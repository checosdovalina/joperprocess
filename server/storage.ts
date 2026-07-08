import {
  users,
  customers,
  customerLocations,
  checkins,
  scheduledVisits,
  quotations,
  quotationItems,
  creditAuthorizations,
  orders,
  orderReleases,
  shipments,
  invoices,
  payments,
  products,
  productCategories,
  customerProductPrices,
  documents,
  incidents,
  empresas,
  UserRole,
  type Empresa,
  type InsertEmpresa,
  type User,
  type ScheduledVisit,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type CustomerLocation,
  type InsertCustomerLocation,
  type Checkin,
  type InsertCheckin,
  type UpdateCheckin,
  type Quotation,
  type InsertQuotation,
  type QuotationItem,
  type InsertQuotationItem,
  type CreditAuthorization,
  type InsertCreditAuthorization,
  type Order,
  type InsertOrder,
  type OrderRelease,
  type InsertOrderRelease,
  type Shipment,
  type InsertShipment,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
  type Product,
  type InsertProduct,
  type UpdateProduct,
  type ProductCategory,
  type InsertProductCategory,
  type CustomerProductPrice,
  type InsertCustomerProductPrice,
  type Document,
  type InsertDocument,
  type Incident,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, asc, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string, tenantId?: string | null): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Empresas (marcas comerciales dentro de un tenant)
  getEmpresa(id: string): Promise<Empresa | undefined>;
  getAllEmpresas(): Promise<Empresa[]>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  updateEmpresa(id: string, data: Partial<InsertEmpresa>): Promise<Empresa | undefined>;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Customer Locations
  getCustomerLocation(id: string): Promise<CustomerLocation | undefined>;
  getAllCustomerLocations(): Promise<CustomerLocation[]>;
  getCustomerLocationsByCustomerId(customerId: string): Promise<CustomerLocation[]>;
  createCustomerLocation(location: InsertCustomerLocation): Promise<CustomerLocation>;
  updateCustomerLocation(id: string, data: Partial<InsertCustomerLocation>): Promise<CustomerLocation | undefined>;

  // Check-ins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getAllCheckins(): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  updateCheckin(id: string, data: UpdateCheckin): Promise<Checkin | undefined>;

  // Quotations
  getQuotation(id: string): Promise<Quotation | undefined>;
  getAllQuotations(): Promise<(Quotation & { customer?: { id: string; name: string; rfc?: string | null; email?: string | null } })[]>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, data: Partial<InsertQuotation>): Promise<Quotation | undefined>;

  // Quotation Items
  getQuotationItems(quotationId: string): Promise<QuotationItem[]>;
  createQuotationItem(item: InsertQuotationItem): Promise<QuotationItem>;
  deleteQuotationItem(id: string): Promise<void>;

  // Credit Authorizations
  getCreditAuthorization(id: string): Promise<CreditAuthorization | undefined>;
  getAllCreditAuthorizations(): Promise<CreditAuthorization[]>;
  createCreditAuthorization(auth: InsertCreditAuthorization): Promise<CreditAuthorization>;
  updateCreditAuthorization(id: string, data: Partial<InsertCreditAuthorization>): Promise<CreditAuthorization | undefined>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;

  // Order Releases
  getOrderReleases(orderId: string): Promise<OrderRelease[]>;
  createOrderRelease(release: InsertOrderRelease): Promise<OrderRelease>;

  // Shipments
  getShipment(id: string): Promise<Shipment | undefined>;
  getAllShipments(): Promise<Shipment[]>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, data: Partial<InsertShipment>): Promise<Shipment | undefined>;

  // Invoices / Accounts Receivable
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  getPendingInvoicesByCustomer(customerId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  getPaymentsByCustomer(customerId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Product Categories
  getProductCategory(id: string): Promise<ProductCategory | undefined>;
  getAllProductCategories(): Promise<ProductCategory[]>;
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  updateProductCategory(id: string, data: Partial<InsertProductCategory>): Promise<ProductCategory | undefined>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: UpdateProduct): Promise<Product | undefined>;

  // Customer Product Prices
  getCustomerProductPrice(customerId: string, productId: string): Promise<CustomerProductPrice | undefined>;
  getCustomerProductPrices(customerId: string): Promise<CustomerProductPrice[]>;
  createCustomerProductPrice(price: InsertCustomerProductPrice): Promise<CustomerProductPrice>;

  // Documents
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument & { tenantId: string; uploadedBy?: string | null }): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string, tenantId?: string | null): Promise<User | undefined> {
    const conditions = [eq(users.username, username)];
    if (tenantId !== undefined) {
      conditions.push(tenantId ? eq(users.tenantId, tenantId) : isNull(users.tenantId));
    }
    const [user] = await db.select().from(users).where(and(...conditions));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Empresas
  async getEmpresa(id: string): Promise<Empresa | undefined> {
    const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id));
    return empresa || undefined;
  }

  async getAllEmpresas(): Promise<Empresa[]> {
    return await db.select().from(empresas).orderBy(empresas.name);
  }

  async createEmpresa(insertEmpresa: InsertEmpresa): Promise<Empresa> {
    const [empresa] = await db.insert(empresas).values(insertEmpresa).returning();
    return empresa;
  }

  async updateEmpresa(id: string, data: Partial<InsertEmpresa>): Promise<Empresa | undefined> {
    const [empresa] = await db.update(empresas).set({ ...data, updatedAt: new Date() }).where(eq(empresas.id, id)).returning();
    return empresa || undefined;
  }

  // Customers
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return customer || undefined;
  }

  // Customer Locations
  async getCustomerLocation(id: string): Promise<CustomerLocation | undefined> {
    const [location] = await db.select().from(customerLocations).where(eq(customerLocations.id, id));
    return location || undefined;
  }

  async getAllCustomerLocations(): Promise<CustomerLocation[]> {
    return await db.select().from(customerLocations).orderBy(desc(customerLocations.createdAt));
  }

  async getCustomerLocationsByCustomerId(customerId: string): Promise<CustomerLocation[]> {
    return await db.select().from(customerLocations).where(eq(customerLocations.customerId, customerId));
  }

  async createCustomerLocation(insertLocation: InsertCustomerLocation): Promise<CustomerLocation> {
    const [location] = await db.insert(customerLocations).values(insertLocation).returning();
    return location;
  }

  async updateCustomerLocation(id: string, data: Partial<InsertCustomerLocation>): Promise<CustomerLocation | undefined> {
    const [location] = await db.update(customerLocations).set(data).where(eq(customerLocations.id, id)).returning();
    return location || undefined;
  }

  // Check-ins
  async getCheckin(id: string): Promise<Checkin | undefined> {
    const [checkin] = await db.select().from(checkins).where(eq(checkins.id, id));
    return checkin || undefined;
  }

  async getAllCheckins(): Promise<Checkin[]> {
    return await db.select().from(checkins).orderBy(desc(checkins.checkinAt));
  }

  async createCheckin(insertCheckin: InsertCheckin): Promise<Checkin> {
    const [checkin] = await db.insert(checkins).values(insertCheckin).returning();
    return checkin;
  }

  async updateCheckin(id: string, data: UpdateCheckin): Promise<Checkin | undefined> {
    const [checkin] = await db.update(checkins).set(data).where(eq(checkins.id, id)).returning();
    return checkin || undefined;
  }

  // Quotations
  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async getAllQuotations(): Promise<(Quotation & { customer?: { id: string; name: string; rfc?: string | null; email?: string | null } })[]> {
    const results = await db.select({
      quotation: quotations,
      customer: {
        id: customers.id,
        name: customers.name,
        rfc: customers.rfc,
        email: customers.email,
      }
    })
    .from(quotations)
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .orderBy(desc(quotations.createdAt));
    
    return results.map(r => ({
      ...r.quotation,
      customer: r.customer || undefined
    }));
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    const FOREIGN_RFC = 'XEXX010101000';
    let countryPrefix = 'COT';

    if (insertQuotation.customerId) {
      const customer = await this.getCustomer(insertQuotation.customerId);
      if (customer) {
        if (customer.rfc === FOREIGN_RFC) {
          countryPrefix = 'EXT';
        } else if (customer.country) {
          const countryPrefixes: Record<string, string> = {
            'México': 'MEX',
            'Mexico': 'MEX',
            'MX': 'MEX',
            'Estados Unidos': 'USA',
            'United States': 'USA',
            'US': 'USA',
            'USA': 'USA',
            'Canadá': 'CAN',
            'Canada': 'CAN',
            'CA': 'CAN',
            'Guatemala': 'GTM',
            'GT': 'GTM',
            'Colombia': 'COL',
            'CO': 'COL',
            'Brasil': 'BRA',
            'Brazil': 'BRA',
            'BR': 'BRA',
            'Argentina': 'ARG',
            'AR': 'ARG',
            'Chile': 'CHL',
            'CL': 'CHL',
            'Perú': 'PER',
            'Peru': 'PER',
            'PE': 'PER',
            'España': 'ESP',
            'Spain': 'ESP',
            'ES': 'ESP',
          };
          countryPrefix = countryPrefixes[customer.country] || customer.country.substring(0, 3).toUpperCase();
        }
      }
    }
    
    // Generate folio with country prefix
    const folioNumber = Date.now().toString().slice(-6);
    const folio = `${countryPrefix}-${folioNumber}`;
    
    const [quotation] = await db
      .insert(quotations)
      .values({ ...insertQuotation, folio })
      .returning();
    return quotation;
  }

  async updateQuotation(id: string, data: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const [quotation] = await db.update(quotations).set(data).where(eq(quotations.id, id)).returning();
    return quotation || undefined;
  }

  // Quotation Items
  async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    return await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  }

  async createQuotationItem(insertItem: InsertQuotationItem): Promise<QuotationItem> {
    const [item] = await db.insert(quotationItems).values(insertItem).returning();
    return item;
  }

  async deleteQuotationItem(id: string): Promise<void> {
    await db.delete(quotationItems).where(eq(quotationItems.id, id));
  }

  // Credit Authorizations
  async getCreditAuthorization(id: string): Promise<CreditAuthorization | undefined> {
    const [auth] = await db.select().from(creditAuthorizations).where(eq(creditAuthorizations.id, id));
    return auth || undefined;
  }

  async getAllCreditAuthorizations(): Promise<CreditAuthorization[]> {
    return await db.select().from(creditAuthorizations).orderBy(desc(creditAuthorizations.createdAt));
  }

  async createCreditAuthorization(insertAuth: InsertCreditAuthorization): Promise<CreditAuthorization> {
    const [auth] = await db.insert(creditAuthorizations).values(insertAuth).returning();
    return auth;
  }

  async updateCreditAuthorization(id: string, data: Partial<InsertCreditAuthorization>): Promise<CreditAuthorization | undefined> {
    const [auth] = await db.update(creditAuthorizations).set(data).where(eq(creditAuthorizations.id, id)).returning();
    return auth || undefined;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.releaseStatus, "approved"))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  // Order Releases
  async getOrderReleases(orderId: string): Promise<OrderRelease[]> {
    return await db.select().from(orderReleases).where(eq(orderReleases.orderId, orderId)).orderBy(desc(orderReleases.createdAt));
  }

  async createOrderRelease(insertRelease: InsertOrderRelease): Promise<OrderRelease> {
    const [release] = await db.insert(orderReleases).values(insertRelease).returning();
    return release;
  }

  // Shipments
  async getShipment(id: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment || undefined;
  }

  async getAllShipments(): Promise<Shipment[]> {
    return await db.select().from(shipments).orderBy(desc(shipments.createdAt));
  }

  async createShipment(insertShipment: InsertShipment): Promise<Shipment> {
    const [shipment] = await db.insert(shipments).values(insertShipment).returning();
    return shipment;
  }

  async updateShipment(id: string, data: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [shipment] = await db.update(shipments).set(data).where(eq(shipments.id, id)).returning();
    return shipment || undefined;
  }

  // Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.issuedAt));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.issuedAt));
  }

  async getPendingInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(invoices.status, "pending_payment")
        )
      )
      .orderBy(desc(invoices.dueDate));
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  // Product Categories
  async getProductCategory(id: string): Promise<ProductCategory | undefined> {
    const [category] = await db.select().from(productCategories).where(eq(productCategories.id, id));
    return category || undefined;
  }

  async getAllProductCategories(): Promise<ProductCategory[]> {
    return await db.select().from(productCategories).orderBy(productCategories.name);
  }

  async createProductCategory(insertCategory: InsertProductCategory): Promise<ProductCategory> {
    const [category] = await db.insert(productCategories).values(insertCategory).returning();
    return category;
  }

  async updateProductCategory(id: string, data: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    const [category] = await db.update(productCategories).set(data).where(eq(productCategories.id, id)).returning();
    return category || undefined;
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchQuery = `%${query.toLowerCase()}%`;
    return await db.select().from(products)
      .where(
        or(
          ilike(products.code, searchQuery),
          ilike(products.name, searchQuery),
          ilike(products.brand ?? '', searchQuery)
        )
      )
      .orderBy(asc(products.name));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, data: UpdateProduct): Promise<Product | undefined> {
    const [product] = await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  // Customer Product Prices
  async getCustomerProductPrice(customerId: string, productId: string): Promise<CustomerProductPrice | undefined> {
    const [price] = await db.select().from(customerProductPrices)
      .where(and(
        eq(customerProductPrices.customerId, customerId),
        eq(customerProductPrices.productId, productId)
      ));
    return price || undefined;
  }

  async getCustomerProductPrices(customerId: string): Promise<CustomerProductPrice[]> {
    return await db.select().from(customerProductPrices)
      .where(eq(customerProductPrices.customerId, customerId));
  }

  async createCustomerProductPrice(insertPrice: InsertCustomerProductPrice): Promise<CustomerProductPrice> {
    const [price] = await db.insert(customerProductPrices).values(insertPrice).returning();
    return price;
  }

  // Documents
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(insertDocument: InsertDocument & { tenantId: string; uploadedBy?: string | null }): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}

