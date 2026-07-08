/**
 * Regression tests for empresa (marca comercial) + tenant isolation.
 *
 * These lock in the security behavior described in
 * .agents/memory/empresa-tenant-isolation.md for two profiles:
 *   1. A restricted "vendedor" (users.empresaId set) — sees ONLY their empresa's
 *      quotations/orders/shipments within their tenant.
 *   2. An internal user (empresaId = null, e.g. ADMIN/producción) — sees everything
 *      inside their tenant but NOTHING from another tenant.
 *
 * They exercise the real Express app end-to-end (login via Passport session +
 * X-Tenant-Subdomain header) so both the by-id guards (403/404) and the
 * list/aggregate filters are covered, plus the immutable empresaId inheritance
 * invariant (order inherits from quotation, shipment from order; client input ignored).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "http";
import { inArray, eq } from "drizzle-orm";

import { db } from "./db";
import { registerRoutes } from "./routes";
import { tenantMiddleware } from "./tenant";
import { hashPassword } from "./auth";
import { createTenantScopedStorage } from "./storage";
import {
  tenants,
  empresas,
  users,
  customers,
  quotations,
  quotationItems,
  products,
  orders,
  shipments,
  creditAuthorizations,
  UserRole,
  QuotationStatus,
} from "@shared/schema";

// Stub the transactional email provider so the send-email happy path can be
// asserted without dispatching a real email. The route imports it dynamically
// (`await import("./quotation-email-service")`), which vi.mock intercepts.
const sendQuotationEmailMock = vi.fn(async () => {});
vi.mock("./quotation-email-service", () => ({
  sendQuotationEmail: (...args: any[]) => sendQuotationEmailMock(...args),
}));

// Unique run suffix so parallel/rerun test data never collides with real data.
const RUN = `zziso_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

type Ctx = {
  server: Server;
  baseUrl: string;
  tenantA: string;
  tenantB: string;
  subA: string;
  subB: string;
  empresaA1: string;
  empresaA2: string;
  empresaB1: string;
  customerA: string;
  customerB: string;
  vendedorA1: typeof users.$inferSelect;
  adminA: typeof users.$inferSelect;
  adminB: typeof users.$inferSelect;
  qA1: string;
  qA2: string;
  qB1: string;
  productA1: string;
  itemA1: string;
  oA1: string;
  oA2: string;
  oB1: string;
  sA1: string;
  sA2: string;
  sB1: string;
  caA1: string;
  caA2: string;
  caB1: string;
};

const ctx = {} as Ctx;

async function insertReturningId(table: any, values: any): Promise<string> {
  const [row] = await db.insert(table).values(values).returning({ id: table.id });
  return row.id;
}

async function seed() {
  const password = await hashPassword("Test-1234");

  ctx.subA = `${RUN}a`;
  ctx.subB = `${RUN}b`;

  ctx.tenantA = await insertReturningId(tenants, { name: `TenantA ${RUN}`, subdomain: ctx.subA, active: true });
  ctx.tenantB = await insertReturningId(tenants, { name: `TenantB ${RUN}`, subdomain: ctx.subB, active: true });

  ctx.empresaA1 = await insertReturningId(empresas, { tenantId: ctx.tenantA, name: `A1 ${RUN}`, clave: "A1" });
  ctx.empresaA2 = await insertReturningId(empresas, { tenantId: ctx.tenantA, name: `A2 ${RUN}`, clave: "A2" });
  ctx.empresaB1 = await insertReturningId(empresas, { tenantId: ctx.tenantB, name: `B1 ${RUN}`, clave: "B1" });

  ctx.customerA = await insertReturningId(customers, { tenantId: ctx.tenantA, name: `CustA ${RUN}` });
  ctx.customerB = await insertReturningId(customers, { tenantId: ctx.tenantB, name: `CustB ${RUN}` });

  const [vendedorA1] = await db.insert(users).values({
    tenantId: ctx.tenantA,
    empresaId: ctx.empresaA1,
    username: `vendedorA1_${RUN}`,
    password,
    fullName: "Vendedor A1",
    email: `vendedorA1_${RUN}@test.local`,
    role: UserRole.VENDEDOR,
    active: true,
  }).returning();
  ctx.vendedorA1 = vendedorA1;

  const [adminA] = await db.insert(users).values({
    tenantId: ctx.tenantA,
    empresaId: null,
    username: `adminA_${RUN}`,
    password,
    fullName: "Admin A",
    email: `adminA_${RUN}@test.local`,
    role: UserRole.ADMIN,
    active: true,
  }).returning();
  ctx.adminA = adminA;

  const [adminB] = await db.insert(users).values({
    tenantId: ctx.tenantB,
    empresaId: null,
    username: `adminB_${RUN}`,
    password,
    fullName: "Admin B",
    email: `adminB_${RUN}@test.local`,
    role: UserRole.ADMIN,
    active: true,
  }).returning();
  ctx.adminB = adminB;

  // Quotations. qA1 is owned by the vendedor so the vendedor can also edit it
  // (isolate the empresa/tenant guard from the unrelated ownership/role guard).
  ctx.qA1 = await insertReturningId(quotations, {
    tenantId: ctx.tenantA, empresaId: ctx.empresaA1, customerId: ctx.customerA,
    userId: ctx.vendedorA1.id, folio: `F-${RUN}-A1`, status: QuotationStatus.DRAFT,
  });
  ctx.qA2 = await insertReturningId(quotations, {
    tenantId: ctx.tenantA, empresaId: ctx.empresaA2, customerId: ctx.customerA,
    userId: ctx.adminA.id, folio: `F-${RUN}-A2`, status: QuotationStatus.DRAFT,
  });
  ctx.qB1 = await insertReturningId(quotations, {
    tenantId: ctx.tenantB, empresaId: ctx.empresaB1, customerId: ctx.customerB,
    userId: ctx.adminB.id, folio: `F-${RUN}-B1`, status: QuotationStatus.DRAFT,
  });

  // A product + line item for qA1 so pipeline/items has a positive (non-empty) case.
  ctx.productA1 = await insertReturningId(products, {
    tenantId: ctx.tenantA, code: `P-${RUN}`, name: `Producto ${RUN}`, listPrice: "100",
  });
  ctx.itemA1 = await insertReturningId(quotationItems, {
    quotationId: ctx.qA1, productId: ctx.productA1, productName: `Producto ${RUN}`,
    quantity: "2", listPrice: "100", unitPrice: "100", subtotal: "200", total: "232", position: 0,
  });

  ctx.oA1 = await insertReturningId(orders, { tenantId: ctx.tenantA, empresaId: ctx.empresaA1, quotationId: ctx.qA1, releaseStatus: "approved" });
  ctx.oA2 = await insertReturningId(orders, { tenantId: ctx.tenantA, empresaId: ctx.empresaA2, quotationId: ctx.qA2, releaseStatus: "approved" });
  ctx.oB1 = await insertReturningId(orders, { tenantId: ctx.tenantB, empresaId: ctx.empresaB1, quotationId: ctx.qB1, releaseStatus: "approved" });

  ctx.sA1 = await insertReturningId(shipments, { tenantId: ctx.tenantA, empresaId: ctx.empresaA1, orderId: ctx.oA1, transporter: "T", transportType: "propio" });
  ctx.sA2 = await insertReturningId(shipments, { tenantId: ctx.tenantA, empresaId: ctx.empresaA2, orderId: ctx.oA2, transporter: "T", transportType: "propio" });
  ctx.sB1 = await insertReturningId(shipments, { tenantId: ctx.tenantB, empresaId: ctx.empresaB1, orderId: ctx.oB1, transporter: "T", transportType: "propio" });

  ctx.caA1 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qA1, userId: ctx.vendedorA1.id });
  ctx.caA2 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qA2, userId: ctx.adminA.id });
  ctx.caB1 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qB1, userId: ctx.adminB.id });
}

async function cleanup() {
  const tIds = [ctx.tenantA, ctx.tenantB].filter(Boolean);
  if (tIds.length === 0) return;
  const qs = await db.select({ id: quotations.id }).from(quotations).where(inArray(quotations.tenantId, tIds));
  const qIds = qs.map((q) => q.id);
  if (qIds.length) await db.delete(creditAuthorizations).where(inArray(creditAuthorizations.quotationId, qIds));
  await db.delete(shipments).where(inArray(shipments.tenantId, tIds));
  await db.delete(orders).where(inArray(orders.tenantId, tIds));
  await db.delete(quotations).where(inArray(quotations.tenantId, tIds));
  await db.delete(products).where(inArray(products.tenantId, tIds));
  await db.delete(customers).where(inArray(customers.tenantId, tIds));
  await db.delete(users).where(inArray(users.tenantId, tIds));
  await db.delete(empresas).where(inArray(empresas.tenantId, tIds));
  await db.delete(tenants).where(inArray(tenants.id, tIds));
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function login(username: string, subdomain: string): Promise<string> {
  const res = await fetch(`${ctx.baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Subdomain": subdomain },
    body: JSON.stringify({ username, password: "Test-1234" }),
  });
  if (res.status !== 200) {
    throw new Error(`login failed for ${username}: ${res.status} ${await res.text()}`);
  }
  const setCookies = (res.headers as any).getSetCookie?.() ?? [res.headers.get("set-cookie")];
  const sid = setCookies
    .map((c: string) => c?.split(";")[0])
    .find((c: string) => c?.startsWith("connect.sid="));
  if (!sid) throw new Error(`no session cookie returned for ${username}`);
  return sid;
}

function req(cookie: string, subdomain: string) {
  return (method: string, path: string, body?: any) =>
    fetch(`${ctx.baseUrl}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        "X-Tenant-Subdomain": subdomain,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
}

let asVendedorA1: ReturnType<typeof req>;
let asAdminA: ReturnType<typeof req>;
let asAdminB: ReturnType<typeof req>;

beforeAll(async () => {
  await seed();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(tenantMiddleware);
  ctx.server = await registerRoutes(app);
  await new Promise<void>((resolve) => ctx.server.listen(0, resolve));
  const addr = ctx.server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  ctx.baseUrl = `http://127.0.0.1:${port}`;

  asVendedorA1 = req(await login(ctx.vendedorA1.username, ctx.subA), ctx.subA);
  asAdminA = req(await login(ctx.adminA.username, ctx.subA), ctx.subA);
  asAdminB = req(await login(ctx.adminB.username, ctx.subB), ctx.subB);
});

afterAll(async () => {
  await new Promise<void>((resolve) => ctx.server?.close(() => resolve()));
  await cleanup();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/quotations/:id", () => {
  it("restricted vendedor CAN read their own empresa's quotation", async () => {
    const r = await asVendedorA1("GET", `/api/quotations/${ctx.qA1}`);
    expect(r.status).toBe(200);
    expect((await r.json()).id).toBe(ctx.qA1);
  });
  it("restricted vendedor is BLOCKED (403) from another empresa in same tenant", async () => {
    const r = await asVendedorA1("GET", `/api/quotations/${ctx.qA2}`);
    expect(r.status).toBe(403);
  });
  it("restricted vendedor is BLOCKED (404) from another tenant", async () => {
    const r = await asVendedorA1("GET", `/api/quotations/${ctx.qB1}`);
    expect(r.status).toBe(404);
  });
  it("internal admin sees all empresas within tenant but NOT another tenant (404)", async () => {
    expect((await asAdminA("GET", `/api/quotations/${ctx.qA1}`)).status).toBe(200);
    expect((await asAdminA("GET", `/api/quotations/${ctx.qA2}`)).status).toBe(200);
    expect((await asAdminA("GET", `/api/quotations/${ctx.qB1}`)).status).toBe(404);
    expect((await asAdminB("GET", `/api/quotations/${ctx.qA1}`)).status).toBe(404);
  });
});

describe("PATCH /api/quotations/:id", () => {
  it("restricted vendedor CAN edit their own empresa's owned quotation", async () => {
    const r = await asVendedorA1("PATCH", `/api/quotations/${ctx.qA1}`, { notes: `n-${Date.now()}` });
    expect(r.status).toBe(200);
  });
  it("restricted vendedor is BLOCKED (403) editing another empresa", async () => {
    const r = await asVendedorA1("PATCH", `/api/quotations/${ctx.qA2}`, { notes: "x" });
    expect(r.status).toBe(403);
  });
  it("internal admin is BLOCKED (404) editing another tenant", async () => {
    const r = await asAdminA("PATCH", `/api/quotations/${ctx.qB1}`, { notes: "x" });
    expect(r.status).toBe(404);
  });
  it("empresaId is immutable: PATCH cannot reassign it", async () => {
    const r = await asAdminA("PATCH", `/api/quotations/${ctx.qA1}`, { empresaId: ctx.empresaA2, notes: "keep" });
    expect(r.status).toBe(200);
    const [row] = await db.select({ empresaId: quotations.empresaId }).from(quotations).where(eq(quotations.id, ctx.qA1));
    expect(row.empresaId).toBe(ctx.empresaA1);
  });
});

describe("GET /api/quotations/:id/pdf", () => {
  it("allowed inside empresa (200 PDF)", async () => {
    const r = await asVendedorA1("GET", `/api/quotations/${ctx.qA1}/pdf`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/pdf");
  });
  it("blocked cross-empresa (403)", async () => {
    expect((await asVendedorA1("GET", `/api/quotations/${ctx.qA2}/pdf`)).status).toBe(403);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asVendedorA1("GET", `/api/quotations/${ctx.qB1}/pdf`)).status).toBe(404);
  });
});

describe("POST /api/quotations/:id/send-email (email provider stubbed)", () => {
  it("allowed in-scope: authorized user sends their tenant/empresa's quotation (200)", async () => {
    sendQuotationEmailMock.mockClear();
    const r = await asAdminA("POST", `/api/quotations/${ctx.qA1}/send-email`, { emails: ["cliente@test.local"] });
    expect(r.status).toBe(200);
    expect(sendQuotationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendQuotationEmailMock.mock.calls[0][0].to).toContain("cliente@test.local");
  });
  it("blocked cross-tenant (404) and the email provider is never invoked", async () => {
    sendQuotationEmailMock.mockClear();
    const r = await asAdminA("POST", `/api/quotations/${ctx.qB1}/send-email`, { emails: ["cliente@test.local"] });
    expect(r.status).toBe(404);
    expect(sendQuotationEmailMock).not.toHaveBeenCalled();
  });
  it("restricted vendedor blocked from another empresa (403), provider never invoked", async () => {
    sendQuotationEmailMock.mockClear();
    const r = await asVendedorA1("POST", `/api/quotations/${ctx.qA2}/send-email`, { emails: ["cliente@test.local"] });
    expect(r.status).toBe(403);
    expect(sendQuotationEmailMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/orders/:id/details", () => {
  it("allowed inside empresa (200)", async () => {
    const r = await asVendedorA1("GET", `/api/orders/${ctx.oA1}/details`);
    expect(r.status).toBe(200);
    expect((await r.json()).id).toBe(ctx.oA1);
  });
  it("blocked cross-empresa (403)", async () => {
    expect((await asVendedorA1("GET", `/api/orders/${ctx.oA2}/details`)).status).toBe(403);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asVendedorA1("GET", `/api/orders/${ctx.oB1}/details`)).status).toBe(404);
    expect((await asAdminB("GET", `/api/orders/${ctx.oA1}/details`)).status).toBe(404);
  });
});

describe("GET /api/shipments/:id/remision", () => {
  it("allowed inside empresa (200 PDF)", async () => {
    const r = await asVendedorA1("GET", `/api/shipments/${ctx.sA1}/remision`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/pdf");
  });
  it("blocked cross-empresa (403)", async () => {
    expect((await asVendedorA1("GET", `/api/shipments/${ctx.sA2}/remision`)).status).toBe(403);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asVendedorA1("GET", `/api/shipments/${ctx.sB1}/remision`)).status).toBe(404);
  });
});

describe("GET /api/pipeline (aggregate)", () => {
  it("restricted vendedor only sees their empresa's quotations & credit auths", async () => {
    const data = await (await asVendedorA1("GET", "/api/pipeline")).json();
    const qIds = data.quotations.map((q: any) => q.id);
    const caIds = data.creditAuths.map((c: any) => c.id);
    expect(qIds).toContain(ctx.qA1);
    expect(qIds).not.toContain(ctx.qA2);
    expect(qIds).not.toContain(ctx.qB1);
    expect(caIds).toContain(ctx.caA1);
    expect(caIds).not.toContain(ctx.caA2);
    expect(caIds).not.toContain(ctx.caB1);
  });
  it("internal admin sees all empresas in tenant but nothing cross-tenant", async () => {
    const data = await (await asAdminA("GET", "/api/pipeline")).json();
    const qIds = data.quotations.map((q: any) => q.id);
    expect(qIds).toContain(ctx.qA1);
    expect(qIds).toContain(ctx.qA2);
    expect(qIds).not.toContain(ctx.qB1);
  });
});

describe("GET /api/pipeline/items", () => {
  it("returns the line items for an in-scope quotation (non-empty)", async () => {
    const r = await asVendedorA1("GET", `/api/pipeline/items?type=quotation&id=${ctx.qA1}`);
    expect(r.status).toBe(200);
    const items = await r.json();
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((i: any) => i.id)).toContain(ctx.itemA1);
  });
  it("returns empty array cross-empresa and cross-tenant", async () => {
    expect((await asVendedorA1("GET", `/api/pipeline/items?type=quotation&id=${ctx.qA2}`)).status).toBe(200);
    expect(await (await asVendedorA1("GET", `/api/pipeline/items?type=quotation&id=${ctx.qA2}`)).json()).toEqual([]);
    expect(await (await asVendedorA1("GET", `/api/pipeline/items?type=quotation&id=${ctx.qB1}`)).json()).toEqual([]);
    expect(await (await asVendedorA1("GET", `/api/pipeline/items?type=order&id=${ctx.oB1}`)).json()).toEqual([]);
    expect(await (await asAdminB("GET", `/api/pipeline/items?type=quotation&id=${ctx.qA1}`)).json()).toEqual([]);
  });
});

describe("GET /api/board/orders (aggregate)", () => {
  it("restricted vendedor only sees their empresa's orders", async () => {
    const data = await (await asVendedorA1("GET", "/api/board/orders")).json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(ctx.oA1);
    expect(ids).not.toContain(ctx.oA2);
    expect(ids).not.toContain(ctx.oB1);
  });
  it("internal admin sees all empresas in tenant, nothing cross-tenant", async () => {
    const data = await (await asAdminA("GET", "/api/board/orders")).json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(ctx.oA1);
    expect(ids).toContain(ctx.oA2);
    expect(ids).not.toContain(ctx.oB1);
  });
});

describe("GET /api/reports/orders (aggregate)", () => {
  it("restricted vendedor only sees their empresa's orders", async () => {
    const data = await (await asVendedorA1("GET", "/api/reports/orders?activeOnly=false")).json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(ctx.oA1);
    expect(ids).not.toContain(ctx.oA2);
    expect(ids).not.toContain(ctx.oB1);
  });
  it("internal admin sees all empresas in tenant, nothing cross-tenant", async () => {
    const data = await (await asAdminA("GET", "/api/reports/orders?activeOnly=false")).json();
    const ids = data.map((o: any) => o.id);
    expect(ids).toContain(ctx.oA1);
    expect(ids).toContain(ctx.oA2);
    expect(ids).not.toContain(ctx.oB1);
  });
});

describe("GET /api/customers/:id/summary", () => {
  it("allowed for a customer inside the tenant", async () => {
    expect((await asVendedorA1("GET", `/api/customers/${ctx.customerA}/summary`)).status).toBe(200);
  });
  it("blocked (404) for a customer in another tenant", async () => {
    expect((await asVendedorA1("GET", `/api/customers/${ctx.customerB}/summary`)).status).toBe(404);
    expect((await asAdminB("GET", `/api/customers/${ctx.customerA}/summary`)).status).toBe(404);
  });
});

describe("Immutable empresaId inheritance (storage layer)", () => {
  function fakeReq(user: typeof users.$inferSelect, tenantId: string) {
    return { user, tenant: { id: tenantId, subdomain: "x" }, headers: {} } as any;
  }

  it("order inherits empresaId from its quotation; client-supplied empresaId ignored", async () => {
    const scoped = createTenantScopedStorage(fakeReq(ctx.vendedorA1, ctx.tenantA));
    const order = await scoped.createOrder({ quotationId: ctx.qA1, empresaId: ctx.empresaA2 } as any);
    expect(order.empresaId).toBe(ctx.empresaA1);
    expect(order.tenantId).toBe(ctx.tenantA);
  });

  it("shipment inherits empresaId from its order; client-supplied empresaId ignored", async () => {
    const scoped = createTenantScopedStorage(fakeReq(ctx.adminA, ctx.tenantA));
    const shipment = await scoped.createShipment({ orderId: ctx.oA2, transporter: "T", transportType: "propio", empresaId: ctx.empresaA1 } as any);
    expect(shipment.empresaId).toBe(ctx.empresaA2);
    expect(shipment.tenantId).toBe(ctx.tenantA);
  });

  it("restricted vendedor cannot create an order from a foreign-empresa quotation", async () => {
    const scoped = createTenantScopedStorage(fakeReq(ctx.vendedorA1, ctx.tenantA));
    await expect(scoped.createOrder({ quotationId: ctx.qA2 } as any)).rejects.toThrow();
  });

  it("cannot create an order from a foreign-tenant quotation", async () => {
    const scoped = createTenantScopedStorage(fakeReq(ctx.adminA, ctx.tenantA));
    await expect(scoped.createOrder({ quotationId: ctx.qB1 } as any)).rejects.toThrow();
  });
});
