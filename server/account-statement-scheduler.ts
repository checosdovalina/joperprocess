import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { accountStatementSchedules, tenants, customers, invoices, payments, users, microsipConfigs } from "@shared/schema";
import { createMicrosipSyncService } from "./microsip-sync";
import { logSystemActivity } from "./system-log";

function todayInMexico(tz = "America/Mexico_City"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

function hourInMexico(tz = "America/Mexico_City"): number {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10);
}

function dayOfMonthInMexico(tz = "America/Mexico_City"): number {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, day: "numeric" }), 10);
}

export async function runAccountStatementScheduler(): Promise<void> {
  const tz = "America/Mexico_City";
  const todayDay = dayOfMonthInMexico(tz);
  const currentHour = hourInMexico(tz);
  const todayStr = todayInMexico(tz);

  const schedules = await db.query.accountStatementSchedules.findMany({
    where: eq(accountStatementSchedules.enabled, true),
  });

  for (const schedule of schedules) {
    if (!schedule.scheduleDays.includes(todayDay)) continue;
    if (currentHour < schedule.sendHour) continue;

    if (schedule.lastRunAt) {
      const lastRunDay = new Date(schedule.lastRunAt).toLocaleDateString("en-CA", { timeZone: tz });
      if (lastRunDay === todayStr) {
        continue;
      }
    }

    console.log(`[StatementScheduler] Sending for tenant ${schedule.tenantId} (day ${todayDay}, hour ${currentHour})`);
    try {
      await runForTenant(schedule.tenantId, schedule.onlyOverdue);
      await db
        .update(accountStatementSchedules)
        .set({ lastRunAt: new Date(), updatedAt: new Date() })
        .where(eq(accountStatementSchedules.id, schedule.id));
      console.log(`[StatementScheduler] Done for tenant ${schedule.tenantId}`);
    } catch (err) {
      console.error(`[StatementScheduler] Error for tenant ${schedule.tenantId}:`, err);
    }
  }
}