export const storage = new DatabaseStorage();

// ==================== TENANT-SCOPED STORAGE ====================
// Wrapper that enforces tenant isolation for all data access

import type { Request } from "express";

interface TenantContext {
  tenantId: string | null;
  allowGlobal: boolean;
  // Empresa scoping: a VENDEDOR bound to a single empresa only sees that empresa's
  // commercial documents (quotations/orders/shipments). Global roles (admin, logística,
  // crédito, fábrica, etc.) see every empresa within the tenant.
  empresaId: string | null;
  restrictToEmpresa: boolean;
}

function getTenantContext(req: Request): TenantContext {
  const user = req.user;
  const tenant = req.tenant;

  // A vendedor assigned to a specific empresa is restricted to it. SuperAdmins are never
  // restricted so they can oversee the whole platform.
  const empresaId = user?.empresaId ?? null;
  const restrictToEmpresa =
    !user?.isSuperAdmin && user?.role === UserRole.VENDEDOR && !!empresaId;

  // If on a subdomain, always use that tenant (ignore header)
  if (tenant?.id) {
    return { tenantId: tenant.id, allowGlobal: false, empresaId, restrictToEmpresa };
  }

  // SuperAdmin on main domain (no subdomain)
  if (user?.isSuperAdmin) {
    // Check if SuperAdmin has selected a specific tenant via header
    const selectedTenantId = req.headers['x-selected-tenant-id'] as string | undefined;
    if (selectedTenantId) {
      // SuperAdmin working in context of a specific tenant
      return { tenantId: selectedTenantId, allowGlobal: false, empresaId: null, restrictToEmpresa: false };
    }
    // SuperAdmin without selection - global access
    return { tenantId: null, allowGlobal: true, empresaId: null, restrictToEmpresa: false };
  }

  // Regular users use their assigned tenantId
  return {
    tenantId: user?.tenantId || null,
    allowGlobal: false,
    empresaId,
    restrictToEmpresa,
  };
}

