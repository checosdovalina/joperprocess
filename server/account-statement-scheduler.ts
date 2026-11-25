import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { accountStatementSchedules, tenants, customers, invoices, payments, users, microsipConfigs, microsipSellerZones } from "@shared/schema";
import { createMicrosipSyncService } from "./microsip-sync";
import { logSystemActivity } from "./system-log";
import { deliverScheduledStatement } from "./account-statement-delivery";
import { isStatementMailRateLimit, statementMailRetryAt } from "./statement-mail-rate-limit";

let schedulerRunning = false;

function todayInMexico(tz = "America/Mexico_City"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

function hourInMexico(tz = "America/Mexico_City"): number {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10) % 24;
}

function dayOfMonthInMexico(tz = "America/Mexico_City"): number {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, day: "numeric" }), 10);
}

export async function runAccountStatementScheduler(): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    await runDueStatements();
  } finally {
    schedulerRunning = false;
  }
}

async function runDueStatements(): Promise<void> {
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

    console.log(`[StatementScheduler] Sending for tenant ${schedule.tenantId} (date ${todayStr}, day ${todayDay}, hour ${currentHour})`);
    try {
      const completed = await runForTenant(schedule.tenantId, schedule.onlyOverdue, todayStr, schedule.copyUserIds ?? null);
      if (!completed) continue;
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

/**
 * Internal copy recipients. `copyUserIds === null` keeps the legacy default
 * (every admin + cobranza user); a configured list is authoritative, even when
 * empty. Users must already be active, opted in and in this tenant.
 */
export function resolveStatementCopyEmails(
  tenantUsers: { id?: string; role: string; email: string | null }[],
  copyUserIds: string[] | null | undefined,
): string[] {
  const chosen = copyUserIds == null
    ? tenantUsers.filter((u) => u.role === "admin" || u.role === "credito_cobranza")
    : tenantUsers.filter((u) => u.id && copyUserIds.includes(u.id));
  return chosen
    .flatMap((u) => (u.email ?? "").split(/[;,]/).map((e) => e.trim()))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .filter((email, index, emails) =>
      emails.findIndex((candidate) => candidate.toLowerCase() === email.toLowerCase()) === index
    );
}

/** Adds the seller assigned to the customer's Microsip zone to the copy list. */
export function statementCopyEmailsForCustomer(
  baseCopyEmails: string[],
  customer: { microsipVendedorId?: number | null },
  zoneSellerEmails: Map<number, string[]>,
): string[] {
  const seller = customer.microsipVendedorId != null ? zoneSellerEmails.get(customer.microsipVendedorId) ?? [] : [];
  const merged = [...baseCopyEmails];
  for (const e of seller) {
    if (!merged.some((m) => m.toLowerCase() === e.toLowerCase())) merged.push(e);
  }
  return merged;
}

async function runForTenant(tenantId: string, onlyOverdue: boolean, deliveryDay: string, copyUserIds: string[] | null = null): Promise<boolean> {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return true;

  const allCustomers = await db.query.customers.findMany({
    where: eq(customers.tenantId, tenantId),
  });

  // Active, opted-in users of this tenant; the copy list is chosen from them.
  const adminUsers = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.active, true),
      eq(users.receiveEmailNotifications, true),
    ),
  });
  const ccEmails = resolveStatementCopyEmails(adminUsers, copyUserIds);

  // Seller per Microsip sales zone. Only active, opted-in users of this tenant.
  const zoneSellerEmails = new Map<number, string[]>();
  const zones = await db.select().from(microsipSellerZones).where(eq(microsipSellerZones.tenantId, tenantId));
  for (const zone of zones) {
    if (!zone.userId) continue;
    const seller = adminUsers.find((u) => u.id === zone.userId);
    if (!seller) continue;
    zoneSellerEmails.set(zone.vendedorId, resolveStatementCopyEmails([seller], [seller.id]));
  }

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
  let duplicatesPrevented = 0;
  let rateLimited = false;
  let retryAt: Date | null = null;
  const failedCustomers: string[] = [];

  for (const customer of allCustomers) {
    const registeredEmails = (customer.email ?? "")
      .split(/[;,]/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    const selected = (customer.statementEmails ?? [])
      .map((e) => e.trim())
      .filter((e) => registeredEmails.some((registered) => registered.toLowerCase() === e.toLowerCase()));
    const emails = customer.statementEmailsConfigured ? selected : registeredEmails;

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
      const delivered = await deliverScheduledStatement({
        tenantId, deliveryDay, customer,
        send: () => sendAccountStatementEmail({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails: emails,
        tenantName: tenant.name,
        liveData,
        ccEmails: (() => {
          const copy = statementCopyEmailsForCustomer(ccEmails, customer, zoneSellerEmails);
          return copy.length > 0 ? copy : undefined;
        })(),
        retryOnRateLimit: false,
        }),
      });
      if (!delivered) {
        duplicatesPrevented++;
        skipped++;
        continue;
      }
      sent++;
      // Pause between sends to stay under the mail provider's rate limit
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      if (isStatementMailRateLimit(err)) {
        rateLimited = true;
        retryAt = statementMailRetryAt(err);
        console.warn(`[StatementScheduler] Paused tenant ${tenantId} on ${deliveryDay}: provider rate limit; retry after ${retryAt.toISOString()}`);
        break;
      }
      failed++;
      failedCustomers.push(customer.name);
      console.error(`[StatementScheduler] Failed to send to ${customer.name}:`, err);
    }
  }

  console.log(`[StatementScheduler] ${tenant.name}: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos`);
  await logSystemActivity({
    tenantId,
    category: "account_statement",
    action: rateLimited ? "auto_send_paused" : "auto_send",
    level: failed > 0 || rateLimited ? "warning" : "info",
    message: `${rateLimited ? "Envío automático pausado por límite del proveedor" : "Envío automático completado"}: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos.` +
      (onlyOverdue ? " (solo clientes con saldo vencido)" : "") +
      (duplicatesPrevented ? ` ${duplicatesPrevented} reenvíos evitados por protección de duplicados.` : "") +
      (rateLimited ? " Se retomará en la siguiente revisión programada, sin repetir los envíos confirmados." : ""),
    details: { sent, skipped, failed, failedCustomers, onlyOverdue, duplicatesPrevented, deliveryDay, retryAfter: retryAt?.toISOString() ?? null },
  });
  return !rateLimited;
}
