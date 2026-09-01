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
import { runScheduledVisitReminderScheduler } from "./scheduled-visit-reminder-scheduler";
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
  shipmentProductInstances,
  invoices,
  checkins,
  scheduledVisits,
  creditAuthorizations,
  microsipConfigs,
  UserRole,
  QuotationStatus,
  ScheduledVisitStatus,
} from "@shared/schema";

// Stub the transactional email provider so the send-email happy path can be
// asserted without dispatching a real email. The route imports it dynamically
// (`await import("./quotation-email-service")`), which vi.mock intercepts.
const sendQuotationEmailMock = vi.fn(async () => {});
vi.mock("./quotation-email-service", () => ({
  sendQuotationEmail: (...args: any[]) => sendQuotationEmailMock(...args),
}));

const sendScheduledVisitReminderEmailMock = vi.fn(async () => {});
vi.mock("./scheduled-visit-email-service", () => ({
  sendScheduledVisitReminderEmail: (...args: any[]) => sendScheduledVisitReminderEmailMock(...args),
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
  superadmin: typeof users.$inferSelect;
  qA1: string;
  qA2: string;
  qB1: string;
  productA1: string;
  productB1: string;
  itemA1: string;
  piA1: string;
  piA2: string;
  piB1: string;
  oA1: string;
  oA2: string;
  oB1: string;
  sA1: string;
  sA2: string;
  sB1: string;
  caA1: string;
  caA2: string;
  caB1: string;
  invA1: string;
  invB1: string;
  svA1: string;
  svB1: string;
  createdTenantIds: string[];
};

const ctx = {} as Ctx;

async function insertReturningId(table: any, values: any): Promise<string> {
  const [row] = await db.insert(table).values(values).returning({ id: table.id });
  return row.id;
}

async function seed() {
  const password = await hashPassword("Test-1234");
  ctx.createdTenantIds = [];

  ctx.subA = `${RUN}a`;
  ctx.subB = `${RUN}b`;

  ctx.tenantA = await insertReturningId(tenants, { name: `TenantA ${RUN}`, subdomain: ctx.subA, locale: "en", active: true });
  ctx.tenantB = await insertReturningId(tenants, { name: `TenantB ${RUN}`, subdomain: ctx.subB, locale: "es", active: true });

  await db.insert(microsipConfigs).values({
    tenantId: ctx.tenantA,
    host: `firebird-${RUN}`,
    port: 3050,
    database: `C:\\Microsip\\${RUN}.fdb`,
    cxcDatabase: "",
    username: "SYSDBA",
    password: `secret-${RUN}`,
    enabled: true,
    syncCustomers: true,
    syncProducts: false,
    syncCategories: true,
    syncInvoices: false,
    syncPayments: true,
    masterDataInterval: 180,
    transactionalInterval: 90,
  });

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

  // Platform superadmin: tenantId=null so on the main domain (no req.tenant) they
  // get global cross-tenant access. Verifies the allowGlobal path stays open.
  const [superadmin] = await db.insert(users).values({
    tenantId: null,
    empresaId: null,
    username: `superadmin_${RUN}`,
    password,
    fullName: "Super Admin",
    email: `superadmin_${RUN}@test.local`,
    role: UserRole.ADMIN,
    isSuperAdmin: true,
    active: true,
  }).returning();
  ctx.superadmin = superadmin;

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
  // A tenant-B product so the cross-tenant PATCH /api/products/:id case has a target.
  ctx.productB1 = await insertReturningId(products, {
    tenantId: ctx.tenantB, code: `P-${RUN}-B`, name: `Producto B ${RUN}`, listPrice: "100",
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

  // Product instances (no tenant/empresa column of their own — scoped via parent shipment).
  // piA1 is in-scope for vendedorA1 (empresaA1); piA2 is same tenant, other empresa;
  // piB1 belongs to tenant B. Used by the product-instances PATCH/DELETE write guards.
  ctx.piA1 = await insertReturningId(shipmentProductInstances, {
    shipmentId: ctx.sA1, orderId: ctx.oA1, customerId: ctx.customerA, productId: ctx.productA1,
    serialNumber: `SN-${RUN}-A1`,
  });
  ctx.piA2 = await insertReturningId(shipmentProductInstances, {
    shipmentId: ctx.sA2, orderId: ctx.oA2, customerId: ctx.customerA, productId: ctx.productA1,
    serialNumber: `SN-${RUN}-A2`,
  });
  ctx.piB1 = await insertReturningId(shipmentProductInstances, {
    shipmentId: ctx.sB1, orderId: ctx.oB1, customerId: ctx.customerB, productId: ctx.productB1,
    serialNumber: `SN-${RUN}-B1`,
  });

  ctx.caA1 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qA1, userId: ctx.vendedorA1.id });
  ctx.caA2 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qA2, userId: ctx.adminA.id });
  ctx.caB1 = await insertReturningId(creditAuthorizations, { quotationId: ctx.qB1, userId: ctx.adminB.id });

  // Invoices (tenant-scoped only; no empresa column). Cross-tenant by-id read must 404.
  ctx.invA1 = await insertReturningId(invoices, {
    tenantId: ctx.tenantA, orderId: ctx.oA1, customerId: ctx.customerA,
    serie: "A", folio: `INV-${RUN}-A1`, subtotal: "200", tax: "32", total: "232",
  });
  ctx.invB1 = await insertReturningId(invoices, {
    tenantId: ctx.tenantB, orderId: ctx.oB1, customerId: ctx.customerB,
    serie: "B", folio: `INV-${RUN}-B1`, subtotal: "100", tax: "16", total: "116",
  });

  // Scheduled visits (tenant-scoped only). Cross-tenant by-id read must 404.
  ctx.svA1 = await insertReturningId(scheduledVisits, {
    tenantId: ctx.tenantA, userId: ctx.vendedorA1.id, customerId: ctx.customerA,
    scheduledDate: new Date(),
  });
  ctx.svB1 = await insertReturningId(scheduledVisits, {
    tenantId: ctx.tenantB, userId: ctx.adminB.id, customerId: ctx.customerB,
    scheduledDate: new Date(),
  });
}