export class TenantScopedStorage {
  private ctx: TenantContext;
  private base: DatabaseStorage;

  constructor(req: Request) {
    this.ctx = getTenantContext(req);
    this.base = storage;
  }

  // Helper to add tenantId to insert data
  private withTenant<T extends Record<string, any>>(data: T): T & { tenantId?: string } {
    if (this.ctx.allowGlobal || !this.ctx.tenantId) {
      return data;
    }
    return { ...data, tenantId: this.ctx.tenantId };
  }

  // Helper to build tenant filter
  private tenantFilter(table: any): any {
    if (this.ctx.allowGlobal || !this.ctx.tenantId) {
      return undefined;
    }
    return eq(table.tenantId, this.ctx.tenantId);
  }

  // Get tenantId for current context
  getTenantId(): string | null {
    return this.ctx.tenantId;
  }

  isGlobalAccess(): boolean {
    return this.ctx.allowGlobal;
  }

  // The empresa this user is restricted to (only vendedores bound to an empresa).
  getRestrictedEmpresaId(): string | null {
    return this.ctx.restrictToEmpresa ? this.ctx.empresaId : null;
  }

  // Builds the "empresaId = X" filter for commercial documents when the current user
  // is restricted to a single empresa. Returns undefined for global roles (see all).
  private empresaFilter(table: any): any {
    if (!this.ctx.restrictToEmpresa || !this.ctx.empresaId) {
      return undefined;
    }
    return eq(table.empresaId, this.ctx.empresaId);
  }

