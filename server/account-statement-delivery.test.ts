import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { accountStatementDeliveries, tenants } from "@shared/schema";
import { deliverScheduledStatement, statementCustomerKey } from "./account-statement-delivery";

const tenantIds: string[] = [];
const day = "2026-10-25";
beforeAll(async () => {
  for (let i = 0; i < 2; i++) {
    const id = randomUUID();
    await db.insert(tenants).values({ id, name: "Statement delivery test", subdomain: `statement-test-${id}` });
    tenantIds.push(id);
  }
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  if (!tenantIds.length) return;
  await db.delete(accountStatementDeliveries).where(inArray(accountStatementDeliveries.tenantId, tenantIds));
  await db.delete(tenants).where(inArray(tenants.id, tenantIds));
});

function attempt(customerId: string, send: () => Promise<void>, extra: { microsipId?: number; deliveryDay?: string; tenantId?: string } = {}) {
  return deliverScheduledStatement({
    tenantId: extra.tenantId ?? tenantIds[0], deliveryDay: extra.deliveryDay ?? day,
    customer: { id: customerId, microsipId: extra.microsipId }, send,
  });
}

describe("durable automatic statement dispatch", () => {
  it("allows only one send when independent workers claim the same customer simultaneously", async () => {
    const send = vi.fn(async () => {});
    const results = await Promise.all(Array.from({ length: 12 }, () => attempt("concurrent", send)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await attempt("concurrent", send)).toBe(false);
    const rows = await db.select().from(accountStatementDeliveries)
      .where(eq(accountStatementDeliveries.customerKey, "customer:concurrent"));
    expect(rows.filter(row => row.tenantId === tenantIds[0])).toHaveLength(1);
    expect(rows.find(row => row.tenantId === tenantIds[0])?.status).toBe("sent");
  });

  it("recognizes duplicate local rows linked to the same Microsip customer", async () => {
    const send = vi.fn(async () => {});
    expect(await attempt("local-row-one", send, { microsipId: 998812 })).toBe(true);
    expect(await attempt("local-row-two", send, { microsipId: 998812 })).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    expect(statementCustomerKey({ id: "row", microsipId: null })).toBe("customer:row");
  });

  it("keeps different customers, companies, and scheduled dates independent", async () => {
    const send = vi.fn(async () => {});
    expect(await attempt("independent", send, { microsipId: 998813 })).toBe(true);
    expect(await attempt("independent", send, { microsipId: 998813, tenantId: tenantIds[1] })).toBe(true);
    expect(await attempt("independent", send, { microsipId: 998813, deliveryDay: "2026-10-26" })).toBe(true);
    expect(await attempt("local-independent-1", send)).toBe(true);
    expect(await attempt("local-independent-2", send)).toBe(true);
    expect(send).toHaveBeenCalledTimes(5);
  });

  it("does not retry an ambiguous provider failure that could already have delivered the mail", async () => {
    const send = vi.fn(async () => { throw new Error("Provider timed out after accepting"); });
    await expect(attempt("unconfirmed", send)).rejects.toThrow("Provider timed out");
    expect(await attempt("unconfirmed", send)).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    const [row] = await db.select().from(accountStatementDeliveries)
      .where(eq(accountStatementDeliveries.customerKey, "customer:unconfirmed"));
    expect(row.status).toBe("unconfirmed");
  });

  it("safely retries a definite 429 rejection after its durable cooldown without duplicating successful sends", async () => {
    const blocked = { statusCode: 429, headers: { "retry-after": "120" } };
    const send = vi.fn().mockRejectedValueOnce(blocked).mockResolvedValue(undefined);
    const before = Date.now();
    await expect(attempt("rate-limited", send)).rejects.toEqual(blocked);
    const [row] = await db.select().from(accountStatementDeliveries)
      .where(eq(accountStatementDeliveries.customerKey, "customer:rate-limited"));
    expect(row.status).toBe("rate_limited");
    expect(row.retryAfter!.getTime()).toBeGreaterThanOrEqual(before + 120_000);
    await expect(attempt("rate-limited", send)).rejects.toMatchObject({ statusCode: 429 });
    expect(send).toHaveBeenCalledTimes(1);
    await db.update(accountStatementDeliveries).set({ retryAfter: new Date(Date.now() - 1000) })
      .where(eq(accountStatementDeliveries.id, row.id));
    const results = await Promise.all(Array.from({ length: 8 }, () => attempt("rate-limited", send)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(2); // one rejected request, then one accepted
    expect(await attempt("rate-limited", send)).toBe(false);
  });

  it("retains protection after a crash leaves a pending claim", async () => {
    await db.insert(accountStatementDeliveries).values({
      tenantId: tenantIds[0], deliveryDay: day, customerKey: "customer:interrupted",
    });
    const send = vi.fn(async () => {});
    expect(await attempt("interrupted", send)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send again when marking a confirmed delivery fails", async () => {
    const send = vi.fn(async () => {});
    const update = vi.spyOn(db, "update").mockImplementationOnce(() => { throw new Error("Persistence unavailable"); });
    await expect(attempt("post-send-failure", send)).rejects.toThrow("Persistence unavailable");
    update.mockRestore();
    expect(await attempt("post-send-failure", send)).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails closed if it cannot persist the claim, without contacting the provider", async () => {
    const send = vi.fn(async () => {});
    vi.spyOn(db, "insert").mockImplementationOnce(() => { throw new Error("Cannot persist claim"); });
    await expect(attempt("claim-failed", send)).rejects.toThrow("Cannot persist claim");
    expect(send).not.toHaveBeenCalled();
  });
});