async function cleanup() {
  const tIds = [ctx.tenantA, ctx.tenantB, ...(ctx.createdTenantIds || [])].filter(Boolean);
  if (tIds.length === 0) return;
  const qs = await db.select({ id: quotations.id }).from(quotations).where(inArray(quotations.tenantId, tIds));
  const qIds = qs.map((q) => q.id);
  if (qIds.length) await db.delete(creditAuthorizations).where(inArray(creditAuthorizations.quotationId, qIds));
  await db.delete(checkins).where(inArray(checkins.tenantId, tIds));
  await db.delete(scheduledVisits).where(inArray(scheduledVisits.tenantId, tIds));
  await db.delete(invoices).where(inArray(invoices.tenantId, tIds));
  const shs = await db.select({ id: shipments.id }).from(shipments).where(inArray(shipments.tenantId, tIds));
  const shIds = shs.map((s) => s.id);
  if (shIds.length) await db.delete(shipmentProductInstances).where(inArray(shipmentProductInstances.shipmentId, shIds));
  await db.delete(shipments).where(inArray(shipments.tenantId, tIds));
  await db.delete(orders).where(inArray(orders.tenantId, tIds));
  await db.delete(quotations).where(inArray(quotations.tenantId, tIds));
  await db.delete(products).where(inArray(products.tenantId, tIds));
  await db.delete(customers).where(inArray(customers.tenantId, tIds));
  await db.delete(microsipConfigs).where(inArray(microsipConfigs.tenantId, tIds));
  await db.delete(users).where(inArray(users.tenantId, tIds));
  if (ctx.superadmin?.id) await db.delete(users).where(eq(users.id, ctx.superadmin.id));
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

// Simulates a superadmin on the platform MAIN domain (nexxo.com.mx). Setting
// X-Forwarded-Host to the bare base domain makes tenantMiddleware skip resolving a
// subdomain (req.tenant stays undefined), which is what grants the superadmin
// allowGlobal (cross-tenant) access. No X-Tenant-Subdomain header is sent.
const MAIN_DOMAIN = "nexxo.com.mx";

async function loginMainDomain(username: string): Promise<string> {
  const res = await fetch(`${ctx.baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-Host": MAIN_DOMAIN },
    body: JSON.stringify({ username, password: "Test-1234" }),
  });
  if (res.status !== 200) {
    throw new Error(`main-domain login failed for ${username}: ${res.status} ${await res.text()}`);
  }
  const setCookies = (res.headers as any).getSetCookie?.() ?? [res.headers.get("set-cookie")];
  const sid = setCookies
    .map((c: string) => c?.split(";")[0])
    .find((c: string) => c?.startsWith("connect.sid="));
  if (!sid) throw new Error(`no session cookie returned for ${username}`);
  return sid;
}

function reqMainDomain(cookie: string) {
  return (method: string, path: string, body?: any) =>
    fetch(`${ctx.baseUrl}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        "X-Forwarded-Host": MAIN_DOMAIN,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
}

let asVendedorA1: ReturnType<typeof req>;
let asAdminA: ReturnType<typeof req>;
let asAdminB: ReturnType<typeof req>;
let asSuperadmin: ReturnType<typeof reqMainDomain>;

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
  asSuperadmin = reqMainDomain(await loginMainDomain(ctx.superadmin.username));
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

describe("locale-specific quotation defaults", () => {
  const quotationPayload = (customerId: string, unitOfMeasure = "BOX") => ({
    customerId,
    items: [{
      productName: `Locale item ${RUN}`,
      unitOfMeasure,
      quantity: "1",
      listPrice: "100",
      unitPrice: "100",
      subtotal: "100",
      total: "100",
      position: 0,
    }],
  });

  it("uses USA defaults when omitted and persists a manually entered sales-tax rate", async () => {
    const defaultsResponse = await asAdminA("POST", "/api/quotations", quotationPayload(ctx.customerA));
    expect(defaultsResponse.status).toBe(201);
    const defaultsQuotation = await defaultsResponse.json();
    const [defaultsRow] = await db.select({
      currency: quotations.currency,
      taxRate: quotations.taxRate,
      requiresPallet: quotations.requiresPallet,
    }).from(quotations).where(eq(quotations.id, defaultsQuotation.id));
    expect(defaultsRow).toMatchObject({ currency: "USD", taxRate: "0.00", requiresPallet: true });

    const manualResponse = await asAdminA("POST", "/api/quotations", {
      ...quotationPayload(ctx.customerA),
      taxRate: "7.25",
    });
    expect(manualResponse.status).toBe(201);
    const manualQuotation = await manualResponse.json();
    const [manualRow] = await db.select({
      taxRate: quotations.taxRate,
      tax: quotations.tax,
      total: quotations.total,
    }).from(quotations).where(eq(quotations.id, manualQuotation.id));
    const [manualItem] = await db.select({
      taxRate: quotationItems.taxRate,
      taxAmount: quotationItems.taxAmount,
      total: quotationItems.total,
    }).from(quotationItems).where(eq(quotationItems.quotationId, manualQuotation.id));
    expect(manualRow).toMatchObject({ taxRate: "7.25", tax: "7.25", total: "107.25" });
    expect(manualItem).toMatchObject({ taxRate: "7.25", taxAmount: "7.25", total: "107.25" });

    const updateResponse = await asAdminA("PATCH", `/api/quotations/${manualQuotation.id}`, {
      taxRate: "8.5",
    });
    expect(updateResponse.status).toBe(200);
    const [updatedRow] = await db.select({
      taxRate: quotations.taxRate,
      tax: quotations.tax,
      total: quotations.total,
    }).from(quotations).where(eq(quotations.id, manualQuotation.id));
    const [updatedItem] = await db.select({
      taxRate: quotationItems.taxRate,
      taxAmount: quotationItems.taxAmount,
      total: quotationItems.total,
    }).from(quotationItems).where(eq(quotationItems.quotationId, manualQuotation.id));
    expect(updatedRow).toMatchObject({ taxRate: "8.50", tax: "8.50", total: "108.50" });
    expect(updatedItem).toMatchObject({ taxRate: "8.50", taxAmount: "8.50", total: "108.50" });
  });

  it("rejects an English-tenant sales-tax rate outside the allowed range", async () => {
    const response = await asAdminA("POST", "/api/quotations", {
      ...quotationPayload(ctx.customerA),
      taxRate: 100.01,
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("Sales tax rate must be between 0 and 100");
  });

  it("returns validation feedback instead of a server error for an invalid USA tax update", async () => {
    const createResponse = await asAdminA("POST", "/api/quotations", quotationPayload(ctx.customerA));
    expect(createResponse.status).toBe(201);
    const quotation = await createResponse.json();

    const response = await asAdminA("PATCH", `/api/quotations/${quotation.id}`, { taxRate: "7.255" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("at most two decimal places");
  });

  it("leaves Mexican quotation defaults and an explicitly supplied item unit unchanged", async () => {
    const response = await asAdminB("POST", "/api/quotations", quotationPayload(ctx.customerB, "Caja"));
    expect(response.status).toBe(201);
    const quotation = await response.json();
    const [quotationRow] = await db.select({
      currency: quotations.currency,
      taxRate: quotations.taxRate,
      requiresPallet: quotations.requiresPallet,
    }).from(quotations).where(eq(quotations.id, quotation.id));
    const [item] = await db.select({
      unitOfMeasure: quotationItems.unitOfMeasure,
    }).from(quotationItems).where(eq(quotationItems.quotationId, quotation.id));
    expect(quotationRow).toMatchObject({ currency: "MXN", taxRate: "16.00", requiresPallet: false });
    expect(item.unitOfMeasure).toBe("Caja");
  });
});

describe("DELETE /api/quotations/:id", () => {
  it("blocks a tenant admin from deleting another tenant's quotation and leaves its records intact", async () => {
    const response = await asAdminA("DELETE", `/api/quotations/${ctx.qB1}`);
    expect(response.status).toBe(404);

    const [quotation] = await db.select({ id: quotations.id }).from(quotations).where(eq(quotations.id, ctx.qB1));
    const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, ctx.oB1));
    expect(quotation?.id).toBe(ctx.qB1);
    expect(order?.id).toBe(ctx.oB1);
  });

  it("blocks a restricted user from deleting another empresa's quotation and leaves it intact", async () => {
    const response = await asVendedorA1("DELETE", `/api/quotations/${ctx.qA2}`);
    expect(response.status).toBe(403);

    const [quotation] = await db.select({ id: quotations.id }).from(quotations).where(eq(quotations.id, ctx.qA2));
    const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, ctx.oA2));
    expect(quotation?.id).toBe(ctx.qA2);
    expect(order?.id).toBe(ctx.oA2);
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

describe("GET /api/invoices/:id (tenant-scoped by-id)", () => {
  it("allowed inside tenant (200)", async () => {
    const r = await asAdminA("GET", `/api/invoices/${ctx.invA1}`);
    expect(r.status).toBe(200);
    expect((await r.json()).id).toBe(ctx.invA1);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asAdminA("GET", `/api/invoices/${ctx.invB1}`)).status).toBe(404);
    expect((await asAdminB("GET", `/api/invoices/${ctx.invA1}`)).status).toBe(404);
    expect((await asVendedorA1("GET", `/api/invoices/${ctx.invB1}`)).status).toBe(404);
  });
  it("PDF blocked cross-tenant (404)", async () => {
    expect((await asAdminA("GET", `/api/invoices/${ctx.invB1}/pdf`)).status).toBe(404);
  });
});

describe("GET /api/scheduled-visits/:id (tenant-scoped by-id)", () => {
  it("allowed inside tenant (200)", async () => {
    const r = await asVendedorA1("GET", `/api/scheduled-visits/${ctx.svA1}`);
    expect(r.status).toBe(200);
    expect((await r.json()).id).toBe(ctx.svA1);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asVendedorA1("GET", `/api/scheduled-visits/${ctx.svB1}`)).status).toBe(404);
    expect((await asAdminB("GET", `/api/scheduled-visits/${ctx.svA1}`)).status).toBe(404);
  });
});

describe("Scheduled visit email reminders", () => {
  it("lets the seller configure a one-hour reminder and sends it once when due", async () => {
    sendScheduledVisitReminderEmailMock.mockClear();
    const scheduledDate = new Date(Date.now() + 30 * 60 * 1000);
    const response = await asVendedorA1("POST", "/api/scheduled-visits", {
      customerId: ctx.customerA,
      meetingType: "visita",
      scheduledDate: scheduledDate.toISOString(),
      topics: ["Seguimiento"],
      notes: "Llevar cotización",
      reminderMinutes: 60,
    });
    expect(response.status).toBe(201);
    const visit = await response.json();
    expect(visit.reminderMinutes).toBe(60);

    await runScheduledVisitReminderScheduler();
    await runScheduledVisitReminderScheduler();

    expect(sendScheduledVisitReminderEmailMock).toHaveBeenCalledTimes(1);
    expect(sendScheduledVisitReminderEmailMock.mock.calls[0][0]).toBe(ctx.vendedorA1.email);
    expect(sendScheduledVisitReminderEmailMock.mock.calls[0][1].customerName).toContain("CustA");

    const [storedVisit] = await db
      .select({ reminderSentAt: scheduledVisits.reminderSentAt })
      .from(scheduledVisits)
      .where(eq(scheduledVisits.id, visit.id));
    expect(storedVisit.reminderSentAt).toBeInstanceOf(Date);
  });

  it("rejects unsupported reminder intervals", async () => {
    const response = await asVendedorA1("POST", "/api/scheduled-visits", {
      customerId: ctx.customerA,
      scheduledDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      reminderMinutes: 15,
    });
    expect(response.status).toBe(400);
  });

  it("does not send or retry a reminder when the assigned user opted out", async () => {
    sendScheduledVisitReminderEmailMock.mockClear();
    await db.update(users)
      .set({ receiveEmailNotifications: false })
      .where(eq(users.id, ctx.vendedorA1.id));

    const response = await asVendedorA1("POST", "/api/scheduled-visits", {
      customerId: ctx.customerA,
      meetingType: "visita",
      scheduledDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      reminderMinutes: 60,
    });
    expect(response.status).toBe(201);
    const visit = await response.json();

    try {
      await runScheduledVisitReminderScheduler();
      await runScheduledVisitReminderScheduler();

      expect(sendScheduledVisitReminderEmailMock).not.toHaveBeenCalled();
      const [storedVisit] = await db
        .select({ reminderSentAt: scheduledVisits.reminderSentAt })
        .from(scheduledVisits)
        .where(eq(scheduledVisits.id, visit.id));
      expect(storedVisit.reminderSentAt).toBeInstanceOf(Date);
    } finally {
      await db.update(users)
        .set({ receiveEmailNotifications: true })
        .where(eq(users.id, ctx.vendedorA1.id));
    }
  });
});

describe("GET /api/checkins/:id/email-recipients", () => {
  it("includes only opted-in admins from the check-in tenant", async () => {
    const checkinId = await insertReturningId(checkins, {
      tenantId: ctx.tenantA,
      userId: ctx.vendedorA1.id,
      customerId: ctx.customerA,
    });

    const initial = await asVendedorA1("GET", `/api/checkins/${checkinId}/email-recipients`);
    expect(initial.status).toBe(200);
    const initialEmails = (await initial.json()).recipients.map((recipient: any) => recipient.email);
    expect(initialEmails).toContain(ctx.adminA.email);
    expect(initialEmails).not.toContain(ctx.adminB.email);

    await db.update(users)
      .set({ receiveEmailNotifications: false })
      .where(eq(users.id, ctx.adminA.id));

    try {
      const optedOut = await asVendedorA1("GET", `/api/checkins/${checkinId}/email-recipients`);
      expect(optedOut.status).toBe(200);
      const optedOutEmails = (await optedOut.json()).recipients.map((recipient: any) => recipient.email);
      expect(optedOutEmails).not.toContain(ctx.adminA.email);
      expect(optedOutEmails).not.toContain(ctx.adminB.email);
    } finally {
      await db.update(users)
        .set({ receiveEmailNotifications: true })
        .where(eq(users.id, ctx.adminA.id));
    }
  });
});

describe("GET /api/products/:id (tenant-scoped by-id)", () => {
  it("allowed inside tenant (200)", async () => {
    const r = await asVendedorA1("GET", `/api/products/${ctx.productA1}`);
    expect(r.status).toBe(200);
    expect((await r.json()).id).toBe(ctx.productA1);
  });
  it("blocked cross-tenant (404)", async () => {
    expect((await asAdminB("GET", `/api/products/${ctx.productA1}`)).status).toBe(404);
  });
});

// ── Write-path (PATCH/DELETE) isolation ──────────────────────────────────────
// These prove a cross-company user cannot MODIFY or DELETE another company's
// records by direct ID — the higher-risk surface. Every negative case also
// re-reads the row straight from the DB to confirm it was left unchanged.

describe("PATCH /api/invoices/:id (write guard, tenant-scoped)", () => {
  it("allowed inside tenant (200) and persists the change", async () => {
    const note = `note-${Date.now()}`;
    const r = await asAdminA("PATCH", `/api/invoices/${ctx.invA1}`, { notes: note });
    expect(r.status).toBe(200);
    const [row] = await db.select({ notes: invoices.notes }).from(invoices).where(eq(invoices.id, ctx.invA1));
    expect(row.notes).toBe(note);
  });
  it("blocked cross-tenant (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ notes: invoices.notes }).from(invoices).where(eq(invoices.id, ctx.invB1));
    expect((await asAdminA("PATCH", `/api/invoices/${ctx.invB1}`, { notes: "hacked" })).status).toBe(404);
    expect((await asVendedorA1("PATCH", `/api/invoices/${ctx.invB1}`, { notes: "hacked" })).status).toBe(404);
    const [after] = await db.select({ notes: invoices.notes }).from(invoices).where(eq(invoices.id, ctx.invB1));
    expect(after.notes).toBe(before.notes);
  });
});

describe("PATCH /api/accounts-receivable/:id (write guard, tenant-scoped)", () => {
  it("blocked cross-tenant (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ notes: invoices.notes }).from(invoices).where(eq(invoices.id, ctx.invB1));
    expect((await asAdminA("PATCH", `/api/accounts-receivable/${ctx.invB1}`, { notes: "hacked" })).status).toBe(404);
    const [after] = await db.select({ notes: invoices.notes }).from(invoices).where(eq(invoices.id, ctx.invB1));
    expect(after.notes).toBe(before.notes);
  });
});