  // ==================== EMPRESAS (tenant-scoped) ====================
  async getAllEmpresas(): Promise<Empresa[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllEmpresas();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(empresas)
      .where(eq(empresas.tenantId, this.ctx.tenantId))
      .orderBy(empresas.name);
  }

  async getEmpresa(id: string): Promise<Empresa | undefined> {
    const empresa = await this.base.getEmpresa(id);
    if (!empresa) return undefined;
    if (!this.ctx.allowGlobal && empresa.tenantId !== this.ctx.tenantId) return undefined;
    return empresa;
  }

  async createEmpresa(data: InsertEmpresa): Promise<Empresa> {
    const tenantId = this.ctx.tenantId;
    if (!tenantId) {
      throw new Error("No se puede crear una empresa sin contexto de tenant");
    }
    return this.base.createEmpresa({ ...data, tenantId });
  }

  async updateEmpresa(id: string, data: Partial<InsertEmpresa>): Promise<Empresa | undefined> {
    const existing = await this.getEmpresa(id);
    if (!existing) return undefined;
    // Never allow moving an empresa to another tenant
    const { tenantId: _ignore, ...rest } = data as any;
    return this.base.updateEmpresa(id, rest);
  }

  // ==================== TENANT-AWARE METHODS ====================

  // Users
  async getAllUsers(): Promise<User[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllUsers();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(users)
      .where(eq(users.tenantId, this.ctx.tenantId))
      .orderBy(desc(users.createdAt));
  }

