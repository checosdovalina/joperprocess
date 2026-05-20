import { db } from "./db";
import { eq } from "drizzle-orm";
import { accountStatementSchedules, tenants, customers, invoices, payments } from "@shared/schema";

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

  const { sendAccountStatementEmail } = await import("./account-statement-email-service");
  const now = new Date();
  let sent = 0;
  let skipped = 0;

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

    const activeInvoices = custInvoices.filter(
      (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
    );

    if (activeInvoices.length === 0) { skipped++; continue; }

    if (onlyOverdue) {
      const hasOverdue = activeInvoices.some((inv) => inv.dueDate && new Date(inv.dueDate) < now);
      if (!hasOverdue) { skipped++; continue; }
    }

    try {
      await sendAccountStatementEmail({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails: emails,
        tenantName: tenant.name,
      });
      sent++;
    } catch (err) {
      console.error(`[StatementScheduler] Failed to send to ${customer.name}:`, err);
    }
  }

  console.log(`[StatementScheduler] ${tenant.name}: ${sent} enviados, ${skipped} omitidos`);
}