describe("PATCH /api/products/:id (write guard, tenant-scoped)", () => {
  it("blocked cross-tenant (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ name: products.name }).from(products).where(eq(products.id, ctx.productB1));
    expect((await asAdminA("PATCH", `/api/products/${ctx.productB1}`, { name: "hacked" })).status).toBe(404);
    const [after] = await db.select({ name: products.name }).from(products).where(eq(products.id, ctx.productB1));
    expect(after.name).toBe(before.name);
  });
});

describe("PATCH/DELETE /api/scheduled-visits/:id (write guard, tenant-scoped)", () => {
  it("PATCH blocked cross-tenant (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ notes: scheduledVisits.notes }).from(scheduledVisits).where(eq(scheduledVisits.id, ctx.svB1));
    expect((await asVendedorA1("PATCH", `/api/scheduled-visits/${ctx.svB1}`, { notes: "hacked" })).status).toBe(404);
    expect((await asAdminA("PATCH", `/api/scheduled-visits/${ctx.svB1}`, { notes: "hacked" })).status).toBe(404);
    const [after] = await db.select({ notes: scheduledVisits.notes }).from(scheduledVisits).where(eq(scheduledVisits.id, ctx.svB1));
    expect(after.notes).toBe(before.notes);
  });
  it("DELETE (cancel) blocked cross-tenant (404) and does NOT cancel the visit", async () => {
    const [before] = await db.select({ status: scheduledVisits.status }).from(scheduledVisits).where(eq(scheduledVisits.id, ctx.svB1));
    expect((await asVendedorA1("DELETE", `/api/scheduled-visits/${ctx.svB1}`)).status).toBe(404);
    expect((await asAdminA("DELETE", `/api/scheduled-visits/${ctx.svB1}`)).status).toBe(404);
    const [after] = await db.select({ status: scheduledVisits.status }).from(scheduledVisits).where(eq(scheduledVisits.id, ctx.svB1));
    expect(after.status).toBe(before.status);
    expect(after.status).not.toBe(ScheduledVisitStatus.CANCELLED);
  });
});

