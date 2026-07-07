import { db } from "./db";
import { systemLogs } from "@shared/schema";

export type LogLevel = "info" | "warning" | "error";
export type LogCategory = "account_statement" | "microsip_sync" | "system";

/**
 * Write an entry to the general system activity log.
 * This is best-effort: logging must never break the caller's main flow, so any
 * failure while persisting the log is swallowed (and reported to the console).
 */
export async function logSystemActivity(entry: {
  tenantId: string;
  category: LogCategory;
  message: string;
  level?: LogLevel;
  action?: string;
  details?: unknown;
}): Promise<void> {
  try {
    await db.insert(systemLogs).values({
      tenantId: entry.tenantId,
      category: entry.category,
      level: entry.level ?? "info",
      action: entry.action ?? null,
      message: entry.message,
      details: (entry.details ?? null) as any,
    });
  } catch (err) {
    console.error("[system-log] Failed to write log entry:", err);
  }
}
