import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schedules: vi.fn(), tenant: vi.fn(), customers: vi.fn(), users: vi.fn(), invoices: vi.fn(), payments: vi.fn(),
  config: vi.fn(), zones: vi.fn(), update: vi.fn(), send: vi.fn(), deliver: vi.fn(), activity: vi.fn(), microsip: vi.fn(),
}));
vi.mock("./db", () => ({
  db: {
    query: {
      accountStatementSchedules: { findMany: mocks.schedules }, tenants: { findFirst: mocks.tenant },
      customers: { findMany: mocks.customers }, users: { findMany: mocks.users },
      invoices: { findMany: mocks.invoices }, payments: { findMany: mocks.payments },
    },
    select: () => ({ from: () => {
      const where: any = () => Object.assign(mocks.zones(), { limit: mocks.config });
      return { where };
    } }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  },
}));
vi.mock("./account-statement-email-service", () => ({ sendAccountStatementEmail: mocks.send }));
vi.mock("./account-statement-delivery", () => ({ deliverScheduledStatement: mocks.deliver }));
vi.mock("./system-log", () => ({ logSystemActivity: mocks.activity }));
vi.mock("./microsip-sync", () => ({ createMicrosipSyncService: mocks.microsip }));
import { resolveStatementCopyEmails, runAccountStatementScheduler, statementCopyEmailsForCustomer } from "./account-statement-scheduler";

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T15:00:00Z"));
  mocks.schedules.mockResolvedValue([{ id: "schedule-a", tenantId: "company-a", scheduleDays: [25], sendHour: 1, onlyOverdue: false, lastRunAt: null }]);
  mocks.tenant.mockResolvedValue({ id: "company-a", name: "Joper" });
  mocks.customers.mockResolvedValue([{
    id: "customer-a", tenantId: "company-a", name: "Cliente de prueba",
    email: "client@example.test", microsipId: null, statementEmailsConfigured: false,
  }]);
  mocks.users.mockResolvedValue([{ role: "admin", email: "admin@example.test" }]);
  mocks.invoices.mockResolvedValue([{ id: "invoice-a", status: "pending_payment", balanceDue: "100" }]);
  mocks.payments.mockResolvedValue([]);
  mocks.config.mockResolvedValue([]);
  mocks.zones.mockImplementation(() => Promise.resolve([]));
  mocks.microsip.mockRejectedValue(new Error("Not configured"));
  mocks.update.mockResolvedValue({});
  mocks.activity.mockResolvedValue({});
  mocks.send.mockResolvedValue(undefined);
  mocks.deliver.mockImplementation(async ({ send }) => { await send(); return true; });
});
afterEach(() => vi.useRealTimers());
async function run() {
  const pending = runAccountStatementScheduler();
  await vi.runAllTimersAsync();
  await pending;
}

