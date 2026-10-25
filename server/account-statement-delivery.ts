import { eq } from "drizzle-orm";
import { accountStatementDeliveries } from "@shared/schema";
import { db } from "./db";

export function statementCustomerKey(customer: { id: string; microsipId?: number | null }): string {
  return customer.microsipId && customer.microsipId > 0
    ? `microsip:${customer.microsipId}`
    : `customer:${customer.id}`;
}

/**
 * At-most-once automatic dispatch, shared across processes and restarts.
 * Manual sends remain available for a reviewed, intentional resend.
 */
export async function deliverScheduledStatement(options: {
  tenantId: string;
  deliveryDay: string;
  customer: { id: string; microsipId?: number | null };
  send: () => Promise<void>;
}): Promise<boolean> {
  const [claim] = await db.insert(accountStatementDeliveries).values({
    tenantId: options.tenantId,
    deliveryDay: options.deliveryDay,
    customerKey: statementCustomerKey(options.customer),
  }).onConflictDoNothing().returning({ id: accountStatementDeliveries.id });
  if (!claim) return false;

  try {
    await options.send();
  } catch (error) {
    // Never delete the claim: a timeout can happen after provider acceptance.
    try {
      await db.update(accountStatementDeliveries).set({ status: "unconfirmed", completedAt: new Date() })
        .where(eq(accountStatementDeliveries.id, claim.id));
    } catch (recordError) {
      console.error("[StatementScheduler] Could not record unconfirmed delivery:", recordError);
    }
    throw error;
  }
  // If persistence fails after delivery, the original claim still blocks a
  // duplicate. Do not wrap this update with provider retries.
  await db.update(accountStatementDeliveries).set({ status: "sent", completedAt: new Date() })
    .where(eq(accountStatementDeliveries.id, claim.id));
  return true;
}