  // Customers
  async getAllCustomers(): Promise<Customer[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllCustomers();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(customers)
      .where(eq(customers.tenantId, this.ctx.tenantId))
      .orderBy(desc(customers.createdAt));
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    return this.base.createCustomer(this.withTenant(data));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const customer = await this.base.getCustomer(id);
    if (!customer) return undefined;
    // Verify tenant ownership
    if (!this.ctx.allowGlobal && customer.tenantId !== this.ctx.tenantId) {
      return undefined;
    }
    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    // Verify ownership first
    const existing = await this.getCustomer(id);
    if (!existing) return undefined;
    return this.base.updateCustomer(id, data);
  }

  // Checkins
  async getAllCheckins(): Promise<Checkin[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllCheckins();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(checkins)
      .where(eq(checkins.tenantId, this.ctx.tenantId))
      .orderBy(desc(checkins.checkinAt));
  }

  async createCheckin(data: InsertCheckin): Promise<Checkin> {
    return this.base.createCheckin(this.withTenant(data));
  }

  // Quotations
  async getAllQuotations(): Promise<(Quotation & { customer?: { id: string; name: string; rfc?: string | null; email?: string | null } })[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllQuotations();
    }
    if (!this.ctx.tenantId) return [];
    const empresaCond = this.empresaFilter(quotations);
    const results = await db.select({
      quotation: quotations,
      customer: {
        id: customers.id,
        name: customers.name,
        rfc: customers.rfc,
        email: customers.email,
      }
    })
    .from(quotations)
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .where(empresaCond
      ? and(eq(quotations.tenantId, this.ctx.tenantId), empresaCond)
      : eq(quotations.tenantId, this.ctx.tenantId))
    .orderBy(desc(quotations.createdAt));
    
