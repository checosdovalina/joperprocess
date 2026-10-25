import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schedules: vi.fn(), tenant: vi.fn(), customers: vi.fn(), users: vi.fn(), invoices: vi.fn(), payments: vi.fn(),
  config: vi.fn(), update: vi.fn(), send: vi.fn(), deliver: vi.fn(), activity: vi.fn(), microsip: vi.fn(),
}));
vi.mock("./db", () => ({
  db: {
    query: {
      accountStatementSchedules: { findMany: mocks.schedules }, tenants: { findFirst: mocks.tenant },
      customers: { findMany: mocks.customers }, users: { findMany: mocks.users },
      invoices: { findMany: mocks.invoices }, payments: { findMany: mocks.payments },
    },
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.config }) }) }),
    update: () => ({ set: () => ({ where: mocks.update }) }),
  },
}));
vi.mock("./account-statement-email-service", () => ({ sendAccountStatementEmail: mocks.send }));
vi.mock("./account-statement-delivery", () => ({ deliverScheduledStatement: mocks.deliver }));
vi.mock("./system-log", () => ({ logSystemActivity: mocks.activity }));
vi.mock("./microsip-sync", () => ({ createMicrosipSyncService: mocks.microsip }));
import { runAccountStatementScheduler } from "./account-statement-scheduler";

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
});
