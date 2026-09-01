import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "./db";
import { scheduledVisits, tenants, ScheduledVisitStatus } from "@shared/schema";
import { sendScheduledVisitReminderEmail } from "./scheduled-visit-email-service";

const ONE_HOUR = 60;
const ONE_DAY = 24 * 60;

function isValidEmail(email: string | null | undefined): email is string {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function runScheduledVisitReminderScheduler(): Promise<void> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + ONE_HOUR * 60_000);
  const oneDayFromNow = new Date(now.getTime() + ONE_DAY * 60_000);

  const dueVisits = await db.query.scheduledVisits.findMany({
    where: and(
      eq(scheduledVisits.status, ScheduledVisitStatus.SCHEDULED),
      or(
        and(eq(scheduledVisits.reminderMinutes, ONE_HOUR), lte(scheduledVisits.scheduledDate, oneHourFromNow)),
        and(eq(scheduledVisits.reminderMinutes, ONE_DAY), lte(scheduledVisits.scheduledDate, oneDayFromNow)),
      ),
      gt(scheduledVisits.scheduledDate, now),
      isNull(scheduledVisits.reminderSentAt),
    ),
    with: {
      user: true,
      customer: true,
    },
  });

  for (const visit of dueVisits) {
    // Claim before sending so overlapping scheduler ticks cannot send duplicates.
    const [claimed] = await db
      .update(scheduledVisits)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(scheduledVisits.id, visit.id), isNull(scheduledVisits.reminderSentAt)))
      .returning({ id: scheduledVisits.id });

    if (!claimed) {
      continue;
    }

    // A disabled preference is a deliberate skip, not a provider failure.
    // Keep the claim so the same visit is not retried every scheduler tick.
    if (visit.user.receiveEmailNotifications === false) {
      console.log(`[VisitReminder] Skipping visit ${visit.id}: seller opted out of email notifications`);
      continue;
    }

    if (!isValidEmail(visit.user.email)) {
      await db.update(scheduledVisits)
        .set({ reminderSentAt: null })
        .where(eq(scheduledVisits.id, visit.id));
      console.warn(`[VisitReminder] Skipping visit ${visit.id}: seller has no valid email`);
      continue;
    }

    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, visit.tenantId),
        columns: { name: true },
      });

      await sendScheduledVisitReminderEmail(visit.user.email, {
        customerName: visit.customer.name,
        sellerName: visit.user.fullName || visit.user.username,
        scheduledDate: new Date(visit.scheduledDate).toLocaleString("es-MX", {
          dateStyle: "full",
          timeStyle: "short",
        }),
        meetingType: visit.meetingType,
        topics: visit.topics,
        notes: visit.notes,
        companyName: tenant?.name || "NEXXO",
      });
      console.log(`[VisitReminder] Sent reminder for visit ${visit.id} to ${visit.user.email}`);
    } catch (error) {
      // Allow the next poll to retry if the provider is temporarily unavailable.
      await db.update(scheduledVisits)
        .set({ reminderSentAt: null })
        .where(eq(scheduledVisits.id, visit.id));
      console.error(`[VisitReminder] Failed for visit ${visit.id}:`, error);
    }
  }
}