    return results.map(r => ({
      ...r.quotation,
      customer: r.customer || undefined
    }));
  }

  async createQuotation(data: InsertQuotation): Promise<Quotation> {
    // A vendedor bound to an empresa always stamps their empresa on the quotation.
    // Global roles may pass empresaId explicitly (e.g. from the empresa picker).
    const withEmpresa = this.ctx.restrictToEmpresa && this.ctx.empresaId
      ? { ...data, empresaId: this.ctx.empresaId }
      : data;
    return this.base.createQuotation(this.withTenant(withEmpresa));
  }

  // Orders
  async getAllOrders() {
    if (this.ctx.allowGlobal) {
      return await db.query.orders.findMany({
        where: eq(orders.releaseStatus, "approved"),
        with: {
          quotation: {
            with: {
              customer: true,
            },
          },
        },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
      });
    }
    if (!this.ctx.tenantId) return [];
    const empresaCond = this.empresaFilter(orders);
    return await db.query.orders.findMany({
      where: empresaCond
        ? and(eq(orders.tenantId, this.ctx.tenantId), eq(orders.releaseStatus, "approved"), empresaCond)
        : and(eq(orders.tenantId, this.ctx.tenantId), eq(orders.releaseStatus, "approved")),
      with: {
        quotation: {
          with: {
            customer: true,
          },
        },
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    // Inheritance is an invariant: empresa always comes from the source quotation,
    // never from client input. Any client-supplied empresaId is ignored.
    // Use the scoped getQuotation so a restricted vendedor cannot create an order
    // from a quotation outside their empresa/tenant.
    let empresaId: string | null = null;
    if (data.quotationId) {
      const quotation = await this.getQuotation(data.quotationId);
      if (!quotation) {
        throw new Error("Cotización no encontrada o fuera de tu alcance");
      }
      empresaId = quotation.empresaId ?? null;
    }
    return this.base.createOrder(this.withTenant({ ...data, empresaId }));
  }

  // Shipments
  async getAllShipments() {
    if (this.ctx.allowGlobal) {
      return await db.query.shipments.findMany({
        with: {
          order: {
            with: {
              quotation: {
                with: {
                  customer: true,
                },
              },
            },
          },
        },
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
    }
    if (!this.ctx.tenantId) return [];
    const empresaCond = this.empresaFilter(shipments);
    return await db.query.shipments.findMany({
      where: empresaCond
        ? and(eq(shipments.tenantId, this.ctx.tenantId), empresaCond)
        : eq(shipments.tenantId, this.ctx.tenantId),
      with: {
        order: {
          with: {
            quotation: {
              with: {
                customer: true,
              },
            },
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });
  }

  async createShipment(data: InsertShipment): Promise<Shipment> {
    // Inheritance is an invariant: empresa always comes from the source order,
    // never from client input. Any client-supplied empresaId is ignored.
    // Use the scoped getOrder so a restricted vendedor cannot create a shipment
    // from an order outside their empresa/tenant.
    let empresaId: string | null = null;
    if (data.orderId) {
      const order = await this.getOrder(data.orderId);
      if (!order) {
        throw new Error("Pedido no encontrado o fuera de tu alcance");
      }
      empresaId = order.empresaId ?? null;
    }
    return this.base.createShipment(this.withTenant({ ...data, empresaId }));
  }

  // Invoices
  async getAllInvoices(): Promise<Invoice[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllInvoices();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(invoices)
      .where(eq(invoices.tenantId, this.ctx.tenantId))
      .orderBy(desc(invoices.issuedAt));
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    return this.base.createInvoice(this.withTenant(data));
  }

  // Payments
  async getAllPayments(): Promise<Payment[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllPayments();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(payments)
      .where(eq(payments.tenantId, this.ctx.tenantId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    return this.base.createPayment(this.withTenant(data));
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllProducts();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(products)
      .where(eq(products.tenantId, this.ctx.tenantId))
      .orderBy(products.name);
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    return this.base.createProduct(this.withTenant(data));
  }

  // Product Categories
  async getAllProductCategories(): Promise<ProductCategory[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllProductCategories();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(productCategories)
      .where(eq(productCategories.tenantId, this.ctx.tenantId))
      .orderBy(productCategories.name);
  }

  async createProductCategory(data: InsertProductCategory): Promise<ProductCategory> {
    return this.base.createProductCategory(this.withTenant(data));
  }

  // ==================== OWNERSHIP-VERIFIED METHODS ====================
  // These methods verify tenant ownership before returning/modifying data
  
  async getUser(id: string) { return this.base.getUser(id); }
  async getUserByUsername(username: string, tenantId?: string | null) { return this.base.getUserByUsername(username, tenantId); }
  async createUser(data: InsertUser) { return this.base.createUser(this.withTenant(data)); }
  async updateUser(id: string, data: Partial<InsertUser>) { return this.base.updateUser(id, data); }
  
  async getCustomerLocation(id: string) { return this.base.getCustomerLocation(id); }
  async getAllCustomerLocations() { return this.base.getAllCustomerLocations(); }
  async getCustomerLocationsByCustomerId(customerId: string) { return this.base.getCustomerLocationsByCustomerId(customerId); }
  async createCustomerLocation(data: InsertCustomerLocation) { return this.base.createCustomerLocation(data); }
  async updateCustomerLocation(id: string, data: Partial<InsertCustomerLocation>) { return this.base.updateCustomerLocation(id, data); }
  
  // Checkin with ownership verification
  async getCheckin(id: string) {
    const checkin = await this.base.getCheckin(id);
    if (!checkin) return undefined;
    if (!this.ctx.allowGlobal && checkin.tenantId !== this.ctx.tenantId) return undefined;
    return checkin;
  }
  async updateCheckin(id: string, data: UpdateCheckin) {
    const existing = await this.getCheckin(id);
    if (!existing) return undefined;
    return this.base.updateCheckin(id, data);
  }
  
  // Quotation with ownership verification
  async getQuotation(id: string) {
    const quotation = await this.base.getQuotation(id);
    if (!quotation) return undefined;
    if (!this.ctx.allowGlobal && quotation.tenantId !== this.ctx.tenantId) return undefined;
    if (this.ctx.restrictToEmpresa && this.ctx.empresaId && quotation.empresaId !== this.ctx.empresaId) return undefined;
    return quotation;
  }
  async updateQuotation(id: string, data: Partial<InsertQuotation>) {
    const existing = await this.getQuotation(id);
    if (!existing) return undefined;
    return this.base.updateQuotation(id, data);
  }
  async getQuotationItems(quotationId: string) {
    const quotation = await this.getQuotation(quotationId);
    if (!quotation) return [];
    return this.base.getQuotationItems(quotationId);
  }
  async createQuotationItem(data: InsertQuotationItem) { return this.base.createQuotationItem(data); }
  async deleteQuotationItem(id: string) { return this.base.deleteQuotationItem(id); }
  
  // Credit authorization - verify via quotation
  async getCreditAuthorization(id: string) { return this.base.getCreditAuthorization(id); }
  async getAllCreditAuthorizations() { return this.base.getAllCreditAuthorizations(); }
  async createCreditAuthorization(data: InsertCreditAuthorization) { return this.base.createCreditAuthorization(data); }
  async updateCreditAuthorization(id: string, data: Partial<InsertCreditAuthorization>) { return this.base.updateCreditAuthorization(id, data); }
  
  // Order with ownership verification
  async getOrder(id: string) {
    const order = await this.base.getOrder(id);
    if (!order) return undefined;
    if (!this.ctx.allowGlobal && order.tenantId !== this.ctx.tenantId) return undefined;
    if (this.ctx.restrictToEmpresa && this.ctx.empresaId && order.empresaId !== this.ctx.empresaId) return undefined;
    return order;
  }
  async updateOrder(id: string, data: Partial<InsertOrder>) {
    const existing = await this.getOrder(id);
    if (!existing) return undefined;
    return this.base.updateOrder(id, data);
  }
  async getOrderReleases(orderId: string) {
    const order = await this.getOrder(orderId);
    if (!order) return [];
    return this.base.getOrderReleases(orderId);
  }
  async createOrderRelease(data: InsertOrderRelease) { return this.base.createOrderRelease(data); }
  
  // Shipment with ownership verification
  async getShipment(id: string) {
    const shipment = await this.base.getShipment(id);
    if (!shipment) return undefined;
    if (!this.ctx.allowGlobal && shipment.tenantId !== this.ctx.tenantId) return undefined;
    if (this.ctx.restrictToEmpresa && this.ctx.empresaId && shipment.empresaId !== this.ctx.empresaId) return undefined;
    return shipment;
  }
  async updateShipment(id: string, data: Partial<InsertShipment>) {
    const existing = await this.getShipment(id);
    if (!existing) return undefined;
    return this.base.updateShipment(id, data);
  }
  
  // Invoice with ownership verification
  async getInvoice(id: string) {
    const invoice = await this.base.getInvoice(id);
    if (!invoice) return undefined;
    if (!this.ctx.allowGlobal && invoice.tenantId !== this.ctx.tenantId) return undefined;
    return invoice;
  }
  async updateInvoice(id: string, data: Partial<InsertInvoice>) {
    const existing = await this.getInvoice(id);
    if (!existing) return undefined;
    return this.base.updateInvoice(id, data);
  }
  async getInvoicesByCustomer(customerId: string) {
    const customer = await this.getCustomer(customerId);
    if (!customer) return [];
    return this.base.getInvoicesByCustomer(customerId);
  }
  async getPendingInvoicesByCustomer(customerId: string) {
    const customer = await this.getCustomer(customerId);
    if (!customer) return [];
    return this.base.getPendingInvoicesByCustomer(customerId);
  }
  
  // Payment with ownership verification
  async getPayment(id: string) {
    const payment = await this.base.getPayment(id);
    if (!payment) return undefined;
    if (!this.ctx.allowGlobal && payment.tenantId !== this.ctx.tenantId) return undefined;
    return payment;
  }

  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return [];
    if (!this.ctx.tenantId) return [];
    return await db.select().from(payments)
      .where(and(eq(payments.customerId, customerId), eq(payments.tenantId, this.ctx.tenantId)))
      .orderBy(desc(payments.paymentDate));
  }
  
  // Product with ownership verification
  async getProduct(id: string) {
    const product = await this.base.getProduct(id);
    if (!product) return undefined;
    if (!this.ctx.allowGlobal && product.tenantId !== this.ctx.tenantId) return undefined;
    return product;
  }
  async getProductByCode(code: string) {
    const product = await this.base.getProductByCode(code);
    if (!product) return undefined;
    if (!this.ctx.allowGlobal && product.tenantId !== this.ctx.tenantId) return undefined;
    return product;
  }
  async searchProducts(query: string) {
    if (this.ctx.allowGlobal) {
      return this.base.searchProducts(query);
    }
    const allProducts = await this.base.searchProducts(query);
    return allProducts.filter(p => p.tenantId === this.ctx.tenantId);
  }
  async updateProduct(id: string, data: UpdateProduct) {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    return this.base.updateProduct(id, data);
  }
  
  // Product Category with ownership verification
  async getProductCategory(id: string) {
    const category = await this.base.getProductCategory(id);
    if (!category) return undefined;
    if (!this.ctx.allowGlobal && category.tenantId !== this.ctx.tenantId) return undefined;
    return category;
  }
  async updateProductCategory(id: string, data: Partial<InsertProductCategory>) {
    const existing = await this.getProductCategory(id);
    if (!existing) return undefined;
    return this.base.updateProductCategory(id, data);
  }
  
  async getCustomerProductPrice(customerId: string, productId: string) {
    const customer = await this.getCustomer(customerId);
    if (!customer) return undefined;
    return this.base.getCustomerProductPrice(customerId, productId);
  }
  async getCustomerProductPrices(customerId: string) {
    const customer = await this.getCustomer(customerId);
    if (!customer) return [];
    return this.base.getCustomerProductPrices(customerId);
  }
  async createCustomerProductPrice(data: InsertCustomerProductPrice) { return this.base.createCustomerProductPrice(data); }
  
  // Incidents
  async getAllIncidents(): Promise<Incident[]> {
    if (this.ctx.allowGlobal) {
      return await db.select().from(incidents).orderBy(desc(incidents.createdAt));
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(incidents)
      .where(eq(incidents.tenantId, this.ctx.tenantId))
      .orderBy(desc(incidents.createdAt));
  }

  // Scheduled Visits
  async getAllScheduledVisits() {
    if (this.ctx.allowGlobal) {
      return await db.query.scheduledVisits.findMany({
        with: {
          customer: true,
          user: true,
          customerLocation: true,
        },
        orderBy: (sv, { desc }) => [desc(sv.scheduledDate)],
      });
    }
    if (!this.ctx.tenantId) return [];
    return await db.query.scheduledVisits.findMany({
      where: eq(scheduledVisits.tenantId, this.ctx.tenantId),
      with: {
        customer: true,
        user: true,
        customerLocation: true,
      },
      orderBy: (sv, { desc }) => [desc(sv.scheduledDate)],
    });
  }

  // Documents
  async getAllDocuments(): Promise<Document[]> {
    if (this.ctx.allowGlobal) {
      return this.base.getAllDocuments();
    }
    if (!this.ctx.tenantId) return [];
    return await db.select().from(documents)
      .where(eq(documents.tenantId, this.ctx.tenantId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const document = await this.base.getDocument(id);
    if (!document) return undefined;
    if (!this.ctx.allowGlobal && document.tenantId !== this.ctx.tenantId) {
      return undefined;
    }
    return document;
  }

  async createDocument(data: InsertDocument & { uploadedBy?: string | null }): Promise<Document> {
    const tenantId = this.ctx.tenantId;
    if (!tenantId) {
      throw new Error("Cannot create document without a tenant context");
    }
    return this.base.createDocument({ ...data, tenantId });
  }

  async deleteDocument(id: string): Promise<void> {
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error("Document not found");
    }
    await this.base.deleteDocument(id);
  }
}

// Factory function to create tenant-scoped storage from request
export function createTenantScopedStorage(req: Request): TenantScopedStorage {
  return new TenantScopedStorage(req);
}