async function runForTenant(tenantId: string, onlyOverdue: boolean): Promise<void> {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return;

  const allCustomers = await db.query.customers.findMany({
    where: eq(customers.tenantId, tenantId),
  });

  // Admin + cobranza users for this tenant → will receive CC copy of each statement
  const adminUsers = await db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId)),
  });
  const ccEmails = adminUsers.filter((u) => u.role === "admin" || u.role === "credito_cobranza")
    .flatMap((u) => (u.email ?? "").split(/[;,]/).map((e) => e.trim()))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  // Try to create Microsip service for live CXC data (one connection per tenant run).
  // Track whether Microsip IS configured but unavailable: in that case linked customers
  // must be skipped rather than emailed with stale local data.
  const microsipConfigured =
    (await db.select().from(microsipConfigs).where(eq(microsipConfigs.tenantId, tenantId)).limit(1)).length > 0;
  let msService: Awaited<ReturnType<typeof createMicrosipSyncService>> | null = null;
  try {
    msService = await createMicrosipSyncService(tenantId);
  } catch (_e) {
    if (microsipConfigured) {
      console.error(`[StatementScheduler] Microsip configured but unavailable for tenant ${tenantId}; linked customers will be skipped`);
    } else {
      console.warn(`[StatementScheduler] Microsip not configured for tenant ${tenantId}, using local DB`);
    }
  }

  // ── Refresh data BEFORE sending ────────────────────────────────────────────
  // Pull the latest invoices + payments from Microsip so the account statements
  // reflect the current balances at the moment of the automatic send (instead of
  // relying on whatever was last synced or on a manual "Actualizar" click).
  if (msService) {
    try {
      const invResult = await msService.syncInvoices();
      const payResult = await msService.syncPayments();
      console.log(
        `[StatementScheduler] Pre-send refresh for tenant ${tenantId}: ` +
        `facturas (+${invResult.created} nuevas, ${invResult.updated} actualizadas), ` +
        `pagos (+${payResult.created} nuevos, ${payResult.updated} actualizados)`
      );
      await logSystemActivity({
        tenantId,
        category: "account_statement",
        action: "pre_send_refresh",
        level: "info",
        message: `Datos actualizados desde Microsip antes del envío: ${invResult.created} facturas nuevas, ${invResult.updated} actualizadas; ${payResult.created} pagos nuevos, ${payResult.updated} actualizados.`,
        details: { invoices: invResult, payments: payResult },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[StatementScheduler] Pre-send refresh failed for tenant ${tenantId} (se enviará con datos disponibles):`, err);
      await logSystemActivity({
        tenantId,
        category: "account_statement",
        action: "pre_send_refresh",
        level: "warning",
        message: `No se pudo actualizar con Microsip antes del envío; se enviará con los datos disponibles. (${msg})`,
      });
    }
  } else {
    await logSystemActivity({
      tenantId,
      category: "account_statement",
      action: "pre_send_refresh",
      level: "warning",
      message: "Microsip no está configurado o no disponible; se enviará con los datos locales disponibles.",
    });
  }

  const { sendAccountStatementEmail } = await import("./account-statement-email-service");
  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failedCustomers: string[] = [];

  for (const customer of allCustomers) {
    const emails = (customer.email ?? "")
      .split(/[;,]/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (customer.skipStatementEmail) { skipped++; continue; }
    if (emails.length === 0) { skipped++; continue; }

    const [custInvoices, custPayments] = await Promise.all([
      db.query.invoices.findMany({ where: eq(invoices.customerId, customer.id) }),
      db.query.payments.findMany({ where: eq(payments.customerId, customer.id) }),
    ]);

    // Live CXC data for accurate balances. If Microsip is configured and this
    // customer is linked but the live query fails, SKIP the customer instead of
    // sending stale local data that contradicts Microsip.
    let liveData: { invoices: any[]; payments: any[] } | undefined;
    if (microsipConfigured && !msService && customer.microsipId) {
      failed++;
      failedCustomers.push(`${customer.name} (Microsip no disponible)`);
      continue;
    }
    if (msService && customer.microsipId) {
      try {
        liveData = await msService.queryLiveCxcStatementForCustomer(customer.microsipId);
      } catch (_e) {
        failed++;
        failedCustomers.push(`${customer.name} (Microsip no disponible)`);
        console.error(`[StatementScheduler] Live CXC failed for ${customer.name}, skipping:`, (_e as any)?.message);
        continue;
      }
    }

    // Determine if this customer has any active balance (using live data if available)
    let hasActive: boolean;
    let hasOverdue: boolean;
    if (liveData) {
      hasActive = liveData.invoices.length > 0;
      hasOverdue = liveData.invoices.some((i: any) => i.FECHA_VEN && new Date(i.FECHA_VEN) < now);
    } else {
      const activeInvoices = custInvoices.filter(
        (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
      );
      hasActive = activeInvoices.length > 0;
      hasOverdue = activeInvoices.some((inv) => inv.dueDate && new Date(inv.dueDate) < now);
    }

    if (!hasActive) { skipped++; continue; }
    if (onlyOverdue && !hasOverdue) { skipped++; continue; }

    try {
      await sendAccountStatementEmail({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails: emails,
        tenantName: tenant.name,
        liveData,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
      });
      sent++;
    } catch (err) {
      failed++;
      failedCustomers.push(customer.name);
      console.error(`[StatementScheduler] Failed to send to ${customer.name}:`, err);
    }
  }

  console.log(`[StatementScheduler] ${tenant.name}: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos`);
  await logSystemActivity({
    tenantId,
    category: "account_statement",
    action: "auto_send",
    level: failed > 0 ? "warning" : "info",
    message: `Envío automático completado: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos.` +
      (onlyOverdue ? " (solo clientes con saldo vencido)" : ""),
    details: { sent, skipped, failed, failedCustomers, onlyOverdue },
  });
}
