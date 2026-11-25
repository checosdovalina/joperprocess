import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("mailersend", async importOriginal => ({
  ...await importOriginal<typeof import("mailersend")>(),
  MailerSend: class { email = { send }; },
}));
import { sendAccountStatementEmail } from "./account-statement-email-service";
import { isStatementMailRateLimit, statementMailRetryAt } from "./statement-mail-rate-limit";

const params = {
  customer: { id: "customer", name: "Cliente de prueba" } as any,
  invoices: [], payments: [], recipientEmails: ["client@example.test"],
  ccEmails: ["admin@example.test"], tenantName: "Joper",
};
beforeEach(() => {
  send.mockReset().mockResolvedValue({});
  vi.stubEnv("MAILERSEND_API_KEY", "mock-provider-key");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T15:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("statement provider rate limits and copies", () => {
  it("immediately pauses automatic delivery on a provider 429 without inline retry", async () => {
    send.mockRejectedValue({ statusCode: 429, body: { error_code: 1015 } });
    await expect(sendAccountStatementEmail({ ...params, retryOnRateLimit: false })).rejects.toMatchObject({ statusCode: 429 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("deduplicates addresses across customer and internal copies", async () => {
    await sendAccountStatementEmail({
      ...params, recipientEmails: [" client@example.test ", "CLIENT@example.test"],
      ccEmails: ["client@example.test", "admin@example.test", "ADMIN@example.test"],
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].to).toHaveLength(1);
    expect(send.mock.calls[0][0].cc).toBeUndefined();
    expect(send.mock.calls[1][0].to.map((r: any) => r.email)).toEqual(["admin@example.test"]);
  });

  it("never attaches internal copies to a multi-recipient customer message", async () => {
    await sendAccountStatementEmail({
      ...params,
      recipientEmails: ["a@client.test", "b@client.test", "c@client.test"],
      ccEmails: ["cobranza@example.test", "ventas@example.test", "direccion@example.test"],
    });
    expect(send).toHaveBeenCalledTimes(2);
    const [customerMsg, copyMsg] = send.mock.calls.map((c) => c[0]);
    expect(customerMsg.to).toHaveLength(3);
    expect(customerMsg.cc).toBeUndefined();
    // One TO only: the provider fans out per TO, so each copy address gets one email.
    expect(copyMsg.to).toHaveLength(1);
    expect(copyMsg.cc.map((r: any) => r.email)).toEqual(["ventas@example.test", "direccion@example.test"]);
    expect(copyMsg.subject).toMatch(/^\[Copia interna\]/);
  });

  it("does not fail the customer delivery when only the internal copy fails", async () => {
    send.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("copy failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendAccountStatementEmail(params)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not retry an uncertain provider failure", async () => {
    send.mockRejectedValue(new Error("Connection timed out"));
    await expect(sendAccountStatementEmail(params)).rejects.toThrow("Connection timed out");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retains existing explicit manual-send retry behavior for definite rejections", async () => {
    send.mockRejectedValueOnce({ statusCode: 429 }).mockResolvedValue({});
    const pending = sendAccountStatementEmail(params);
    const assertion = expect(pending).resolves.toBeUndefined();
    await vi.runAllTimersAsync();
    await assertion;
    expect(send).toHaveBeenCalledTimes(3); // rejected + accepted customer message, then internal copy
  });

  it("recognizes Cloudflare 1015 and respects Retry-After seconds or HTTP dates", () => {
    expect(isStatementMailRateLimit({ body: { error_code: "1015" } })).toBe(true);
    expect(isStatementMailRateLimit({ statusCode: "429" })).toBe(true);
    expect(isStatementMailRateLimit(new Error("Timeout"))).toBe(false);
    const now = Date.now();
    expect(statementMailRetryAt({ headers: { "retry-after": "120" } }).getTime()).toBe(now + 120_000);
    expect(statementMailRetryAt({ headers: { "Retry-After": new Date(now + 180_000).toUTCString() } }).getTime()).toBe(now + 180_000);
    expect(statementMailRetryAt({}).getTime()).toBe(now + 60_000);
  });
});