describe("PATCH/DELETE /api/product-instances/:id (write guard, tenant + empresa via shipment)", () => {
  it("PATCH allowed in-scope (200) and persists the change", async () => {
    const note = `note-${Date.now()}`;
    const r = await asVendedorA1("PATCH", `/api/product-instances/${ctx.piA1}`, { notes: note });
    expect(r.status).toBe(200);
    const [row] = await db.select({ notes: shipmentProductInstances.notes }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piA1));
    expect(row.notes).toBe(note);
  });
  it("PATCH blocked cross-empresa (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ notes: shipmentProductInstances.notes }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piA2));
    expect((await asVendedorA1("PATCH", `/api/product-instances/${ctx.piA2}`, { notes: "hacked" })).status).toBe(404);
    const [after] = await db.select({ notes: shipmentProductInstances.notes }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piA2));
    expect(after.notes).toBe(before.notes);
  });
  it("PATCH blocked cross-tenant (404) and leaves the record unchanged", async () => {
    const [before] = await db.select({ notes: shipmentProductInstances.notes }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piB1));
    expect((await asAdminA("PATCH", `/api/product-instances/${ctx.piB1}`, { notes: "hacked" })).status).toBe(404);
    const [after] = await db.select({ notes: shipmentProductInstances.notes }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piB1));
    expect(after.notes).toBe(before.notes);
  });
  it("DELETE blocked cross-tenant (404) and the record still exists", async () => {
    expect((await asAdminA("DELETE", `/api/product-instances/${ctx.piB1}`)).status).toBe(404);
    const rows = await db.select({ id: shipmentProductInstances.id }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piB1));
    expect(rows.length).toBe(1);
  });
  it("DELETE blocked cross-empresa (404) and the record still exists", async () => {
    expect((await asVendedorA1("DELETE", `/api/product-instances/${ctx.piA2}`)).status).toBe(404);
    const rows = await db.select({ id: shipmentProductInstances.id }).from(shipmentProductInstances).where(eq(shipmentProductInstances.id, ctx.piA2));
    expect(rows.length).toBe(1);
  });
});

