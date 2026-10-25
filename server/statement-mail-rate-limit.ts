export function isStatementMailRateLimit(error: any): boolean {
  return [error?.statusCode, error?.status, error?.body?.status].some(value => Number(value) === 429) ||
    Number(error?.body?.error_code) === 1015;
}

export function statementMailRetryAt(error: any, now = Date.now()): Date {
  if (error?.retryAt instanceof Date && error.retryAt.getTime() > now) return error.retryAt;
  const headers = error?.headers ?? error?.response?.headers;
  const value = typeof headers?.get === "function" ? headers.get("retry-after")
    : headers?.["retry-after"] ?? headers?.["Retry-After"];
  const seconds = Number(value);
  const parsed = value && !Number.isFinite(seconds) ? Date.parse(String(value)) : now + seconds * 1000;
  // Without an explicit Retry-After, stop for at least one minute.
  return new Date(Math.max(now + 60_000, Number.isFinite(parsed) ? parsed : 0));
}

export class StatementMailRateLimitPause extends Error {
  readonly statusCode = 429;
  constructor(readonly retryAt: Date) {
    super(`Envío de estados de cuenta pausado por límite del proveedor hasta ${retryAt.toISOString()}`);
  }
}
