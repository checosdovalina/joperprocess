import { and, eq, lte } from "drizzle-orm";
import { accountStatementDeliveries } from "@shared/schema";
import { db } from "./db";
import { isStatementMailRateLimit, statementMailRetryAt, StatementMailRateLimitPause } from "./statement-mail-rate-limit";

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
  const customerKey = statementCustomerKey(options.customer);
  const [claim] = await db.insert(accountStatementDeliveries).values({
    tenantId: options.tenantId,
    deliveryDay: options.deliveryDay,
    customerKey,
  }).onConflictDoUpdate({
    target: [accountStatementDeliveries.tenantId, accountStatementDeliveries.deliveryDay, accountStatementDeliveries.customerKey],
    set: { status: "sending", attemptedAt: new Date(), completedAt: null, retryAfter: null },
    setWhere: and(eq(accountStatementDeliveries.status, "rate_limited"), lte(accountStatementDeliveries.retryAfter, new Date())),
  }).returning({ id: accountStatementDeliveries.id });
  if (!claim) {
    const previous = await db.query.accountStatementDeliveries.findFirst({ where: and(
      eq(accountStatementDeliveries.tenantId, options.tenantId),
      eq(accountStatementDeliveries.deliveryDay, options.deliveryDay),
      eq(accountStatementDeliveries.customerKey, customerKey),
    ) });
    if (previous?.status === "rate_limited" && previous.retryAfter) {
      throw new StatementMailRateLimitPause(previous.retryAfter);
    }
    return false;
  }

  try {
    await options.send();
  } catch (error) {
    // Never delete the claim: a timeout can happen after provider acceptance.
    try {
      const limited = isStatementMailRateLimit(error);
      await db.update(accountStatementDeliveries).set({
        status: limited ? "rate_limited" : "unconfirmed", completedAt: new Date(),
        retryAfter: limited ? statementMailRetryAt(error) : null,
      })
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