describe("SuperAdmin on main domain keeps global cross-tenant access", () => {
  it("reads quotations from BOTH tenants by id (200)", async () => {
    expect((await asSuperadmin("GET", `/api/quotations/${ctx.qA1}`)).status).toBe(200);
    expect((await asSuperadmin("GET", `/api/quotations/${ctx.qA2}`)).status).toBe(200);
    expect((await asSuperadmin("GET", `/api/quotations/${ctx.qB1}`)).status).toBe(200);
  });
  it("reads invoices from BOTH tenants by id (200)", async () => {
    expect((await asSuperadmin("GET", `/api/invoices/${ctx.invA1}`)).status).toBe(200);
    expect((await asSuperadmin("GET", `/api/invoices/${ctx.invB1}`)).status).toBe(200);
  });
  it("reads products from any tenant by id (200)", async () => {
    expect((await asSuperadmin("GET", `/api/products/${ctx.productA1}`)).status).toBe(200);
  });
  it("pipeline aggregate spans all tenants", async () => {
    const data = await (await asSuperadmin("GET", "/api/pipeline")).json();
    const qIds = data.quotations.map((q: any) => q.id);
    expect(qIds).toContain(ctx.qA1);
    expect(qIds).toContain(ctx.qB1);
  });
});

describe("Microsip configuration for new child companies", () => {
  it("copies the parent's connection and sync preferences as an independent disabled configuration", async () => {
    const response = await asSuperadmin("POST", "/api/tenants", {
      name: `Child Microsip ${RUN}`,
      subdomain: `child-ms-${RUN}`,
      parentId: ctx.tenantA,
      inheritMicrosip: true,
      active: true,
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    ctx.createdTenantIds.push(body.id);
    expect(body.microsipConfigInherited).toBe(true);
    expect(JSON.stringify(body)).not.toContain(`secret-${RUN}`);

    const [parentConfig] = await db
      .select()
      .from(microsipConfigs)
      .where(eq(microsipConfigs.tenantId, ctx.tenantA));
    const [childConfig] = await db
      .select()
      .from(microsipConfigs)
      .where(eq(microsipConfigs.tenantId, body.id));

    expect(childConfig.id).not.toBe(parentConfig.id);
    expect(childConfig.tenantId).toBe(body.id);
    expect(childConfig.inheritedFromTenantId).toBe(ctx.tenantA);
    expect(childConfig.host).toBe(parentConfig.host);
    expect(childConfig.password).toBe(parentConfig.password);
    expect(childConfig.syncProducts).toBe(parentConfig.syncProducts);
    expect(childConfig.masterDataInterval).toBe(parentConfig.masterDataInterval);
    expect(childConfig.enabled).toBe(false);
    expect(childConfig.lastCustomerSync).toBeNull();
    expect(childConfig.lastSyncStatus).toBeNull();
    expect(childConfig.lastSyncError).toBeNull();

    await db
      .update(microsipConfigs)
      .set({ host: `child-only-${RUN}` })
      .where(eq(microsipConfigs.tenantId, body.id));
    const [unchangedParent] = await db
      .select({ host: microsipConfigs.host })
      .from(microsipConfigs)
      .where(eq(microsipConfigs.tenantId, ctx.tenantA));
    expect(unchangedParent.host).toBe(parentConfig.host);
  });

  it("creates the child without Microsip configuration when the parent has none", async () => {
    const response = await asSuperadmin("POST", "/api/tenants", {
      name: `Child Manual Microsip ${RUN}`,
      subdomain: `child-manual-ms-${RUN}`,
      parentId: ctx.tenantB,
      inheritMicrosip: true,
      active: true,
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    ctx.createdTenantIds.push(body.id);
    expect(body.microsipConfigInherited).toBe(false);

    const childConfigs = await db
      .select({ id: microsipConfigs.id })
      .from(microsipConfigs)
      .where(eq(microsipConfigs.tenantId, body.id));
    expect(childConfigs).toHaveLength(0);
  });

  it("does not allow a regular tenant admin to create companies", async () => {
    const response = await asAdminA("POST", "/api/tenants", {
      name: `Forbidden Child ${RUN}`,
      subdomain: `forbidden-child-${RUN}`,
      parentId: ctx.tenantA,
      inheritMicrosip: true,
    });
    expect(response.status).toBe(403);
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