describe("automatic statement scheduler", () => {
  it("routes automatic mail through the durable claim using the company-local delivery day", async () => {
    await run();
    expect(mocks.deliver).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "company-a", deliveryDay: "2026-10-25", customer: expect.objectContaining({ id: "customer-a" }),
    }));
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmails: ["client@example.test"], ccEmails: ["admin@example.test"],
    }));
  });

  it("does not contact the provider for an already attempted customer", async () => {
    mocks.deliver.mockResolvedValue(false);
    await run();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.activity).toHaveBeenCalledWith(expect.objectContaining({
      action: "auto_send", details: expect.objectContaining({ sent: 0, duplicatesPrevented: 1 }),
    }));
  });

  it("does not fall back to unselected addresses when a configured selection becomes stale", async () => {
    mocks.customers.mockResolvedValue([{
      id: "customer-a", name: "Cliente", email: "new@example.test",
      statementEmailsConfigured: true, statementEmails: ["old@example.test"],
    }]);
    await run();
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("skips a second in-process tick until the first has finished", async () => {
    let release!: (value: never[]) => void;
    mocks.schedules.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = runAccountStatementScheduler();
    await runAccountStatementScheduler();
    expect(mocks.schedules).toHaveBeenCalledTimes(1);
    release([]);
    await first;
    mocks.schedules.mockResolvedValue([]);
    await run();
    expect(mocks.schedules).toHaveBeenCalledTimes(2);
  });

  it("releases the in-process guard after errors", async () => {
    mocks.schedules.mockRejectedValueOnce(new Error("DB unavailable"));
    await expect(runAccountStatementScheduler()).rejects.toThrow("DB unavailable");
    mocks.schedules.mockResolvedValue([]);
    await run();
    expect(mocks.schedules).toHaveBeenCalledTimes(2);
  });

  it("does not send again on a day already recorded as completed", async () => {
    mocks.schedules.mockResolvedValue([{
      id: "s", tenantId: "company-a", scheduleDays: [25], sendHour: 1,
      lastRunAt: new Date("2026-10-25T08:00:00Z"),
    }]);
    await run();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.customers).not.toHaveBeenCalled();
  });

  it("treats midnight as hour zero, not hour 24, and waits for the configured time", async () => {
    vi.setSystemTime(new Date("2026-10-25T06:30:00Z"));
    await run();
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("still permits a schedule explicitly configured for midnight", async () => {
    vi.setSystemTime(new Date("2026-10-25T06:30:00Z"));
    mocks.schedules.mockResolvedValue([{
      id: "schedule-a", tenantId: "company-a", scheduleDays: [25], sendHour: 0, lastRunAt: null,
    }]);
    await run();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("stops the batch on 429 without marking it completed or trying every remaining customer", async () => {
    mocks.customers.mockResolvedValue([
      { id: "first", name: "First", email: "first@example.test" },
      { id: "second", name: "Second", email: "second@example.test" },
    ]);
    mocks.send.mockRejectedValueOnce({ statusCode: 429 });
    await run();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ retryOnRateLimit: false }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.activity).toHaveBeenCalledWith(expect.objectContaining({
      action: "auto_send_paused", level: "warning",
    }));
    await run();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("sends the internal copy only to the configured users", async () => {
    mocks.schedules.mockResolvedValue([{
      id: "schedule-a", tenantId: "company-a", scheduleDays: [25], sendHour: 1, lastRunAt: null,
      copyUserIds: ["rodrigo", "eunice"],
    }]);
    mocks.users.mockResolvedValue([
      { id: "rodrigo", role: "admin", email: "rodrigopg@example.test" },
      { id: "eunice", role: "credito_cobranza", email: "cobranza@example.test" },
      { id: "andrea", role: "admin", email: "joper@example.test" },
      { id: "anael", role: "admin", email: "ventas@example.test" },
    ]);
    await run();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      ccEmails: ["rodrigopg@example.test", "cobranza@example.test"],
    }));
  });
});

describe("resolveStatementCopyEmails", () => {
  const users = [
    { id: "a", role: "admin", email: "a@example.test" },
    { id: "c", role: "credito_cobranza", email: "c@example.test; A@example.test" },
    { id: "v", role: "vendedor", email: "v@example.test" },
  ];
  it("keeps the admin + cobranza default when never configured", () => {
    expect(resolveStatementCopyEmails(users, null)).toEqual(["a@example.test", "c@example.test"]);
  });
  it("treats a configured list as authoritative, including an empty one", () => {
    expect(resolveStatementCopyEmails(users, ["v"])).toEqual(["v@example.test"]);
    expect(resolveStatementCopyEmails(users, [])).toEqual([]);
  });
  it("ignores configured ids that are not active, opted-in users of the company", () => {
    expect(resolveStatementCopyEmails(users, ["gone", "a"])).toEqual(["a@example.test"]);
  });
});

describe("seller copy by Microsip zone", () => {
  it("adds the zone's assigned seller to that customer's internal copy", async () => {
    mocks.customers.mockResolvedValue([{
      id: "customer-a", name: "Cliente", email: "client@example.test", microsipVendedorId: 4780,
    }]);
    mocks.users.mockResolvedValue([
      { id: "admin", role: "admin", email: "admin@example.test" },
      { id: "seller", role: "vendedor", email: "seller@example.test" },
    ]);
    mocks.zones.mockImplementation(() => Promise.resolve([
      { vendedorId: 4780, name: "CENTRO", userId: "seller" },
      { vendedorId: 7121, name: "GRUPO", userId: "admin" },
    ]));
    await run();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      ccEmails: ["admin@example.test", "seller@example.test"],
    }));
  });

  it("skips sellers that are inactive or opted out (not in the eligible user list)", () => {
    const map = new Map<number, string[]>([[1, ["s@example.test"]]]);
    expect(statementCopyEmailsForCustomer(["a@example.test"], { microsipVendedorId: 2 }, map)).toEqual(["a@example.test"]);
    expect(statementCopyEmailsForCustomer(["S@example.test"], { microsipVendedorId: 1 }, map)).toEqual(["S@example.test"]);
    expect(statementCopyEmailsForCustomer([], { microsipVendedorId: null }, map)).toEqual([]);
  });
});
