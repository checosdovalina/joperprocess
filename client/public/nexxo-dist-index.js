var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  CommentVisibility: () => CommentVisibility,
  CreditAuthStatus: () => CreditAuthStatus,
  IncidentStatus: () => IncidentStatus,
  IncidentType: () => IncidentType,
  IncidentUrgency: () => IncidentUrgency,
  InvoiceStatus: () => InvoiceStatus,
  MeetingType: () => MeetingType,
  OrderReleaseStatus: () => OrderReleaseStatus,
  OrderStatus: () => OrderStatus,
  QuotationStatus: () => QuotationStatus,
  ScheduledVisitStatus: () => ScheduledVisitStatus,
  ShipmentStatus: () => ShipmentStatus,
  ShippingApprovalStatus: () => ShippingApprovalStatus,
  ShippingCostStatus: () => ShippingCostStatus,
  UserRole: () => UserRole,
  accountStatementSchedules: () => accountStatementSchedules,
  checkins: () => checkins,
  checkinsRelations: () => checkinsRelations,
  creditAuthorizationComments: () => creditAuthorizationComments,
  creditAuthorizationCommentsRelations: () => creditAuthorizationCommentsRelations,
  creditAuthorizations: () => creditAuthorizations,
  creditAuthorizationsRelations: () => creditAuthorizationsRelations,
  customerLocations: () => customerLocations,
  customerLocationsRelations: () => customerLocationsRelations,
  customerProductPrices: () => customerProductPrices,
  customerProductPricesRelations: () => customerProductPricesRelations,
  customers: () => customers,
  customersRelations: () => customersRelations,
  documents: () => documents,
  documentsRelations: () => documentsRelations,
  empresas: () => empresas,
  incidentActivities: () => incidentActivities,
  incidentActivitiesRelations: () => incidentActivitiesRelations,
  incidentAttachments: () => incidentAttachments,
  incidentAttachmentsRelations: () => incidentAttachmentsRelations,
  incidentComments: () => incidentComments,
  incidentCommentsRelations: () => incidentCommentsRelations,
  incidents: () => incidents,
  incidentsRelations: () => incidentsRelations,
  insertAccountStatementScheduleSchema: () => insertAccountStatementScheduleSchema,
  insertCheckinSchema: () => insertCheckinSchema,
  insertCreditAuthorizationCommentSchema: () => insertCreditAuthorizationCommentSchema,
  insertCreditAuthorizationSchema: () => insertCreditAuthorizationSchema,
  insertCustomerLocationSchema: () => insertCustomerLocationSchema,
  insertCustomerProductPriceSchema: () => insertCustomerProductPriceSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertEmpresaSchema: () => insertEmpresaSchema,
  insertIncidentActivitySchema: () => insertIncidentActivitySchema,
  insertIncidentAttachmentSchema: () => insertIncidentAttachmentSchema,
  insertIncidentCommentSchema: () => insertIncidentCommentSchema,
  insertIncidentSchema: () => insertIncidentSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertMicrosipConfigSchema: () => insertMicrosipConfigSchema,
  insertOrderReleaseSchema: () => insertOrderReleaseSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPendingUploadSchema: () => insertPendingUploadSchema,
  insertProductCategorySchema: () => insertProductCategorySchema,
  insertProductSchema: () => insertProductSchema,
  insertQuotationItemSchema: () => insertQuotationItemSchema,
  insertQuotationSchema: () => insertQuotationSchema,
  insertScheduledVisitSchema: () => insertScheduledVisitSchema,
  insertShipmentProductInstanceSchema: () => insertShipmentProductInstanceSchema,
  insertShipmentSchema: () => insertShipmentSchema,
  insertSystemLogSchema: () => insertSystemLogSchema,
  insertTenantSchema: () => insertTenantSchema,
  insertUserSchema: () => insertUserSchema,
  invoices: () => invoices,
  invoicesRelations: () => invoicesRelations,
  microsipConfigs: () => microsipConfigs,
  microsipSyncLogs: () => microsipSyncLogs,
  orderReleases: () => orderReleases,
  orderReleasesRelations: () => orderReleasesRelations,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  passwordResetTokens: () => passwordResetTokens,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  pendingUploads: () => pendingUploads,
  productCategories: () => productCategories,
  productCategoriesRelations: () => productCategoriesRelations,
  products: () => products,
  productsRelations: () => productsRelations,
  quotationItems: () => quotationItems,
  quotationItemsRelations: () => quotationItemsRelations,
  quotations: () => quotations,
  quotationsRelations: () => quotationsRelations,
  scheduledVisits: () => scheduledVisits,
  scheduledVisitsRelations: () => scheduledVisitsRelations,
  session: () => session,
  shipmentProductInstances: () => shipmentProductInstances,
  shipmentProductInstancesRelations: () => shipmentProductInstancesRelations,
  shipments: () => shipments,
  shipmentsRelations: () => shipmentsRelations,
  systemLogs: () => systemLogs,
  tenants: () => tenants,
  updateCheckinSchema: () => updateCheckinSchema,
  updateCustomerSchema: () => updateCustomerSchema,
  updateIncidentSchema: () => updateIncidentSchema,
  updateMicrosipConfigSchema: () => updateMicrosipConfigSchema,
  updateProductSchema: () => updateProductSchema,
  updateQuotationSchema: () => updateQuotationSchema,
  updateScheduledVisitSchema: () => updateScheduledVisitSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, jsonb, bigint, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var session, tenants, insertTenantSchema, empresas, insertEmpresaSchema, UserRole, QuotationStatus, ShippingCostStatus, ShippingApprovalStatus, OrderStatus, ShipmentStatus, CreditAuthStatus, ScheduledVisitStatus, MeetingType, IncidentType, IncidentStatus, IncidentUrgency, CommentVisibility, users, passwordResetTokens, insertPasswordResetTokenSchema, customers, customerLocations, checkins, scheduledVisits, pendingUploads, quotations, quotationItems, creditAuthorizations, creditAuthorizationComments, OrderReleaseStatus, orders, orderReleases, shipments, shipmentProductInstances, InvoiceStatus, invoices, payments, productCategories, products, customerProductPrices, documents, incidents, incidentComments, incidentAttachments, incidentActivities, usersRelations, customersRelations, customerLocationsRelations, checkinsRelations, scheduledVisitsRelations, quotationsRelations, quotationItemsRelations, productCategoriesRelations, productsRelations, documentsRelations, customerProductPricesRelations, creditAuthorizationsRelations, creditAuthorizationCommentsRelations, ordersRelations, orderReleasesRelations, shipmentsRelations, shipmentProductInstancesRelations, invoicesRelations, paymentsRelations, incidentsRelations, incidentCommentsRelations, incidentAttachmentsRelations, incidentActivitiesRelations, insertUserSchema, insertCustomerSchema, updateCustomerSchema, insertCustomerLocationSchema, insertCheckinSchema, updateCheckinSchema, insertScheduledVisitSchema, updateScheduledVisitSchema, insertPendingUploadSchema, insertQuotationSchema, insertQuotationItemSchema, insertCreditAuthorizationSchema, insertCreditAuthorizationCommentSchema, insertOrderSchema, insertOrderReleaseSchema, insertShipmentSchema, insertShipmentProductInstanceSchema, insertInvoiceSchema, insertPaymentSchema, insertProductCategorySchema, emptyToNull, emptyToZero, insertProductSchema, updateProductSchema, insertDocumentSchema, insertCustomerProductPriceSchema, updateQuotationSchema, insertIncidentSchema, updateIncidentSchema, insertIncidentCommentSchema, insertIncidentAttachmentSchema, insertIncidentActivitySchema, microsipConfigs, microsipSyncLogs, insertMicrosipConfigSchema, updateMicrosipConfigSchema, accountStatementSchedules, insertAccountStatementScheduleSchema, systemLogs, insertSystemLogSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    session = pgTable("session", {
      sid: varchar("sid").primaryKey(),
      sess: jsonb("sess").notNull(),
      expire: timestamp("expire", { precision: 6 }).notNull()
    });
    tenants = pgTable("tenants", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      subdomain: text("subdomain").notNull().unique(),
      // e.g., "joper" for joper.nexxo.com.mx
      // Jerarquía de compañías (Opción B): una compañía puede tener una compañía "padre".
      // Las compañías hijas tienen sus PROPIOS datos aislados, pero el admin de la compañía
      // padre puede entrar a administrar cualquier compañía descendiente. FK se define en
      // scripts/vps-schema-changes.sql (auto-referencia). null = compañía raíz.
      parentId: varchar("parent_id"),
      logoUrl: text("logo_url"),
      primaryColor: text("primary_color").default("#4DA3FF"),
      // Nexxo blue default
      secondaryColor: text("secondary_color").default("#1F3C88"),
      active: boolean("active").notNull().default(true),
      // Company legal info
      legalName: text("legal_name"),
      // Razón social
      rfc: text("rfc"),
      // RFC fiscal
      website: text("website"),
      // Contact info
      email: text("email"),
      phone: text("phone"),
      address: text("address"),
      city: text("city"),
      state: text("state"),
      zipCode: text("zip_code"),
      country: text("country").default("M\xE9xico"),
      timezone: text("timezone").default("America/Mexico_City"),
      locale: text("locale").default("es"),
      // es | en | pt
      // Billing/subscription info (for future)
      plan: text("plan").default("basic"),
      // basic, professional, enterprise
      maxUsers: integer("max_users").default(10),
      // Timestamps
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    insertTenantSchema = createInsertSchema(tenants).omit({
      id: true,
      parentId: true,
      createdAt: true,
      updatedAt: true
    });
    empresas = pgTable("empresas", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      name: text("name").notNull(),
      // p.ej. "Joper Ligero", "Joper Móvil"
      clave: text("clave"),
      // clave corta interna, p.ej. "LIGERO" / "MOVIL"
      logoUrl: text("logo_url"),
      primaryColor: text("primary_color").default("#4DA3FF"),
      secondaryColor: text("secondary_color").default("#1F3C88"),
      subdomain: text("subdomain").unique(),
      // opcional: marca por subdominio (último paso)
      active: boolean("active").notNull().default(true),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    insertEmpresaSchema = createInsertSchema(empresas).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    UserRole = {
      ADMIN: "admin",
      VENDEDOR: "vendedor",
      CREDITO_COBRANZA: "credito_cobranza",
      VENTAS_LOGISTICA: "ventas_logistica",
      FABRICA: "fabrica",
      EMBARQUES: "embarques",
      FACTURACION: "facturacion",
      SERVICIO_CLIENTE: "servicio_cliente",
      SERVICIO_TECNICO: "servicio_tecnico"
    };
    QuotationStatus = {
      DRAFT: "draft",
      SENT: "sent",
      PENDING_APPROVAL: "pending_approval",
      PENDING_AUTHORIZATION: "pending_authorization",
      AUTHORIZED: "authorized",
      CONVERTED: "converted",
      REJECTED: "rejected",
      EXPIRED: "expired"
    };
    ShippingCostStatus = {
      CONFIRMED: "confirmed",
      PENDING: "pending"
    };
    ShippingApprovalStatus = {
      NOT_REQUIRED: "not_required",
      PENDING: "pending",
      APPROVED: "approved",
      REJECTED: "rejected"
    };
    OrderStatus = {
      PENDING: "pending",
      IN_PRODUCTION: "in_production",
      READY: "ready",
      PARTIALLY_RELEASED: "partially_released",
      RELEASED: "released",
      SHIPPED: "shipped",
      DELIVERED: "delivered",
      CLOSED: "closed",
      CANCELLED: "cancelled"
    };
    ShipmentStatus = {
      PENDING: "pending",
      IN_TRANSIT: "in_transit",
      DELIVERED: "delivered"
    };
    CreditAuthStatus = {
      PENDING: "pending",
      APPROVED: "approved",
      REJECTED: "rejected"
    };
    ScheduledVisitStatus = {
      SCHEDULED: "scheduled",
      COMPLETED: "completed",
      CANCELLED: "cancelled"
    };
    MeetingType = {
      LLAMADA: "llamada",
      VISITA: "visita",
      VIDEOLLAMADA: "videollamada"
    };
    IncidentType = {
      GARANTIA: "garantia",
      RETRABAJO: "retrabajo",
      QUEJA: "queja",
      CONSULTA: "consulta",
      ADMINISTRATIVO: "administrativo"
    };
    IncidentStatus = {
      NUEVO: "nuevo",
      ASIGNADO: "asignado",
      EN_PROCESO: "en_proceso",
      ESPERANDO_CLIENTE: "esperando_cliente",
      ESPERANDO_INTERNO: "esperando_interno",
      RESUELTO: "resuelto",
      CERRADO: "cerrado",
      CANCELADO: "cancelado"
    };
    IncidentUrgency = {
      BAJA: "baja",
      MEDIA: "media",
      ALTA: "alta",
      CRITICA: "critica"
    };
    CommentVisibility = {
      INTERNAL: "internal",
      CUSTOMER: "customer"
    };
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").references(() => tenants.id),
      empresaId: varchar("empresa_id").references(() => empresas.id),
      // vendedor pertenece a UNA empresa; null = rol global (ve todas)
      username: text("username").notNull(),
      password: text("password").notNull(),
      fullName: text("full_name").notNull(),
      email: text("email").notNull(),
      role: text("role").notNull(),
      active: boolean("active").notNull().default(true),
      isSuperAdmin: boolean("is_super_admin").notNull().default(false),
      // For platform-level admins
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    passwordResetTokens = pgTable("password_reset_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
      id: true,
      createdAt: true
    });
    customers = pgTable("customers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      name: text("name").notNull(),
      rfc: text("rfc"),
      email: text("email"),
      phone: text("phone"),
      address: text("address"),
      city: text("city"),
      state: text("state"),
      country: text("country"),
      zipCode: text("zip_code"),
      creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
      creditDays: integer("credit_days").notNull().default(30),
      blocked: boolean("blocked").notNull().default(false),
      skipStatementEmail: boolean("skip_statement_email").notNull().default(false),
      contactName: text("contact_name"),
      // Microsip integration fields
      microsipId: integer("microsip_id"),
      // CLIENTE_ID from Microsip CLIENTES table
      microsipCode: text("microsip_code"),
      // CLAVE from Microsip CLIENTES table
      microsipSyncedAt: timestamp("microsip_synced_at"),
      // Last sync timestamp
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    customerLocations = pgTable("customer_locations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      name: text("name"),
      // Optional: "Sucursal Centro", "Bodega Norte", etc.
      latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
      longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
      radiusMeters: integer("radius_meters").notNull().default(100),
      // Validation radius
      isPrimary: boolean("is_primary").notNull().default(false),
      address: text("address"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    checkins = pgTable("checkins", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      customerLocationId: varchar("customer_location_id").references(() => customerLocations.id),
      meetingType: text("meeting_type").notNull().default(MeetingType.VISITA),
      latitude: decimal("latitude", { precision: 10, scale: 7 }),
      longitude: decimal("longitude", { precision: 10, scale: 7 }),
      checkinAt: timestamp("checkin_at").notNull().defaultNow(),
      checkoutAt: timestamp("checkout_at"),
      topics: text("topics").array(),
      notes: text("notes"),
      checkoutNotes: text("checkout_notes"),
      // Acuerdos/comentarios del checkout
      photos: text("photos").array(),
      minutePdfPath: text("minute_pdf_path"),
      internalNotes: text("internal_notes"),
      // Notas internas que NO se envían al cliente
      salesPersonId: varchar("sales_person_id").references(() => users.id)
      // Vendedor asignado
    });
    scheduledVisits = pgTable("scheduled_visits", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      customerLocationId: varchar("customer_location_id").references(() => customerLocations.id),
      meetingType: text("meeting_type").notNull().default(MeetingType.VISITA),
      scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
      topics: text("topics").array().notNull().default(sql`ARRAY[]::text[]`),
      notes: text("notes"),
      status: text("status").notNull().default(ScheduledVisitStatus.SCHEDULED),
      checkinId: varchar("checkin_id").unique().references(() => checkins.id),
      // Unique: one visit maps to at most one checkin
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    }, (table) => ({
      // Composite index for daily agenda queries (userId + date range)
      userScheduledIdx: sql`CREATE INDEX scheduled_visits_user_date_idx ON ${table} (user_id, scheduled_date)`,
      // Index for customer lookup with status filtering
      customerStatusIdx: sql`CREATE INDEX scheduled_visits_customer_status_idx ON ${table} (customer_id, status)`
    }));
    pendingUploads = pgTable("pending_uploads", {
      entityId: text("entity_id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      checkinId: varchar("checkin_id").notNull().references(() => checkins.id),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      expiresAt: timestamp("expires_at").notNull()
    });
    quotations = pgTable("quotations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      empresaId: varchar("empresa_id").references(() => empresas.id),
      // empresa (marca) a la que pertenece esta cotización
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      folio: text("folio").notNull().unique(),
      version: integer("version").notNull().default(1),
      status: text("status").notNull().default(QuotationStatus.DRAFT),
      currency: text("currency").notNull().default("MXN"),
      paymentTerms: text("payment_terms"),
      deliveryTime: text("delivery_time"),
      validUntil: timestamp("valid_until"),
      subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
      globalDiscount: decimal("global_discount", { precision: 5, scale: 2 }).default("0"),
      tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
      total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
      totalSavings: decimal("total_savings", { precision: 12, scale: 2 }).default("0"),
      notes: text("notes"),
      conditions: text("conditions"),
      pdfPath: text("pdf_path"),
      requiresApproval: boolean("requires_approval").notNull().default(false),
      approvalReason: text("approval_reason"),
      authorizedBy: varchar("authorized_by").references(() => users.id),
      authorizedAt: timestamp("authorized_at"),
      rejectedBy: varchar("rejected_by").references(() => users.id),
      rejectedAt: timestamp("rejected_at"),
      rejectionReason: text("rejection_reason"),
      sentAt: timestamp("sent_at"),
      sentMethod: text("sent_method"),
      convertedToOrderId: varchar("converted_to_order_id"),
      parentQuotationId: varchar("parent_quotation_id"),
      // Customer approval workflow fields
      approvalToken: text("approval_token").unique(),
      // Unique token for customer approval link
      customerApprovedAt: timestamp("customer_approved_at"),
      customerRejectedAt: timestamp("customer_rejected_at"),
      customerRejectionReason: text("customer_rejection_reason"),
      // Exchange rate (tipo de cambio) — used to unify mixed-currency totals
      exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).default("18.0000"),
      // MXN per 1 USD
      // Shipping fields
      shippingHandledByJoper: boolean("shipping_handled_by_joper").notNull().default(false),
      shippingMethod: text("shipping_method").default("truck"),
      // truck (camión), parcel (paquetería)
      requiresPallet: boolean("requires_pallet").default(false),
      shippingNotes: text("shipping_notes"),
      // Notas de envío (no van en la cotización)
      shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default("0"),
      shippingCostStatus: text("shipping_cost_status").default("confirmed"),
      // confirmed, pending
      shippingApprovalStatus: text("shipping_approval_status").default("not_required"),
      // not_required, pending, approved, rejected
      shippingApprovalToken: text("shipping_approval_token").unique(),
      shippingApprovedBy: varchar("shipping_approved_by").references(() => users.id),
      shippingApprovedAt: timestamp("shipping_approved_at"),
      shippingRejectedBy: varchar("shipping_rejected_by").references(() => users.id),
      shippingRejectedAt: timestamp("shipping_rejected_at"),
      shippingRejectionReason: text("shipping_rejection_reason"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    quotationItems = pgTable("quotation_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
      productId: varchar("product_id").references(() => products.id),
      productCode: text("product_code"),
      productName: text("product_name").notNull(),
      description: text("description"),
      unitOfMeasure: text("unit_of_measure").notNull().default("PZA"),
      quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
      listPrice: decimal("list_price", { precision: 12, scale: 2 }).notNull(),
      unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
      discountPercent: decimal("discount_percent", { precision: 10, scale: 2 }).default("0"),
      discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
      subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
      taxRate: decimal("tax_rate", { precision: 8, scale: 2 }).default("16"),
      taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
      total: decimal("total", { precision: 12, scale: 2 }).notNull(),
      exceedsMaxDiscount: boolean("exceeds_max_discount").default(false),
      position: integer("position").notNull().default(0),
      currency: text("currency").notNull().default("MXN")
      // Moneda por partida (MXN, USD)
    });
    creditAuthorizations = pgTable("credit_authorizations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      quotationId: varchar("quotation_id").notNull().references(() => quotations.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      status: text("status").notNull().default(CreditAuthStatus.PENDING),
      creditAvailable: decimal("credit_available", { precision: 12, scale: 2 }),
      creditUsed: decimal("credit_used", { precision: 12, scale: 2 }),
      overdueBalance: decimal("overdue_balance", { precision: 12, scale: 2 }),
      notes: text("notes"),
      authorizedAt: timestamp("authorized_at"),
      approvedById: varchar("approved_by_id").references(() => users.id),
      approvalSignature: text("approval_signature"),
      approvalSignedAt: timestamp("approval_signed_at"),
      rejectedById: varchar("rejected_by_id").references(() => users.id),
      rejectionNotes: text("rejection_notes"),
      lastEditedById: varchar("last_edited_by_id").references(() => users.id),
      lastEditedAt: timestamp("last_edited_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    creditAuthorizationComments = pgTable("credit_authorization_comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      creditAuthorizationId: varchar("credit_authorization_id").notNull().references(() => creditAuthorizations.id, { onDelete: "cascade" }),
      userId: varchar("user_id").notNull().references(() => users.id),
      content: text("content").notNull(),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    OrderReleaseStatus = {
      PENDING: "pending",
      APPROVED: "approved",
      REJECTED: "rejected",
      CLOSED: "closed"
    };
    orders = pgTable("orders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      empresaId: varchar("empresa_id").references(() => empresas.id),
      // heredada de la cotización
      quotationId: varchar("quotation_id").notNull().references(() => quotations.id),
      status: text("status").notNull().default(OrderStatus.PENDING),
      productionProgress: integer("production_progress").notNull().default(0),
      estimatedDelivery: timestamp("estimated_delivery"),
      actualDelivery: timestamp("actual_delivery"),
      factoryNotes: text("factory_notes"),
      lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
      // Admin release workflow
      releaseStatus: text("release_status").notNull().default(OrderReleaseStatus.PENDING),
      releaseNotes: text("release_notes"),
      releasedById: varchar("released_by_id").references(() => users.id),
      releasedAt: timestamp("released_at"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    orderReleases = pgTable("order_releases", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      quotationItemId: varchar("quotation_item_id").notNull().references(() => quotationItems.id),
      quantityReleased: decimal("quantity_released", { precision: 10, scale: 2 }).notNull(),
      releasedById: varchar("released_by_id").notNull().references(() => users.id),
      invoiceId: varchar("invoice_id"),
      shipmentId: varchar("shipment_id"),
      notes: text("notes"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    shipments = pgTable("shipments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      empresaId: varchar("empresa_id").references(() => empresas.id),
      // heredada del pedido
      orderId: varchar("order_id").notNull().references(() => orders.id),
      transporter: text("transporter").notNull(),
      transportType: text("transport_type").notNull(),
      // 'propio' or 'paqueteria'
      trackingNumber: text("tracking_number"),
      driverName: text("driver_name"),
      vehiclePlates: text("vehicle_plates"),
      status: text("status").notNull().default(ShipmentStatus.PENDING),
      series: text("series").array(),
      signatures: jsonb("signatures"),
      shippedAt: timestamp("shipped_at"),
      deliveredAt: timestamp("delivered_at"),
      cartaPortePath: text("carta_porte_path"),
      invoiceNumber: text("invoice_number"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    shipmentProductInstances = pgTable("shipment_product_instances", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      shipmentId: varchar("shipment_id").notNull().references(() => shipments.id),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      productId: varchar("product_id").notNull().references(() => products.id),
      serialNumber: text("serial_number").notNull().unique(),
      status: text("status").notNull().default("active"),
      // active, returned, defective
      deliveredAt: timestamp("delivered_at"),
      notes: text("notes"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    InvoiceStatus = {
      DRAFT: "draft",
      PENDING_PAYMENT: "pending_payment",
      PARTIALLY_PAID: "partially_paid",
      PAID: "paid",
      CANCELLED: "cancelled"
    };
    invoices = pgTable("invoices", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      orderId: varchar("order_id").references(() => orders.id),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      cfdiUuid: text("cfdi_uuid"),
      serie: text("serie").notNull(),
      folio: text("folio").notNull(),
      subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
      tax: decimal("tax", { precision: 12, scale: 2 }).notNull(),
      total: decimal("total", { precision: 12, scale: 2 }).notNull(),
      balanceDue: decimal("balance_due", { precision: 12, scale: 2 }),
      currency: text("currency").notNull().default("MXN"),
      paymentMethod: text("payment_method"),
      paymentForm: text("payment_form"),
      status: text("status").notNull().default(InvoiceStatus.PENDING_PAYMENT),
      xmlPath: text("xml_path"),
      pdfPath: text("pdf_path"),
      issuedAt: timestamp("issued_at").notNull().defaultNow(),
      dueDate: timestamp("due_date"),
      paidAt: timestamp("paid_at"),
      notes: text("notes"),
      // Microsip integration fields
      microsipDoctoId: bigint("microsip_docto_id", { mode: "number" }),
      // DOCTO_VE_ID from Microsip DOCTOS_VE
      microsipSyncedAt: timestamp("microsip_synced_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    payments = pgTable("payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      invoiceId: varchar("invoice_id").references(() => invoices.id),
      // Made optional for Microsip synced payments
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
      paymentDate: timestamp("payment_date").notNull(),
      reference: text("reference"),
      notes: text("notes"),
      registeredBy: varchar("registered_by").references(() => users.id),
      // Made optional for Microsip synced payments
      // Microsip integration fields
      microsipDoctoCoId: bigint("microsip_docto_co_id", { mode: "number" }),
      // DOCTO_CO_ID from Microsip DOCTOS_CO
      microsipSyncedAt: timestamp("microsip_synced_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    productCategories = pgTable("product_categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      name: text("name").notNull(),
      description: text("description"),
      parentId: varchar("parent_id"),
      active: boolean("active").notNull().default(true),
      // Microsip integration fields
      microsipLineaId: integer("microsip_linea_id"),
      // LINEA_ARTICULO_ID from Microsip LINEAS_ARTICULOS
      microsipSyncedAt: timestamp("microsip_synced_at"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    products = pgTable("products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      code: text("code").notNull(),
      name: text("name").notNull(),
      description: text("description"),
      categoryId: varchar("category_id").references(() => productCategories.id),
      brand: text("brand"),
      unitOfMeasure: text("unit_of_measure").notNull().default("PZA"),
      listPrice: decimal("list_price", { precision: 12, scale: 2 }).notNull(),
      cost: decimal("cost", { precision: 12, scale: 2 }),
      stock: decimal("stock", { precision: 10, scale: 2 }).notNull().default("0"),
      minStock: decimal("min_stock", { precision: 10, scale: 2 }).default("0"),
      maxDiscount: decimal("max_discount", { precision: 5, scale: 2 }).default("0"),
      taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("16"),
      imageUrl: text("image_url"),
      active: boolean("active").notNull().default(true),
      currency: text("currency").notNull().default("MXN"),
      // MXN or USD from Microsip MONEDA_ID
      // Microsip integration fields
      microsipArticuloId: integer("microsip_articulo_id"),
      // ARTICULO_ID from Microsip ARTICULOS
      microsipSyncedAt: timestamp("microsip_synced_at"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    }, (table) => [
      uniqueIndex("products_tenant_code_unique").on(table.tenantId, table.code)
    ]);
    customerProductPrices = pgTable("customer_product_prices", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      productId: varchar("product_id").notNull().references(() => products.id),
      specialPrice: decimal("special_price", { precision: 12, scale: 2 }).notNull(),
      maxDiscount: decimal("max_discount", { precision: 5, scale: 2 }),
      validFrom: timestamp("valid_from"),
      validUntil: timestamp("valid_until"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    documents = pgTable("documents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      title: text("title").notNull(),
      description: text("description"),
      type: text("type").notNull().default("operativo"),
      // 'operativo' | 'despiece'
      category: text("category"),
      productId: varchar("product_id").references(() => products.id),
      fileUrl: text("file_url").notNull(),
      // storage entityId / relative path
      fileName: text("file_name").notNull(),
      // original filename
      fileSize: integer("file_size"),
      uploadedBy: varchar("uploaded_by").references(() => users.id),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    incidents = pgTable("incidents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      ticketNumber: text("ticket_number").notNull().unique(),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      type: text("type").notNull().default(IncidentType.ADMINISTRATIVO),
      status: text("status").notNull().default(IncidentStatus.NUEVO),
      urgency: text("urgency").notNull().default(IncidentUrgency.MEDIA),
      subject: text("subject").notNull(),
      description: text("description").notNull(),
      productId: varchar("product_id").references(() => products.id),
      productInstanceId: varchar("product_instance_id").references(() => shipmentProductInstances.id),
      orderId: varchar("order_id").references(() => orders.id),
      invoiceId: varchar("invoice_id").references(() => invoices.id),
      referenceNumber: text("reference_number"),
      contactName: text("contact_name"),
      contactEmail: text("contact_email"),
      contactPhone: text("contact_phone"),
      assignedTo: varchar("assigned_to").references(() => users.id),
      assignedArea: text("assigned_area"),
      reworkCause: text("rework_cause"),
      warrantySerialNumber: text("warranty_serial_number"),
      warrantyValidated: boolean("warranty_validated"),
      warrantyValid: boolean("warranty_valid"),
      resolution: text("resolution"),
      resolvedAt: timestamp("resolved_at"),
      resolvedBy: varchar("resolved_by").references(() => users.id),
      closedAt: timestamp("closed_at"),
      closedBy: varchar("closed_by").references(() => users.id),
      customerConfirmedClose: boolean("customer_confirmed_close"),
      createdBy: varchar("created_by").references(() => users.id),
      accessToken: text("access_token"),
      accessTokenExpires: timestamp("access_token_expires"),
      isFromCustomerPortal: boolean("is_from_customer_portal").default(false),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    incidentComments = pgTable("incident_comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull().references(() => incidents.id),
      userId: varchar("user_id").references(() => users.id),
      content: text("content").notNull(),
      visibility: text("visibility").notNull().default(CommentVisibility.INTERNAL),
      isFromCustomer: boolean("is_from_customer").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    incidentAttachments = pgTable("incident_attachments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull().references(() => incidents.id),
      filename: text("filename").notNull(),
      originalName: text("original_name").notNull(),
      mimeType: text("mime_type").notNull(),
      size: integer("size").notNull(),
      storagePath: text("storage_path").notNull(),
      uploadedBy: varchar("uploaded_by").references(() => users.id),
      isFromCustomer: boolean("is_from_customer").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    incidentActivities = pgTable("incident_activities", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull().references(() => incidents.id),
      userId: varchar("user_id").references(() => users.id),
      action: text("action").notNull(),
      previousValue: text("previous_value"),
      newValue: text("new_value"),
      details: text("details"),
      isFromCustomer: boolean("is_from_customer").notNull().default(false),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    usersRelations = relations(users, ({ many }) => ({
      checkins: many(checkins),
      scheduledVisits: many(scheduledVisits),
      quotations: many(quotations),
      creditAuthorizations: many(creditAuthorizations),
      paymentsRegistered: many(payments)
    }));
    customersRelations = relations(customers, ({ many }) => ({
      checkins: many(checkins),
      scheduledVisits: many(scheduledVisits),
      quotations: many(quotations),
      invoices: many(invoices),
      payments: many(payments),
      locations: many(customerLocations)
    }));
    customerLocationsRelations = relations(customerLocations, ({ one, many }) => ({
      customer: one(customers, {
        fields: [customerLocations.customerId],
        references: [customers.id]
      }),
      checkins: many(checkins),
      scheduledVisits: many(scheduledVisits)
    }));
    checkinsRelations = relations(checkins, ({ one }) => ({
      user: one(users, {
        fields: [checkins.userId],
        references: [users.id]
      }),
      customer: one(customers, {
        fields: [checkins.customerId],
        references: [customers.id]
      }),
      customerLocation: one(customerLocations, {
        fields: [checkins.customerLocationId],
        references: [customerLocations.id]
      })
    }));
    scheduledVisitsRelations = relations(scheduledVisits, ({ one }) => ({
      user: one(users, {
        fields: [scheduledVisits.userId],
        references: [users.id]
      }),
      customer: one(customers, {
        fields: [scheduledVisits.customerId],
        references: [customers.id]
      }),
      customerLocation: one(customerLocations, {
        fields: [scheduledVisits.customerLocationId],
        references: [customerLocations.id]
      }),
      checkin: one(checkins, {
        fields: [scheduledVisits.checkinId],
        references: [checkins.id]
      })
    }));
    quotationsRelations = relations(quotations, ({ one, many }) => ({
      customer: one(customers, {
        fields: [quotations.customerId],
        references: [customers.id]
      }),
      user: one(users, {
        fields: [quotations.userId],
        references: [users.id]
      }),
      items: many(quotationItems),
      creditAuthorization: many(creditAuthorizations),
      order: many(orders)
    }));
    quotationItemsRelations = relations(quotationItems, ({ one }) => ({
      quotation: one(quotations, {
        fields: [quotationItems.quotationId],
        references: [quotations.id]
      }),
      product: one(products, {
        fields: [quotationItems.productId],
        references: [products.id]
      })
    }));
    productCategoriesRelations = relations(productCategories, ({ many }) => ({
      products: many(products)
    }));
    productsRelations = relations(products, ({ one, many }) => ({
      category: one(productCategories, {
        fields: [products.categoryId],
        references: [productCategories.id]
      }),
      customerPrices: many(customerProductPrices),
      quotationItems: many(quotationItems)
    }));
    documentsRelations = relations(documents, ({ one }) => ({
      tenant: one(tenants, {
        fields: [documents.tenantId],
        references: [tenants.id]
      }),
      product: one(products, {
        fields: [documents.productId],
        references: [products.id]
      }),
      uploader: one(users, {
        fields: [documents.uploadedBy],
        references: [users.id]
      })
    }));
    customerProductPricesRelations = relations(customerProductPrices, ({ one }) => ({
      customer: one(customers, {
        fields: [customerProductPrices.customerId],
        references: [customers.id]
      }),
      product: one(products, {
        fields: [customerProductPrices.productId],
        references: [products.id]
      })
    }));
    creditAuthorizationsRelations = relations(creditAuthorizations, ({ one, many }) => ({
      quotation: one(quotations, {
        fields: [creditAuthorizations.quotationId],
        references: [quotations.id]
      }),
      user: one(users, {
        fields: [creditAuthorizations.userId],
        references: [users.id]
      }),
      approvedBy: one(users, {
        fields: [creditAuthorizations.approvedById],
        references: [users.id]
      }),
      rejectedBy: one(users, {
        fields: [creditAuthorizations.rejectedById],
        references: [users.id]
      }),
      lastEditedBy: one(users, {
        fields: [creditAuthorizations.lastEditedById],
        references: [users.id]
      }),
      comments: many(creditAuthorizationComments)
    }));
    creditAuthorizationCommentsRelations = relations(creditAuthorizationComments, ({ one }) => ({
      creditAuthorization: one(creditAuthorizations, {
        fields: [creditAuthorizationComments.creditAuthorizationId],
        references: [creditAuthorizations.id]
      }),
      user: one(users, {
        fields: [creditAuthorizationComments.userId],
        references: [users.id]
      })
    }));
    ordersRelations = relations(orders, ({ one, many }) => ({
      quotation: one(quotations, {
        fields: [orders.quotationId],
        references: [quotations.id]
      }),
      shipment: many(shipments),
      invoice: many(invoices),
      releases: many(orderReleases)
    }));
    orderReleasesRelations = relations(orderReleases, ({ one }) => ({
      order: one(orders, {
        fields: [orderReleases.orderId],
        references: [orders.id]
      }),
      quotationItem: one(quotationItems, {
        fields: [orderReleases.quotationItemId],
        references: [quotationItems.id]
      }),
      releasedBy: one(users, {
        fields: [orderReleases.releasedById],
        references: [users.id]
      })
    }));
    shipmentsRelations = relations(shipments, ({ one, many }) => ({
      order: one(orders, {
        fields: [shipments.orderId],
        references: [orders.id]
      }),
      productInstances: many(shipmentProductInstances)
    }));
    shipmentProductInstancesRelations = relations(shipmentProductInstances, ({ one }) => ({
      shipment: one(shipments, {
        fields: [shipmentProductInstances.shipmentId],
        references: [shipments.id]
      }),
      order: one(orders, {
        fields: [shipmentProductInstances.orderId],
        references: [orders.id]
      }),
      customer: one(customers, {
        fields: [shipmentProductInstances.customerId],
        references: [customers.id]
      }),
      product: one(products, {
        fields: [shipmentProductInstances.productId],
        references: [products.id]
      })
    }));
    invoicesRelations = relations(invoices, ({ one, many }) => ({
      order: one(orders, {
        fields: [invoices.orderId],
        references: [orders.id]
      }),
      customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id]
      }),
      payments: many(payments)
    }));
    paymentsRelations = relations(payments, ({ one }) => ({
      invoice: one(invoices, {
        fields: [payments.invoiceId],
        references: [invoices.id]
      }),
      customer: one(customers, {
        fields: [payments.customerId],
        references: [customers.id]
      }),
      registeredBy: one(users, {
        fields: [payments.registeredBy],
        references: [users.id]
      })
    }));
    incidentsRelations = relations(incidents, ({ one, many }) => ({
      customer: one(customers, {
        fields: [incidents.customerId],
        references: [customers.id]
      }),
      product: one(products, {
        fields: [incidents.productId],
        references: [products.id]
      }),
      productInstance: one(shipmentProductInstances, {
        fields: [incidents.productInstanceId],
        references: [shipmentProductInstances.id]
      }),
      order: one(orders, {
        fields: [incidents.orderId],
        references: [orders.id]
      }),
      invoice: one(invoices, {
        fields: [incidents.invoiceId],
        references: [invoices.id]
      }),
      assignee: one(users, {
        fields: [incidents.assignedTo],
        references: [users.id],
        relationName: "assignedIncidents"
      }),
      resolver: one(users, {
        fields: [incidents.resolvedBy],
        references: [users.id],
        relationName: "resolvedIncidents"
      }),
      closer: one(users, {
        fields: [incidents.closedBy],
        references: [users.id],
        relationName: "closedIncidents"
      }),
      creator: one(users, {
        fields: [incidents.createdBy],
        references: [users.id],
        relationName: "createdIncidents"
      }),
      comments: many(incidentComments),
      attachments: many(incidentAttachments),
      activities: many(incidentActivities)
    }));
    incidentCommentsRelations = relations(incidentComments, ({ one }) => ({
      incident: one(incidents, {
        fields: [incidentComments.incidentId],
        references: [incidents.id]
      }),
      user: one(users, {
        fields: [incidentComments.userId],
        references: [users.id]
      })
    }));
    incidentAttachmentsRelations = relations(incidentAttachments, ({ one }) => ({
      incident: one(incidents, {
        fields: [incidentAttachments.incidentId],
        references: [incidents.id]
      }),
      uploader: one(users, {
        fields: [incidentAttachments.uploadedBy],
        references: [users.id]
      })
    }));
    incidentActivitiesRelations = relations(incidentActivities, ({ one }) => ({
      incident: one(incidents, {
        fields: [incidentActivities.incidentId],
        references: [incidents.id]
      }),
      user: one(users, {
        fields: [incidentActivities.userId],
        references: [users.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true
    });
    insertCustomerSchema = createInsertSchema(customers).omit({
      id: true,
      tenantId: true,
      createdAt: true
    });
    updateCustomerSchema = createInsertSchema(customers).omit({
      id: true,
      createdAt: true
    }).partial();
    insertCustomerLocationSchema = createInsertSchema(customerLocations).omit({
      id: true,
      createdAt: true
    });
    insertCheckinSchema = createInsertSchema(checkins).omit({
      id: true,
      tenantId: true,
      checkinAt: true
    }).extend({
      userId: z.string().optional()
      // Allow backend to set it
    });
    updateCheckinSchema = createInsertSchema(checkins).omit({
      id: true
    }).partial();
    insertScheduledVisitSchema = createInsertSchema(scheduledVisits).omit({
      id: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      userId: z.string().optional(),
      // Allow backend to set it
      scheduledDate: z.coerce.date().refine((date) => {
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }, {
        message: "La fecha programada no puede ser en el pasado"
      })
    });
    updateScheduledVisitSchema = createInsertSchema(scheduledVisits).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).partial().extend({
      userId: z.string().optional(),
      // Allow backend to preserve it
      scheduledDate: z.coerce.date().refine((date) => {
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }, {
        message: "La fecha programada no puede ser en el pasado"
      }).optional()
    });
    insertPendingUploadSchema = createInsertSchema(pendingUploads).omit({
      createdAt: true
    });
    insertQuotationSchema = createInsertSchema(quotations).omit({
      id: true,
      tenantId: true,
      createdAt: true,
      folio: true
    });
    insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
      id: true
    });
    insertCreditAuthorizationSchema = createInsertSchema(creditAuthorizations).omit({
      id: true,
      createdAt: true
    });
    insertCreditAuthorizationCommentSchema = createInsertSchema(creditAuthorizationComments).omit({
      id: true,
      createdAt: true
    });
    insertOrderSchema = createInsertSchema(orders).omit({
      id: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true
    });
    insertOrderReleaseSchema = createInsertSchema(orderReleases).omit({
      id: true,
      createdAt: true
    });
    insertShipmentSchema = createInsertSchema(shipments).omit({
      id: true,
      tenantId: true,
      createdAt: true
    });
    insertShipmentProductInstanceSchema = createInsertSchema(shipmentProductInstances).omit({
      id: true,
      createdAt: true
    });
    insertInvoiceSchema = createInsertSchema(invoices).omit({
      id: true,
      tenantId: true,
      issuedAt: true,
      createdAt: true
    }).extend({
      dueDate: z.coerce.date().optional(),
      paidAt: z.coerce.date().optional()
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      tenantId: true,
      createdAt: true
    });
    insertProductCategorySchema = createInsertSchema(productCategories).omit({
      id: true,
      tenantId: true,
      createdAt: true
    });
    emptyToNull = z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional());
    emptyToZero = z.preprocess((val) => val === "" ? "0" : val, z.string());
    insertProductSchema = createInsertSchema(products).omit({
      id: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      cost: emptyToNull,
      stock: emptyToZero,
      minStock: emptyToNull,
      maxDiscount: emptyToNull,
      taxRate: emptyToZero
    });
    updateProductSchema = createInsertSchema(products).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).partial();
    insertDocumentSchema = createInsertSchema(documents).omit({
      id: true,
      tenantId: true,
      createdAt: true
    }).extend({
      type: z.enum(["operativo", "despiece"])
    });
    insertCustomerProductPriceSchema = createInsertSchema(customerProductPrices).omit({
      id: true,
      createdAt: true
    });
    updateQuotationSchema = createInsertSchema(quotations).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      folio: true
    }).partial();
    insertIncidentSchema = createInsertSchema(incidents).omit({
      id: true,
      tenantId: true,
      ticketNumber: true,
      createdAt: true,
      updatedAt: true,
      accessToken: true,
      accessTokenExpires: true
    }).extend({
      productInstanceId: emptyToNull,
      orderId: emptyToNull,
      shipmentId: emptyToNull,
      invoiceId: emptyToNull,
      assignedToId: emptyToNull
    });
    updateIncidentSchema = createInsertSchema(incidents).omit({
      id: true,
      ticketNumber: true,
      createdAt: true,
      updatedAt: true,
      accessToken: true,
      accessTokenExpires: true
    }).partial();
    insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({
      id: true,
      createdAt: true
    });
    insertIncidentAttachmentSchema = createInsertSchema(incidentAttachments).omit({
      id: true,
      createdAt: true
    });
    insertIncidentActivitySchema = createInsertSchema(incidentActivities).omit({
      id: true,
      createdAt: true
    });
    microsipConfigs = pgTable("microsip_configs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
      // Firebird connection settings
      host: text("host").notNull(),
      // Firebird server IP or hostname
      port: integer("port").notNull().default(3050),
      // Default Firebird port
      database: text("database").notNull(),
      // Path to .fdb file on the server (inventory/master data)
      cxcDatabase: text("cxc_database"),
      // Optional: separate .fdb for CXC/facturas (DOCTOS_VE, DOCTOS_CC)
      username: text("username").notNull(),
      password: text("password").notNull(),
      // Encrypted in production
      // Sync settings
      enabled: boolean("enabled").notNull().default(false),
      syncCustomers: boolean("sync_customers").notNull().default(true),
      syncProducts: boolean("sync_products").notNull().default(true),
      syncCategories: boolean("sync_categories").notNull().default(true),
      syncInvoices: boolean("sync_invoices").notNull().default(true),
      syncPayments: boolean("sync_payments").notNull().default(true),
      // Sync intervals in minutes
      masterDataInterval: integer("master_data_interval").notNull().default(120),
      // 2 hours for customers, products
      transactionalInterval: integer("transactional_interval").notNull().default(60),
      // 1 hour for invoices, payments
      // Last sync timestamps
      lastCustomerSync: timestamp("last_customer_sync"),
      lastProductSync: timestamp("last_product_sync"),
      lastCategorySync: timestamp("last_category_sync"),
      lastInvoiceSync: timestamp("last_invoice_sync"),
      lastPaymentSync: timestamp("last_payment_sync"),
      // Status
      lastSyncStatus: text("last_sync_status"),
      // 'success', 'error', 'running'
      lastSyncError: text("last_sync_error"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    microsipSyncLogs = pgTable("microsip_sync_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      syncType: text("sync_type").notNull(),
      // 'customers', 'products', 'categories', 'invoices', 'payments', 'full'
      status: text("status").notNull(),
      // 'started', 'success', 'error'
      recordsProcessed: integer("records_processed").default(0),
      recordsCreated: integer("records_created").default(0),
      recordsUpdated: integer("records_updated").default(0),
      recordsSkipped: integer("records_skipped").default(0),
      errorMessage: text("error_message"),
      errorDetails: text("error_details"),
      startedAt: timestamp("started_at").notNull().defaultNow(),
      completedAt: timestamp("completed_at")
    });
    insertMicrosipConfigSchema = createInsertSchema(microsipConfigs).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      lastCustomerSync: true,
      lastProductSync: true,
      lastCategorySync: true,
      lastInvoiceSync: true,
      lastPaymentSync: true,
      lastSyncStatus: true,
      lastSyncError: true
    });
    updateMicrosipConfigSchema = insertMicrosipConfigSchema.partial();
    accountStatementSchedules = pgTable("account_statement_schedules", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      enabled: boolean("enabled").notNull().default(false),
      scheduleDays: integer("schedule_days").array().notNull().default([1, 15]),
      sendHour: integer("send_hour").notNull().default(9),
      onlyOverdue: boolean("only_overdue").notNull().default(false),
      lastRunAt: timestamp("last_run_at"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow()
    });
    insertAccountStatementScheduleSchema = createInsertSchema(accountStatementSchedules).omit({
      id: true,
      lastRunAt: true,
      createdAt: true,
      updatedAt: true
    });
    systemLogs = pgTable("system_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
      category: text("category").notNull(),
      // 'account_statement' | 'microsip_sync' | 'system'
      level: text("level").notNull().default("info"),
      // 'info' | 'warning' | 'error'
      action: text("action"),
      // short label, e.g. 'auto_send', 'manual_send', 'pre_send_refresh'
      message: text("message").notNull(),
      details: jsonb("details"),
      createdAt: timestamp("created_at").notNull().defaultNow()
    });
    insertSystemLogSchema = createInsertSchema(systemLogs).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
var isNeonDatabase, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    isNeonDatabase = process.env.DATABASE_URL.includes("neon.tech");
    if (isNeonDatabase) {
      neonConfig.webSocketConstructor = ws;
      pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
      db = drizzleNeon({ client: pool, schema: schema_exports });
    } else {
      pool = new PgPool({ connectionString: process.env.DATABASE_URL });
      db = drizzlePg({ client: pool, schema: schema_exports });
    }
  }
});

// server/storage.ts
import { eq, desc, and, or, ilike, asc, isNull, sql as sql2 } from "drizzle-orm";
import session2 from "express-session";
import connectPg from "connect-pg-simple";
function getTenantContext(req) {
  const user = req.user;
  const tenant = req.tenant;
  const empresaId = user?.empresaId ?? null;
  const restrictToEmpresa = !user?.isSuperAdmin && user?.role === UserRole.VENDEDOR && !!empresaId;
  if (tenant?.id) {
    return { tenantId: tenant.id, allowGlobal: false, empresaId, restrictToEmpresa };
  }
  if (user?.isSuperAdmin) {
    const selectedTenantId = req.headers["x-selected-tenant-id"];
    if (selectedTenantId) {
      return { tenantId: selectedTenantId, allowGlobal: false, empresaId: null, restrictToEmpresa: false };
    }
    return { tenantId: null, allowGlobal: true, empresaId: null, restrictToEmpresa: false };
  }
  return {
    tenantId: user?.tenantId || null,
    allowGlobal: false,
    empresaId,
    restrictToEmpresa
  };
}
function createTenantScopedStorage(req) {
  return new TenantScopedStorage(req);
}
var PostgresSessionStore, DatabaseStorage, storage, TenantScopedStorage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_db();
    PostgresSessionStore = connectPg(session2);
    DatabaseStorage = class {
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      // Users
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username, tenantId) {
        const conditions = [eq(users.username, username)];
        if (tenantId !== void 0) {
          conditions.push(tenantId ? eq(users.tenantId, tenantId) : isNull(users.tenantId));
        }
        const [user] = await db.select().from(users).where(and(...conditions));
        return user || void 0;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      async updateUser(id, data) {
        const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return user || void 0;
      }
      async getAllUsers() {
        return await db.select().from(users).orderBy(desc(users.createdAt));
      }
      // Empresas
      async getEmpresa(id) {
        const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id));
        return empresa || void 0;
      }
      async getAllEmpresas() {
        return await db.select().from(empresas).orderBy(empresas.name);
      }
      async createEmpresa(insertEmpresa) {
        const [empresa] = await db.insert(empresas).values(insertEmpresa).returning();
        return empresa;
      }
      async updateEmpresa(id, data) {
        const [empresa] = await db.update(empresas).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(empresas.id, id)).returning();
        return empresa || void 0;
      }
      async deleteEmpresa(id) {
        await db.update(users).set({ empresaId: null }).where(eq(users.empresaId, id));
        await db.update(quotations).set({ empresaId: null }).where(eq(quotations.empresaId, id));
        await db.update(orders).set({ empresaId: null }).where(eq(orders.empresaId, id));
        await db.update(shipments).set({ empresaId: null }).where(eq(shipments.empresaId, id));
        const result = await db.delete(empresas).where(eq(empresas.id, id)).returning();
        return result.length > 0;
      }
      // Customers
      async getCustomer(id) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, id));
        return customer || void 0;
      }
      async getAllCustomers() {
        return await db.select().from(customers).orderBy(desc(customers.createdAt));
      }
      async createCustomer(insertCustomer) {
        const [customer] = await db.insert(customers).values(insertCustomer).returning();
        return customer;
      }
      async updateCustomer(id, data) {
        const [customer] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
        return customer || void 0;
      }
      // Customer Locations
      async getCustomerLocation(id) {
        const [location] = await db.select().from(customerLocations).where(eq(customerLocations.id, id));
        return location || void 0;
      }
      async getAllCustomerLocations() {
        return await db.select().from(customerLocations).orderBy(desc(customerLocations.createdAt));
      }
      async getCustomerLocationsByCustomerId(customerId) {
        return await db.select().from(customerLocations).where(eq(customerLocations.customerId, customerId));
      }
      async createCustomerLocation(insertLocation) {
        const [location] = await db.insert(customerLocations).values(insertLocation).returning();
        return location;
      }
      async updateCustomerLocation(id, data) {
        const [location] = await db.update(customerLocations).set(data).where(eq(customerLocations.id, id)).returning();
        return location || void 0;
      }
      // Check-ins
      async getCheckin(id) {
        const [checkin] = await db.select().from(checkins).where(eq(checkins.id, id));
        return checkin || void 0;
      }
      async getAllCheckins() {
        return await db.select().from(checkins).orderBy(desc(checkins.checkinAt));
      }
      async createCheckin(insertCheckin) {
        const [checkin] = await db.insert(checkins).values(insertCheckin).returning();
        return checkin;
      }
      async updateCheckin(id, data) {
        const [checkin] = await db.update(checkins).set(data).where(eq(checkins.id, id)).returning();
        return checkin || void 0;
      }
      // Quotations
      async getQuotation(id) {
        const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
        return quotation || void 0;
      }
      async getAllQuotations() {
        const results = await db.select({
          quotation: quotations,
          customer: {
            id: customers.id,
            name: customers.name,
            rfc: customers.rfc,
            email: customers.email
          }
        }).from(quotations).leftJoin(customers, eq(quotations.customerId, customers.id)).orderBy(desc(quotations.createdAt));
        return results.map((r) => ({
          ...r.quotation,
          customer: r.customer || void 0
        }));
      }
      async createQuotation(insertQuotation) {
        const FOREIGN_RFC = "XEXX010101000";
        let prefix = "MEX";
        if (insertQuotation.customerId) {
          const customer = await this.getCustomer(insertQuotation.customerId);
          if (customer) {
            if (customer.rfc === FOREIGN_RFC) {
              prefix = "EXT";
            } else {
              const country = (customer.country || "").trim().toLowerCase();
              const mexican = ["m\xE9xico", "mexico", "mx", "mex"];
              if (country) {
                prefix = mexican.includes(country) ? "MEX" : "EXT";
              }
            }
          }
        }
        const maxAttempts = 8;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const [row] = await db.select({
            next: sql2`COALESCE(MAX(CAST(substring(${quotations.folio} from ${`^${prefix}-([0-9]+)$`}) AS INTEGER)), 0) + 1`
          }).from(quotations).where(sql2`${quotations.folio} LIKE ${`${prefix}-%`}`);
          const next = Number(row?.next ?? 1);
          const folio = `${prefix}-${next}`;
          try {
            const [quotation] = await db.insert(quotations).values({ ...insertQuotation, folio }).returning();
            return quotation;
          } catch (err) {
            if (err?.code === "23505" && attempt < maxAttempts - 1) {
              continue;
            }
            throw err;
          }
        }
        throw new Error("No se pudo generar un folio \xFAnico para la cotizaci\xF3n");
      }
      async updateQuotation(id, data) {
        const [quotation] = await db.update(quotations).set(data).where(eq(quotations.id, id)).returning();
        return quotation || void 0;
      }
      // Quotation Items
      async getQuotationItems(quotationId) {
        return await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
      }
      async createQuotationItem(insertItem) {
        const [item] = await db.insert(quotationItems).values(insertItem).returning();
        return item;
      }
      async deleteQuotationItem(id) {
        await db.delete(quotationItems).where(eq(quotationItems.id, id));
      }
      // Credit Authorizations
      async getCreditAuthorization(id) {
        const [auth] = await db.select().from(creditAuthorizations).where(eq(creditAuthorizations.id, id));
        return auth || void 0;
      }
      async getAllCreditAuthorizations() {
        return await db.select().from(creditAuthorizations).orderBy(desc(creditAuthorizations.createdAt));
      }
      async createCreditAuthorization(insertAuth) {
        const [auth] = await db.insert(creditAuthorizations).values(insertAuth).returning();
        return auth;
      }
      async updateCreditAuthorization(id, data) {
        const [auth] = await db.update(creditAuthorizations).set(data).where(eq(creditAuthorizations.id, id)).returning();
        return auth || void 0;
      }
      // Orders
      async getOrder(id) {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order || void 0;
      }
      async getAllOrders() {
        return await db.select().from(orders).where(eq(orders.releaseStatus, "approved")).orderBy(desc(orders.createdAt));
      }
      async createOrder(insertOrder) {
        const [order] = await db.insert(orders).values(insertOrder).returning();
        return order;
      }
      async updateOrder(id, data) {
        const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
        return order || void 0;
      }
      // Order Releases
      async getOrderReleases(orderId) {
        return await db.select().from(orderReleases).where(eq(orderReleases.orderId, orderId)).orderBy(desc(orderReleases.createdAt));
      }
      async createOrderRelease(insertRelease) {
        const [release] = await db.insert(orderReleases).values(insertRelease).returning();
        return release;
      }
      // Shipments
      async getShipment(id) {
        const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
        return shipment || void 0;
      }
      async getAllShipments() {
        return await db.select().from(shipments).orderBy(desc(shipments.createdAt));
      }
      async createShipment(insertShipment) {
        const [shipment] = await db.insert(shipments).values(insertShipment).returning();
        return shipment;
      }
      async updateShipment(id, data) {
        const [shipment] = await db.update(shipments).set(data).where(eq(shipments.id, id)).returning();
        return shipment || void 0;
      }
      // Invoices
      async getInvoice(id) {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
        return invoice || void 0;
      }
      async getAllInvoices() {
        return await db.select().from(invoices).orderBy(desc(invoices.issuedAt));
      }
      async createInvoice(insertInvoice) {
        const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
        return invoice;
      }
      async updateInvoice(id, data) {
        const [invoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
        return invoice || void 0;
      }
      async getInvoicesByCustomer(customerId) {
        return await db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(desc(invoices.issuedAt));
      }
      async getPendingInvoicesByCustomer(customerId) {
        return await db.select().from(invoices).where(
          and(
            eq(invoices.customerId, customerId),
            eq(invoices.status, "pending_payment")
          )
        ).orderBy(desc(invoices.dueDate));
      }
      // Payments
      async getPayment(id) {
        const [payment] = await db.select().from(payments).where(eq(payments.id, id));
        return payment || void 0;
      }
      async getAllPayments() {
        return await db.select().from(payments).orderBy(desc(payments.createdAt));
      }
      async getPaymentsByCustomer(customerId) {
        return await db.select().from(payments).where(eq(payments.customerId, customerId)).orderBy(desc(payments.paymentDate));
      }
      async createPayment(insertPayment) {
        const [payment] = await db.insert(payments).values(insertPayment).returning();
        return payment;
      }
      // Product Categories
      async getProductCategory(id) {
        const [category] = await db.select().from(productCategories).where(eq(productCategories.id, id));
        return category || void 0;
      }
      async getAllProductCategories() {
        return await db.select().from(productCategories).orderBy(productCategories.name);
      }
      async createProductCategory(insertCategory) {
        const [category] = await db.insert(productCategories).values(insertCategory).returning();
        return category;
      }
      async updateProductCategory(id, data) {
        const [category] = await db.update(productCategories).set(data).where(eq(productCategories.id, id)).returning();
        return category || void 0;
      }
      // Products
      async getProduct(id) {
        const [product] = await db.select().from(products).where(eq(products.id, id));
        return product || void 0;
      }
      async getProductByCode(code) {
        const [product] = await db.select().from(products).where(eq(products.code, code));
        return product || void 0;
      }
      async getAllProducts() {
        return await db.select().from(products).orderBy(products.name);
      }
      async searchProducts(query) {
        const searchQuery = `%${query.toLowerCase()}%`;
        return await db.select().from(products).where(
          or(
            ilike(products.code, searchQuery),
            ilike(products.name, searchQuery),
            ilike(products.brand ?? "", searchQuery)
          )
        ).orderBy(asc(products.name));
      }
      async createProduct(insertProduct) {
        const [product] = await db.insert(products).values(insertProduct).returning();
        return product;
      }
      async updateProduct(id, data) {
        const [product] = await db.update(products).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, id)).returning();
        return product || void 0;
      }
      // Customer Product Prices
      async getCustomerProductPrice(customerId, productId) {
        const [price] = await db.select().from(customerProductPrices).where(and(
          eq(customerProductPrices.customerId, customerId),
          eq(customerProductPrices.productId, productId)
        ));
        return price || void 0;
      }
      async getCustomerProductPrices(customerId) {
        return await db.select().from(customerProductPrices).where(eq(customerProductPrices.customerId, customerId));
      }
      async createCustomerProductPrice(insertPrice) {
        const [price] = await db.insert(customerProductPrices).values(insertPrice).returning();
        return price;
      }
      // Documents
      async getAllDocuments() {
        return await db.select().from(documents).orderBy(desc(documents.createdAt));
      }
      async getDocument(id) {
        const [document] = await db.select().from(documents).where(eq(documents.id, id));
        return document || void 0;
      }
      async createDocument(insertDocument) {
        const [document] = await db.insert(documents).values(insertDocument).returning();
        return document;
      }
      async deleteDocument(id) {
        await db.delete(documents).where(eq(documents.id, id));
      }
    };
    storage = new DatabaseStorage();
    TenantScopedStorage = class {
      constructor(req) {
        this.ctx = getTenantContext(req);
        this.base = storage;
      }
      // Helper to add tenantId to insert data
      withTenant(data) {
        if (this.ctx.allowGlobal || !this.ctx.tenantId) {
          return data;
        }
        return { ...data, tenantId: this.ctx.tenantId };
      }
      // Helper to build tenant filter
      tenantFilter(table) {
        if (this.ctx.allowGlobal || !this.ctx.tenantId) {
          return void 0;
        }
        return eq(table.tenantId, this.ctx.tenantId);
      }
      // Get tenantId for current context
      getTenantId() {
        return this.ctx.tenantId;
      }
      isGlobalAccess() {
        return this.ctx.allowGlobal;
      }
      // The empresa this user is restricted to (only vendedores bound to an empresa).
      getRestrictedEmpresaId() {
        return this.ctx.restrictToEmpresa ? this.ctx.empresaId : null;
      }
      // Builds the "empresaId = X" filter for commercial documents when the current user
      // is restricted to a single empresa. Returns undefined for global roles (see all).
      empresaFilter(table) {
        if (!this.ctx.restrictToEmpresa || !this.ctx.empresaId) {
          return void 0;
        }
        return eq(table.empresaId, this.ctx.empresaId);
      }
      // ==================== EMPRESAS (tenant-scoped) ====================
      async getAllEmpresas() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllEmpresas();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(empresas).where(eq(empresas.tenantId, this.ctx.tenantId)).orderBy(empresas.name);
      }
      async getEmpresa(id) {
        const empresa = await this.base.getEmpresa(id);
        if (!empresa) return void 0;
        if (!this.ctx.allowGlobal && empresa.tenantId !== this.ctx.tenantId) return void 0;
        return empresa;
      }
      async createEmpresa(data) {
        const tenantId = this.ctx.tenantId;
        if (!tenantId) {
          throw new Error("No se puede crear una empresa sin contexto de tenant");
        }
        return this.base.createEmpresa({ ...data, tenantId });
      }
      async updateEmpresa(id, data) {
        const existing = await this.getEmpresa(id);
        if (!existing) return void 0;
        const { tenantId: _ignore, ...rest } = data;
        return this.base.updateEmpresa(id, rest);
      }
      async deleteEmpresa(id) {
        const existing = await this.getEmpresa(id);
        if (!existing) return false;
        return this.base.deleteEmpresa(id);
      }
      // ==================== TENANT-AWARE METHODS ====================
      // Users
      async getAllUsers() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllUsers();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(users).where(eq(users.tenantId, this.ctx.tenantId)).orderBy(desc(users.createdAt));
      }
      // Customers
      async getAllCustomers() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllCustomers();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(customers).where(eq(customers.tenantId, this.ctx.tenantId)).orderBy(desc(customers.createdAt));
      }
      async createCustomer(data) {
        return this.base.createCustomer(this.withTenant(data));
      }
      async getCustomer(id) {
        const customer = await this.base.getCustomer(id);
        if (!customer) return void 0;
        if (!this.ctx.allowGlobal && customer.tenantId !== this.ctx.tenantId) {
          return void 0;
        }
        return customer;
      }
      async updateCustomer(id, data) {
        const existing = await this.getCustomer(id);
        if (!existing) return void 0;
        return this.base.updateCustomer(id, data);
      }
      // Checkins
      async getAllCheckins() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllCheckins();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(checkins).where(eq(checkins.tenantId, this.ctx.tenantId)).orderBy(desc(checkins.checkinAt));
      }
      async createCheckin(data) {
        return this.base.createCheckin(this.withTenant(data));
      }
      // Quotations
      async getAllQuotations() {
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
            email: customers.email
          }
        }).from(quotations).leftJoin(customers, eq(quotations.customerId, customers.id)).where(empresaCond ? and(eq(quotations.tenantId, this.ctx.tenantId), empresaCond) : eq(quotations.tenantId, this.ctx.tenantId)).orderBy(desc(quotations.createdAt));
        return results.map((r) => ({
          ...r.quotation,
          customer: r.customer || void 0
        }));
      }
      async createQuotation(data) {
        const withEmpresa = this.ctx.restrictToEmpresa && this.ctx.empresaId ? { ...data, empresaId: this.ctx.empresaId } : data;
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
                  customer: true
                }
              }
            },
            orderBy: (o, { desc: desc3 }) => [desc3(o.createdAt)]
          });
        }
        if (!this.ctx.tenantId) return [];
        const empresaCond = this.empresaFilter(orders);
        return await db.query.orders.findMany({
          where: empresaCond ? and(eq(orders.tenantId, this.ctx.tenantId), eq(orders.releaseStatus, "approved"), empresaCond) : and(eq(orders.tenantId, this.ctx.tenantId), eq(orders.releaseStatus, "approved")),
          with: {
            quotation: {
              with: {
                customer: true
              }
            }
          },
          orderBy: (o, { desc: desc3 }) => [desc3(o.createdAt)]
        });
      }
      async createOrder(data) {
        let empresaId = null;
        if (data.quotationId) {
          const quotation = await this.getQuotation(data.quotationId);
          if (!quotation) {
            throw new Error("Cotizaci\xF3n no encontrada o fuera de tu alcance");
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
                      customer: true
                    }
                  }
                }
              }
            },
            orderBy: (s, { desc: desc3 }) => [desc3(s.createdAt)]
          });
        }
        if (!this.ctx.tenantId) return [];
        const empresaCond = this.empresaFilter(shipments);
        return await db.query.shipments.findMany({
          where: empresaCond ? and(eq(shipments.tenantId, this.ctx.tenantId), empresaCond) : eq(shipments.tenantId, this.ctx.tenantId),
          with: {
            order: {
              with: {
                quotation: {
                  with: {
                    customer: true
                  }
                }
              }
            }
          },
          orderBy: (s, { desc: desc3 }) => [desc3(s.createdAt)]
        });
      }
      async createShipment(data) {
        let empresaId = null;
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
      async getAllInvoices() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllInvoices();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(invoices).where(eq(invoices.tenantId, this.ctx.tenantId)).orderBy(desc(invoices.issuedAt));
      }
      async createInvoice(data) {
        return this.base.createInvoice(this.withTenant(data));
      }
      // Payments
      async getAllPayments() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllPayments();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(payments).where(eq(payments.tenantId, this.ctx.tenantId)).orderBy(desc(payments.createdAt));
      }
      async createPayment(data) {
        return this.base.createPayment(this.withTenant(data));
      }
      // Products
      async getAllProducts() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllProducts();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(products).where(eq(products.tenantId, this.ctx.tenantId)).orderBy(products.name);
      }
      async createProduct(data) {
        return this.base.createProduct(this.withTenant(data));
      }
      // Product Categories
      async getAllProductCategories() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllProductCategories();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(productCategories).where(eq(productCategories.tenantId, this.ctx.tenantId)).orderBy(productCategories.name);
      }
      async createProductCategory(data) {
        return this.base.createProductCategory(this.withTenant(data));
      }
      // ==================== OWNERSHIP-VERIFIED METHODS ====================
      // These methods verify tenant ownership before returning/modifying data
      async getUser(id) {
        return this.base.getUser(id);
      }
      async getUserByUsername(username, tenantId) {
        return this.base.getUserByUsername(username, tenantId);
      }
      async createUser(data) {
        return this.base.createUser(this.withTenant(data));
      }
      async updateUser(id, data) {
        return this.base.updateUser(id, data);
      }
      async getCustomerLocation(id) {
        return this.base.getCustomerLocation(id);
      }
      async getAllCustomerLocations() {
        return this.base.getAllCustomerLocations();
      }
      async getCustomerLocationsByCustomerId(customerId) {
        return this.base.getCustomerLocationsByCustomerId(customerId);
      }
      async createCustomerLocation(data) {
        return this.base.createCustomerLocation(data);
      }
      async updateCustomerLocation(id, data) {
        return this.base.updateCustomerLocation(id, data);
      }
      // Checkin with ownership verification
      async getCheckin(id) {
        const checkin = await this.base.getCheckin(id);
        if (!checkin) return void 0;
        if (!this.ctx.allowGlobal && checkin.tenantId !== this.ctx.tenantId) return void 0;
        return checkin;
      }
      async updateCheckin(id, data) {
        const existing = await this.getCheckin(id);
        if (!existing) return void 0;
        return this.base.updateCheckin(id, data);
      }
      // Quotation with ownership verification
      async getQuotation(id) {
        const quotation = await this.base.getQuotation(id);
        if (!quotation) return void 0;
        if (!this.ctx.allowGlobal && quotation.tenantId !== this.ctx.tenantId) return void 0;
        if (this.ctx.restrictToEmpresa && this.ctx.empresaId && quotation.empresaId !== this.ctx.empresaId) return void 0;
        return quotation;
      }
      async updateQuotation(id, data) {
        const existing = await this.getQuotation(id);
        if (!existing) return void 0;
        return this.base.updateQuotation(id, data);
      }
      async getQuotationItems(quotationId) {
        const quotation = await this.getQuotation(quotationId);
        if (!quotation) return [];
        return this.base.getQuotationItems(quotationId);
      }
      async createQuotationItem(data) {
        return this.base.createQuotationItem(data);
      }
      async deleteQuotationItem(id) {
        return this.base.deleteQuotationItem(id);
      }
      // Credit authorization - verify via quotation
      async getCreditAuthorization(id) {
        const auth = await this.base.getCreditAuthorization(id);
        if (!auth) return void 0;
        const quotation = await this.getQuotation(auth.quotationId);
        if (!quotation) return void 0;
        return auth;
      }
      async getAllCreditAuthorizations() {
        const all = await this.base.getAllCreditAuthorizations();
        if (this.ctx.allowGlobal) return all;
        if (!this.ctx.tenantId) return [];
        const accessibleQuotationIds = new Set((await this.getAllQuotations()).map((q) => q.id));
        return all.filter((a) => accessibleQuotationIds.has(a.quotationId));
      }
      async createCreditAuthorization(data) {
        return this.base.createCreditAuthorization(data);
      }
      async updateCreditAuthorization(id, data) {
        const existing = await this.getCreditAuthorization(id);
        if (!existing) return void 0;
        return this.base.updateCreditAuthorization(id, data);
      }
      // Order with ownership verification
      async getOrder(id) {
        const order = await this.base.getOrder(id);
        if (!order) return void 0;
        if (!this.ctx.allowGlobal && order.tenantId !== this.ctx.tenantId) return void 0;
        if (this.ctx.restrictToEmpresa && this.ctx.empresaId && order.empresaId !== this.ctx.empresaId) return void 0;
        return order;
      }
      async updateOrder(id, data) {
        const existing = await this.getOrder(id);
        if (!existing) return void 0;
        return this.base.updateOrder(id, data);
      }
      async getOrderReleases(orderId) {
        const order = await this.getOrder(orderId);
        if (!order) return [];
        return this.base.getOrderReleases(orderId);
      }
      async createOrderRelease(data) {
        return this.base.createOrderRelease(data);
      }
      // Shipment with ownership verification
      async getShipment(id) {
        const shipment = await this.base.getShipment(id);
        if (!shipment) return void 0;
        if (!this.ctx.allowGlobal && shipment.tenantId !== this.ctx.tenantId) return void 0;
        if (this.ctx.restrictToEmpresa && this.ctx.empresaId && shipment.empresaId !== this.ctx.empresaId) return void 0;
        return shipment;
      }
      async updateShipment(id, data) {
        const existing = await this.getShipment(id);
        if (!existing) return void 0;
        return this.base.updateShipment(id, data);
      }
      // Invoice with ownership verification
      async getInvoice(id) {
        const invoice = await this.base.getInvoice(id);
        if (!invoice) return void 0;
        if (!this.ctx.allowGlobal && invoice.tenantId !== this.ctx.tenantId) return void 0;
        return invoice;
      }
      async updateInvoice(id, data) {
        const existing = await this.getInvoice(id);
        if (!existing) return void 0;
        return this.base.updateInvoice(id, data);
      }
      async getInvoicesByCustomer(customerId) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return [];
        return this.base.getInvoicesByCustomer(customerId);
      }
      async getPendingInvoicesByCustomer(customerId) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return [];
        return this.base.getPendingInvoicesByCustomer(customerId);
      }
      // Payment with ownership verification
      async getPayment(id) {
        const payment = await this.base.getPayment(id);
        if (!payment) return void 0;
        if (!this.ctx.allowGlobal && payment.tenantId !== this.ctx.tenantId) return void 0;
        return payment;
      }
      async getPaymentsByCustomer(customerId) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return [];
        if (!this.ctx.tenantId) return [];
        return await db.select().from(payments).where(and(eq(payments.customerId, customerId), eq(payments.tenantId, this.ctx.tenantId))).orderBy(desc(payments.paymentDate));
      }
      // Product with ownership verification
      async getProduct(id) {
        const product = await this.base.getProduct(id);
        if (!product) return void 0;
        if (!this.ctx.allowGlobal && product.tenantId !== this.ctx.tenantId) return void 0;
        return product;
      }
      async getProductByCode(code) {
        const product = await this.base.getProductByCode(code);
        if (!product) return void 0;
        if (!this.ctx.allowGlobal && product.tenantId !== this.ctx.tenantId) return void 0;
        return product;
      }
      async searchProducts(query) {
        if (this.ctx.allowGlobal) {
          return this.base.searchProducts(query);
        }
        const allProducts = await this.base.searchProducts(query);
        return allProducts.filter((p) => p.tenantId === this.ctx.tenantId);
      }
      async updateProduct(id, data) {
        const existing = await this.getProduct(id);
        if (!existing) return void 0;
        return this.base.updateProduct(id, data);
      }
      // Product Category with ownership verification
      async getProductCategory(id) {
        const category = await this.base.getProductCategory(id);
        if (!category) return void 0;
        if (!this.ctx.allowGlobal && category.tenantId !== this.ctx.tenantId) return void 0;
        return category;
      }
      async updateProductCategory(id, data) {
        const existing = await this.getProductCategory(id);
        if (!existing) return void 0;
        return this.base.updateProductCategory(id, data);
      }
      async getCustomerProductPrice(customerId, productId) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return void 0;
        return this.base.getCustomerProductPrice(customerId, productId);
      }
      async getCustomerProductPrices(customerId) {
        const customer = await this.getCustomer(customerId);
        if (!customer) return [];
        return this.base.getCustomerProductPrices(customerId);
      }
      async createCustomerProductPrice(data) {
        return this.base.createCustomerProductPrice(data);
      }
      // Incidents
      async getAllIncidents() {
        if (this.ctx.allowGlobal) {
          return await db.select().from(incidents).orderBy(desc(incidents.createdAt));
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(incidents).where(eq(incidents.tenantId, this.ctx.tenantId)).orderBy(desc(incidents.createdAt));
      }
      // Scheduled Visits
      async getAllScheduledVisits() {
        if (this.ctx.allowGlobal) {
          return await db.query.scheduledVisits.findMany({
            with: {
              customer: true,
              user: true,
              customerLocation: true
            },
            orderBy: (sv, { desc: desc3 }) => [desc3(sv.scheduledDate)]
          });
        }
        if (!this.ctx.tenantId) return [];
        return await db.query.scheduledVisits.findMany({
          where: eq(scheduledVisits.tenantId, this.ctx.tenantId),
          with: {
            customer: true,
            user: true,
            customerLocation: true
          },
          orderBy: (sv, { desc: desc3 }) => [desc3(sv.scheduledDate)]
        });
      }
      // Documents
      async getAllDocuments() {
        if (this.ctx.allowGlobal) {
          return this.base.getAllDocuments();
        }
        if (!this.ctx.tenantId) return [];
        return await db.select().from(documents).where(eq(documents.tenantId, this.ctx.tenantId)).orderBy(desc(documents.createdAt));
      }
      async getDocument(id) {
        const document = await this.base.getDocument(id);
        if (!document) return void 0;
        if (!this.ctx.allowGlobal && document.tenantId !== this.ctx.tenantId) {
          return void 0;
        }
        return document;
      }
      async createDocument(data) {
        const tenantId = this.ctx.tenantId;
        if (!tenantId) {
          throw new Error("Cannot create document without a tenant context");
        }
        return this.base.createDocument({ ...data, tenantId });
      }
      async deleteDocument(id) {
        const existing = await this.getDocument(id);
        if (!existing) {
          throw new Error("Document not found");
        }
        await this.base.deleteDocument(id);
      }
    };
  }
});

// server/objectAcl.ts
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  return false;
}
var ACL_POLICY_METADATA_KEY;
var init_objectAcl = __esm({
  "server/objectAcl.ts"() {
    "use strict";
    ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
  }
});

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
function parseObjectPath(path5) {
  if (!path5.startsWith("/")) {
    path5 = `/${path5}`;
  }
  const pathParts = path5.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
var REPLIT_SIDECAR_ENDPOINT, ACL_POLICY_METADATA_KEY2, objectStorageClient, ObjectNotFoundError, ObjectStorageService;
var init_objectStorage = __esm({
  "server/objectStorage.ts"() {
    "use strict";
    init_objectAcl();
    REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
    ACL_POLICY_METADATA_KEY2 = "custom:aclPolicy";
    objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token"
          }
        },
        universe_domain: "googleapis.com"
      },
      projectId: ""
    });
    ObjectNotFoundError = class _ObjectNotFoundError extends Error {
      constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
      }
    };
    ObjectStorageService = class {
      constructor() {
        this.normalizedPrivateDir = null;
      }
      getPublicObjectSearchPaths() {
        const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        const paths = Array.from(
          new Set(
            pathsStr.split(",").map((path5) => path5.trim()).filter((path5) => path5.length > 0)
          )
        );
        if (paths.length === 0) {
          throw new Error(
            "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
          );
        }
        return paths;
      }
      getPrivateObjectDir() {
        const dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        return dir;
      }
      async searchPublicObject(filePath) {
        for (const searchPath of this.getPublicObjectSearchPaths()) {
          const fullPath = `${searchPath}/${filePath}`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const [exists] = await file.exists();
          if (exists) {
            return file;
          }
        }
        return null;
      }
      async downloadObject(file, res, cacheTtlSec = 3600) {
        try {
          const [metadata] = await file.getMetadata();
          const aclPolicy = await getObjectAclPolicy(file);
          const isPublic = aclPolicy?.visibility === "public";
          res.set({
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Content-Length": metadata.size,
            "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
          });
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
        } catch (error) {
          console.error("Error downloading file:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        }
      }
      getNormalizedPrivateDir() {
        if (!this.normalizedPrivateDir) {
          const privateObjectDir = this.getPrivateObjectDir();
          let normalized = privateObjectDir.startsWith("/") ? privateObjectDir : `/${privateObjectDir}`;
          normalized = normalized.replace(/\/+$/, "");
          normalized = normalized.replace(/\/+/g, "/");
          this.normalizedPrivateDir = normalized;
        }
        return this.normalizedPrivateDir;
      }
      async downloadObjectByPath(objectPath, res, options) {
        try {
          let fullPath;
          if (objectPath.startsWith("/")) {
            fullPath = objectPath;
          } else {
            const normalizedPrivateDir = this.getNormalizedPrivateDir();
            fullPath = `${normalizedPrivateDir}/${objectPath}`;
          }
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const [exists] = await file.exists();
          if (!exists) {
            console.error(`Object not found: ${fullPath}`);
            throw new ObjectNotFoundError();
          }
          const [metadata] = await file.getMetadata();
          const contentType = options?.contentType || metadata.contentType || "application/octet-stream";
          const cacheTtlSec = options?.cacheTtlSec || 3600;
          const headers = {
            "Content-Type": contentType,
            "Cache-Control": `${options?.isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
          };
          if (metadata.size) {
            headers["Content-Length"] = String(metadata.size);
          }
          if (options?.disposition) {
            const filename = options?.filename || objectName.split("/").pop();
            headers["Content-Disposition"] = `${options.disposition}; filename="${filename}"`;
          }
          res.set(headers);
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
        } catch (error) {
          console.error(`Error downloading object by path: ${objectPath}`, error);
          throw error;
        }
      }
      async downloadObjectAsBuffer(objectPath) {
        try {
          let fullPath = objectPath;
          if (!objectPath.startsWith("/")) {
            const privateObjectDir = this.getPrivateObjectDir();
            fullPath = `${privateObjectDir}/${objectPath}`;
          }
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const [exists] = await file.exists();
          if (!exists) {
            console.error(`Object not found: ${fullPath}`);
            throw new ObjectNotFoundError();
          }
          const [buffer] = await file.download();
          return buffer;
        } catch (error) {
          console.error(`Error downloading object as buffer: ${objectPath}`, error);
          throw error;
        }
      }
      async getObjectEntityUploadURL() {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        const objectId = randomUUID();
        const entityId = `uploads/${objectId}`;
        const fullPath = `${privateObjectDir}/${entityId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        const uploadURL = await signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 900
        });
        return { uploadURL, entityId };
      }
      async getObjectEntityFile(entityId) {
        let entityDir = this.getPrivateObjectDir();
        if (!entityDir.endsWith("/")) {
          entityDir = `${entityDir}/`;
        }
        const objectEntityPath = `${entityDir}${entityId}`;
        const { bucketName, objectName } = parseObjectPath(objectEntityPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(objectName);
        const [exists] = await objectFile.exists();
        if (!exists) {
          throw new ObjectNotFoundError();
        }
        return objectFile;
      }
      normalizeObjectEntityPath(rawPath) {
        if (!rawPath.startsWith("https://storage.googleapis.com/")) {
          return null;
        }
        const url = new URL(rawPath);
        let rawObjectPath = url.pathname;
        if (!rawObjectPath.startsWith("/")) {
          rawObjectPath = `/${rawObjectPath}`;
        }
        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.startsWith("/")) {
          objectEntityDir = `/${objectEntityDir}`;
        }
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
          return null;
        }
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return entityId;
      }
      async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
        const entityId = this.normalizeObjectEntityPath(rawPath);
        if (!entityId) {
          throw new Error("Invalid object path: must be under PRIVATE_OBJECT_DIR");
        }
        const objectFile = await this.getObjectEntityFile(entityId);
        await setObjectAclPolicy(objectFile, aclPolicy);
        return entityId;
      }
      async canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission
      }) {
        return canAccessObject({
          userId,
          objectFile,
          requestedPermission: requestedPermission ?? "read" /* READ */
        });
      }
      async uploadPdfStreamToStorage(pdfStream, filename, ownerId) {
        return new Promise((resolve2, reject) => {
          const privateObjectDir = this.getPrivateObjectDir();
          const fullPath = `${privateObjectDir}/minutes/${filename}.pdf`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const writeStream = file.createWriteStream({
            metadata: {
              contentType: "application/pdf",
              metadata: {
                [ACL_POLICY_METADATA_KEY2]: JSON.stringify({
                  owner: ownerId,
                  visibility: "private"
                })
              }
            }
          });
          pdfStream.pipe(writeStream).on("error", (error) => reject(error)).on("finish", () => resolve2(`minutes/${filename}.pdf`));
        });
      }
      async uploadQuotationPdfToStorage(pdfStream, folio, ownerId) {
        return new Promise((resolve2, reject) => {
          const privateObjectDir = this.getPrivateObjectDir();
          const timestamp2 = Date.now();
          const fullPath = `${privateObjectDir}/quotations/${folio}-${timestamp2}.pdf`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const writeStream = file.createWriteStream({
            metadata: {
              contentType: "application/pdf",
              metadata: {
                [ACL_POLICY_METADATA_KEY2]: JSON.stringify({
                  owner: ownerId,
                  visibility: "private"
                })
              }
            }
          });
          pdfStream.pipe(writeStream).on("error", (error) => reject(error)).on("finish", () => resolve2(`quotations/${folio}-${timestamp2}.pdf`));
        });
      }
    };
  }
});

// server/localStorage.ts
import * as fs from "fs";
import * as path from "path";
var STORAGE_BASE_DIR, LocalStorageService, localStorageService;
var init_localStorage = __esm({
  "server/localStorage.ts"() {
    "use strict";
    STORAGE_BASE_DIR = process.env.LOCAL_STORAGE_DIR || "./storage";
    LocalStorageService = class {
      constructor() {
        this.baseDir = path.resolve(STORAGE_BASE_DIR);
        this.ensureDirectories();
      }
      ensureDirectories() {
        const dirs = [
          this.baseDir,
          path.join(this.baseDir, "minutes"),
          path.join(this.baseDir, "quotations"),
          path.join(this.baseDir, "photos"),
          path.join(this.baseDir, "incidents"),
          path.join(this.baseDir, "logos"),
          path.join(this.baseDir, "documents")
        ];
        for (const dir of dirs) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }
      }
      async uploadPdfStreamToStorage(pdfStream, filename, _ownerId) {
        return new Promise((resolve2, reject) => {
          const relativePath = `minutes/${filename}.pdf`;
          const fullPath = path.join(this.baseDir, relativePath);
          const writeStream = fs.createWriteStream(fullPath);
          pdfStream.pipe(writeStream).on("error", (error) => reject(error)).on("finish", () => resolve2(relativePath));
        });
      }
      async uploadQuotationPdfToStorage(pdfStream, folio, _ownerId) {
        return new Promise((resolve2, reject) => {
          const timestamp2 = Date.now();
          const relativePath = `quotations/${folio}-${timestamp2}.pdf`;
          const fullPath = path.join(this.baseDir, relativePath);
          const writeStream = fs.createWriteStream(fullPath);
          pdfStream.pipe(writeStream).on("error", (error) => reject(error)).on("finish", () => resolve2(relativePath));
        });
      }
      async uploadPhotoToStorage(buffer, filename, contentType) {
        const relativePath = `photos/${filename}`;
        const fullPath = path.join(this.baseDir, relativePath);
        await fs.promises.writeFile(fullPath, buffer);
        return relativePath;
      }
      async uploadIncidentAttachment(buffer, entityId, contentType) {
        const relativePath = `incidents/${entityId}`;
        const fullPath = path.join(this.baseDir, relativePath);
        await fs.promises.writeFile(fullPath, buffer);
        return relativePath;
      }
      async uploadDocument(buffer, entityId) {
        const relativePath = `documents/${entityId}.pdf`;
        const fullPath = path.join(this.baseDir, relativePath);
        await fs.promises.writeFile(fullPath, buffer);
        return relativePath;
      }
      async uploadLogo(buffer, tenantId, ext) {
        const filename = `${tenantId}-${Date.now()}.${ext}`;
        const relativePath = `logos/${filename}`;
        const fullPath = path.join(this.baseDir, relativePath);
        await fs.promises.writeFile(fullPath, buffer);
        return relativePath;
      }
      async getFile(relativePath) {
        const fullPath = path.join(this.baseDir, relativePath);
        try {
          return await fs.promises.readFile(fullPath);
        } catch {
          return null;
        }
      }
      async streamFile(relativePath, res) {
        const fullPath = path.join(this.baseDir, relativePath);
        if (!fs.existsSync(fullPath)) {
          return false;
        }
        const stat = fs.statSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypes = {
          ".pdf": "application/pdf",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp"
        };
        res.set({
          "Content-Type": contentTypes[ext] || "application/octet-stream",
          "Content-Length": stat.size,
          "Cache-Control": "private, max-age=3600"
        });
        const readStream = fs.createReadStream(fullPath);
        readStream.pipe(res);
        return true;
      }
      async deleteFile(relativePath) {
        const fullPath = path.join(this.baseDir, relativePath);
        try {
          await fs.promises.unlink(fullPath);
        } catch {
        }
      }
      getFullPath(relativePath) {
        return path.join(this.baseDir, relativePath);
      }
      isLocalStorageEnabled() {
        return process.env.USE_LOCAL_STORAGE === "true" || process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
      }
    };
    localStorageService = new LocalStorageService();
  }
});

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  getAdminEmails: () => getAdminEmails,
  sendCheckoutEmail: () => sendCheckoutEmail,
  sendCompanyWelcomeEmail: () => sendCompanyWelcomeEmail,
  sendIncidentNotificationEmail: () => sendIncidentNotificationEmail,
  sendOrderCancellationEmail: () => sendOrderCancellationEmail,
  sendPasswordResetEmail: () => sendPasswordResetEmail
});
import { MailerSend, EmailParams, Sender, Recipient, Attachment } from "mailersend";
function useLocalStorage() {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.NODE_ENV !== "production" || process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
}
async function sendCheckoutEmail({
  to,
  checkinData,
  pdfPath
}) {
  try {
    if (!to || to.length === 0) {
      throw new Error("No recipients provided for email");
    }
    let pdfBuffer;
    if (useLocalStorage()) {
      console.log(`\u{1F4E5} Reading PDF from local storage: ${pdfPath}`);
      const buffer = await localStorageService.getFile(pdfPath);
      if (!buffer) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }
      pdfBuffer = buffer;
    } else {
      console.log(`\u{1F4E5} Downloading PDF from GCS: ${pdfPath}`);
      const objectStorageService = new ObjectStorageService();
      pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);
    }
    const subject = `Minuta de Visita - ${checkinData.customerName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              background: #ffffff;
              padding: 30px 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
              min-width: 140px;
            }
            .info-value {
              color: #111827;
            }
            .notes {
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              margin-top: 20px;
              border-left: 4px solid #667eea;
            }
            .notes-label {
              font-weight: 600;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .attachment-note {
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1e40af;
              padding: 12px;
              border-radius: 6px;
              margin-top: 20px;
              text-align: center;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>\u{1F4CB} Minuta de Visita</h1>
          </div>
          
          <div class="content">
            <p>Se ha generado una nueva minuta de visita con los siguientes detalles:</p>
            
            <div class="info-row">
              <div class="info-label">Cliente:</div>
              <div class="info-value">${checkinData.customerName}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Vendedor:</div>
              <div class="info-value">${checkinData.vendedorName}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Fecha:</div>
              <div class="info-value">${checkinData.checkoutDate}</div>
            </div>
            
            ${checkinData.notes ? `
              <div class="notes">
                <div class="notes-label">Acuerdos y Comentarios:</div>
                <div>${checkinData.notes}</div>
              </div>
            ` : ""}
            
            <div class="attachment-note">
              \u{1F4CE} La minuta en formato PDF est\xE1 adjunta a este correo
            </div>
          </div>
          
          <div class="footer">
            <p><strong>GRUPO JOPER</strong> - Sistema Comercial</p>
            <p style="font-size: 12px; margin-top: 10px;">
              Este es un correo autom\xE1tico, por favor no responder.
            </p>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender("noreply@nexxo.com.mx", "GRUPO JOPER");
    const attachment = new Attachment(
      pdfBuffer.toString("base64"),
      `minuta-${checkinData.customerName.replace(/\s+/g, "-")}.pdf`,
      "attachment"
    );
    for (const email of to) {
      try {
        const emailParams = new EmailParams().setFrom(sentFrom).setTo([new Recipient(email)]).setSubject(subject).setHtml(htmlContent).setAttachments([attachment]);
        await mailerSend.email.send(emailParams);
        console.log(`\u2705 Email sent successfully to: ${email}`);
      } catch (individualError) {
        console.error(`\u274C Failed to send email to ${email}:`, individualError);
      }
    }
  } catch (error) {
    console.error("\u274C Error sending email:", error);
    throw new Error("Failed to send email");
  }
}
async function getAdminEmails() {
  return [];
}
async function sendIncidentNotificationEmail({
  to,
  eventType,
  incident,
  extraMessage,
  detailUrl,
  tenantName = "Nexxo"
}) {
  try {
    if (!to || to.length === 0) {
      console.warn("\u26A0\uFE0F No admin recipients for incident notification");
      return;
    }
    const headings = {
      created: "Nuevo Incidente Recibido",
      customer_comment: "Nuevo Comentario del Cliente",
      status_change: "Actualizaci\xF3n de Incidente"
    };
    const heading = headings[eventType] || "Notificaci\xF3n de Incidente";
    const subject = `[${incident.ticketNumber}] ${heading} - ${incident.customerName}`;
    const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const row = (label, value) => value ? `<div class="info-row"><div class="info-label">${label}:</div><div class="info-value">${escapeHtml(value)}</div></div>` : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white; padding: 24px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .ticket { font-family: monospace; font-size: 14px; opacity: 0.9; margin-top: 6px; }
            .content { padding: 24px 20px; }
            .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #6b7280; min-width: 130px; }
            .info-value { color: #111827; }
            .message { background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 16px; border-left: 4px solid #4DA3FF; }
            .button-container { text-align: center; margin: 24px 0 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${heading}</h1>
              <div class="ticket">${escapeHtml(incident.ticketNumber)}</div>
            </div>
            <div class="content">
              ${extraMessage ? `<div class="message">${escapeHtml(extraMessage)}</div>` : ""}
              ${row("Cliente", incident.customerName)}
              ${row("Asunto", incident.subject)}
              ${row("Tipo", INCIDENT_TYPE_LABELS[incident.type] || incident.type)}
              ${row("Urgencia", INCIDENT_URGENCY_LABELS[incident.urgency] || incident.urgency)}
              ${row("Estado", INCIDENT_STATUS_LABELS[incident.status] || incident.status)}
              ${row("Descripci\xF3n", incident.description)}
              ${row("Contacto", incident.contactName)}
              ${row("Email", incident.contactEmail)}
              ${row("Tel\xE9fono", incident.contactPhone)}
              ${detailUrl ? `<div class="button-container"><a href="${detailUrl}" class="button">Ver Incidente</a></div>` : ""}
            </div>
            <div class="footer">
              <p><strong>${escapeHtml(tenantName)}</strong> - Sistema Comercial</p>
              <p>Este es un correo autom\xE1tico, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
    for (const email of to) {
      try {
        const emailParams = new EmailParams().setFrom(sentFrom).setTo([new Recipient(email)]).setSubject(subject).setHtml(htmlContent);
        await mailerSend.email.send(emailParams);
        console.log(`\u2705 Incident notification sent to: ${email}`);
      } catch (individualError) {
        console.error(`\u274C Failed to send incident notification to ${email}:`, individualError);
      }
    }
  } catch (error) {
    console.error("\u274C Error sending incident notification:", error);
  }
}
async function sendOrderCancellationEmail({
  to,
  orderData,
  orderUrl,
  tenantName = "Nexxo"
}) {
  try {
    if (!to || to.length === 0) {
      console.warn("\u26A0\uFE0F No admin recipients for order cancellation notification");
      return;
    }
    const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const subject = `Pedido ${orderData.folio} cancelado - ${orderData.customerName}`;
    const row = (label, value) => value ? `<div class="info-row"><div class="info-label">${label}:</div><div class="info-value">${escapeHtml(value)}</div></div>` : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 24px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
            .content { padding: 24px 20px; }
            .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #6b7280; min-width: 130px; }
            .info-value { color: #111827; }
            .reason { background: #fef2f2; padding: 15px; border-radius: 6px; margin-top: 16px; border-left: 4px solid #ef4444; }
            .reason-label { font-weight: 600; color: #6b7280; margin-bottom: 8px; }
            .button-container { text-align: center; margin: 24px 0 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%); color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; }
            .footer { background: #f9fafb; padding: 18px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pedido Cancelado</h1>
            </div>
            <div class="content">
              <p>Se ha cancelado el siguiente pedido:</p>
              ${row("Pedido", orderData.folio)}
              ${row("Cliente", orderData.customerName)}
              ${row("Cancelado por", orderData.cancelledBy)}
              ${row("Fecha", orderData.cancelDate)}
              <div class="reason">
                <div class="reason-label">Raz\xF3n de la cancelaci\xF3n:</div>
                <div>${orderData.reason ? escapeHtml(orderData.reason) : "No se especific\xF3 una raz\xF3n."}</div>
              </div>
              ${orderUrl ? `<div class="button-container"><a href="${orderUrl}" class="button">Ver Pedidos</a></div>` : ""}
            </div>
            <div class="footer">
              <p><strong>${escapeHtml(tenantName)}</strong> - Sistema Comercial</p>
              <p>Este es un correo autom\xE1tico, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
    for (const recipient of to) {
      try {
        const emailParams = new EmailParams().setFrom(sentFrom).setTo([new Recipient(recipient.email, recipient.name)]).setSubject(subject).setHtml(htmlContent);
        await mailerSend.email.send(emailParams);
        console.log(`\u2705 Order cancellation notification sent to: ${recipient.email}`);
      } catch (individualError) {
        console.error(`\u274C Failed to send cancellation notification to ${recipient.email}:`, individualError);
      }
    }
  } catch (error) {
    console.error("\u274C Error sending order cancellation notification:", error);
  }
}
async function sendPasswordResetEmail({
  to,
  userName,
  resetLink,
  tenantName = "Nexxo"
}) {
  try {
    const subject = `Recuperar contrase\xF1a - ${tenantName}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .content p {
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white !important;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .link-text {
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>\u{1F510} Recuperar Contrase\xF1a</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${userName}</strong>,</p>
              
              <p>Recibimos una solicitud para restablecer tu contrase\xF1a en ${tenantName}.</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button">Restablecer Contrase\xF1a</a>
              </div>
              
              <div class="warning">
                \u26A0\uFE0F Este enlace expirar\xE1 en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
              </div>
              
              <p class="link-text">
                Si el bot\xF3n no funciona, copia y pega este enlace en tu navegador:<br>
                ${resetLink}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>${tenantName}</strong> - Sistema Comercial</p>
              <p>Este es un correo autom\xE1tico, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);
    const emailParams = new EmailParams().setFrom(sentFrom).setTo([new Recipient(to)]).setSubject(subject).setHtml(htmlContent);
    await mailerSend.email.send(emailParams);
    console.log(`\u2705 Password reset email sent to: ${to}`);
  } catch (error) {
    console.error("\u274C Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}
async function sendCompanyWelcomeEmail({
  to,
  companyName,
  portalUrl,
  username,
  password,
  pendingApproval = false
}) {
  try {
    const subject = pendingApproval ? `Recibimos el registro de ${companyName} en Nexxo` : `Bienvenido a Nexxo - Tu portal de ${companyName} est\xE1 listo`;
    const introHtml = pendingApproval ? `<p>Recibimos el registro del portal comercial de <strong>${companyName}</strong>. Tu solicitud est\xE1 <strong>en revisi\xF3n</strong>. Te avisaremos en cuanto el equipo de Nexxo active tu portal.</p>` : `<p>El portal comercial de <strong>${companyName}</strong> ha sido creado exitosamente. Ya puedes acceder a tu plataforma personalizada de Nexxo.</p>`;
    const buttonHtml = pendingApproval ? `` : `<div class="button-container"><a href="${portalUrl}" class="button">Acceder a mi portal</a></div>`;
    const credsIntroHtml = pendingApproval ? `<p>Guarda estos datos de acceso. Podr\xE1s iniciar sesi\xF3n una vez que tu portal sea activado:</p>` : `<p>Estos son tus datos de acceso de administrador:</p>`;
    const warningHtml = pendingApproval ? `<div class="warning">Tu portal a\xFAn no est\xE1 activo. Recibir\xE1s acceso en cuanto Nexxo apruebe tu registro.</div>` : `<div class="warning">Por seguridad, te recomendamos cambiar tu contrase\xF1a despu\xE9s de iniciar sesi\xF3n por primera vez.</div>`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px 20px;
            }
            .content p {
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #4DA3FF 0%, #1F3C88 100%);
              color: white !important;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 16px;
            }
            .credentials {
              background: #f0f7ff;
              border: 1px solid #4DA3FF;
              border-radius: 6px;
              padding: 16px 20px;
              margin: 20px 0;
            }
            .credentials p {
              margin: 8px 0;
            }
            .credentials .label {
              color: #6b7280;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .credentials .value {
              font-size: 18px;
              font-weight: 700;
              color: #1F3C88;
              font-family: monospace;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              color: #856404;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .link-text {
              word-break: break-all;
              font-size: 12px;
              color: #6b7280;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>\xA1Bienvenido a Nexxo!</h1>
            </div>

            <div class="content">
              <p>Hola,</p>

              ${introHtml}

              ${buttonHtml}

              ${credsIntroHtml}

              <div class="credentials">
                <p><span class="label">Direcci\xF3n del portal</span><br>
                <a href="${portalUrl}">${portalUrl}</a></p>
                <p><span class="label">Usuario</span><br>
                <span class="value">${username}</span></p>
                <p><span class="label">Contrase\xF1a</span><br>
                <span class="value">${password}</span></p>
              </div>

              ${warningHtml}

              ${pendingApproval ? `` : `<p class="link-text">
                Si el bot\xF3n no funciona, copia y pega este enlace en tu navegador:<br>
                ${portalUrl}
              </p>`}
            </div>

            <div class="footer">
              <p><strong>Nexxo</strong> - Sistema Comercial</p>
              <p>Este es un correo autom\xE1tico, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender("noreply@nexxo.com.mx", "Nexxo");
    const emailParams = new EmailParams().setFrom(sentFrom).setTo([new Recipient(to)]).setSubject(subject).setHtml(htmlContent);
    await mailerSend.email.send(emailParams);
    console.log(`\u2705 Company welcome email sent to: ${to}`);
  } catch (error) {
    console.error("\u274C Error sending company welcome email:", error);
    throw new Error("Failed to send company welcome email");
  }
}
var mailerSend, INCIDENT_TYPE_LABELS, INCIDENT_URGENCY_LABELS, INCIDENT_STATUS_LABELS;
var init_email_service = __esm({
  "server/email-service.ts"() {
    "use strict";
    init_objectStorage();
    init_localStorage();
    mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY || ""
    });
    INCIDENT_TYPE_LABELS = {
      garantia: "Garant\xEDa",
      retrabajo: "Retrabajo",
      queja: "Queja",
      consulta: "Consulta",
      administrativo: "Administrativo"
    };
    INCIDENT_URGENCY_LABELS = {
      baja: "Baja",
      media: "Media",
      alta: "Alta",
      critica: "Cr\xEDtica"
    };
    INCIDENT_STATUS_LABELS = {
      nuevo: "Nuevo",
      asignado: "Asignado",
      en_proceso: "En Proceso",
      esperando_cliente: "Esperando Cliente",
      esperando_interno: "Esperando Interno",
      resuelto: "Resuelto",
      cerrado: "Cerrado",
      cancelado: "Cancelado"
    };
  }
});

// server/auth.ts
var auth_exports = {};
__export(auth_exports, {
  comparePasswords: () => comparePasswords,
  hasRole: () => hasRole,
  hashPassword: () => hashPassword,
  isAuthenticated: () => isAuthenticated,
  setupAuth: () => setupAuth
});
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq as eq2, and as and2, or as or2, isNull as isNull2, gt } from "drizzle-orm";
import { z as z2 } from "zod";
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      // 7 days
      secure: isProduction,
      // Require HTTPS in production
      httpOnly: true,
      // Prevent XSS attacks
      sameSite: isProduction ? "none" : "lax"
      // Allow cross-origin in production
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy({ passReqToCallback: true }, async (req, username, password, done) => {
      try {
        const tenantId = req.tenant?.id || null;
        const tenantCondition = tenantId ? eq2(users.tenantId, tenantId) : isNull2(users.tenantId);
        const [user] = await db.select().from(users).where(
          and2(
            eq2(users.username, username),
            or2(
              tenantCondition,
              eq2(users.isSuperAdmin, true)
            )
          )
        ).limit(1);
        if (!user) {
          console.warn(`[auth] Login failed \u2014 user not found: username="${username}" tenantId="${tenantId}"`);
          return done(null, false, { message: "Usuario o contrase\xF1a incorrectos" });
        }
        if (!user.active) {
          console.warn(`[auth] Login failed \u2014 inactive user: username="${username}"`);
          return done(null, false, { message: "Usuario inactivo. Contacta al administrador." });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.warn(`[auth] Login failed \u2014 wrong password: username="${username}" tenantId="${tenantId}"`);
          return done(null, false, { message: "Usuario o contrase\xF1a incorrectos" });
        }
        return done(null, user);
      } catch (error) {
        console.error(`[auth] Login error:`, error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const registerSchema = z2.object({
        username: z2.string().min(3).max(50),
        password: z2.string().min(6),
        fullName: z2.string().min(1).max(100),
        email: z2.string().email(),
        role: z2.enum([
          UserRole.ADMIN,
          UserRole.VENDEDOR,
          UserRole.CREDITO_COBRANZA,
          UserRole.VENTAS_LOGISTICA,
          UserRole.FABRICA,
          UserRole.EMBARQUES,
          UserRole.FACTURACION
        ]),
        active: z2.boolean().optional(),
        empresaId: z2.string().nullable().optional()
      });
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inv\xE1lidos",
          details: validationResult.error.errors
        });
      }
      const userData = validationResult.data;
      const isAuthenticated2 = req.isAuthenticated();
      const isAdmin = isAuthenticated2 && req.user?.role === UserRole.ADMIN;
      const allUsers = await storage.getAllUsers();
      const isFirstUser = allUsers.length === 0;
      if (!isFirstUser && !isAdmin) {
        return res.status(403).json({
          error: isAuthenticated2 ? "Solo administradores pueden crear usuarios" : "No autorizado. El registro p\xFAblico est\xE1 deshabilitado."
        });
      }
      const tenantId = req.tenant?.id || null;
      const existingUser = await storage.getUserByUsername(userData.username, tenantId);
      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }
      const user = await storage.createUser({
        username: userData.username,
        password: await hashPassword(userData.password),
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        active: userData.active ?? true,
        tenantId,
        empresaId: userData.empresaId ?? null
      });
      if (isFirstUser && !isAuthenticated2) {
        const usersAfterCreate = await storage.getAllUsers();
        if (usersAfterCreate.length > 1) {
          await db.delete(users).where(eq2(users.id, user.id));
          return res.status(409).json({
            error: "El registro p\xFAblico ya no est\xE1 disponible. Por favor contacta al administrador."
          });
        }
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      } else {
        res.status(201).json(user);
      }
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/register-company", async (req, res) => {
    try {
      const schema = z2.object({
        companyName: z2.string().trim().min(2, "El nombre de la empresa es requerido").max(100),
        phone: z2.string().trim().min(7, "El tel\xE9fono es requerido").max(50),
        contactEmail: z2.string().trim().email("Correo de contacto inv\xE1lido")
      });
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inv\xE1lidos",
          details: validationResult.error.errors
        });
      }
      const { companyName, phone, contactEmail } = validationResult.data;
      const existingTenants = await db.select().from(tenants);
      const nameTaken = existingTenants.some(
        (t) => t.name.trim().toLowerCase() === companyName.toLowerCase()
      );
      if (nameTaken) {
        return res.status(409).json({
          error: "La empresa ya fue registrada. Si necesitas acceso, contacta a tu administrador."
        });
      }
      const baseSlug = companyName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) || "empresa";
      const usedSubdomains = new Set(existingTenants.map((t) => t.subdomain));
      let suffix = 0;
      let subdomain = baseSlug;
      while (usedSubdomains.has(subdomain)) {
        suffix++;
        subdomain = `${baseSlug}${suffix}`;
      }
      const generatedPassword = randomBytes(6).toString("base64url").slice(0, 10);
      const hashedPassword = await hashPassword(generatedPassword);
      const MAX_ATTEMPTS = 6;
      let newTenant;
      let username = "";
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        username = `admin_${subdomain}`;
        try {
          newTenant = await db.transaction(async (tx) => {
            const [tenant] = await tx.insert(tenants).values({
              name: companyName,
              subdomain,
              email: contactEmail,
              phone,
              active: false
            }).returning();
            await tx.insert(users).values({
              username,
              password: hashedPassword,
              fullName: "Administrador",
              email: contactEmail,
              role: UserRole.ADMIN,
              active: true,
              tenantId: tenant.id
            });
            return tenant;
          });
          break;
        } catch (err) {
          if (err?.code === "23505" && attempt < MAX_ATTEMPTS - 1) {
            suffix++;
            subdomain = `${baseSlug}${suffix}`;
            continue;
          }
          throw err;
        }
      }
      if (!newTenant) {
        return res.status(500).json({ error: "Error al registrar la empresa" });
      }
      const baseDomain = "nexxo.com.mx";
      const portalUrl = `https://${subdomain}.${baseDomain}`;
      sendCompanyWelcomeEmail({
        to: contactEmail,
        companyName,
        portalUrl,
        username,
        password: generatedPassword,
        pendingApproval: true
      }).catch((err) => {
        console.error("Failed to send company welcome email:", err);
      });
      res.status(201).json({
        message: "Empresa registrada. Est\xE1 en revisi\xF3n y ser\xE1 activada por Nexxo.",
        companyName,
        subdomain,
        portalUrl,
        emailSentTo: contactEmail,
        pendingApproval: true
      });
    } catch (error) {
      if (error?.code === "23505") {
        return res.status(409).json({
          error: "La empresa ya fue registrada. Si necesitas acceso, contacta a tu administrador."
        });
      }
      console.error("Error in register-company:", error);
      res.status(500).json({ error: "Error al registrar la empresa" });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          error: info?.message || "Credenciales incorrectas"
        });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  app2.get("/api/allow-registration", async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json({ allowed: allUsers.length === 0 });
    } catch (error) {
      res.status(500).json({ allowed: false });
    }
  });
  app2.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "El correo es requerido" });
      }
      const tenantId = req.tenant?.id || null;
      let user;
      if (tenantId) {
        [user] = await db.select().from(users).where(and2(eq2(users.email, email), eq2(users.tenantId, tenantId))).limit(1);
      } else {
        [user] = await db.select().from(users).where(eq2(users.email, email)).limit(1);
      }
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.json({ message: "Si el correo existe, recibir\xE1s un enlace de recuperaci\xF3n" });
      }
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt
      });
      const host = req.get("host") || "nexxo.com.mx";
      const protocol = req.secure || process.env.NODE_ENV === "production" ? "https" : "http";
      const resetLink = `${protocol}://${host}/reset-password?token=${token}`;
      let tenantName = "Nexxo";
      if (user.tenantId) {
        const [tenant] = await db.select().from(tenants).where(eq2(tenants.id, user.tenantId)).limit(1);
        if (tenant) {
          tenantName = tenant.name;
        }
      }
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.fullName,
        resetLink,
        tenantName
      });
      res.json({ message: "Si el correo existe, recibir\xE1s un enlace de recuperaci\xF3n" });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res.status(500).json({ error: "Error al procesar la solicitud" });
    }
  });
  app2.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token y nueva contrase\xF1a son requeridos" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "La contrase\xF1a debe tener al menos 6 caracteres" });
      }
      const [resetToken] = await db.select().from(passwordResetTokens).where(
        and2(
          eq2(passwordResetTokens.token, token),
          eq2(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
        )
      ).limit(1);
      if (!resetToken) {
        return res.status(400).json({ error: "El enlace ha expirado o no es v\xE1lido" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await db.update(users).set({ password: hashedPassword }).where(eq2(users.id, resetToken.userId));
      await db.update(passwordResetTokens).set({ used: true }).where(eq2(passwordResetTokens.id, resetToken.id));
      res.json({ message: "Contrase\xF1a actualizada exitosamente" });
    } catch (error) {
      console.error("Error in reset-password:", error);
      res.status(500).json({ error: "Error al restablecer la contrase\xF1a" });
    }
  });
  app2.get("/api/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, error: "Token requerido" });
      }
      const [resetToken] = await db.select().from(passwordResetTokens).where(
        and2(
          eq2(passwordResetTokens.token, token),
          eq2(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
        )
      ).limit(1);
      if (!resetToken) {
        return res.json({ valid: false, error: "El enlace ha expirado o no es v\xE1lido" });
      }
      res.json({ valid: true });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ valid: false, error: "Error al verificar el token" });
    }
  });
}
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(401);
}
function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
}
var scryptAsync;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_storage();
    init_schema();
    init_db();
    init_email_service();
    scryptAsync = promisify(scrypt);
  }
});

// server/quotation-email-service.ts
var quotation_email_service_exports = {};
__export(quotation_email_service_exports, {
  sendCreditAuthNewRequestEmail: () => sendCreditAuthNewRequestEmail,
  sendCreditAuthStatusEmail: () => sendCreditAuthStatusEmail,
  sendOrderReleaseEmail: () => sendOrderReleaseEmail,
  sendOrderReleasePendingEmail: () => sendOrderReleasePendingEmail,
  sendQuotationEmail: () => sendQuotationEmail,
  sendShippingApprovalRequestEmail: () => sendShippingApprovalRequestEmail,
  sendShippingRejectionEmail: () => sendShippingRejectionEmail,
  sendWarrantySheetEmail: () => sendWarrantySheetEmail
});
import { MailerSend as MailerSend2, EmailParams as EmailParams2, Sender as Sender2, Recipient as Recipient2, Attachment as Attachment2 } from "mailersend";
function useLocalStorage2() {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.NODE_ENV !== "production" || process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
}
async function sendQuotationEmail({
  to,
  quotationData,
  pdfPath,
  approvalUrl
}) {
  try {
    if (!to || to.length === 0) {
      throw new Error("No recipients provided for email");
    }
    let pdfBuffer;
    if (useLocalStorage2()) {
      console.log(`\u{1F4E5} Reading quotation PDF from local storage: ${pdfPath}`);
      const buffer = await localStorageService.getFile(pdfPath);
      if (!buffer) {
        throw new Error(`PDF not found in local storage: ${pdfPath}`);
      }
      pdfBuffer = buffer;
    } else {
      console.log(`\u{1F4E5} Downloading quotation PDF from GCS: ${pdfPath}`);
      const objectStorageService = new ObjectStorageService();
      pdfBuffer = await objectStorageService.downloadObjectAsBuffer(pdfPath);
    }
    const subject = `Cotizaci\xF3n ${quotationData.folio} - GRUPO JOPER`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .header p {
              margin: 10px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px 25px;
            }
            .greeting {
              font-size: 18px;
              color: #2d3748;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f7fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #1a365d;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #4a5568;
            }
            .info-value {
              color: #2d3748;
              font-weight: 500;
            }
            .total-row {
              background: #1a365d;
              color: white;
              padding: 15px;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
            }
            .total-label {
              font-size: 16px;
              font-weight: 600;
            }
            .total-value {
              font-size: 20px;
              font-weight: 700;
            }
            .cta-box {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #edf2f7;
              border-radius: 8px;
            }
            .cta-text {
              color: #4a5568;
              margin-bottom: 10px;
            }
            .approval-section {
              background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
              padding: 25px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: center;
            }
            .approval-title {
              color: white;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 15px;
            }
            .approval-btn {
              display: inline-block;
              background: white;
              color: #38a169;
              padding: 14px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 700;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .approval-note {
              color: rgba(255,255,255,0.9);
              font-size: 12px;
              margin-top: 12px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f7fafc;
              color: #718096;
              font-size: 12px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GRUPO JOPER</h1>
              <p>Sistema Comercial</p>
            </div>
            <div class="content">
              <p class="greeting">Estimado(a) cliente,</p>
              <p>Es un placer enviarle la cotizaci\xF3n solicitada. A continuaci\xF3n encontrar\xE1 un resumen:</p>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Folio:</span>
                  <span class="info-value">${quotationData.folio}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Cliente:</span>
                  <span class="info-value">${quotationData.customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Vendedor:</span>
                  <span class="info-value">${quotationData.vendedorName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Productos:</span>
                  <span class="info-value">${quotationData.itemsCount} art\xEDculo(s)</span>
                </div>
                ${quotationData.validUntil ? `
                <div class="info-row">
                  <span class="info-label">Vigencia:</span>
                  <span class="info-value">${quotationData.validUntil}</span>
                </div>
                ` : ""}
                <div class="total-row">
                  <span class="total-label">TOTAL:</span>
                  <span class="total-value">${quotationData.total} ${quotationData.currency}</span>
                </div>
              </div>

              <div class="cta-box">
                <p class="cta-text">La cotizaci\xF3n completa en formato PDF se encuentra adjunta a este correo.</p>
              </div>

              ${approvalUrl ? `
              <div class="approval-section">
                <p class="approval-title">\xBFDesea proceder con esta cotizaci\xF3n?</p>
                <a href="${approvalUrl}" class="approval-btn">Revisar y Aprobar Cotizaci\xF3n</a>
                <p class="approval-note">Al hacer clic, podr\xE1 revisar los detalles y confirmar su decisi\xF3n.</p>
              </div>
              ` : ""}

              <p>Si tiene alguna pregunta o desea realizar alg\xFAn cambio, no dude en contactarnos. Estamos a sus \xF3rdenes.</p>
              
              <p>Atentamente,<br><strong>${quotationData.vendedorName}</strong><br>GRUPO JOPER</p>
            </div>
            <div class="footer">
              <p>Este correo fue enviado autom\xE1ticamente desde el Sistema Comercial de GRUPO JOPER.</p>
              <p>Por favor, no responda directamente a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const sentFrom = new Sender2(
      "noreply@nexxo.com.mx",
      "GRUPO JOPER - Sistema Comercial"
    );
    const recipients = to.map((email) => new Recipient2(email));
    const attachments = [
      new Attachment2(
        pdfBuffer.toString("base64"),
        `cotizacion-${quotationData.folio}.pdf`,
        "attachment"
      )
    ];
    const emailParams = new EmailParams2().setFrom(sentFrom).setTo(recipients).setSubject(subject).setHtml(htmlContent).setAttachments(attachments);
    console.log(`\u{1F4E7} Sending quotation email to: ${to.join(", ")}`);
    await mailerSend2.email.send(emailParams);
    console.log(`\u2705 Quotation email sent successfully`);
  } catch (error) {
    console.error("Error sending quotation email:", error);
    throw error;
  }
}
async function sendShippingRejectionEmail({
  sellerEmail,
  sellerName,
  quotationFolio,
  customerName,
  rejectionReason,
  tenantName
}) {
  try {
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) throw new Error("MAILERSEND_API_KEY not configured");
    const ms = new MailerSend2({ apiKey });
    const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
    const recipients = [new Recipient2(sellerEmail, sellerName)];
    const subject = `Env\xEDo sin costo rechazado \u2014 Cotizaci\xF3n ${quotationFolio}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
            .container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); padding: 28px 32px; }
            .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
            .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
            .body { padding: 28px 32px; }
            .alert-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
            .alert-box p { margin: 0; color: #991b1b; font-size: 14px; }
            .reason-box { background: #f8fafc; border-left: 4px solid #b91c1c; border-radius: 0 6px 6px 0; padding: 14px 18px; margin: 20px 0; }
            .reason-box p { margin: 0; color: #374151; font-size: 14px; }
            .reason-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 6px; }
            .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
            .info-label { color: #6b7280; font-size: 13px; min-width: 120px; }
            .info-value { color: #111827; font-size: 13px; font-weight: 600; }
            .action-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin-top: 24px; }
            .action-box h3 { margin: 0 0 8px; color: #1e40af; font-size: 14px; }
            .action-box ul { margin: 0; padding-left: 20px; color: #374151; font-size: 13px; }
            .action-box li { margin-bottom: 4px; }
            .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; }
            .footer p { margin: 0; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Env\xEDo sin costo rechazado</h1>
              <p>${tenantName} \u2014 Sistema Comercial</p>
            </div>
            <div class="body">
              <p>Hola <strong>${sellerName}</strong>,</p>
              <div class="alert-box">
                <p>El administrador ha <strong>rechazado</strong> la solicitud de env\xEDo sin costo para la cotizaci\xF3n <strong>${quotationFolio}</strong>. La cotizaci\xF3n ha sido regresada a estado <strong>Borrador</strong> para que puedas retrabajarla.</p>
              </div>

              <div class="info-row"><span class="info-label">Cotizaci\xF3n:</span><span class="info-value">${quotationFolio}</span></div>
              <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${customerName}</span></div>

              <div class="reason-box">
                <p class="reason-label">Motivo del rechazo</p>
                <p>${rejectionReason}</p>
              </div>

              <div class="action-box">
                <h3>Pasos a seguir</h3>
                <ul>
                  <li>Revisa el motivo del rechazo indicado arriba</li>
                  <li>Abre la cotizaci\xF3n en el sistema y ajusta el costo de env\xEDo</li>
                  <li>Una vez lista, env\xEDala nuevamente para aprobaci\xF3n</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>${tenantName} \u2014 Este es un mensaje autom\xE1tico, por favor no respondas a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const emailParams = new EmailParams2().setFrom(sentFrom).setTo(recipients).setSubject(subject).setHtml(htmlContent);
    console.log(`\u{1F4E7} Sending shipping rejection email to: ${sellerEmail}`);
    await ms.email.send(emailParams);
    console.log(`\u2705 Shipping rejection email sent successfully`);
  } catch (error) {
    console.error("Error sending shipping rejection email:", error);
    throw error;
  }
}
async function sendShippingApprovalRequestEmail({
  adminEmails,
  quotationData,
  quotationUrl,
  tenantName,
  approveUrl,
  rejectUrl
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured \u2014 skipping shipping approval request email");
    return;
  }
  const validAdmins = adminEmails.filter((a) => a.email && a.email.includes("@"));
  if (validAdmins.length === 0) {
    console.warn("No admin emails for shipping approval notification \u2014 skipping");
    return;
  }
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const subject = `Autorizaci\xF3n requerida \u2014 Env\xEDo a cargo de empresa \xB7 ${quotationData.folio}`;
  const shippingMethodLabel = quotationData.shippingMethod === "parcel" ? "Paqueter\xEDa" : "Cami\xF3n";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">

          <div style="background:linear-gradient(135deg,#c05621 0%,#9c4221 100%);padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Solicitud de Autorizaci\xF3n de Env\xEDo</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${tenantName} \u2014 Sistema Comercial</p>
          </div>

          <div style="padding:28px 32px;">
            <p style="font-size:15px;color:#374151;margin:0 0 20px;">
              Se ha creado una cotizaci\xF3n con <strong>env\xEDo sin costo a cargo de la empresa</strong>
              que requiere tu autorizaci\xF3n antes de enviarse al cliente.
            </p>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:18px 22px;margin-bottom:24px;">
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Cotizaci\xF3n:</span>
                <span style="color:#1c1917;font-size:13px;font-weight:700;">${quotationData.folio}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Cliente:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.customerName}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Vendedor:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.vendedorName}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Total:</span>
                <span style="color:#1c1917;font-size:13px;font-weight:700;">$${quotationData.total} ${quotationData.currency}</span>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:8px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">M\xE9todo de env\xEDo:</span>
                <span style="color:#1c1917;font-size:13px;">${shippingMethodLabel}</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#92400e;font-size:13px;min-width:130px;font-weight:600;">Productos:</span>
                <span style="color:#1c1917;font-size:13px;">${quotationData.itemsCount} partida(s)</span>
              </div>
            </div>

            ${approveUrl && rejectUrl ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${approveUrl}"
                 style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 8px 8px 0;">
                Aprobar env\xEDo
              </a>
              <a href="${rejectUrl}"
                 style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin:0 0 8px 0;">
                Rechazar
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
              Puedes aprobar o rechazar directamente desde este correo, o ingresar al sistema para m\xE1s detalles.
              <a href="${quotationUrl}" style="color:#c05621;text-decoration:none;">Ver en el sistema</a>
            </p>
            ` : `
            <div style="text-align:center;margin:24px 0;">
              <a href="${quotationUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#c05621 0%,#9c4221 100%);color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                Ver cotizaci\xF3n y autorizar
              </a>
            </div>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
              Ingresa al sistema para aprobar o rechazar el env\xEDo sin costo.
            </p>
            `}
          </div>

          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} \u2014 Mensaje autom\xE1tico, no respondas a este correo.</p>
          </div>

        </div>
      </body>
    </html>
  `;
  for (const admin of validAdmins) {
    try {
      const emailParams = new EmailParams2().setFrom(sentFrom).setTo([new Recipient2(admin.email, admin.name)]).setSubject(subject).setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`\u2705 Shipping approval request email sent to admin: ${admin.email}`);
    } catch (err) {
      console.warn(`Failed to send shipping approval email to ${admin.email}:`, err.message || err);
    }
  }
}
async function sendCreditAuthStatusEmail({
  status,
  quotationFolio,
  customerName,
  quotationTotal,
  rejectionNotes,
  tenantName,
  recipients
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured \u2014 skipping credit auth email");
    return;
  }
  const isApproved = status === "approved";
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const subject = isApproved ? `Cr\xE9dito autorizado \u2014 Cotizaci\xF3n ${quotationFolio}` : `Cr\xE9dito rechazado \u2014 Cotizaci\xF3n ${quotationFolio}`;
  const headerColor = isApproved ? "linear-gradient(135deg, #15803d 0%, #14532d 100%)" : "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)";
  const statusBadge = isApproved ? `<span style="background:#dcfce7;color:#15803d;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">AUTORIZADO</span>` : `<span style="background:#fef2f2;color:#b91c1c;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">RECHAZADO</span>`;
  const nextStepsHtml = isApproved ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:14px;">Pr\xF3ximos pasos</h3>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;">
          <li style="margin-bottom:4px;">Se ha generado autom\xE1ticamente un pedido de producci\xF3n</li>
          <li style="margin-bottom:4px;">El equipo de producci\xF3n comenzar\xE1 a procesar el pedido</li>
          <li>Puedes consultar el avance desde el panel de pedidos</li>
        </ul>
      </div>` : `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#b91c1c;font-size:14px;">Motivo del rechazo</h3>
        <p style="margin:0;color:#374151;font-size:13px;">${rejectionNotes || "No se proporcion\xF3 motivo"}</p>
      </div>`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:${headerColor};padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Autorizaci\xF3n de Cr\xE9dito</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} \u2014 Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <span style="font-size:15px;font-weight:600;color:#111827;">Estatus:</span>
              ${statusBadge}
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cotizaci\xF3n:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationFolio}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cliente:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Monto cotizaci\xF3n:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
            </div>
            ${nextStepsHtml}
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} \u2014 Este es un mensaje autom\xE1tico, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  const validRecipients = recipients.filter((r) => r.email && r.email.trim() !== "");
  if (validRecipients.length === 0) {
    console.warn("No valid recipients for credit auth status email \u2014 skipping");
    return;
  }
  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams2().setFrom(sentFrom).setTo([new Recipient2(recipient.email, recipient.name)]).setSubject(subject).setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`\u2705 Credit auth ${status} email sent to: ${recipient.email}`);
    } catch (err) {
      console.warn(`Failed to send credit auth email to ${recipient.email}:`, err.message || err);
    }
  }
}
async function sendCreditAuthNewRequestEmail({
  quotationFolio,
  customerName,
  quotationTotal,
  vendedorName,
  creditAvailable,
  creditUsed,
  overdueBalance,
  tenantName,
  tenantSubdomain,
  recipients
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured \u2014 skipping credit auth new request email");
    return;
  }
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const subject = `Nueva solicitud de cr\xE9dito \u2014 Cotizaci\xF3n ${quotationFolio}`;
  const appUrl = tenantSubdomain ? `https://${tenantSubdomain}.nexxo.com.mx/credit-authorizations` : `https://nexxo.com.mx/credit-authorizations`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%);padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Solicitud de Autorizaci\xF3n de Cr\xE9dito</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} \u2014 Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              Se ha registrado una nueva solicitud de autorizaci\xF3n de cr\xE9dito que requiere su revisi\xF3n.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Cotizaci\xF3n:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${quotationFolio}</span>
              </div>
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Cliente:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
              </div>
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Vendedor:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${vendedorName}</span>
              </div>
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Monto cotizaci\xF3n:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
              </div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <h3 style="margin:0 0 12px;color:#1d4ed8;font-size:14px;">Informaci\xF3n de Cr\xE9dito</h3>
              <div style="margin-bottom:6px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Cr\xE9dito disponible:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${creditAvailable}</span>
              </div>
              <div style="margin-bottom:6px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Cr\xE9dito utilizado:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${creditUsed}</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:150px;">Saldo vencido:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${overdueBalance}</span>
              </div>
            </div>
            <div style="text-align:center;">
              <a href="${appUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
                Revisar Solicitud
              </a>
            </div>
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} \u2014 Este es un mensaje autom\xE1tico, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  const validRecipients = recipients.filter((r) => r.email && r.email.trim() !== "");
  if (validRecipients.length === 0) {
    console.warn("No valid recipients for credit auth new request email \u2014 skipping");
    return;
  }
  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams2().setFrom(sentFrom).setTo([new Recipient2(recipient.email, recipient.name)]).setSubject(subject).setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`\u2705 Credit auth new request email sent to: ${recipient.email}`);
    } catch (err) {
      console.warn(`Failed to send credit auth new request email to ${recipient.email}:`, err.message || err);
    }
  }
}
async function sendWarrantySheetEmail({
  toEmail,
  toName,
  ccEmails,
  ticketNumber,
  customerName,
  subject,
  tenantName,
  pdfBuffer
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) throw new Error("MAILERSEND_API_KEY no configurado");
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const recipients = [new Recipient2(toEmail, toName)];
  const cc = ccEmails.map((r) => new Recipient2(r.email, r.name));
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%); padding: 28px 32px; }
          .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
          .header p { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
          .body { padding: 28px 32px; }
          .info-row { display: flex; gap: 12px; margin-bottom: 8px; }
          .info-label { color: #6b7280; font-size: 13px; min-width: 120px; }
          .info-value { color: #111827; font-size: 13px; font-weight: 600; }
          .note { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin-top: 20px; font-size: 13px; color: #0369a1; }
          .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; }
          .footer p { margin: 0; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hoja de Garant\xEDa \u2014 ${ticketNumber}</h1>
            <p>${tenantName} \u2014 Sistema Comercial</p>
          </div>
          <div class="body">
            <p>Estimado(a) <strong>${toName || customerName}</strong>,</p>
            <p>Adjunto encontrar\xE1 la <strong>Hoja de Garant\xEDa</strong> correspondiente a su solicitud de servicio.</p>
            <div class="info-row"><span class="info-label">Ticket:</span><span class="info-value">${ticketNumber}</span></div>
            <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${customerName}</span></div>
            <div class="info-row"><span class="info-label">Asunto:</span><span class="info-value">${subject}</span></div>
            <div class="note">Por favor revise el documento adjunto, f\xEDrmelo y env\xEDelo de regreso para continuar con el proceso de garant\xEDa.</div>
          </div>
          <div class="footer">
            <p>${tenantName} \u2014 Este es un mensaje autom\xE1tico.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  const attachment = new Attachment2(
    pdfBuffer.toString("base64"),
    `Garantia-${ticketNumber}.pdf`,
    "application/pdf"
  );
  const emailParams = new EmailParams2().setFrom(sentFrom).setTo(recipients).setCc(cc).setSubject(`Hoja de Garant\xEDa \u2014 ${ticketNumber} \u2014 ${customerName}`).setHtml(htmlContent).setAttachments([attachment]);
  console.log(`\u{1F4E7} Sending warranty sheet to: ${toEmail}${cc.length ? ` (CC: ${cc.map((c) => c.email).join(", ")})` : ""}`);
  await ms.email.send(emailParams);
  console.log(`\u2705 Warranty sheet email sent for ${ticketNumber}`);
}
async function sendOrderReleasePendingEmail({
  orderFolio,
  customerName,
  quotationTotal,
  vendedorName,
  tenantName,
  tenantSubdomain,
  adminRecipients
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured \u2014 skipping order release pending email");
    return;
  }
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const subject = `Pedido pendiente de liberaci\xF3n \u2014 ${orderFolio}`;
  const releaseUrl = tenantSubdomain ? `https://${tenantSubdomain}.nexxo.com.mx/order-release` : "https://nexxo.com.mx/order-release";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Acci\xF3n requerida: Liberar Pedido</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} \u2014 Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:14px;">
              Un pedido acaba de ser <strong>aprobado por Cr\xE9dito y Cobranza</strong> y est\xE1 esperando tu autorizaci\xF3n para continuar a producci\xF3n.
            </p>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:130px;">Pedido:</span>
                <span style="color:#1e40af;font-size:13px;font-weight:700;">${orderFolio}</span>
              </div>
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:130px;">Cliente:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
              </div>
              <div style="margin-bottom:8px;display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:130px;">Monto:</span>
                <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
              </div>
              <div style="display:flex;gap:12px;">
                <span style="color:#6b7280;font-size:13px;min-width:130px;">Vendedor:</span>
                <span style="color:#111827;font-size:13px;">${vendedorName}</span>
              </div>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${releaseUrl}" style="display:inline-block;background:#1e40af;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                Ir a Liberaci\xF3n de Pedidos
              </a>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:8px;">
              <p style="margin:0;color:#166534;font-size:13px;">
                <strong>Nota:</strong> Al ingresar al sistema podr\xE1s revisar los detalles completos del pedido, agregar comentarios y decidir si lo liberas o rechazas.
              </p>
            </div>
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} \u2014 Este es un mensaje autom\xE1tico, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  const validRecipients = adminRecipients.filter((r) => r.email?.trim());
  if (validRecipients.length === 0) {
    console.warn("No valid admin recipients for order release pending email \u2014 skipping");
    return;
  }
  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams2().setFrom(sentFrom).setTo([new Recipient2(recipient.email, recipient.name)]).setSubject(subject).setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`\u2705 Order release pending email sent to admin: ${recipient.email}`);
    } catch (err) {
      console.warn(`Failed to send order release pending email to ${recipient.email}:`, err.message || err);
    }
  }
}
async function sendOrderReleaseEmail({
  status,
  orderFolio,
  customerName,
  quotationTotal,
  releaseNotes,
  tenantName,
  releasedByName,
  recipients
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    console.warn("MAILERSEND_API_KEY not configured \u2014 skipping order release email");
    return;
  }
  const isApproved = status === "approved";
  const ms = new MailerSend2({ apiKey });
  const sentFrom = new Sender2("noreply@nexxo.com.mx", tenantName);
  const subject = isApproved ? `Pedido liberado \u2014 ${orderFolio}` : `Pedido rechazado \u2014 ${orderFolio}`;
  const headerColor = isApproved ? "linear-gradient(135deg, #15803d 0%, #14532d 100%)" : "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)";
  const statusBadge = isApproved ? `<span style="background:#dcfce7;color:#15803d;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">LIBERADO</span>` : `<span style="background:#fef2f2;color:#b91c1c;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:700;">RECHAZADO</span>`;
  const detailBox = isApproved ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:14px;">Pr\xF3ximos pasos</h3>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;">
          <li style="margin-bottom:4px;">El pedido ha sido autorizado para producci\xF3n</li>
          <li>Puedes consultar el avance desde el panel de pedidos</li>
        </ul>
      </div>` : `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;color:#b91c1c;font-size:14px;">Motivo del rechazo</h3>
        <p style="margin:0;color:#374151;font-size:13px;">${releaseNotes || "No se proporcion\xF3 motivo"}</p>
      </div>`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
          <div style="background:${headerColor};padding:28px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Liberaci\xF3n de Pedido</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${tenantName} \u2014 Sistema Comercial</p>
          </div>
          <div style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <span style="font-size:15px;font-weight:600;color:#111827;">Estatus:</span>
              ${statusBadge}
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Pedido:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${orderFolio}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Cliente:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${customerName}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Monto:</span>
              <span style="color:#111827;font-size:13px;font-weight:600;">${quotationTotal}</span>
            </div>
            <div style="margin-bottom:8px;display:flex;gap:12px;">
              <span style="color:#6b7280;font-size:13px;min-width:130px;">Autorizado por:</span>
              <span style="color:#111827;font-size:13px;">${releasedByName}</span>
            </div>
            ${detailBox}
          </div>
          <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} \u2014 Este es un mensaje autom\xE1tico, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  const validRecipients = recipients.filter((r) => r.email && r.email.trim() !== "");
  if (validRecipients.length === 0) {
    console.warn("No valid recipients for order release email \u2014 skipping");
    return;
  }
  for (const recipient of validRecipients) {
    try {
      const emailParams = new EmailParams2().setFrom(sentFrom).setTo([new Recipient2(recipient.email, recipient.name)]).setSubject(subject).setHtml(htmlContent);
      await ms.email.send(emailParams);
      console.log(`\u2705 Order release ${status} email sent to: ${recipient.email}`);
    } catch (err) {
      console.warn(`Failed to send order release email to ${recipient.email}:`, err.message || err);
    }
  }
}
var mailerSend2;
var init_quotation_email_service = __esm({
  "server/quotation-email-service.ts"() {
    "use strict";
    init_objectStorage();
    init_localStorage();
    mailerSend2 = new MailerSend2({
      apiKey: process.env.MAILERSEND_API_KEY || ""
    });
  }
});

// server/quotation-pdf-generator.ts
var quotation_pdf_generator_exports = {};
__export(quotation_pdf_generator_exports, {
  generateQuotationPDFStream: () => generateQuotationPDFStream
});
import PDFDocument from "pdfkit";
async function loadLogoBuffer(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
    }
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function formatDate(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: timezone || "America/Mexico_City" });
}
function formatDateTime(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "America/Mexico_City"
  });
}
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}
function lightenColor(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
async function generateQuotationPDFStream(data) {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { quotation, items, customer, user, tenant, hideDiscount = false } = data;
  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  try {
    const HEADER_H = 112;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, {
          fit: [110, 68]
        });
      } catch {
      }
    }
    const TEXT_X = PAGE_W / 2;
    const TEXT_W = PAGE_W - TEXT_X - MARGIN;
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });
    const infoLines = [];
    if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
    if (tenant?.address) {
      tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((part) => infoLines.push(part));
    }
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("   |   "));
    if (tenant?.website) infoLines.push(tenant.website);
    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
    infoLines.forEach((line, i) => {
      doc.text(line, TEXT_X, 33 + i * 11, { width: TEXT_W, align: "right", lineBreak: false });
    });
    const TITLE_BAND_Y = HEADER_H;
    const TITLE_BAND_H = 32;
    doc.rect(0, TITLE_BAND_Y, PAGE_W, TITLE_BAND_H).fill(mediumColor);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("COTIZACI\xD3N", MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2, align: "left" });
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(`Folio: ${quotation.folio}`, MARGIN + CONTENT_W / 2, TITLE_BAND_Y + 8, { width: CONTENT_W / 2, align: "right" });
    let currentY = TITLE_BAND_Y + TITLE_BAND_H + 18;
    const COL_W = CONTENT_W / 2 - 8;
    const COL2_X = MARGIN + COL_W + 16;
    const BOX_H = 115;
    doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
    doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text("DATOS DE LA COTIZACI\xD3N", COL2_X + 6, currentY + 4, { width: COL_W - 10 });
    let leftY = currentY + 22;
    doc.fontSize(8).font("Helvetica").fillColor("#333333");
    const customerRows = [
      ["Raz\xF3n Social:", customer.name],
      ...customer.rfc ? [["RFC:", customer.rfc]] : [],
      ...customer.contactName ? [["Contacto:", customer.contactName]] : [],
      ...customer.phone ? [["Tel\xE9fono:", customer.phone]] : [],
      ...customer.email ? [["Email:", customer.email]] : []
    ];
    if (customer.city || customer.state) {
      customerRows.push(["Ciudad:", [customer.city, customer.state].filter(Boolean).join(", ")]);
    }
    const LABEL_W = 72;
    const ROW_H = 13;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 12;
    const textOpts = (w) => ({ width: w, height: ROW_H, lineBreak: false, ellipsis: true });
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, textOpts(LABEL_W));
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, textOpts(VALUE_W_L));
      leftY += ROW_H;
    }
    let rightY = currentY + 22;
    const quotationRows = [
      ["Fecha:", formatDate(quotation.createdAt, tenant?.timezone)],
      ["Moneda:", quotation.currency || "MXN"],
      ["Vendedor:", user.fullName]
    ];
    if (quotation.validUntil) quotationRows.push(["Vigencia:", formatDate(quotation.validUntil, tenant?.timezone)]);
    if (quotation.paymentTerms) quotationRows.push(["Cond. Pago:", PAYMENT_TERMS_LABELS[quotation.paymentTerms] || quotation.paymentTerms]);
    if (quotation.deliveryTime) quotationRows.push(["T. Entrega:", DELIVERY_TIME_LABELS[quotation.deliveryTime] || quotation.deliveryTime]);
    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 12;
    for (const [label, value] of quotationRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, textOpts(LABEL_W));
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, textOpts(VALUE_W_R));
      rightY += ROW_H;
    }
    currentY += BOX_H + 20;
    const rawQuoteCurrency = quotation.currency || "MXN";
    const exRate = parseFloat(String(quotation.exchangeRate || "18")) || 18;
    const mxnItems = items.filter((i) => (i.currency || "MXN") === "MXN");
    const usdItems = items.filter((i) => i.currency === "USD");
    const showMonColumn = mxnItems.length > 0 && usdItems.length > 0;
    let quoteCurrency;
    if (rawQuoteCurrency === "AMBAS") {
      quoteCurrency = usdItems.length > 0 && mxnItems.length === 0 ? "USD" : "MXN";
    } else {
      quoteCurrency = rawQuoteCurrency;
    }
    const convertToQuote = (amount, itemCurrency) => {
      if (itemCurrency === quoteCurrency) return amount;
      if (itemCurrency === "USD" && quoteCurrency === "MXN") return amount * exRate;
      if (itemCurrency === "MXN" && quoteCurrency === "USD") return amount / exRate;
      return amount;
    };
    const discountPct = parseFloat(quotation.globalDiscount || "0");
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("PRODUCTOS Y SERVICIOS", MARGIN + 6, currentY + 4);
    currentY += 16;
    const MON_W = showMonColumn ? 32 : 0;
    const DISC_W = hideDiscount ? 0 : 42;
    const DESC_W = showMonColumn ? 168 + (hideDiscount ? 42 : 0) : 200 + (hideDiscount ? 42 : 0);
    const cols = {
      num: { x: MARGIN, w: 22 },
      code: { x: MARGIN + 22, w: 72 },
      desc: { x: MARGIN + 94, w: DESC_W },
      qty: { x: MARGIN + 94 + DESC_W, w: 44 },
      price: { x: MARGIN + 94 + DESC_W + 44, w: 72 },
      disc: { x: MARGIN + 94 + DESC_W + 44 + 72, w: DISC_W },
      mon: { x: MARGIN + 94 + DESC_W + 44 + 72 + DISC_W, w: MON_W },
      total: { x: MARGIN + 94 + DESC_W + 44 + 72 + DISC_W + MON_W, w: 80 }
    };
    const TH = 15;
    doc.rect(MARGIN, currentY, CONTENT_W, TH).fill(primaryColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("#", cols.num.x + 2, currentY + 4, { width: cols.num.w - 2, align: "center" });
    doc.text("C\xF3digo", cols.code.x + 2, currentY + 4, { width: cols.code.w - 2 });
    doc.text("Descripci\xF3n", cols.desc.x + 2, currentY + 4, { width: cols.desc.w - 2 });
    doc.text("Cant.", cols.qty.x + 2, currentY + 4, { width: cols.qty.w - 4, align: "center" });
    doc.text("P. Unit.", cols.price.x + 2, currentY + 4, { width: cols.price.w - 4, align: "right" });
    if (!hideDiscount) {
      doc.text("Desc%", cols.disc.x + 2, currentY + 4, { width: cols.disc.w - 2, align: "center" });
    }
    if (showMonColumn) {
      doc.text("Mon.", cols.mon.x + 2, currentY + 4, { width: cols.mon.w - 2, align: "center" });
    }
    doc.text("Subtotal", cols.total.x + 2, currentY + 4, { width: cols.total.w - 4, align: "right" });
    currentY += TH;
    const ROW_PAD = 4;
    const MIN_ROW_H = 16;
    doc.fontSize(7.5).font("Helvetica");
    const fmtMXN = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);
    const fmtUSD = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
    const fmtQuote = quoteCurrency === "USD" ? fmtUSD : fmtMXN;
    const fmtItem = (v, cur) => cur === "USD" ? fmtUSD(v) : fmtMXN(v);
    items.forEach((item, index) => {
      const itemCurrency = item.currency || "MXN";
      const displayUnitPrice = showMonColumn ? parseFloat(String(item.unitPrice)) || 0 : convertToQuote(parseFloat(String(item.unitPrice)) || 0, itemCurrency);
      const displaySubtotal = showMonColumn ? parseFloat(String(item.subtotal)) || 0 : convertToQuote(parseFloat(String(item.subtotal)) || 0, itemCurrency);
      const descH = doc.heightOfString(item.productName, { width: cols.desc.w - 4 });
      const rowH = Math.max(MIN_ROW_H, descH + ROW_PAD * 2);
      if (currentY + rowH > PAGE_H - 160) {
        doc.addPage({ size: "LETTER", margin: 0 });
        currentY = 20;
      }
      const rowBg = index % 2 === 0 ? "#ffffff" : lightColor;
      doc.rect(MARGIN, currentY, CONTENT_W, rowH).fill(rowBg);
      doc.fillColor("#333333");
      const rowY = currentY + ROW_PAD;
      doc.text(String(index + 1), cols.num.x + 2, rowY, { width: cols.num.w - 2, align: "center", lineBreak: false });
      doc.text(item.productCode || "-", cols.code.x + 2, rowY, { width: cols.code.w - 4, lineBreak: false });
      doc.text(item.productName, cols.desc.x + 2, rowY, { width: cols.desc.w - 4 });
      doc.text(parseFloat(item.quantity).toString(), cols.qty.x + 2, rowY, { width: cols.qty.w - 4, align: "center", lineBreak: false });
      const rowFmt = showMonColumn ? (v) => fmtItem(v, itemCurrency) : fmtQuote;
      doc.text(rowFmt(displayUnitPrice), cols.price.x + 2, rowY, { width: cols.price.w - 4, align: "right", lineBreak: false });
      if (!hideDiscount) {
        doc.text(parseFloat(item.discountPercent || "0").toFixed(1) + "%", cols.disc.x + 2, rowY, { width: cols.disc.w - 2, align: "center", lineBreak: false });
      }
      if (showMonColumn) {
        doc.fillColor(itemCurrency === "USD" ? "#1a6b3a" : "#444");
        doc.text(itemCurrency, cols.mon.x + 2, rowY, { width: cols.mon.w - 2, align: "center", lineBreak: false });
        doc.fillColor("#333333");
      }
      doc.text(rowFmt(displaySubtotal), cols.total.x + 2, rowY, { width: cols.total.w - 4, align: "right", lineBreak: false });
      currentY += rowH;
    });
    doc.rect(MARGIN, currentY, CONTENT_W, 1).fill(mediumColor);
    currentY += 20;
    const TOTALS_ROW_H = 16;
    const FOREIGN_RFC = "XEXX010101000";
    const isForeignCustomer = customer.rfc === FOREIGN_RFC;
    const isMexicoCustomer = !isForeignCustomer && (!customer.country || ["mx", "mexico", "m\xE9xico", "mex"].includes(customer.country.toLowerCase().trim()));
    const drawTotalsBox = (bx, by, bw, label, labelColor, sub, disc, tax, total, fmtFn) => {
      const rows = [
        ["Subtotal:", fmtFn(sub)],
        ...disc > 0 ? [[`Desc. (${discountPct}%):`, `-${fmtFn(disc)}`]] : [],
        ...isMexicoCustomer ? [["IVA (16%):", fmtFn(tax)]] : []
      ];
      const boxH = rows.length * TOTALS_ROW_H + 22 + 26;
      doc.rect(bx, by, bw, 14).fill(labelColor);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(label, bx + 4, by + 3, { width: bw - 8, align: "center" });
      doc.rect(bx, by + 14, bw, boxH - 14 - 22).fill(lightColor);
      doc.rect(bx, by + 14, bw, boxH - 14 - 22).stroke(mediumColor);
      let ty = by + 14 + 6;
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      for (const [lbl, val] of rows) {
        doc.text(lbl, bx + 6, ty, { width: bw * 0.52 });
        doc.text(val, bx + bw * 0.52, ty, { width: bw * 0.44, align: "right" });
        ty += TOTALS_ROW_H;
      }
      doc.rect(bx, by + boxH - 22, bw, 22).fill(labelColor);
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text("TOTAL:", bx + 6, by + boxH - 16, { width: bw * 0.45 });
      doc.text(fmtFn(total), bx + bw * 0.45, by + boxH - 16, { width: bw * 0.5, align: "right" });
      return boxH;
    };
    if (showMonColumn) {
      const mxnSub = mxnItems.reduce((s, i) => s + (parseFloat(String(i.subtotal)) || 0), 0);
      const usdSub = usdItems.reduce((s, i) => s + (parseFloat(String(i.subtotal)) || 0), 0);
      const mxnDisc = discountPct > 0 ? mxnSub * (discountPct / 100) : 0;
      const usdDisc = discountPct > 0 ? usdSub * (discountPct / 100) : 0;
      const mxnTax = isMexicoCustomer ? (mxnSub - mxnDisc) * 0.16 : 0;
      const mxnTotal = mxnSub - mxnDisc + mxnTax;
      const usdTotal = usdSub - usdDisc;
      const TOTALS_W = 195;
      const GAP = 10;
      const BOX2_START = PAGE_W - MARGIN - TOTALS_W * 2 - GAP;
      const mxnH = drawTotalsBox(
        BOX2_START,
        currentY,
        TOTALS_W,
        "PESOS MEXICANOS (MXN)",
        primaryColor,
        hideDiscount ? mxnSub - mxnDisc : mxnSub,
        hideDiscount ? 0 : mxnDisc,
        mxnTax,
        mxnTotal,
        fmtMXN
      );
      const usdH = drawTotalsBox(
        BOX2_START + TOTALS_W + GAP,
        currentY,
        TOTALS_W,
        "D\xD3LARES AMERICANOS (USD)",
        "#1a6b3a",
        hideDiscount ? usdSub - usdDisc : usdSub,
        hideDiscount ? 0 : usdDisc,
        0,
        usdTotal,
        fmtUSD
      );
      currentY += Math.max(mxnH, usdH) + 20;
    } else {
      const TOTALS_W = 200;
      const TOTALS_X = PAGE_W - MARGIN - TOTALS_W;
      const subtotalVal = items.reduce((s, i) => {
        const sub = parseFloat(String(i.subtotal)) || 0;
        const iCur = i.currency || "MXN";
        return s + convertToQuote(sub, iCur);
      }, 0);
      const discountAmt = discountPct > 0 ? subtotalVal * (discountPct / 100) : 0;
      const subtotalAfterDisc = subtotalVal - discountAmt;
      const taxVal = isForeignCustomer ? 0 : subtotalAfterDisc * 0.16;
      const totalVal = subtotalAfterDisc + (isForeignCustomer ? 0 : taxVal);
      const quoteLabel = quoteCurrency === "USD" ? "D\xD3LARES AMERICANOS (USD)" : "PESOS MEXICANOS (MXN)";
      const quoteColor = quoteCurrency === "USD" ? "#1a6b3a" : primaryColor;
      const singleH = drawTotalsBox(
        TOTALS_X,
        currentY,
        TOTALS_W,
        quoteLabel,
        quoteColor,
        hideDiscount ? subtotalAfterDisc : subtotalVal,
        hideDiscount ? 0 : discountAmt,
        taxVal,
        totalVal,
        fmtQuote
      );
      currentY += singleH + 20;
    }
    if (quotation.notes) {
      const notesH = Math.max(40, doc.heightOfString(quotation.notes, { width: CONTENT_W - 12 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("NOTAS", MARGIN + 6, currentY + 3);
      currentY += 14;
      doc.rect(MARGIN, currentY, CONTENT_W, notesH).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      doc.text(quotation.notes, MARGIN + 6, currentY + 6, { width: CONTENT_W - 12 });
      currentY += notesH + 10;
    }
    if (quotation.conditions) {
      const condText = quotation.conditions;
      const condH = Math.max(40, doc.heightOfString(condText, { width: CONTENT_W - 12 }) + 16);
      if (currentY + condH + 30 > PAGE_H - 60) {
        doc.addPage({ size: "LETTER", margin: 0 });
        currentY = 20;
      }
      doc.rect(MARGIN, currentY, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("CONDICIONES", MARGIN + 6, currentY + 3);
      currentY += 14;
      doc.rect(MARGIN, currentY, CONTENT_W, condH).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      doc.text(condText, MARGIN + 6, currentY + 6, { width: CONTENT_W - 12 });
      currentY += condH + 10;
    }
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text("Este documento es una cotizaci\xF3n y no constituye un pedido en firme.", MARGIN, FOOTER_Y + 6, { width: 260 });
    doc.text(`Generado el ${formatDateTime(/* @__PURE__ */ new Date(), tenant?.timezone)}`, MARGIN, FOOTER_Y + 16, { width: 260 });
    const footerRight = [];
    if (tenant?.phone) footerRight.push(`Tel: ${tenant.phone}`);
    if (tenant?.email) footerRight.push(tenant.email);
    if (tenant?.website) footerRight.push(tenant.website);
    if (footerRight.length) {
      doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff");
      doc.text(footerRight.join("   |   "), PAGE_W - MARGIN - 270, FOOTER_Y + 10, { width: 270, align: "right" });
    }
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName, PAGE_W - MARGIN - 270, FOOTER_Y + 22, { width: 270, align: "right" });
    doc.end();
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    doc.end();
  }
  return doc;
}
var PAYMENT_TERMS_LABELS, DELIVERY_TIME_LABELS;
var init_quotation_pdf_generator = __esm({
  "server/quotation-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
    PAYMENT_TERMS_LABELS = {
      contado: "Contado",
      "15_dias": "15 d\xEDas",
      "30_dias": "30 d\xEDas",
      "90_dias": "90 d\xEDas",
      "120_dias": "120 d\xEDas",
      "150_dias": "150 d\xEDas",
      "45_dias": "45 d\xEDas",
      "60_dias": "60 d\xEDas"
    };
    DELIVERY_TIME_LABELS = {
      inmediato: "Inmediato",
      "1_semana": "1 semana",
      "2_semanas": "2 semanas",
      "3_semanas": "3 semanas",
      "1_mes": "1 mes",
      por_confirmar: "Por confirmar"
    };
  }
});

// server/credit-auth-pdf-generator.ts
var credit_auth_pdf_generator_exports = {};
__export(credit_auth_pdf_generator_exports, {
  generateCreditAuthPDFStream: () => generateCreditAuthPDFStream
});
import PDFDocument2 from "pdfkit";
async function loadLogoBuffer2(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function formatCurrency(value, currency = "MXN") {
  if (value === null || value === void 0) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return "$" + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate2(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", timeZone: timezone || "America/Mexico_City" });
}
function formatDateTime2(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: timezone || "America/Mexico_City" });
}
function getStatusLabel(status) {
  return { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" }[status] || status;
}
function getStatusColor(status) {
  return { pending: "#d69e2e", approved: "#38a169", rejected: "#e53e3e" }[status] || "#4a5568";
}
function lightenColor2(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
async function generateCreditAuthPDFStream(data) {
  const doc = new PDFDocument2({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { authorization, quotation, customer, requestedBy, approvedBy, tenant } = data;
  const logoBuffer = await loadLogoBuffer2(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor2(primaryColor, 0.92);
  const mediumColor = lightenColor2(primaryColor, 0.75);
  const statusColor2 = getStatusColor(authorization.status);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  try {
    const HEADER_H = 112;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] });
      } catch {
      }
    }
    const TEXT_X = PAGE_W / 2;
    const TEXT_W = PAGE_W - TEXT_X - MARGIN;
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });
    const infoLines = [];
    if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
    if (tenant?.address) {
      tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((part) => infoLines.push(part));
    }
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("   |   "));
    if (tenant?.website) infoLines.push(tenant.website);
    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
    infoLines.forEach((line, i) => {
      doc.text(line, TEXT_X, 32 + i * 11, { width: TEXT_W, align: "right", lineBreak: false });
    });
    const TITLE_Y = HEADER_H;
    const TITLE_H = 32;
    doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("AUTORIZACI\xD3N DE CR\xC9DITO", MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.6 });
    const statusBadgeW = 160;
    const statusBadgeX = PAGE_W - MARGIN - statusBadgeW;
    doc.rect(statusBadgeX, TITLE_Y + 5, statusBadgeW, 22).fill(statusColor2);
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(getStatusLabel(authorization.status).toUpperCase(), statusBadgeX, TITLE_Y + 11, { width: statusBadgeW, align: "center" });
    let currentY = TITLE_Y + TITLE_H + 18;
    const COL_W = CONTENT_W / 2 - 8;
    const COL2_X = MARGIN + COL_W + 16;
    const BOX_H = 100;
    doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
    doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text("DATOS DE LA COTIZACI\xD3N", COL2_X + 6, currentY + 4, { width: COL_W - 10 });
    let leftY = currentY + 22;
    const customerRows = [
      ["Raz\xF3n Social:", customer.name],
      ...customer.rfc ? [["RFC:", customer.rfc]] : [],
      ...customer.contactName ? [["Contacto:", customer.contactName]] : [],
      ...customer.phone ? [["Tel\xE9fono:", customer.phone]] : [],
      ...customer.email ? [["Email:", customer.email]] : []
    ];
    const LABEL_W = 72;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 10;
    doc.fontSize(8);
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L, lineBreak: false });
      leftY += 12;
    }
    let rightY = currentY + 22;
    const quotRows = [
      ["Folio:", quotation.folio],
      ["Importe:", formatCurrency(quotation.total, quotation.currency || "MXN")],
      ["Fecha:", formatDate2(quotation.createdAt, tenant?.timezone)],
      ["Solicitado por:", requestedBy.fullName],
      ["Solicitud:", formatDate2(authorization.createdAt, tenant?.timezone)]
    ];
    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 10;
    for (const [label, value] of quotRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
      rightY += 12;
    }
    currentY += BOX_H + 18;
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("AN\xC1LISIS DE CR\xC9DITO", MARGIN + 6, currentY + 4);
    currentY += 16;
    const creditFields = [
      ["Cr\xE9dito Disponible", formatCurrency(authorization.creditAvailable), "#38a169"],
      ["Cr\xE9dito Utilizado", formatCurrency(authorization.creditUsed), "#d69e2e"],
      ["Saldo Vencido", formatCurrency(authorization.overdueBalance), "#e53e3e"],
      ["Monto Solicitado", formatCurrency(quotation.total, quotation.currency || "MXN"), primaryColor]
    ];
    const CREDIT_COL_W = CONTENT_W / 4;
    doc.rect(MARGIN, currentY, CONTENT_W, 50).fill(lightColor);
    creditFields.forEach(([label, value, color], idx) => {
      const cx = MARGIN + idx * CREDIT_COL_W;
      doc.rect(cx, currentY, CREDIT_COL_W, 50).stroke(mediumColor);
      doc.fontSize(7).font("Helvetica").fillColor("#666").text(label, cx + 4, currentY + 6, { width: CREDIT_COL_W - 8, align: "center" });
      doc.fontSize(11).font("Helvetica-Bold").fillColor(color).text(value, cx + 4, currentY + 20, { width: CREDIT_COL_W - 8, align: "center" });
    });
    currentY += 60;
    if (authorization.notes) {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("NOTAS", MARGIN + 6, currentY + 4);
      currentY += 16;
      const textH = Math.max(36, doc.heightOfString(authorization.notes, { width: CONTENT_W - 16 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, textH).fill(lightColor);
      doc.fontSize(8.5).font("Helvetica").fillColor("#444");
      doc.text(authorization.notes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16 });
      currentY += textH + 14;
    }
    if (authorization.status === "approved" && approvedBy) {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill("#38a169");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text("APROBACI\xD3N", MARGIN + 6, currentY + 4);
      currentY += 16;
      doc.rect(MARGIN, currentY, CONTENT_W, 50).fill("#f0fff4");
      doc.fontSize(8).font("Helvetica").fillColor("#333");
      doc.font("Helvetica-Bold").fillColor("#555").text("Aprobado por:", MARGIN + 8, currentY + 8, { continued: true, width: 90 });
      doc.font("Helvetica").fillColor("#222").text(approvedBy.fullName);
      doc.font("Helvetica-Bold").fillColor("#555").text("Fecha:", MARGIN + 8, currentY + 20, { continued: true, width: 90 });
      doc.font("Helvetica").fillColor("#222").text(formatDate2(authorization.authorizedAt, tenant?.timezone));
      currentY += 50;
      if (authorization.approvalSignature) {
        currentY += 10;
        try {
          const sigData = authorization.approvalSignature;
          if (sigData.startsWith("data:image")) {
            const imageBuffer = Buffer.from(sigData.split(",")[1], "base64");
            doc.image(imageBuffer, MARGIN, currentY, { width: 200, height: 80 });
            doc.fontSize(7).font("Helvetica").fillColor("#777").text("Firma Digital", MARGIN, currentY + 84, { width: 200, align: "center" });
            currentY += 100;
          }
        } catch {
          doc.fontSize(8).font("Helvetica").fillColor("#777").text("[Firma registrada]", MARGIN + 8, currentY + 8);
          currentY += 30;
        }
      }
    }
    if (authorization.status === "rejected") {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill("#e53e3e");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text("MOTIVO DE RECHAZO", MARGIN + 6, currentY + 4);
      currentY += 16;
      const rejText = authorization.rejectionNotes || "Sin motivo especificado";
      const textH = Math.max(36, doc.heightOfString(rejText, { width: CONTENT_W - 16 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, textH).fill("#fff5f5");
      doc.fontSize(8.5).font("Helvetica").fillColor("#c53030");
      doc.text(rejText, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16 });
      currentY += textH + 14;
    }
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text("Documento generado autom\xE1ticamente. V\xE1lido como constancia de autorizaci\xF3n de cr\xE9dito.", MARGIN, FOOTER_Y + 6, { width: 280 });
    doc.text(`Generado el ${formatDateTime2(/* @__PURE__ */ new Date(), tenant?.timezone)}`, MARGIN, FOOTER_Y + 16, { width: 280 });
    const footerRight = [];
    if (tenant?.phone) footerRight.push(`Tel: ${tenant.phone}`);
    if (tenant?.email) footerRight.push(tenant.email);
    if (tenant?.website) footerRight.push(tenant.website);
    if (footerRight.length) {
      doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff");
      doc.text(footerRight.join("   |   "), PAGE_W - MARGIN - 270, FOOTER_Y + 10, { width: 270, align: "right" });
    }
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName, PAGE_W - MARGIN - 270, FOOTER_Y + 22, { width: 270, align: "right" });
    doc.end();
  } catch (error) {
    console.error("Error generating credit authorization PDF:", error);
    doc.end();
  }
  return doc;
}
var init_credit_auth_pdf_generator = __esm({
  "server/credit-auth-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
  }
});

// server/reports-pdf-generator.ts
var reports_pdf_generator_exports = {};
__export(reports_pdf_generator_exports, {
  generateIncidentsReportPDF: () => generateIncidentsReportPDF,
  generateOrdersReportPDF: () => generateOrdersReportPDF
});
import PDFDocument3 from "pdfkit";
async function loadLogoBuffer3(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
    }
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function hexToRgb2(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16)
  ];
}
function lightenColor3(hex, amount) {
  const [r, g, b] = hexToRgb2(hex);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
function formatDate3(d) {
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
async function generateOrdersReportPDF(data) {
  const doc = new PDFDocument3({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { orders: orders2, tenant, filters } = data;
  const logoBuffer = await loadLogoBuffer3(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor3(primaryColor, 0.93);
  const mediumColor = lightenColor3(primaryColor, 0.75);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  (async () => {
    try {
      let drawHeader2 = function() {
        const HEADER_H = 100;
        doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] });
          } catch {
          }
        }
        const TEXT_X = PAGE_W / 2;
        const TEXT_W = PAGE_W - TEXT_X - MARGIN;
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });
        const infoLines = [];
        if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
        if (tenant?.address) {
          tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((part) => infoLines.push(part));
        }
        const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
        if (cityParts.length) infoLines.push(cityParts.join(", "));
        const contact = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
        if (contact.length) infoLines.push(contact.join("  |  "));
        if (tenant?.website) infoLines.push(tenant.website);
        doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
        infoLines.forEach((line, i) => {
          doc.text(line, TEXT_X, 33 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false });
        });
        const TITLE_Y = HEADER_H;
        doc.rect(0, TITLE_Y, PAGE_W, 28).fill(mediumColor);
        doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("REPORTE DE PEDIDOS", MARGIN, TITLE_Y + 7, { width: CONTENT_W / 2, lineBreak: false });
        const filterParts = [];
        if (filters.dateFrom || filters.dateTo) {
          filterParts.push(`${filters.dateFrom || "\u2014"} al ${filters.dateTo || "\u2014"}`);
        }
        if (filters.customerName) filterParts.push(filters.customerName);
        if (filters.status && filters.status !== "all") filterParts.push(STATUS_LABELS[filters.status] || filters.status);
        if (filterParts.length) {
          doc.fontSize(7.5).font("Helvetica").fillColor(primaryColor);
          doc.text(filterParts.join("  \u2022  "), MARGIN + CONTENT_W / 2, TITLE_Y + 10, {
            width: CONTENT_W / 2,
            align: "right",
            lineBreak: false
          });
        }
      };
      var drawHeader = drawHeader2;
      let isFirstPage = true;
      drawHeader2();
      let currentY = 100 + 28 + 14;
      doc.fontSize(8).font("Helvetica").fillColor("#555555");
      doc.text(`Total de pedidos: ${orders2.length}`, MARGIN, currentY, { lineBreak: false });
      currentY += 16;
      for (let oi = 0; oi < orders2.length; oi++) {
        const order = orders2[oi];
        const cardPadEst = 10;
        const innerWEst = CONTENT_W - cardPadEst * 2 - 3;
        const productColW = innerWEst - 80;
        const buildLabel = (item) => (item.productCode ? `${item.productCode} \u2014 ${item.productName}` : item.productName).replace(/\s+/g, " ").trim();
        const itemsH = order.items.length === 0 ? 16 + 20 : order.items.reduce((sum, item) => {
          const h = doc.fontSize(8.5).font("Helvetica").heightOfString(buildLabel(item), { width: productColW });
          return sum + h + 6;
        }, 20);
        const notesTextW = innerWEst - 38;
        const notesH = order.notes ? doc.fontSize(8.5).font("Helvetica").heightOfString(order.notes, { width: notesTextW }) + 4 : 0;
        const orderH = 44 + itemsH + 14 + notesH;
        if (currentY + orderH > PAGE_H - 50) {
          doc.addPage();
          isFirstPage = false;
          drawHeader2();
          currentY = 100 + 28 + 14;
        }
        doc.rect(MARGIN, currentY, CONTENT_W, orderH).fill(lightColor);
        doc.rect(MARGIN, currentY, 3, orderH).fill(primaryColor);
        const cardPad = 10;
        const innerX = MARGIN + cardPad + 3;
        const innerW = CONTENT_W - cardPad * 2 - 3;
        const halfW = innerW / 2 - 6;
        const col2X = innerX + halfW + 12;
        let cardY = currentY + cardPad;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Folio:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(order.folio, innerX + 35, cardY, { width: halfW - 35, lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Fecha de Cierre:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate3(order.closeDate), col2X + 85, cardY, { lineBreak: false });
        cardY += 14;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Lib. C y Cobranza:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate3(order.creditReleaseDate), col2X + 95, cardY, { lineBreak: false });
        cardY += 14;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Orden de Compra:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(order.purchaseOrder || "\u2014", innerX + 90, cardY, { width: halfW - 90, lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Estatus:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(STATUS_LABELS[order.status] || order.status, col2X + 45, cardY, { lineBreak: false });
        cardY += 14;
        if (order.notes) {
          doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
          doc.text("Notas:", innerX, cardY, { lineBreak: false });
          doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
          doc.text(order.notes, innerX + 38, cardY, { width: innerW - 38 });
          const renderedNotesH = doc.fontSize(8.5).font("Helvetica").heightOfString(order.notes, { width: innerW - 38 });
          cardY += renderedNotesH + 4;
        }
        cardY += 4;
        doc.moveTo(innerX, cardY).lineTo(MARGIN + CONTENT_W - cardPad, cardY).strokeColor(mediumColor).lineWidth(0.5).stroke();
        cardY += 6;
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("Cantidad", innerX + 4, cardY, { lineBreak: false });
        doc.text("Clave / Producto", innerX + 80, cardY, { lineBreak: false });
        cardY += 14;
        if (order.items.length === 0) {
          doc.fontSize(8).font("Helvetica").fillColor("#999999");
          doc.text("Sin art\xEDculos", innerX + 4, cardY, { lineBreak: false });
          cardY += 14;
        } else {
          for (const item of order.items) {
            doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
            const qty = parseFloat(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 });
            const productLabel = buildLabel(item);
            const labelH = doc.fontSize(8.5).font("Helvetica").heightOfString(productLabel, { width: innerW - 80 });
            doc.text(`${qty} ${item.unitOfMeasure}`, innerX + 4, cardY, { width: 70, lineBreak: false });
            doc.text(productLabel, innerX + 80, cardY, { width: innerW - 80 });
            cardY += labelH + 6;
          }
        }
        currentY += orderH + 10;
      }
      const footerY = PAGE_H - 36;
      doc.rect(0, footerY, PAGE_W, 36).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.75)");
      const generated = (/* @__PURE__ */ new Date()).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Generado el ${generated}  \u2014  ${companyName}`, MARGIN, footerY + 14, { width: CONTENT_W, align: "center", lineBreak: false });
      doc.end();
    } catch (err) {
      console.error("Error generating report PDF:", err);
      doc.end();
    }
  })();
  return doc;
}
async function generateIncidentsReportPDF(data) {
  const doc = new PDFDocument3({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { incidents: incidents2, tenant, cutoffDate } = data;
  const logoBuffer = await loadLogoBuffer3(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor3(primaryColor, 0.93);
  const mediumColor = lightenColor3(primaryColor, 0.75);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  (async () => {
    try {
      let drawHeader2 = function() {
        const HEADER_H = 100;
        doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
        if (logoBuffer) {
          try {
            doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] });
          } catch {
          }
        }
        const TEXT_X = PAGE_W / 2;
        const TEXT_W = PAGE_W - TEXT_X - MARGIN;
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });
        const infoLines = [];
        if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
        if (tenant?.address) {
          tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((p) => infoLines.push(p));
        }
        const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
        if (cityParts.length) infoLines.push(cityParts.join(", "));
        const contact = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
        if (contact.length) infoLines.push(contact.join("  |  "));
        if (tenant?.website) infoLines.push(tenant.website);
        doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
        infoLines.forEach((line, i) => {
          doc.text(line, TEXT_X, 33 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false });
        });
        const TITLE_Y = HEADER_H;
        doc.rect(0, TITLE_Y, PAGE_W, 28).fill(mediumColor);
        doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("REPORTE DE INCIDENTES VIGENTES", MARGIN, TITLE_Y + 7, { width: CONTENT_W / 2, lineBreak: false });
        doc.fontSize(8).font("Helvetica").fillColor(primaryColor);
        doc.text(`Corte: ${cutoffDate}`, PAGE_W - MARGIN - 130, TITLE_Y + 10, { width: 130, align: "right", lineBreak: false });
      };
      var drawHeader = drawHeader2;
      drawHeader2();
      let currentY = 100 + 28 + 14;
      doc.fontSize(8).font("Helvetica").fillColor("#555555");
      doc.text(`Total de incidentes vigentes: ${incidents2.length}`, MARGIN, currentY, { lineBreak: false });
      currentY += 16;
      for (let ii = 0; ii < incidents2.length; ii++) {
        const inc = incidents2[ii];
        const descW = CONTENT_W - (10 + 3) * 2;
        const descH = doc.fontSize(8).font("Helvetica").heightOfString(inc.description || "", { width: descW }) + 2;
        const resH = inc.resolution ? doc.fontSize(8).font("Helvetica").heightOfString(inc.resolution, { width: descW }) + 14 : 0;
        const cardH = 73 + descH + resH;
        if (currentY + cardH > PAGE_H - 50) {
          doc.addPage();
          drawHeader2();
          currentY = 100 + 28 + 14;
        }
        doc.rect(MARGIN, currentY, CONTENT_W, cardH).fill(lightColor);
        doc.rect(MARGIN, currentY, 3, cardH).fill(primaryColor);
        const cardPad = 10;
        const innerX = MARGIN + cardPad + 3;
        const innerW = CONTENT_W - cardPad * 2 - 3;
        const halfW = innerW / 2 - 6;
        const col2X = innerX + halfW + 12;
        let cardY = currentY + cardPad;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Ticket:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(inc.ticketNumber, innerX + 40, cardY, { width: halfW - 40, lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Fecha:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate3(inc.createdAt), col2X + 38, cardY, { lineBreak: false });
        cardY += 14;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Tipo:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(INCIDENT_TYPE_LABELS2[inc.type] || inc.type, col2X + 30, cardY, { lineBreak: false });
        cardY += 14;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Urgencia:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(INCIDENT_URGENCY_LABELS2[inc.urgency] || inc.urgency, innerX + 52, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Estatus:", col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(INCIDENT_STATUS_LABELS2[inc.status] || inc.status, col2X + 45, cardY, { lineBreak: false });
        cardY += 14;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Asunto:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(inc.subject, innerX + 42, cardY, { width: innerW - 42, lineBreak: false });
        cardY += 14;
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555");
        doc.text("Descripci\xF3n:", innerX, cardY, { lineBreak: false });
        cardY += 11;
        doc.fontSize(8).font("Helvetica").fillColor("#333333");
        doc.text(inc.description || "\u2014", innerX + 4, cardY, { width: innerW - 4 });
        cardY += descH;
        if (inc.resolution) {
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555");
          doc.text("Resoluci\xF3n:", innerX, cardY, { lineBreak: false });
          cardY += 11;
          doc.fontSize(8).font("Helvetica").fillColor("#333333");
          doc.text(inc.resolution, innerX + 4, cardY, { width: innerW - 4 });
        }
        currentY += cardH + 8;
      }
      const footerY = PAGE_H - 36;
      doc.rect(0, footerY, PAGE_W, 36).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.75)");
      const generated = (/* @__PURE__ */ new Date()).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Generado el ${generated}  \u2014  ${companyName}`, MARGIN, footerY + 14, { width: CONTENT_W, align: "center", lineBreak: false });
      doc.end();
    } catch (err) {
      console.error("Error generating incidents PDF:", err);
      doc.end();
    }
  })();
  return doc;
}
var STATUS_LABELS, INCIDENT_TYPE_LABELS2, INCIDENT_STATUS_LABELS2, INCIDENT_URGENCY_LABELS2;
var init_reports_pdf_generator = __esm({
  "server/reports-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
    STATUS_LABELS = {
      pending: "Pendiente",
      in_production: "En Producci\xF3n",
      ready: "Listo",
      partially_released: "Parcialmente Surtido",
      released: "Surtido",
      shipped: "Embarcado",
      delivered: "Entregado"
    };
    INCIDENT_TYPE_LABELS2 = {
      garantia: "Garant\xEDa",
      retrabajo: "Retrabajo",
      queja: "Queja",
      consulta: "Consulta",
      administrativo: "Administrativo"
    };
    INCIDENT_STATUS_LABELS2 = {
      nuevo: "Nuevo",
      asignado: "Asignado",
      en_proceso: "En Proceso",
      esperando_cliente: "Esperando Cliente",
      esperando_interno: "Esperando Interno",
      resuelto: "Resuelto",
      cerrado: "Cerrado",
      cancelado: "Cancelado"
    };
    INCIDENT_URGENCY_LABELS2 = {
      baja: "Baja",
      media: "Media",
      alta: "Alta",
      critica: "Cr\xEDtica"
    };
  }
});

// server/shipment-remision-pdf-generator.ts
var shipment_remision_pdf_generator_exports = {};
__export(shipment_remision_pdf_generator_exports, {
  generateShipmentRemisionPDF: () => generateShipmentRemisionPDF
});
import PDFDocument4 from "pdfkit";
async function loadLogoBuffer4(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      return await localStorageService.getFile(`logos/${logoUrl.replace("/api/logos/", "")}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function fmtDate(date) {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function lightenColor4(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `#${Math.min(255, r + Math.round((255 - r) * amount)).toString(16).padStart(2, "0")}${Math.min(255, g + Math.round((255 - g) * amount)).toString(16).padStart(2, "0")}${Math.min(255, b + Math.round((255 - b) * amount)).toString(16).padStart(2, "0")}`;
}
async function generateShipmentRemisionPDF(data) {
  const { tenant, products: products2 } = data;
  const doc = new PDFDocument4({ size: "LETTER", margin: 0, autoFirstPage: true });
  const logoBuffer = await loadLogoBuffer4(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor4(primaryColor, 0.92);
  const mediumColor = lightenColor4(primaryColor, 0.75);
  const PAGE_W = 612;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = /* @__PURE__ */ new Date();
  const HEADER_H = 110;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGIN, (HEADER_H - 64) / 2, { fit: [110, 64] });
    } catch {
    }
  }
  const TEXT_X = PAGE_W / 2;
  const TEXT_W = PAGE_W - TEXT_X - MARGIN;
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text(companyName.toUpperCase(), TEXT_X, 16, { width: TEXT_W, align: "right", lineBreak: false });
  const infoLines = [];
  if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
  if (tenant?.address) tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((p) => infoLines.push(p));
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  if (tenant?.phone) infoLines.push(`Tel: ${tenant.phone}`);
  if (tenant?.email) infoLines.push(tenant.email);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 34 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false }));
  const TITLE_Y = HEADER_H;
  const TITLE_H = 30;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("REMISI\xD3N DE SALIDA", MARGIN, TITLE_Y + 7, { width: CONTENT_W * 0.6 });
  doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor);
  doc.text(`Fecha: ${fmtDate(now)}`, MARGIN + CONTENT_W * 0.6, TITLE_Y + 10, { width: CONTENT_W * 0.4, align: "right" });
  let Y = TITLE_Y + TITLE_H + 14;
  doc.fontSize(18).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(data.invoiceNumber || data.folio, MARGIN, Y);
  Y += 28;
  const INFO_COL = CONTENT_W / 3;
  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text("Orden:", MARGIN, Y);
  doc.text("Estado:", MARGIN + INFO_COL, Y);
  doc.text("Fecha programada:", MARGIN + INFO_COL * 2, Y);
  Y += 11;
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.folio, MARGIN, Y);
  doc.text(data.orderStatus, MARGIN + INFO_COL, Y);
  doc.text(fmtDate(data.scheduledDate), MARGIN + INFO_COL * 2, Y);
  Y += 18;
  const BOX_W = CONTENT_W / 2 - 6;
  const BOX2_X = MARGIN + BOX_W + 12;
  const BOX_H = 70;
  doc.rect(MARGIN, Y, BOX_W, BOX_H).fill(lightColor);
  doc.rect(MARGIN, Y, BOX_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("CLIENTE / DESTINATARIO", MARGIN + 6, Y + 4, { width: BOX_W - 12 });
  if (data.customerAddress) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
    doc.text(data.customerAddress, MARGIN + 6, Y + 20, { width: BOX_W - 12, lineBreak: false, ellipsis: true });
  }
  doc.rect(BOX2_X, Y, BOX_W, BOX_H).fill(lightColor);
  doc.rect(BOX2_X, Y, BOX_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("DATOS DE TRANSPORTE", BOX2_X + 6, Y + 4, { width: BOX_W - 12 });
  const transportLines = [
    { label: "Transportista:", value: data.transporter },
    { label: "Tipo:", value: data.transportType === "propio" ? "Transporte Propio" : "Paqueter\xEDa" },
    { label: "Chofer:", value: data.driverName || "\u2014" },
    { label: "Placas:", value: data.vehiclePlates || "\u2014" }
  ];
  doc.fontSize(7.5).font("Helvetica").fillColor("#374151");
  transportLines.forEach((row, i) => {
    doc.font("Helvetica-Bold").text(row.label, BOX2_X + 6, Y + 20 + i * 11, { width: 65, continued: false });
    doc.font("Helvetica").text(row.value, BOX2_X + 74, Y + 20 + i * 11, { width: BOX_W - 80, lineBreak: false, ellipsis: true });
  });
  Y += BOX_H + 14;
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Nombre: _______________________________________________", MARGIN, Y);
  Y += 16;
  doc.text("A quien corresponda:", MARGIN, Y);
  Y += 12;
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#4b5563");
  doc.text(
    "Por medio de la presente autorizamos al portador trasladar nuestros equipos desde las instalaciones de la empresa hasta el destino marcado previamente.",
    MARGIN,
    Y,
    { width: CONTENT_W }
  );
  Y += 24;
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Atte. DIRECCI\xD3N", MARGIN, Y);
  Y += 18;
  const COL = {
    producto: MARGIN,
    cantidad: MARGIN + 240,
    desde: MARGIN + 320,
    serie: MARGIN + 400
  };
  const ROW_H = 18;
  doc.rect(MARGIN, Y, CONTENT_W, ROW_H).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("PRODUCTO", COL.producto + 4, Y + 5, { width: 232 });
  doc.text("CANTIDAD", COL.cantidad + 4, Y + 5, { width: 76 });
  doc.text("DESDE", COL.desde + 4, Y + 5, { width: 76 });
  doc.text("N\xDAMERO DE LOTE/SERIE", COL.serie + 4, Y + 5, { width: 128 });
  Y += ROW_H;
  let rowIndex = 0;
  for (const p of products2) {
    const rows = p.serialNumbers.length > 0 ? p.serialNumbers : ["\u2014"];
    const qtyPerRow = p.serialNumbers.length > 1 ? 1 : p.quantity;
    for (const serial of rows) {
      if (rowIndex % 2 === 0) doc.rect(MARGIN, Y, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(7.5).font("Helvetica").fillColor("#111827");
      doc.text(p.name, COL.producto + 4, Y + 5, { width: 232, lineBreak: false, ellipsis: true });
      doc.text(`${qtyPerRow.toFixed(2)} ${p.unitOfMeasure}`, COL.cantidad + 4, Y + 5, { width: 76 });
      doc.text(p.desde, COL.desde + 4, Y + 5, { width: 76 });
      doc.font("Helvetica-Bold").text(serial, COL.serie + 4, Y + 5, { width: 128, lineBreak: false, ellipsis: true });
      Y += ROW_H;
      rowIndex++;
      if (Y > 680) {
        doc.addPage();
        Y = 40;
      }
    }
  }
  Y += 22;
  if (Y > 630) {
    doc.addPage();
    Y = 40;
  }
  const SIG_W = CONTENT_W / 4 - 6;
  const SIG_H = 80;
  const sigBoxes = ["DEPTO. DE SEGURIDAD", "EMBARQUES", "FACTURACI\xD3N", "TRANSPORTACI\xD3N"];
  sigBoxes.forEach((label, i) => {
    const bx = MARGIN + i * (SIG_W + 8);
    doc.rect(bx, Y, SIG_W, SIG_H).stroke(mediumColor);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(label, bx + 4, Y + 5, { width: SIG_W - 8 });
    doc.moveTo(bx + 4, Y + 45).lineTo(bx + SIG_W - 4, Y + 45).stroke("#9ca3af");
    doc.fontSize(6.5).font("Helvetica").fillColor("#6b7280");
    doc.text("FIRMA", bx + 4, Y + 47, { width: SIG_W - 8 });
    doc.moveTo(bx + 4, Y + 68).lineTo(bx + SIG_W - 4, Y + 68).stroke("#9ca3af");
    doc.text("FECHA", bx + 4, Y + 70, { width: SIG_W - 8 });
  });
  Y += SIG_H + 20;
  if (Y > 710) {
    doc.addPage();
    Y = 40;
  }
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Yo ", MARGIN, Y, { continued: true });
  doc.text("___________________________________", { continued: true });
  doc.text(" firmo de que he recibido completa la mercanc\xEDa arriba descrita.", { continued: false });
  Y += 22;
  doc.text("Fecha ___/___/______", MARGIN, Y);
  doc.moveTo(PAGE_W - MARGIN - 160, Y).lineTo(PAGE_W - MARGIN, Y).stroke("#374151");
  doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
  doc.text("FIRMA DE RECIBIDO POR PARTE DEL CLIENTE", PAGE_W - MARGIN - 160, Y + 4, { width: 160, align: "right" });
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  const footerParts = [];
  if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
  if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
  if (tenant?.phone) footerParts.push(tenant.phone);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
  doc.text(footerParts.join("   |   "), MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" });
  doc.text("P\xE1gina: 1 / 1", MARGIN, FOOTER_Y + 20, { width: CONTENT_W, align: "center" });
  doc.end();
  return doc;
}
var init_shipment_remision_pdf_generator = __esm({
  "server/shipment-remision-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
  }
});

// server/invoice-pdf-generator.ts
var invoice_pdf_generator_exports = {};
__export(invoice_pdf_generator_exports, {
  generateInvoicePDFStream: () => generateInvoicePDFStream
});
import PDFDocument5 from "pdfkit";
async function loadLogoBuffer5(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function formatCurrency2(value, currency = "MXN") {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return "$" + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate4(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", timeZone: timezone || "America/Mexico_City" });
}
function formatDateTime3(date, timezone) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: timezone || "America/Mexico_City" });
}
function lightenColor5(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
async function generateInvoicePDFStream(data) {
  const doc = new PDFDocument5({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { invoice, customer, tenant } = data;
  const logoBuffer = await loadLogoBuffer5(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor5(primaryColor, 0.92);
  const mediumColor = lightenColor5(primaryColor, 0.75);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  try {
    const HEADER_H = 112;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] });
      } catch {
      }
    }
    const TEXT_X = PAGE_W / 2;
    const TEXT_W = PAGE_W - TEXT_X - MARGIN;
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });
    const infoLines = [];
    if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
    if (tenant?.address) {
      tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((part) => infoLines.push(part));
    }
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("   |   "));
    if (tenant?.website) infoLines.push(tenant.website);
    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
    infoLines.forEach((line, i) => {
      doc.text(line, TEXT_X, 33 + i * 11, { width: TEXT_W, align: "right", lineBreak: false });
    });
    const TITLE_Y = HEADER_H;
    const TITLE_H = 32;
    doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("FACTURA", MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.5 });
    doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
    doc.text(`Serie: ${invoice.serie}  |  Folio: ${invoice.folio}`, MARGIN + CONTENT_W * 0.5, TITLE_Y + 11, { width: CONTENT_W * 0.5, align: "right" });
    let currentY = TITLE_Y + TITLE_H + 18;
    if (invoice.cfdiUuid) {
      doc.rect(MARGIN, currentY, CONTENT_W, 20).fill(lightColor);
      doc.fontSize(7.5).font("Helvetica").fillColor("#666");
      doc.text("UUID CFDI:", MARGIN + 6, currentY + 6, { continued: true, width: 55 });
      doc.font("Helvetica-Bold").fillColor("#333").text(invoice.cfdiUuid, { width: CONTENT_W - 70 });
      currentY += 26;
    }
    const COL_W = CONTENT_W / 2 - 8;
    const COL2_X = MARGIN + COL_W + 16;
    const BOX_H = 100;
    doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
    doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text("DATOS DE LA FACTURA", COL2_X + 6, currentY + 4, { width: COL_W - 10 });
    let leftY = currentY + 22;
    const customerRows = [
      ["Raz\xF3n Social:", customer.name],
      ...customer.rfc ? [["RFC:", customer.rfc]] : [],
      ...customer.phone ? [["Tel\xE9fono:", customer.phone]] : [],
      ...customer.email ? [["Email:", customer.email]] : []
    ];
    if (customer.address) {
      const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
      customerRows.push(["Direcci\xF3n:", addr]);
    }
    const LABEL_W = 68;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 10;
    doc.fontSize(8);
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L, lineBreak: false });
      leftY += 12;
    }
    let rightY = currentY + 22;
    const invoiceRows = [
      ["Fecha Emisi\xF3n:", formatDate4(invoice.issuedAt, tenant?.timezone)],
      ...invoice.dueDate ? [["Vencimiento:", formatDate4(invoice.dueDate, tenant?.timezone)]] : [],
      ["M\xE9todo Pago:", invoice.paymentMethod || "Por definir"],
      ["Forma Pago:", invoice.paymentForm || "Por definir"],
      ["Moneda:", invoice.currency || "MXN"]
    ];
    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 10;
    for (const [label, value] of invoiceRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
      rightY += 12;
    }
    currentY += BOX_H + 20;
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("RESUMEN DE FACTURA", MARGIN + 6, currentY + 4);
    currentY += 16;
    const TOTALS_W = 220;
    const TOTALS_X = PAGE_W - MARGIN - TOTALS_W;
    doc.rect(TOTALS_X, currentY, TOTALS_W, 75).fill(lightColor);
    doc.rect(TOTALS_X, currentY, TOTALS_W, 75).stroke(mediumColor);
    let totY = currentY + 10;
    doc.fontSize(8.5).font("Helvetica").fillColor("#444");
    doc.text("Subtotal:", TOTALS_X + 6, totY, { width: 110 });
    doc.text(formatCurrency2(invoice.subtotal), TOTALS_X + 116, totY, { width: TOTALS_W - 122, align: "right" });
    totY += 16;
    doc.text("IVA (16%):", TOTALS_X + 6, totY, { width: 110 });
    doc.text(formatCurrency2(invoice.tax), TOTALS_X + 116, totY, { width: TOTALS_W - 122, align: "right" });
    totY += 16;
    doc.rect(TOTALS_X, totY, TOTALS_W, 1).fill(mediumColor);
    totY += 6;
    doc.rect(TOTALS_X, totY, TOTALS_W, 22).fill(primaryColor);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("TOTAL:", TOTALS_X + 6, totY + 6, { width: 90 });
    doc.text(formatCurrency2(invoice.total), TOTALS_X + 96, totY + 6, { width: TOTALS_W - 102, align: "right" });
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#888");
    doc.text(`Importe expresado en ${invoice.currency || "MXN"} (Pesos Mexicanos).`, MARGIN, currentY + 10, { width: TOTALS_X - MARGIN - 10 });
    doc.text("Este documento es una representaci\xF3n impresa de un CFDI.", MARGIN, currentY + 22, { width: TOTALS_X - MARGIN - 10 });
    currentY += 85;
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text("Representaci\xF3n impresa de Comprobante Fiscal Digital por Internet (CFDI).", MARGIN, FOOTER_Y + 6, { width: 280 });
    doc.text(`Generado el ${formatDateTime3(/* @__PURE__ */ new Date(), tenant?.timezone)}`, MARGIN, FOOTER_Y + 16, { width: 280 });
    const footerRight = [];
    if (tenant?.phone) footerRight.push(`Tel: ${tenant.phone}`);
    if (tenant?.email) footerRight.push(tenant.email);
    if (tenant?.website) footerRight.push(tenant.website);
    if (footerRight.length) {
      doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff");
      doc.text(footerRight.join("   |   "), PAGE_W - MARGIN - 270, FOOTER_Y + 10, { width: 270, align: "right" });
    }
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName, PAGE_W - MARGIN - 270, FOOTER_Y + 22, { width: 270, align: "right" });
    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    doc.end();
  }
  return doc;
}
var init_invoice_pdf_generator = __esm({
  "server/invoice-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
  }
});

// server/invoice-email-service.ts
var invoice_email_service_exports = {};
__export(invoice_email_service_exports, {
  sendInvoiceEmail: () => sendInvoiceEmail
});
import { MailerSend as MailerSend3, EmailParams as EmailParams3, Sender as Sender3, Recipient as Recipient3 } from "mailersend";
function formatCurrency3(value) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatDate5(date) {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
async function sendInvoiceEmail({
  invoice,
  customer,
  recipientEmail,
  ccEmails = []
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY no est\xE1 configurado");
  }
  const mailerSend3 = new MailerSend3({ apiKey });
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f7fafc; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { color: #718096; }
        .value { font-weight: bold; }
        .total-section { background: #e2e8f0; padding: 15px; margin-top: 20px; border-radius: 8px; }
        .total-amount { font-size: 24px; color: #2d3748; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GRUPO JOPER</h1>
          <p>Sistema Comercial</p>
        </div>
        
        <div class="content">
          <h2>Factura ${invoice.serie}-${invoice.folio}</h2>
          
          <p>Estimado/a <strong>${customer.name}</strong>,</p>
          
          <p>Le hacemos llegar su factura correspondiente. A continuaci\xF3n los detalles:</p>
          
          <div class="info-row">
            <span class="label">N\xFAmero de Factura:</span>
            <span class="value">${invoice.serie}-${invoice.folio}</span>
          </div>
          
          ${invoice.cfdiUuid ? `
          <div class="info-row">
            <span class="label">UUID CFDI:</span>
            <span class="value">${invoice.cfdiUuid}</span>
          </div>
          ` : ""}
          
          <div class="info-row">
            <span class="label">Fecha de Emisi\xF3n:</span>
            <span class="value">${formatDate5(invoice.issuedAt)}</span>
          </div>
          
          ${invoice.dueDate ? `
          <div class="info-row">
            <span class="label">Fecha de Vencimiento:</span>
            <span class="value">${formatDate5(invoice.dueDate)}</span>
          </div>
          ` : ""}
          
          <div class="total-section">
            <div class="info-row">
              <span class="label">Subtotal:</span>
              <span class="value">${formatCurrency3(invoice.subtotal)}</span>
            </div>
            <div class="info-row">
              <span class="label">IVA (16%):</span>
              <span class="value">${formatCurrency3(invoice.tax)}</span>
            </div>
            <hr style="border: none; border-top: 1px solid #cbd5e0; margin: 10px 0;">
            <div class="info-row">
              <span class="label">Total a Pagar:</span>
              <span class="total-amount">${formatCurrency3(invoice.total)}</span>
            </div>
          </div>
          
          <p style="margin-top: 20px;">
            Si tiene alguna pregunta sobre esta factura, no dude en contactarnos.
          </p>
        </div>
        
        <div class="footer">
          <p>Este correo fue generado autom\xE1ticamente por el Sistema Comercial de GRUPO JOPER.</p>
          <p>Por favor no responda directamente a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const sentFrom = new Sender3("noreply@nexxo.com.mx", "GRUPO JOPER");
  const recipients = [new Recipient3(recipientEmail, customer.name)];
  const cc = ccEmails.filter((email) => email && email !== recipientEmail).map((email) => new Recipient3(email));
  const emailParams = new EmailParams3().setFrom(sentFrom).setTo(recipients).setSubject(`Factura ${invoice.serie}-${invoice.folio} - GRUPO JOPER`).setHtml(htmlContent);
  if (cc.length > 0) {
    emailParams.setCc(cc);
  }
  await mailerSend3.email.send(emailParams);
}
var init_invoice_email_service = __esm({
  "server/invoice-email-service.ts"() {
    "use strict";
  }
});

// server/account-statement-email-service.ts
var account_statement_email_service_exports = {};
__export(account_statement_email_service_exports, {
  sendAccountStatementEmail: () => sendAccountStatementEmail
});
import { MailerSend as MailerSend4, EmailParams as EmailParams4, Sender as Sender4, Recipient as Recipient4 } from "mailersend";
function fmt(value, currency = "MXN") {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function fmtDate2(date) {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function statusLabel(status) {
  const map = {
    pending_payment: "Pendiente",
    partially_paid: "Pago Parcial",
    paid: "Pagado",
    cancelled: "Cancelada",
    draft: "Borrador"
  };
  return map[status] ?? status;
}
function statusColor(status) {
  const map = {
    pending_payment: "#dc2626",
    partially_paid: "#d97706",
    paid: "#16a34a",
    cancelled: "#6b7280",
    draft: "#9ca3af"
  };
  return map[status] ?? "#374151";
}
async function sendAccountStatementEmail({
  customer,
  invoices: invoices2,
  payments: payments2,
  recipientEmails,
  tenantName = "Nexxo",
  cutoffDate,
  liveData,
  ccEmails
}) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) throw new Error("MAILERSEND_API_KEY no est\xE1 configurado");
  const now = /* @__PURE__ */ new Date();
  let totalBalance;
  let totalOverdue;
  let usdTotal = 0;
  let invoiceRows;
  let invoiceTableHeader;
  let paymentRows;
  let activeCount;
  const dedupLive = (list) => {
    const seen = /* @__PURE__ */ new Map();
    for (const inv of list) {
      const prev = seen.get(inv.FOLIO);
      if (!prev || inv.SALDO > prev.SALDO) seen.set(inv.FOLIO, inv);
    }
    return Array.from(seen.values());
  };
  const dedupLocalInvoices = (list) => {
    const seen = /* @__PURE__ */ new Map();
    for (const inv of list) {
      const key = `${inv.serie ?? ""}-${inv.folio}`;
      const prev = seen.get(key);
      if (!prev || parseFloat(inv.balanceDue ?? inv.total ?? "0") > parseFloat(prev.balanceDue ?? prev.total ?? "0")) seen.set(key, inv);
    }
    return Array.from(seen.values());
  };
  if (liveData) {
    const liveInvoices = dedupLive(liveData.invoices);
    const currencyOf = (inv) => inv.TIPO_CAMBIO && inv.TIPO_CAMBIO > 1.5 ? "USD" : "MXN";
    const mxnInvoices = liveInvoices.filter((i) => currencyOf(i) === "MXN");
    const usdInvoices = liveInvoices.filter((i) => currencyOf(i) === "USD");
    const totalMXN = mxnInvoices.reduce((s, i) => s + i.SALDO, 0);
    const totalUSD = usdInvoices.reduce((s, i) => s + i.SALDO, 0);
    totalBalance = totalMXN;
    const overdueInv = liveInvoices.filter((i) => i.FECHA_VEN && new Date(i.FECHA_VEN) < now);
    totalOverdue = overdueInv.filter((i) => currencyOf(i) === "MXN").reduce((s, i) => s + i.SALDO, 0);
    activeCount = liveInvoices.length;
    invoiceRows = liveInvoices.map((inv) => {
      const isOverdue = inv.FECHA_VEN && new Date(inv.FECHA_VEN) < now;
      const statusCol = isOverdue ? "#dc2626" : "#d97706";
      const statusTxt = isOverdue ? "Vencida" : "Pendiente";
      const cur = currencyOf(inv);
      return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;font-weight:600;">${inv.FOLIO}</td>
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate2(inv.FECHA)}</td>
        <td style="padding:8px 10px;color:${isOverdue ? "#dc2626" : "#374151"};">
          ${inv.FECHA_VEN ? fmtDate2(inv.FECHA_VEN) : "\u2014"}${isOverdue ? " \u26A0" : ""}
        </td>
        <td style="padding:8px 10px;text-align:right;">${fmt(inv.IMPORTE_TOTAL, cur)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:${statusCol};">
          ${fmt(inv.SALDO, cur)}
        </td>
        <td style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">${cur}</td>
        <td style="padding:8px 10px;">
          <span style="background:${statusCol}20;color:${statusCol};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">
            ${statusTxt}
          </span>
        </td>
      </tr>`;
    }).join("");
    usdTotal = totalUSD;
    invoiceTableHeader = `
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Folio</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Emisi\xF3n</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Total</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Saldo</th>
            <th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;">Moneda</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>`;
    paymentRows = liveData.payments.slice(0, 10).map((pay) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate2(pay.FECHA)}</td>
        <td style="padding:8px 10px;">${pay.REFERENCIA ?? "\u2014"}</td>
        <td style="padding:8px 10px;color:#6b7280;">${pay.FACTURA_FOLIO ?? "\u2014"}</td>
        <td style="padding:8px 10px;text-align:right;color:#16a34a;font-weight:600;">+${fmt(pay.IMPORTE)}</td>
      </tr>`).join("");
  } else {
    const activeInvoices = dedupLocalInvoices(invoices2.filter(
      (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
    ));
    activeCount = activeInvoices.length;
    totalBalance = activeInvoices.reduce((sum, inv) => {
      const b = parseFloat(inv.balanceDue ?? inv.total ?? "0");
      return sum + (Number.isFinite(b) ? b : 0);
    }, 0);
    const overdueInvoices = activeInvoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now
    );
    totalOverdue = overdueInvoices.reduce((sum, inv) => {
      const b = parseFloat(inv.balanceDue ?? inv.total ?? "0");
      return sum + (Number.isFinite(b) ? b : 0);
    }, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    const recentPayments = [...payments2].filter((p) => new Date(p.paymentDate) >= thirtyDaysAgo).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 10);
    invoiceRows = activeInvoices.map((inv) => {
      const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
      const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0");
      return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;font-weight:600;">${inv.serie}-${inv.folio}</td>
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate2(inv.issuedAt)}</td>
        <td style="padding:8px 10px;color:${isOverdue ? "#dc2626" : "#374151"};">
          ${inv.dueDate ? fmtDate2(inv.dueDate) : "\u2014"}${isOverdue ? " \u26A0" : ""}
        </td>
        <td style="padding:8px 10px;text-align:right;">${fmt(inv.total, inv.currency)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:${statusColor(inv.status)};">
          ${fmt(bal, inv.currency)}
        </td>
        <td style="padding:8px 10px;">
          <span style="background:${statusColor(inv.status)}20;color:${statusColor(inv.status)};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">
            ${statusLabel(inv.status)}
          </span>
        </td>
      </tr>`;
    }).join("");
    paymentRows = recentPayments.map((pay) => {
      const inv = invoices2.find((i) => i.id === pay.invoiceId);
      return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate2(pay.paymentDate)}</td>
        <td style="padding:8px 10px;">${pay.reference ?? "\u2014"}</td>
        <td style="padding:8px 10px;color:#6b7280;">${inv ? `${inv.serie}-${inv.folio}` : "\u2014"}</td>
        <td style="padding:8px 10px;text-align:right;color:#16a34a;font-weight:600;">+${fmt(pay.amount)}</td>
      </tr>`;
    }).join("");
    invoiceTableHeader = `
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Folio</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Emisi\xF3n</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Total (MXN)</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Saldo (MXN)</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>`;
  }
  const cutoffStr = cutoffDate ? fmtDate2(cutoffDate) : fmtDate2(now);
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:700px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    
    <!-- Header -->
    <div style="background:#1e3a5f;padding:28px 32px;color:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:.5px;">${tenantName}</h1>
          <p style="margin:0;opacity:.8;font-size:13px;">Estado de Cuenta</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:12px;opacity:.7;">Corte al</p>
          <p style="margin:0;font-size:15px;font-weight:600;">${cutoffStr}</p>
        </div>
      </div>
    </div>

    <!-- Customer info -->
    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Cliente</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${customer.name}</p>
      ${customer.rfc ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">RFC: ${customer.rfc}</p>` : ""}
      ${customer.email ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${customer.email}</p>` : ""}
    </div>

    <!-- Summary cards -->
    <div style="display:flex;padding:20px 32px;gap:16px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#fef2f2;border-radius:8px;padding:16px 18px;border:1px solid #fecaca;">
        <p style="margin:0 0 6px;font-size:12px;color:#ef4444;font-weight:600;text-transform:uppercase;">Saldo Total</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#dc2626;">${fmt(totalBalance)}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">MXN</p>
      </div>
      ${totalOverdue > 0 ? `
      <div style="flex:1;min-width:140px;background:#fff7ed;border-radius:8px;padding:16px 18px;border:1px solid #fed7aa;">
        <p style="margin:0 0 6px;font-size:12px;color:#f97316;font-weight:600;text-transform:uppercase;">Saldo Vencido</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#ea580c;">${fmt(totalOverdue)}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">MXN</p>
      </div>` : ""}
      ${usdTotal > 0 ? `
      <div style="flex:1;min-width:140px;background:#eff6ff;border-radius:8px;padding:16px 18px;border:1px solid #bfdbfe;">
        <p style="margin:0 0 6px;font-size:12px;color:#2563eb;font-weight:600;text-transform:uppercase;">Saldo Total</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#1d4ed8;">${fmt(usdTotal, "USD")}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">USD</p>
      </div>` : ""}
      <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:8px;padding:16px 18px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 6px;font-size:12px;color:#16a34a;font-weight:600;text-transform:uppercase;">Facturas Activas</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#15803d;">${activeCount}</p>
      </div>
    </div>

    <!-- Invoices table -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;">
        Facturas Pendientes
      </h2>
      ${activeCount === 0 ? `
        <p style="color:#6b7280;font-style:italic;padding:16px 0;">Sin facturas pendientes.</p>
      ` : `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>${invoiceTableHeader}</thead>
        <tbody>${invoiceRows}</tbody>
      </table>`}
    </div>

    <!-- Payments table -->
    ${paymentRows.length > 0 ? `
    <div style="padding:0 32px 24px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;">
        \xDAltimos Pagos Registrados
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Fecha</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Referencia</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Factura</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Importe</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>` : ""}

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Estado de cuenta generado autom\xE1ticamente por ${tenantName} \xB7 ${fmtDate2(now)}
      </p>
      <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Por favor, no responda a este correo.</p>
    </div>
  </div>
</body>
</html>`;
  const mailerSend3 = new MailerSend4({ apiKey });
  const sentFrom = new Sender4("noreply@nexxo.com.mx", tenantName);
  const norm = (e) => e.trim().toLowerCase();
  const toSet = /* @__PURE__ */ new Set();
  const toList = [];
  for (const e of recipientEmails) {
    const k = norm(e);
    if (k && !toSet.has(k)) {
      toSet.add(k);
      toList.push(e.trim());
    }
  }
  const ccSet = /* @__PURE__ */ new Set();
  const ccList = [];
  for (const e of ccEmails ?? []) {
    const k = norm(e);
    if (k && !toSet.has(k) && !ccSet.has(k)) {
      ccSet.add(k);
      ccList.push(e.trim());
    }
  }
  let emailParams = new EmailParams4().setFrom(sentFrom).setTo(toList.map((e) => new Recipient4(e, customer.name))).setSubject(`Estado de Cuenta \u2014 ${customer.name} \u2014 ${fmtDate2(now)}`).setHtml(html);
  if (ccList.length > 0) {
    emailParams = emailParams.setCc(ccList.map((e) => new Recipient4(e, e)));
  }
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mailerSend3.email.send(emailParams);
      return;
    } catch (err) {
      const status = err?.statusCode ?? err?.status ?? err?.body?.status;
      const isRateLimit = status === 429 || err?.body?.error_code === 1015;
      if (isRateLimit && attempt < maxAttempts) {
        const waitMs = 15e3 * attempt;
        console.warn(`[StatementEmail] Rate limited (intento ${attempt}/${maxAttempts}), esperando ${waitMs / 1e3}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}
var init_account_statement_email_service = __esm({
  "server/account-statement-email-service.ts"() {
    "use strict";
  }
});

// server/account-statement-pdf-generator.ts
var account_statement_pdf_generator_exports = {};
__export(account_statement_pdf_generator_exports, {
  generateAccountStatementPDF: () => generateAccountStatementPDF
});
import PDFDocument6 from "pdfkit";
async function loadLogoBuffer6(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function fmt2(value, currency = "MXN") {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return currency === "USD" ? "US$0.00" : "$0.00";
  const prefix = currency === "USD" ? "US$" : "$";
  return prefix + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate3(date) {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function statusLabel2(status) {
  const map = {
    pending_payment: "Pendiente",
    partially_paid: "Pago Parcial",
    paid: "Pagado",
    cancelled: "Cancelada"
  };
  return map[status] ?? status;
}
function lightenColor6(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
async function generateAccountStatementPDF(data) {
  const { customer, invoices: invoices2, payments: payments2, tenant } = data;
  let cxcData = data.cxcData;
  const doc = new PDFDocument6({ size: "LETTER", margin: 0, autoFirstPage: true });
  const logoBuffer = await loadLogoBuffer6(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor6(primaryColor, 0.92);
  const mediumColor = lightenColor6(primaryColor, 0.75);
  const PAGE_W = 612;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = /* @__PURE__ */ new Date();
  let totalBalance;
  let totalOverdue;
  let activeCount;
  let docCurrency = "MXN";
  const dedupCxc = (list) => {
    const seen = /* @__PURE__ */ new Map();
    for (const inv of list) {
      const prev = seen.get(inv.folio);
      if (!prev || Number(inv.balance) > Number(prev.balance)) seen.set(inv.folio, inv);
    }
    return Array.from(seen.values());
  };
  const dedupLocal = (list) => {
    const seen = /* @__PURE__ */ new Map();
    for (const inv of list) {
      const key = `${inv.serie ?? ""}-${inv.folio}`;
      const prev = seen.get(key);
      if (!prev || parseFloat(inv.balanceDue ?? inv.total ?? "0") > parseFloat(prev.balanceDue ?? prev.total ?? "0")) seen.set(key, inv);
    }
    return Array.from(seen.values());
  };
  if (cxcData) {
    const dedupedCxc = dedupCxc(cxcData.invoices);
    cxcData = { ...cxcData, invoices: dedupedCxc };
    totalBalance = dedupedCxc.reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
    totalOverdue = dedupedCxc.filter((inv) => inv.dueDate && new Date(inv.dueDate) < now).reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
    activeCount = dedupedCxc.length;
    if (dedupedCxc.some((inv) => inv.currency === "USD")) docCurrency = "USD";
  } else {
    const activeInvoices = dedupLocal(invoices2.filter(
      (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
    ));
    totalBalance = activeInvoices.reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
    const overdueInvoices = activeInvoices.filter((inv) => inv.dueDate && new Date(inv.dueDate) < now);
    totalOverdue = overdueInvoices.reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
    activeCount = activeInvoices.length;
  }
  const localActiveInvoices = cxcData ? [] : dedupLocal(
    invoices2.filter((inv) => inv.status === "pending_payment" || inv.status === "partially_paid")
  );
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const recentPayments = [...payments2].filter((p) => new Date(p.paymentDate).getFullYear() === currentYear).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 15);
  const HEADER_H = 112;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] });
    } catch {
    }
  }
  const TEXT_X = PAGE_W / 2;
  const TEXT_W = PAGE_W - TEXT_X - MARGIN;
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });
  const infoLines = [];
  if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
  if (tenant?.address) tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((p) => infoLines.push(p));
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
  if (contactParts.length) infoLines.push(contactParts.join("   |   "));
  if (tenant?.website) infoLines.push(tenant.website);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 33 + i * 11, { width: TEXT_W, align: "right", lineBreak: false }));
  const TITLE_Y = HEADER_H;
  const TITLE_H = 32;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("ESTADO DE CUENTA", MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.5 });
  doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
  doc.text(`Corte: ${fmtDate3(now)}`, MARGIN + CONTENT_W * 0.5, TITLE_Y + 11, { width: CONTENT_W * 0.5, align: "right" });
  let currentY = TITLE_Y + TITLE_H + 16;
  const COL_W = CONTENT_W / 2 - 8;
  const COL2_X = MARGIN + COL_W + 16;
  const customerEmails = customer.email ? customer.email.split(/[;,]/).map((e) => e.trim()).filter(Boolean) : [];
  const EMAIL_LINE_H = 13;
  const extraEmailH = Math.max(0, customerEmails.length - 1) * EMAIL_LINE_H;
  const BOX_H = 76 + extraEmailH;
  doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
  doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("CLIENTE", MARGIN + 8, currentY + 4, { width: COL_W - 16 });
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827");
  doc.text(customer.name, MARGIN + 8, currentY + 22, { width: COL_W - 16, lineBreak: false, ellipsis: true });
  doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
  if (customer.rfc) doc.text(`RFC: ${customer.rfc}`, MARGIN + 8, currentY + 36, { width: COL_W - 16 });
  customerEmails.forEach((email, idx) => {
    doc.text(email, MARGIN + 8, currentY + 48 + idx * EMAIL_LINE_H, { width: COL_W - 16, lineBreak: false, ellipsis: true });
  });
  if (customer.phone) {
    const phoneOffY = 48 + Math.max(customerEmails.length, 1) * EMAIL_LINE_H;
    doc.text(`Tel: ${customer.phone}`, MARGIN + 8, currentY + phoneOffY, { width: COL_W - 16 });
  }
  doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
  doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("RESUMEN", COL2_X + 8, currentY + 4, { width: COL_W - 16 });
  const summaryContentH = BOX_H - 16;
  const summaryRowStep = summaryContentH / 3;
  const s1Y = currentY + 16 + summaryRowStep * 0 + 6;
  const s2Y = currentY + 16 + summaryRowStep * 1 + 6;
  const s3Y = currentY + 16 + summaryRowStep * 2 + 6;
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(`Saldo Total por Cobrar${docCurrency === "USD" ? " (USD)" : ""}:`, COL2_X + 8, s1Y, { width: COL_W / 2, continued: false });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#dc2626");
  doc.text(fmt2(totalBalance, docCurrency), COL2_X + COL_W / 2, s1Y - 2, { width: COL_W / 2 - 8, align: "right" });
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(`Saldo Vencido${docCurrency === "USD" ? " (USD)" : ""}:`, COL2_X + 8, s2Y, { width: COL_W / 2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor(totalOverdue > 0 ? "#ea580c" : "#374151");
  doc.text(fmt2(totalOverdue, docCurrency), COL2_X + COL_W / 2, s2Y - 2, { width: COL_W / 2 - 8, align: "right" });
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Facturas Activas:", COL2_X + 8, s3Y, { width: COL_W / 2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151");
  doc.text(`${activeCount}`, COL2_X + COL_W / 2, s3Y - 2, { width: COL_W / 2 - 8, align: "right" });
  currentY += BOX_H + 20;
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("FACTURAS PENDIENTES", MARGIN, currentY);
  currentY += 16;
  const cols = { folio: MARGIN, fecha: MARGIN + 90, venc: MARGIN + 175, total: MARGIN + 265, saldo: MARGIN + 355, estado: MARGIN + 440 };
  const ROW_H = 18;
  doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("FOLIO", cols.folio + 4, currentY + 5, { width: 86 });
  doc.text("EMISI\xD3N", cols.fecha + 4, currentY + 5, { width: 80 });
  doc.text("VENCIMIENTO", cols.venc + 4, currentY + 5, { width: 85 });
  doc.text("TOTAL", cols.total + 4, currentY + 5, { width: 80, align: "right" });
  doc.text("SALDO", cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
  doc.text("ESTADO", cols.estado + 4, currentY + 5, { width: 90 });
  currentY += ROW_H;
  if (cxcData) {
    if (cxcData.invoices.length === 0) {
      doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Sin facturas pendientes.", MARGIN + 8, currentY + 5, { width: CONTENT_W - 16 });
      currentY += ROW_H;
    } else {
      cxcData.invoices.forEach((inv, i) => {
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
        const bal = Number(inv.balance) || 0;
        const tot = Number(inv.total) || 0;
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111827");
        doc.text(inv.folio, cols.folio + 4, currentY + 5, { width: 86 });
        doc.font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate3(inv.issueDate), cols.fecha + 4, currentY + 5, { width: 80 });
        doc.fillColor(isOverdue ? "#dc2626" : "#6b7280");
        doc.text(fmtDate3(inv.dueDate), cols.venc + 4, currentY + 5, { width: 85 });
        const cur = inv.currency ?? "MXN";
        doc.fillColor("#374151");
        doc.text(fmt2(tot, cur), cols.total + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica-Bold").fillColor(bal > 0 ? "#dc2626" : "#16a34a");
        doc.text(fmt2(bal, cur), cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica").fillColor(isOverdue ? "#dc2626" : "#374151");
        doc.text(isOverdue ? "Vencido" : "Pendiente", cols.estado + 4, currentY + 5, { width: 90 });
        currentY += ROW_H;
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
      });
    }
  } else {
    if (localActiveInvoices.length === 0) {
      doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Sin facturas pendientes.", MARGIN + 8, currentY + 5, { width: CONTENT_W - 16 });
      currentY += ROW_H;
    } else {
      localActiveInvoices.forEach((inv, i) => {
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
        const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0;
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111827");
        doc.text(`${inv.serie}-${inv.folio}`, cols.folio + 4, currentY + 5, { width: 86 });
        doc.font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate3(inv.issuedAt), cols.fecha + 4, currentY + 5, { width: 80 });
        doc.fillColor(isOverdue ? "#dc2626" : "#6b7280");
        doc.text(fmtDate3(inv.dueDate), cols.venc + 4, currentY + 5, { width: 85 });
        doc.fillColor("#374151");
        doc.text(fmt2(inv.total), cols.total + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica-Bold").fillColor(bal > 0 ? "#dc2626" : "#16a34a");
        doc.text(fmt2(bal), cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica").fillColor("#374151");
        doc.text(statusLabel2(inv.status), cols.estado + 4, currentY + 5, { width: 90 });
        currentY += ROW_H;
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
      });
    }
  }
  currentY += 20;
  const hasCxcPayments = cxcData && cxcData.payments.length > 0;
  const hasLocalPayments = !cxcData && recentPayments.length > 0;
  if (hasCxcPayments || hasLocalPayments) {
    if (currentY > 620) {
      doc.addPage();
      currentY = 40;
    }
    doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("\xDALTIMOS PAGOS REGISTRADOS", MARGIN, currentY);
    currentY += 16;
    const pcols = { fecha: MARGIN, ref: MARGIN + 90, factura: MARGIN + 270, importe: MARGIN + 420 };
    doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(mediumColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("FECHA", pcols.fecha + 4, currentY + 5, { width: 86 });
    doc.text("REFERENCIA", pcols.ref + 4, currentY + 5, { width: 175 });
    doc.text("FACTURA", pcols.factura + 4, currentY + 5, { width: 145 });
    doc.text("IMPORTE", pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
    currentY += ROW_H;
    if (cxcData) {
      cxcData.payments.forEach((pay, i) => {
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate3(pay.date), pcols.fecha + 4, currentY + 5, { width: 86 });
        doc.fillColor("#374151");
        doc.text(pay.reference ?? "\u2014", pcols.ref + 4, currentY + 5, { width: 175 });
        doc.fillColor("#6b7280");
        doc.text(pay.invoiceFolio ?? "\u2014", pcols.factura + 4, currentY + 5, { width: 145 });
        doc.font("Helvetica-Bold").fillColor("#16a34a");
        doc.text(fmt2(pay.amount), pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
        currentY += ROW_H;
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
      });
    } else {
      recentPayments.forEach((pay, i) => {
        const inv = invoices2.find((inv2) => inv2.id === pay.invoiceId);
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate3(pay.paymentDate), pcols.fecha + 4, currentY + 5, { width: 86 });
        doc.fillColor("#374151");
        doc.text(pay.reference ?? "\u2014", pcols.ref + 4, currentY + 5, { width: 175 });
        doc.fillColor("#6b7280");
        doc.text(inv ? `${inv.serie}-${inv.folio}` : "\u2014", pcols.factura + 4, currentY + 5, { width: 145 });
        doc.font("Helvetica-Bold").fillColor("#16a34a");
        doc.text(fmt2(pay.amount), pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
        currentY += ROW_H;
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
      });
    }
  }
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.7)");
  doc.text(
    `Estado de cuenta generado el ${fmtDate3(now)} \u2014 ${companyName}`,
    MARGIN,
    FOOTER_Y + 8,
    { width: CONTENT_W, align: "center" }
  );
  doc.text("Documento generado autom\xE1ticamente \u2014 no requiere firma", MARGIN, FOOTER_Y + 20, {
    width: CONTENT_W,
    align: "center"
  });
  doc.end();
  return doc;
}
var init_account_statement_pdf_generator = __esm({
  "server/account-statement-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
  }
});

// server/pdf-generator.ts
var pdf_generator_exports = {};
__export(pdf_generator_exports, {
  generateMinutePDFStream: () => generateMinutePDFStream
});
import PDFDocument7 from "pdfkit";
import sharp from "sharp";
import pLimit from "p-limit";
function useLocalStorage3() {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.NODE_ENV !== "production" || process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
}
async function retryWithBackoff(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isTransient = error.code === "ETIMEDOUT" || error.status >= 500 || error.message?.includes("timeout");
      if (!isTransient || attempt === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw new Error("Max retries exceeded");
}
async function downloadAndResizePhoto(photoEntityId, objectStorageService) {
  try {
    if (useLocalStorage3()) {
      const extensions = ["", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
      let photoBuffer = null;
      for (const ext of extensions) {
        photoBuffer = await localStorageService.getFile(`photos/${photoEntityId}${ext}`);
        if (photoBuffer) break;
      }
      if (!photoBuffer) return null;
      return await sharp(photoBuffer).resize(MAX_PHOTO_WIDTH, void 0, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    }
    return await retryWithBackoff(async () => {
      const photoFile = await objectStorageService.getObjectEntityFile(photoEntityId);
      const [photoBuffer] = await photoFile.download();
      return await sharp(photoBuffer).resize(MAX_PHOTO_WIDTH, void 0, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    });
  } catch (error) {
    console.error(`Failed to download/resize photo ${photoEntityId}:`, error);
    return null;
  }
}
async function loadLogoBuffer7(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
    }
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function hexToRgb3(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16)
  ];
}
function lightenColor7(hex, amount) {
  const [r, g, b] = hexToRgb3(hex);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
function formatDateTime4(date, timezone) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "America/Mexico_City"
  });
}
async function generateMinutePDFStream(data) {
  const doc = new PDFDocument7({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { checkin, customer, user, tenant } = data;
  const logoBuffer = await loadLogoBuffer7(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor7(primaryColor, 0.92);
  const mediumColor = lightenColor7(primaryColor, 0.75);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  (async () => {
    try {
      const HEADER_H = 112;
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, {
            fit: [110, 68]
          });
        } catch {
        }
      }
      const TEXT_X = PAGE_W / 2;
      const TEXT_W = PAGE_W - TEXT_X - MARGIN;
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });
      const infoLines = [];
      if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
      if (tenant?.address) {
        tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((part) => infoLines.push(part));
      }
      const cityStateParts = [
        tenant?.city,
        tenant?.state,
        tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null
      ].filter(Boolean);
      if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
      const contactParts = [
        tenant?.phone ? `Tel: ${tenant.phone}` : "",
        tenant?.email || ""
      ].filter(Boolean);
      if (contactParts.length) infoLines.push(contactParts.join("  |  "));
      if (tenant?.website) infoLines.push(tenant.website);
      const LINE_H = 10.5;
      const START_Y = 33;
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
      infoLines.forEach((line, i) => {
        doc.text(line, TEXT_X, START_Y + i * LINE_H, { width: TEXT_W, align: "right", lineBreak: false });
      });
      const TITLE_BAND_Y = HEADER_H;
      const TITLE_BAND_H = 32;
      doc.rect(0, TITLE_BAND_Y, PAGE_W, TITLE_BAND_H).fill(mediumColor);
      doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("MINUTA DE VISITA A CLIENTE", MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2 });
      const visitDate = formatDateTime4(checkin.checkinAt, tenant?.timezone);
      doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
      doc.text(visitDate, MARGIN + CONTENT_W / 2, TITLE_BAND_Y + 11, { width: CONTENT_W / 2, align: "right" });
      let currentY = TITLE_BAND_Y + TITLE_BAND_H + 18;
      const COL_W = CONTENT_W / 2 - 8;
      const COL2_X = MARGIN + COL_W + 16;
      const BOX_H = 100;
      doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
      doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
      doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
      doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("INFORMACI\xD3N DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
      doc.text("DATOS DE LA VISITA", COL2_X + 6, currentY + 4, { width: COL_W - 10 });
      let leftY = currentY + 22;
      const customerRows = [
        ["Cliente:", customer.name],
        ...customer.rfc ? [["RFC:", customer.rfc]] : [],
        ...customer.contactName ? [["Contacto:", customer.contactName]] : [],
        ...customer.phone ? [["Tel\xE9fono:", customer.phone]] : []
      ];
      if (customer.address) {
        const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
        customerRows.push(["Direcci\xF3n:", addr]);
      }
      const LABEL_W = 64;
      const VALUE_X_L = MARGIN + 6 + LABEL_W;
      const VALUE_W_L = COL_W - LABEL_W - 10;
      doc.fontSize(8);
      for (const [label, value] of customerRows) {
        const lineH = doc.font("Helvetica").heightOfString(value, { width: VALUE_W_L });
        const rowH = Math.max(lineH, 10);
        doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
        doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L });
        leftY += rowH + 2;
      }
      let rightY = currentY + 22;
      const visitRows = [
        ["Vendedor:", user.fullName],
        ["Check-in:", formatDateTime4(checkin.checkinAt, tenant?.timezone)],
        ...checkin.checkoutAt ? [["Check-out:", formatDateTime4(checkin.checkoutAt, tenant?.timezone)]] : []
      ];
      if (checkin.latitude && checkin.longitude) {
        visitRows.push(["Ubicaci\xF3n:", `${Number(checkin.latitude).toFixed(4)}, ${Number(checkin.longitude).toFixed(4)}`]);
      }
      const VALUE_X_R = COL2_X + 6 + LABEL_W;
      const VALUE_W_R = COL_W - LABEL_W - 10;
      for (const [label, value] of visitRows) {
        doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
        doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
        rightY += 12;
      }
      currentY += BOX_H + 18;
      if (checkin.topics && checkin.topics.length > 0) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("TEMAS TRATADOS", MARGIN + 6, currentY + 4);
        currentY += 16;
        const topicsH = checkin.topics.length * 14 + 12;
        doc.rect(MARGIN, currentY, CONTENT_W, topicsH).fill(lightColor);
        let topicY = currentY + 6;
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        checkin.topics.forEach((topic, idx) => {
          doc.text(`${idx + 1}.  ${topic}`, MARGIN + 10, topicY, { width: CONTENT_W - 20 });
          topicY += 14;
        });
        currentY += topicsH + 14;
      }
      if (checkin.notes) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("NOTAS Y OBSERVACIONES", MARGIN + 6, currentY + 4);
        currentY += 16;
        const textHeight = Math.max(40, doc.heightOfString(checkin.notes, { width: CONTENT_W - 16 }) + 16);
        doc.rect(MARGIN, currentY, CONTENT_W, textHeight).fill(lightColor);
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        doc.text(checkin.notes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16, align: "justify" });
        currentY += textHeight + 14;
      }
      if (data.checkoutNotes) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("ACUERDOS Y COMPROMISOS", MARGIN + 6, currentY + 4);
        currentY += 16;
        const textHeight = Math.max(40, doc.heightOfString(data.checkoutNotes, { width: CONTENT_W - 16 }) + 16);
        doc.rect(MARGIN, currentY, CONTENT_W, textHeight).fill(lightColor);
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        doc.text(data.checkoutNotes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16, align: "justify" });
        currentY += textHeight + 14;
      }
      if (checkin.photos && checkin.photos.length > 0) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(
          `FOTOGRAF\xCDAS DE LA VISITA${checkin.photos.length > MAX_PHOTOS_PER_PDF ? ` (mostrando ${MAX_PHOTOS_PER_PDF} de ${checkin.photos.length})` : ""}`,
          MARGIN + 6,
          currentY + 4
        );
        currentY += 20;
        const objectStorageService = useLocalStorage3() ? null : new ObjectStorageService();
        const photosToProcess = checkin.photos.slice(0, MAX_PHOTOS_PER_PDF);
        const limit = pLimit(PHOTO_CONCURRENCY);
        const photoBuffers = await Promise.all(
          photosToProcess.map((id) => limit(() => downloadAndResizePhoto(id, objectStorageService)))
        );
        const PHOTO_COL_W = (CONTENT_W - 10) / 2;
        const PHOTO_MAX_H = 170;
        for (let i = 0; i < photoBuffers.length; i += 2) {
          if (currentY + PHOTO_MAX_H + 10 > PAGE_H - 60) {
            doc.addPage({ size: "LETTER", margin: 0 });
            currentY = 20;
          }
          const leftBuf = photoBuffers[i];
          const rightBuf = photoBuffers[i + 1];
          const photoY = currentY;
          if (leftBuf) {
            doc.image(leftBuf, MARGIN, photoY, { fit: [PHOTO_COL_W, PHOTO_MAX_H] });
          } else {
            doc.rect(MARGIN, photoY, PHOTO_COL_W, PHOTO_MAX_H).fill("#f0f0f0");
            doc.fontSize(8).fillColor("#999").text("[Foto no disponible]", MARGIN, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }
          if (rightBuf) {
            doc.image(rightBuf, MARGIN + PHOTO_COL_W + 10, photoY, { fit: [PHOTO_COL_W, PHOTO_MAX_H] });
          } else if (i + 1 < photosToProcess.length) {
            doc.rect(MARGIN + PHOTO_COL_W + 10, photoY, PHOTO_COL_W, PHOTO_MAX_H).fill("#f0f0f0");
            doc.fontSize(8).fillColor("#999").text("[Foto no disponible]", MARGIN + PHOTO_COL_W + 10, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }
          currentY += PHOTO_MAX_H + 10;
        }
      }
      const FOOTER_Y = PAGE_H - 42;
      doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
      doc.text("Documento generado autom\xE1ticamente. V\xE1lido como constancia de visita comercial.", MARGIN, FOOTER_Y + 6, { width: 260 });
      doc.text(`Generado el ${formatDateTime4(/* @__PURE__ */ new Date(), tenant?.timezone)}`, MARGIN, FOOTER_Y + 16, { width: 260 });
      const footerRight = [];
      if (tenant?.phone) footerRight.push(`Tel: ${tenant.phone}`);
      if (tenant?.email) footerRight.push(tenant.email);
      if (tenant?.website) footerRight.push(tenant.website);
      if (footerRight.length) {
        doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff");
        doc.text(footerRight.join("   |   "), PAGE_W - MARGIN - 270, FOOTER_Y + 10, { width: 270, align: "right" });
      }
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(companyName, PAGE_W - MARGIN - 270, FOOTER_Y + 22, { width: 270, align: "right" });
      doc.end();
    } catch (error) {
      console.error("Error generating PDF content:", error);
      doc.end();
    }
  })();
  return doc;
}
var MAX_PHOTOS_PER_PDF, MAX_PHOTO_WIDTH, PHOTO_CONCURRENCY, MAX_RETRIES, RETRY_DELAY_MS;
var init_pdf_generator = __esm({
  "server/pdf-generator.ts"() {
    "use strict";
    init_objectStorage();
    init_localStorage();
    MAX_PHOTOS_PER_PDF = 6;
    MAX_PHOTO_WIDTH = 1280;
    PHOTO_CONCURRENCY = 3;
    MAX_RETRIES = 3;
    RETRY_DELAY_MS = 500;
  }
});

// server/incident-warranty-pdf-generator.ts
var incident_warranty_pdf_generator_exports = {};
__export(incident_warranty_pdf_generator_exports, {
  generateIncidentWarrantyPDF: () => generateIncidentWarrantyPDF
});
import PDFDocument8 from "pdfkit";
async function loadLogoBuffer8(logoUrl) {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      return await localStorageService.getFile(`logos/${logoUrl.replace("/api/logos/", "")}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}
function fmtDate4(date) {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function lightenColor8(hex, amount) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `#${Math.min(255, r + Math.round((255 - r) * amount)).toString(16).padStart(2, "0")}${Math.min(255, g + Math.round((255 - g) * amount)).toString(16).padStart(2, "0")}${Math.min(255, b + Math.round((255 - b) * amount)).toString(16).padStart(2, "0")}`;
}
async function generateIncidentWarrantyPDF(data) {
  const { tenant } = data;
  const doc = new PDFDocument8({ size: "LETTER", margin: 0, autoFirstPage: true });
  const logoBuffer = await loadLogoBuffer8(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor8(primaryColor, 0.92);
  const mediumColor = lightenColor8(primaryColor, 0.75);
  const PAGE_W = 612;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = /* @__PURE__ */ new Date();
  const HEADER_H = 110;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGIN, (HEADER_H - 64) / 2, { fit: [110, 64] });
    } catch {
    }
  }
  const TEXT_X = PAGE_W / 2;
  const TEXT_W = PAGE_W - TEXT_X - MARGIN;
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text(companyName.toUpperCase(), TEXT_X, 16, { width: TEXT_W, align: "right", lineBreak: false });
  const infoLines = [];
  if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
  if (tenant?.address) tenant.address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((p) => infoLines.push(p));
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  if (tenant?.phone) infoLines.push(`Tel: ${tenant.phone}`);
  if (tenant?.email) infoLines.push(tenant.email);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 34 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false }));
  const TITLE_Y = HEADER_H;
  const TITLE_H = 30;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("HOJA DE GARANT\xCDA", MARGIN, TITLE_Y + 7, { width: CONTENT_W * 0.65 });
  doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor);
  doc.text(`Generado: ${fmtDate4(now)}`, MARGIN + CONTENT_W * 0.65, TITLE_Y + 10, { width: CONTENT_W * 0.35, align: "right" });
  let Y = TITLE_Y + TITLE_H + 14;
  doc.fontSize(18).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(data.ticketNumber, MARGIN, Y);
  Y += 28;
  const INFO_COL = CONTENT_W / 3;
  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text("Tipo:", MARGIN, Y);
  doc.text("Estado:", MARGIN + INFO_COL, Y);
  doc.text("Urgencia:", MARGIN + INFO_COL * 2, Y);
  Y += 11;
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(TYPE_LABELS[data.type] || data.type, MARGIN, Y);
  doc.text(STATUS_LABELS2[data.status] || data.status, MARGIN + INFO_COL, Y);
  doc.text(URGENCY_LABELS[data.urgency] || data.urgency, MARGIN + INFO_COL * 2, Y);
  Y += 18;
  const productLines = [];
  if (data.productName) productLines.push({ label: "Producto:", value: data.productName });
  if (data.productSku) productLines.push({ label: "SKU/Modelo:", value: data.productSku });
  if (data.warrantySerialNumber) productLines.push({ label: "No. Serie:", value: data.warrantySerialNumber });
  if (data.referenceNumber) productLines.push({ label: "Referencia:", value: data.referenceNumber });
  if (data.orderFolio) productLines.push({ label: "Pedido:", value: data.orderFolio });
  if (data.invoiceFolio) productLines.push({ label: "Factura:", value: data.invoiceFolio });
  const PROD_BOX_H = Math.max(40, 22 + Math.min(productLines.length, 6) * 11 + 6);
  doc.rect(MARGIN, Y, CONTENT_W, PROD_BOX_H).fill(lightColor);
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("PRODUCTO / EQUIPO", MARGIN + 6, Y + 4, { width: CONTENT_W - 12 });
  if (productLines.length === 0) {
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#9ca3af");
    doc.text("Sin informaci\xF3n de producto / equipo registrada.", MARGIN + 6, Y + 22, { width: CONTENT_W - 12 });
  } else {
    doc.fontSize(7.5);
    productLines.slice(0, 6).forEach((row, i) => {
      doc.font("Helvetica-Bold").fillColor("#374151").text(row.label, MARGIN + 6, Y + 20 + i * 11, { width: 70, continued: false });
      doc.font("Helvetica").text(row.value, MARGIN + 78, Y + 20 + i * 11, { width: CONTENT_W - 90, lineBreak: false, ellipsis: true });
    });
  }
  Y += PROD_BOX_H + 14;
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("ASUNTO Y DESCRIPCI\xD3N DEL PROBLEMA", MARGIN + 6, Y + 4);
  Y += 15;
  doc.rect(MARGIN, Y, CONTENT_W, 14).fill(lightColor);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.subject, MARGIN + 6, Y + 3, { width: CONTENT_W - 12, lineBreak: false, ellipsis: true });
  Y += 14;
  const descFontSize = 8;
  doc.fontSize(descFontSize).font("Helvetica").fillColor("#374151");
  const descLines = data.description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n");
  const descH = Math.max(44, Math.min(120, Math.ceil(descLines.length / 80) * 12 + 16));
  doc.rect(MARGIN, Y, CONTENT_W, descH).fill("#f9fafb");
  doc.text(descLines || "Sin descripci\xF3n.", MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: descH - 10, ellipsis: true });
  Y += descH + 12;
  if (data.resolution) {
    doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("RESOLUCI\xD3N / ACCI\xD3N TOMADA", MARGIN + 6, Y + 4);
    Y += 15;
    const resH = Math.max(32, Math.min(80, Math.ceil(data.resolution.length / 90) * 12 + 12));
    doc.rect(MARGIN, Y, CONTENT_W, resH).fill(lightColor);
    doc.fontSize(8).font("Helvetica").fillColor("#374151");
    doc.text(data.resolution, MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: resH - 10, ellipsis: true });
    Y += resH + 12;
  }
  if (data.assigneeName || data.assignedArea) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
    const assignParts = [];
    if (data.assigneeName) assignParts.push(`Responsable: ${data.assigneeName}`);
    if (data.assignedArea) assignParts.push(`\xC1rea: ${data.assignedArea}`);
    doc.text(assignParts.join("   |   "), MARGIN, Y, { width: CONTENT_W });
    Y += 16;
  }
  if (Y > 580) {
    doc.addPage();
    Y = 40;
  }
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("OBSERVACIONES / CONDICI\xD3N DEL EQUIPO", MARGIN + 6, Y + 4);
  Y += 15;
  if (data.observations) {
    const obsH = Math.max(44, Math.min(90, Math.ceil(data.observations.length / 90) * 12 + 16));
    doc.rect(MARGIN, Y, CONTENT_W, obsH).fill(lightColor);
    doc.fontSize(8).font("Helvetica").fillColor("#374151");
    doc.text(data.observations, MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: obsH - 10, ellipsis: true });
    Y += obsH + 12;
  } else {
    doc.rect(MARGIN, Y, CONTENT_W, 56).stroke(mediumColor);
    Y += 56 + 12;
  }
  if (Y > 630) {
    doc.addPage();
    Y = 40;
  }
  const SIG_W = CONTENT_W / 4 - 6;
  const SIG_H = 82;
  const sigBoxes = ["DEPTO. DE\nSEGURIDAD", "EMBARQUES", "FACTURACI\xD3N", "TRANSPORTE\nO CLIENTE"];
  sigBoxes.forEach((label, i) => {
    const bx = MARGIN + i * (SIG_W + 8);
    doc.rect(bx, Y, SIG_W, SIG_H).stroke(mediumColor);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(label, bx + 4, Y + 5, { width: SIG_W - 8, align: "center" });
    doc.moveTo(bx + 6, Y + 42).lineTo(bx + SIG_W - 6, Y + 42).stroke("#9ca3af");
    doc.fontSize(6).font("Helvetica").fillColor("#6b7280");
    doc.text("NOMBRE Y FIRMA", bx + 4, Y + 44, { width: SIG_W - 8, align: "center" });
    doc.moveTo(bx + 6, Y + 66).lineTo(bx + SIG_W - 6, Y + 66).stroke("#9ca3af");
    doc.text("FECHA", bx + 4, Y + 68, { width: SIG_W - 8, align: "center" });
  });
  Y += SIG_H + 16;
  if (Y > 710) {
    doc.addPage();
    Y = 40;
  }
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#4b5563");
  doc.text(
    "Declaro que el equipo descrito en este documento es entregado para revisi\xF3n/garant\xEDa en las condiciones indicadas y que la informaci\xF3n proporcionada es ver\xEDdica.",
    MARGIN,
    Y,
    { width: CONTENT_W }
  );
  Y += 18;
  doc.fontSize(7.5).font("Helvetica").fillColor("#374151");
  doc.text("Yo: ___________________________________", MARGIN, Y, { continued: true });
  doc.text("   confirmo la entrega del equipo arriba descrito.", { continued: false });
  Y += 14;
  doc.text("Fecha: ___/___/______", MARGIN, Y);
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  const footerParts = [];
  if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
  if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
  if (tenant?.phone) footerParts.push(tenant.phone);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
  doc.text(footerParts.join("   |   "), MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" });
  doc.text(`${data.ticketNumber}   \u2014   Generado el ${fmtDate4(now)}`, MARGIN, FOOTER_Y + 20, { width: CONTENT_W, align: "center" });
  doc.end();
  return doc;
}
var TYPE_LABELS, STATUS_LABELS2, URGENCY_LABELS;
var init_incident_warranty_pdf_generator = __esm({
  "server/incident-warranty-pdf-generator.ts"() {
    "use strict";
    init_localStorage();
    TYPE_LABELS = {
      garantia: "Garant\xEDa",
      retrabajo: "Retrabajo",
      queja: "Queja",
      consulta: "Consulta",
      administrativo: "Administrativo"
    };
    STATUS_LABELS2 = {
      nuevo: "Nuevo",
      asignado: "Asignado",
      en_proceso: "En Proceso",
      esperando_cliente: "Esperando Cliente",
      esperando_interno: "En Revisi\xF3n",
      resuelto: "Resuelto",
      cerrado: "Cerrado",
      cancelado: "Cancelado"
    };
    URGENCY_LABELS = {
      baja: "Baja",
      media: "Media",
      alta: "Alta",
      critica: "Cr\xEDtica"
    };
  }
});

// server/index.ts
import express2 from "express";
import path4 from "path";

// server/routes.ts
init_storage();
init_auth();
init_db();
init_objectStorage();
init_localStorage();
init_objectAcl();
init_email_service();
init_schema();
import { createServer } from "http";
import { z as z3 } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import OpenAI from "openai";

// server/tenant.ts
init_db();
init_schema();
import { eq as eq3, sql as sql3 } from "drizzle-orm";
var BASE_DOMAIN = "nexxo.com.mx";
var DEV_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0", ".replit.dev", ".replit.app"];
async function tenantMiddleware(req, res, next) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const hostname = forwardedHost?.split(":")[0] || req.hostname || req.headers.host?.split(":")[0] || "";
  let subdomain = null;
  let devEmpresaOverride = null;
  if (DEV_DOMAINS.some((d) => hostname.includes(d))) {
    const querySubdomain = req.query.tenant;
    const headerSubdomain = req.headers["x-tenant-subdomain"];
    devEmpresaOverride = req.query.empresa || req.headers["x-empresa-subdomain"] || null;
    subdomain = querySubdomain || headerSubdomain || "joper";
  } else if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    subdomain = hostname.replace(`.${BASE_DOMAIN}`, "");
  } else if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    return next();
  }
  if (!subdomain) {
    return next();
  }
  try {
    if (devEmpresaOverride) {
      const devResolved = await resolveEmpresaSubdomain(devEmpresaOverride);
      if (devResolved && devResolved.tenant.active) {
        req.tenant = devResolved.tenant;
        req.empresa = devResolved.empresa;
        return next();
      }
    }
    const [tenant] = await db.select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      secondaryColor: tenants.secondaryColor,
      active: tenants.active,
      timezone: tenants.timezone,
      locale: tenants.locale
    }).from(tenants).where(eq3(tenants.subdomain, subdomain)).limit(1);
    if (tenant) {
      if (!tenant.active) {
        if (req.path.startsWith("/api/")) {
          return res.status(403).json({ message: "Tenant is inactive" });
        }
        return next();
      }
      req.tenant = tenant;
      return next();
    }
    const resolved = await resolveEmpresaSubdomain(subdomain);
    if (resolved) {
      if (!resolved.tenant.active) {
        if (req.path.startsWith("/api/")) {
          return res.status(403).json({ message: "Tenant is inactive" });
        }
        return next();
      }
      req.tenant = resolved.tenant;
      req.empresa = resolved.empresa;
      return next();
    }
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    return next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    next();
  }
}
async function resolveEmpresaSubdomain(subdomain) {
  const [empresa] = await db.select({
    id: empresas.id,
    tenantId: empresas.tenantId,
    name: empresas.name,
    logoUrl: empresas.logoUrl,
    primaryColor: empresas.primaryColor,
    secondaryColor: empresas.secondaryColor,
    active: empresas.active
  }).from(empresas).where(eq3(empresas.subdomain, subdomain)).limit(1);
  if (!empresa || !empresa.active) return null;
  const tenant = await getTenantById(empresa.tenantId);
  if (!tenant) return null;
  return {
    tenant,
    empresa: {
      id: empresa.id,
      tenantId: empresa.tenantId,
      name: empresa.name,
      logoUrl: empresa.logoUrl,
      primaryColor: empresa.primaryColor,
      secondaryColor: empresa.secondaryColor
    }
  };
}
async function getAccessibleTenantIds(rootTenantId) {
  const result = await db.execute(sql3`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tenants WHERE id = ${rootTenantId}
      UNION ALL
      SELECT t.id FROM tenants t
      INNER JOIN descendants d ON t.parent_id = d.id
    )
    SELECT id FROM descendants
  `);
  const rows = result?.rows ?? result;
  return rows.map((r) => r.id);
}
async function getTenantById(id) {
  const [tenant] = await db.select({
    id: tenants.id,
    name: tenants.name,
    subdomain: tenants.subdomain,
    logoUrl: tenants.logoUrl,
    primaryColor: tenants.primaryColor,
    secondaryColor: tenants.secondaryColor,
    active: tenants.active,
    timezone: tenants.timezone,
    locale: tenants.locale
  }).from(tenants).where(eq3(tenants.id, id)).limit(1);
  return tenant || null;
}

// server/routes.ts
init_schema();
init_schema();

// server/microsip-sync.ts
init_db();
init_schema();
import Firebird from "node-firebird";
import { eq as eq4, and as and3 } from "drizzle-orm";
var attachChain = Promise.resolve();
var ATTACH_TIMEOUT_MS = 15e3;
var ATTACH_LOCK_CAP_MS = 25e3;
function attachSerialized(options) {
  const settledHandshake = attachChain.then(
    () => new Promise((resolveInner) => {
      Firebird.attach(options, (err, db2) => {
        resolveInner({ db: db2 ?? null, err: err ?? null });
      });
    })
  );
  attachChain = Promise.race([
    settledHandshake,
    new Promise((r) => setTimeout(r, ATTACH_LOCK_CAP_MS))
  ]).then(
    () => void 0,
    () => void 0
  );
  return new Promise((resolve2, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `Timeout: No se pudo conectar a ${options.host}:${options.port} en 15 segundos. Verifique que el servidor sea accesible desde Internet.`
        )
      );
    }, ATTACH_TIMEOUT_MS);
    settledHandshake.then(({ db: db2, err }) => {
      if (settled) {
        if (db2) {
          try {
            db2.detach();
          } catch {
          }
        }
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (err) {
        console.error("[Microsip] Connection error:", err.message);
        reject(err);
      } else {
        console.log("[Microsip] Connected to Firebird database");
        resolve2(db2);
      }
    });
  });
}
var MicrosipSyncService = class {
  constructor(tenantId) {
    this.config = null;
    this.tenantId = tenantId;
  }
  async loadConfig(requireEnabled = false) {
    const [configRow] = await db.select().from(microsipConfigs).where(eq4(microsipConfigs.tenantId, this.tenantId));
    if (!configRow) {
      console.log(`[Microsip] No config found for tenant ${this.tenantId}`);
      return false;
    }
    if (requireEnabled && !configRow.enabled) {
      console.log(`[Microsip] Sync not enabled for tenant ${this.tenantId}`);
      return false;
    }
    this.config = configRow;
    return true;
  }
  getFirebirdOptions(useCxc = false) {
    if (!this.config) throw new Error("Config not loaded");
    const database = useCxc && this.config.cxcDatabase ? this.config.cxcDatabase : this.config.database;
    return {
      host: this.config.host,
      port: this.config.port,
      database,
      user: this.config.username,
      password: this.config.password,
      lowercase_keys: false,
      role: void 0,
      pageSize: 4096,
      WireCrypt: "Disabled"
    };
  }
  connect(useCxc = false) {
    const options = this.getFirebirdOptions(useCxc);
    return attachSerialized(options);
  }
  query(db2, sql6, params = []) {
    return new Promise((resolve2, reject) => {
      db2.query(sql6, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve2(result || []);
        }
      });
    });
  }
  async logSync(syncType, status, stats = {}, error) {
    const [log2] = await db.insert(microsipSyncLogs).values({
      tenantId: this.tenantId,
      syncType,
      status,
      recordsProcessed: stats.processed || 0,
      recordsCreated: stats.created || 0,
      recordsUpdated: stats.updated || 0,
      recordsSkipped: stats.skipped || 0,
      errorMessage: error?.message,
      errorDetails: error?.details,
      completedAt: status !== "started" ? /* @__PURE__ */ new Date() : void 0
    }).returning();
    return log2.id;
  }
  async updateLogCompletion(logId, status, stats = {}, error) {
    await db.update(microsipSyncLogs).set({
      status,
      recordsProcessed: stats.processed || 0,
      recordsCreated: stats.created || 0,
      recordsUpdated: stats.updated || 0,
      recordsSkipped: stats.skipped || 0,
      errorMessage: error?.message,
      errorDetails: error?.details,
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq4(microsipSyncLogs.id, logId));
  }
  async executeReadOnlyQuery(sql6) {
    if (!await this.loadConfig(false)) {
      throw new Error("Configuraci\xF3n de Microsip no encontrada");
    }
    if (sql6.length > 2e3) {
      throw new Error("La consulta es demasiado larga (m\xE1ximo 2000 caracteres)");
    }
    let cleanSql = sql6.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim();
    const normalizedSql = cleanSql.toUpperCase();
    if (!normalizedSql.startsWith("SELECT")) {
      throw new Error("Solo se permiten consultas SELECT");
    }
    const dangerousKeywords = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE", "GRANT", "REVOKE", "PROCEDURE", "FUNCTION", "TRIGGER", "SET", "COMMIT", "ROLLBACK", "SAVEPOINT"];
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(cleanSql)) {
        throw new Error(`Palabra clave no permitida: ${keyword}`);
      }
    }
    if (cleanSql.includes(";")) {
      throw new Error("No se permiten m\xFAltiples sentencias");
    }
    if (sql6.includes("/*") || sql6.includes("*/") || sql6.includes("--")) {
      throw new Error("No se permiten comentarios SQL");
    }
    let safeSql = cleanSql;
    if (!normalizedSql.includes("FIRST") && !normalizedSql.includes("ROWS")) {
      safeSql = safeSql.replace(/^SELECT/i, "SELECT FIRST 5000");
    }
    let fbDb = null;
    try {
      fbDb = await this.connect();
      const results = await this.query(fbDb, safeSql);
      const columns = results.length > 0 ? Object.keys(results[0]) : [];
      if (results.length > 0) {
        console.log(`[Microsip Query] Columns: ${JSON.stringify(columns)}`);
        console.log(`[Microsip Query] First row: ${JSON.stringify(results[0])}`);
      }
      return {
        columns,
        rows: results,
        rowCount: results.length
      };
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
  }
  async syncCustomers() {
    if (!await this.loadConfig(false) || !this.config?.syncCustomers) {
      return { created: 0, updated: 0, skipped: 0 };
    }
    const logId = await this.logSync("customers", "started");
    let fbDb = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    try {
      fbDb = await this.connect();
      const microsipCustomers = await this.query(fbDb, `
        SELECT 
          C.CLIENTE_ID, C.NOMBRE, C.ESTATUS, C.CONTACTO1,
          C.LIMITE_CREDITO, PCP.DIAS_PLAZO AS DIAS_CREDITO,
          D.RFC_CURP AS RFC, D.CALLE, D.NUM_EXTERIOR, D.NUM_INTERIOR,
          D.CODIGO_POSTAL, D.COLONIA, UPPER(D.POBLACION) AS POBLACION, 
          D.TELEFONO1, D.EMAIL, D.CONTACTO
        FROM CLIENTES C
        LEFT JOIN DIRS_CLIENTES D ON D.CLIENTE_ID = C.CLIENTE_ID
        LEFT JOIN PLAZOS_COND_PAG PCP ON PCP.COND_PAGO_ID = C.COND_PAGO_ID
        WHERE C.ESTATUS = 'A'
      `);
      const uniqueCustomers = /* @__PURE__ */ new Map();
      for (const customer of microsipCustomers) {
        if (!uniqueCustomers.has(customer.CLIENTE_ID)) {
          uniqueCustomers.set(customer.CLIENTE_ID, customer);
        }
      }
      console.log(`[Microsip] Found ${uniqueCustomers.size} unique customers to sync`);
      const sampleCustomers = Array.from(uniqueCustomers.values()).slice(0, 5);
      console.log(`[Microsip] Sample credit days:`, sampleCustomers.map((c) => ({
        id: c.CLIENTE_ID,
        name: c.NOMBRE?.substring(0, 20),
        creditDays: c.DIAS_CREDITO
      })));
      for (const msCustomer of Array.from(uniqueCustomers.values())) {
        stats.processed++;
        try {
          const [existing] = await db.select().from(customers).where(and3(
            eq4(customers.tenantId, this.tenantId),
            eq4(customers.microsipId, msCustomer.CLIENTE_ID)
          ));
          const addressParts = [
            msCustomer.CALLE?.trim(),
            msCustomer.NUM_EXTERIOR ? `#${msCustomer.NUM_EXTERIOR.trim()}` : null,
            msCustomer.NUM_INTERIOR ? `Int. ${msCustomer.NUM_INTERIOR.trim()}` : null,
            msCustomer.COLONIA?.trim()
          ].filter(Boolean);
          const customerData = {
            name: msCustomer.NOMBRE?.trim() || "Sin nombre",
            rfc: msCustomer.RFC?.trim() || null,
            phone: msCustomer.TELEFONO1?.trim() || null,
            email: msCustomer.EMAIL?.trim() || null,
            address: addressParts.join(", ") || null,
            city: msCustomer.POBLACION?.trim() || null,
            state: null,
            country: "M\xE9xico",
            zipCode: msCustomer.CODIGO_POSTAL?.trim() || null,
            creditLimit: String(msCustomer.LIMITE_CREDITO || 0),
            creditDays: msCustomer.DIAS_CREDITO || 0,
            // Query filters WHERE C.ESTATUS = 'A'; driver returns CHAR fields empty,
            // so checking ESTATUS here would wrongly block every customer.
            blocked: false,
            contactName: msCustomer.CONTACTO?.trim() || msCustomer.CONTACTO1?.trim() || null,
            microsipId: msCustomer.CLIENTE_ID,
            microsipCode: String(msCustomer.CLIENTE_ID),
            microsipSyncedAt: /* @__PURE__ */ new Date()
          };
          if (existing) {
            await db.update(customers).set(customerData).where(eq4(customers.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(customers).values({
              ...customerData,
              tenantId: this.tenantId
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing customer ${msCustomer.CLIENTE_ID}:`, err);
          stats.skipped++;
        }
      }
      await db.update(microsipConfigs).set({
        lastCustomerSync: /* @__PURE__ */ new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "success", stats);
      console.log(`[Microsip] Customer sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
    } catch (err) {
      const error = err;
      console.error("[Microsip] Customer sync error:", error.message);
      await db.update(microsipConfigs).set({
        lastSyncStatus: "error",
        lastSyncError: error.message,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "error", stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
    return stats;
  }
  async syncCategories() {
    if (!await this.loadConfig(false) || !this.config?.syncCategories) {
      return { created: 0, updated: 0, skipped: 0 };
    }
    const logId = await this.logSync("categories", "started");
    let fbDb = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    try {
      fbDb = await this.connect();
      const microsipCategories = await this.query(fbDb, `
        SELECT LINEA_ARTICULO_ID, NOMBRE
        FROM LINEAS_ARTICULOS
      `);
      console.log(`[Microsip] Found ${microsipCategories.length} categories to sync`);
      for (const msCategory of microsipCategories) {
        stats.processed++;
        try {
          const [existing] = await db.select().from(productCategories).where(and3(
            eq4(productCategories.tenantId, this.tenantId),
            eq4(productCategories.microsipLineaId, msCategory.LINEA_ARTICULO_ID)
          ));
          if (existing) {
            await db.update(productCategories).set({
              name: msCategory.NOMBRE?.trim() || "Sin categor\xEDa",
              microsipSyncedAt: /* @__PURE__ */ new Date()
            }).where(eq4(productCategories.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(productCategories).values({
              name: msCategory.NOMBRE?.trim() || "Sin categor\xEDa",
              description: null,
              active: true,
              microsipLineaId: msCategory.LINEA_ARTICULO_ID,
              microsipSyncedAt: /* @__PURE__ */ new Date(),
              tenantId: this.tenantId
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing category ${msCategory.LINEA_ARTICULO_ID}:`, err);
          stats.skipped++;
        }
      }
      await db.update(microsipConfigs).set({
        lastCategorySync: /* @__PURE__ */ new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "success", stats);
      console.log(`[Microsip] Category sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
    } catch (err) {
      const error = err;
      console.error("[Microsip] Category sync error:", error.message);
      await db.update(microsipConfigs).set({
        lastSyncStatus: "error",
        lastSyncError: error.message,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "error", stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
    return stats;
  }
  async syncProducts() {
    if (!await this.loadConfig(false) || !this.config?.syncProducts) {
      return { created: 0, updated: 0, skipped: 0 };
    }
    const logId = await this.logSync("products", "started");
    let fbDb = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    try {
      fbDb = await this.connect();
      const microsipProducts = await this.query(fbDb, `
        SELECT 
          A.ARTICULO_ID, A.NOMBRE, A.LINEA_ARTICULO_ID, A.ESTATUS,
          P.PRECIO AS PRECIO_1, P.MONEDA_ID,
          (SELECT FIRST 1 CA.CLAVE_ARTICULO FROM CLAVES_ARTICULOS CA WHERE CA.ARTICULO_ID = A.ARTICULO_ID) AS CLAVE_ARTICULO
        FROM ARTICULOS A
        LEFT JOIN PRECIOS_ARTICULOS P ON A.ARTICULO_ID = P.ARTICULO_ID AND P.PRECIO_EMPRESA_ID = 42
        WHERE A.ESTATUS = 'A'
      `);
      console.log(`[Microsip] Found ${microsipProducts.length} products to sync`);
      const productsWithPrices = microsipProducts.filter((p) => {
        const price = p.PRECIO ?? p.PRECIO_1;
        return price !== null && price !== void 0 && price > 0;
      });
      console.log(`[Microsip] Products with prices (PRECIO or PRECIO_1): ${productsWithPrices.length}`);
      if (productsWithPrices.length > 0) {
        const sample = productsWithPrices[0];
        console.log(`[Microsip] Sample with price - PRECIO: ${sample.PRECIO}, PRECIO_1: ${sample.PRECIO_1}`);
        console.log(`[Microsip] Sample data:`, JSON.stringify(sample));
      }
      if (microsipProducts.length > 0) {
        console.log(`[Microsip] First product columns:`, Object.keys(microsipProducts[0]));
        console.log(`[Microsip] First product all data:`, JSON.stringify(microsipProducts[0]));
      }
      const categoryMap = /* @__PURE__ */ new Map();
      const categories = await db.select().from(productCategories).where(eq4(productCategories.tenantId, this.tenantId));
      for (const cat of categories) {
        if (cat.microsipLineaId) {
          categoryMap.set(cat.microsipLineaId, { id: cat.id, active: cat.active });
        }
      }
      for (const msProduct of microsipProducts) {
        stats.processed++;
        try {
          const [existing] = await db.select().from(products).where(and3(
            eq4(products.tenantId, this.tenantId),
            eq4(products.microsipArticuloId, msProduct.ARTICULO_ID)
          ));
          const categoryEntry = msProduct.LINEA_ARTICULO_ID ? categoryMap.get(msProduct.LINEA_ARTICULO_ID) || null : null;
          const categoryId = categoryEntry ? categoryEntry.id : null;
          const categoryActive = categoryEntry ? categoryEntry.active : true;
          const rawPrice = msProduct.PRECIO ?? msProduct.PRECIO_1;
          const listPrice = rawPrice ? String(Number(rawPrice).toFixed(2)) : "0";
          const productActive = categoryActive;
          const currency = msProduct.MONEDA_ID === 1 ? "MXN" : msProduct.MONEDA_ID ? "USD" : "MXN";
          const productData = {
            code: msProduct.CLAVE_ARTICULO?.toString().trim() || msProduct.CLAVE?.toString().trim() || String(msProduct.ARTICULO_ID),
            name: msProduct.NOMBRE?.trim() || "Sin nombre",
            description: null,
            categoryId,
            unitOfMeasure: "PZA",
            listPrice,
            cost: null,
            stock: "0",
            active: productActive,
            currency,
            microsipArticuloId: msProduct.ARTICULO_ID,
            microsipSyncedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          };
          if (existing) {
            await db.update(products).set(productData).where(eq4(products.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(products).values({
              ...productData,
              tenantId: this.tenantId
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing product ${msProduct.ARTICULO_ID}:`, err);
          stats.skipped++;
        }
      }
      const syncedMicrosipIds = microsipProducts.map((p) => p.ARTICULO_ID);
      if (syncedMicrosipIds.length > 0) {
        const allTenantProducts = await db.select({ id: products.id, microsipArticuloId: products.microsipArticuloId }).from(products).where(eq4(products.tenantId, this.tenantId));
        for (const product of allTenantProducts) {
          if (product.microsipArticuloId && !syncedMicrosipIds.includes(product.microsipArticuloId)) {
            await db.update(products).set({ active: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq4(products.id, product.id));
          }
        }
        console.log(`[Microsip] Deactivated products no longer active in Microsip`);
      }
      await db.update(microsipConfigs).set({
        lastProductSync: /* @__PURE__ */ new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "success", stats);
      console.log(`[Microsip] Product sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
    } catch (err) {
      const error = err;
      console.error("[Microsip] Product sync error:", error.message);
      await db.update(microsipConfigs).set({
        lastSyncStatus: "error",
        lastSyncError: error.message,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "error", stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
    return stats;
  }
  async syncInvoices() {
    if (!await this.loadConfig(false) || !this.config?.syncInvoices) {
      return { created: 0, updated: 0, skipped: 0 };
    }
    const logId = await this.logSync("invoices", "started");
    let fbDb = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    try {
      fbDb = await this.connect(true);
      const microsipInvoices = await this.query(fbDb, `
        SELECT
          DV.DOCTO_VE_ID,
          DV.FOLIO,
          DV.CLIENTE_ID,
          DV.FECHA,
          DV.FECHA + COALESCE(PCP.DIAS_PLAZO, 0) AS FECHA_VENCE,
          DV.IMPORTE_NETO,
          DV.TOTAL_IMPUESTOS AS IMPUESTO,
          DV.IMPORTE_COBRO,
          CXC_BAL.SALDO_CXC AS SALDO_CXC,
          PCP.DIAS_PLAZO AS DIAS_PPAG
        FROM DOCTOS_VE DV
        LEFT JOIN PLAZOS_COND_PAG PCP ON PCP.COND_PAGO_ID = DV.COND_PAGO_ID
        LEFT JOIN (
          /* Real outstanding balance from CXC module per sales invoice */
          SELECT
            DES.DOCTO_FTE_ID AS DOCTO_VE_ID,
            SUM(I_TOT.CARGO - COALESCE(CR.CREDITO_APLICADO, 0)) AS SALDO_CXC
          FROM DOCTOS_CC D
          JOIN DOCTOS_ENTRE_SIS DES ON DES.DOCTO_DEST_ID = D.DOCTO_CC_ID
          JOIN (
            SELECT DOCTO_CC_ID,
                   SUM(IMPORTE + IMPUESTO
                       - COALESCE(IVA_RETENIDO, 0)
                       - COALESCE(ISR_RETENIDO, 0)) AS CARGO
            FROM IMPORTES_DOCTOS_CC
            WHERE TIPO_IMPTE = 'C'
            GROUP BY DOCTO_CC_ID
          ) I_TOT ON I_TOT.DOCTO_CC_ID = D.DOCTO_CC_ID
          LEFT JOIN (
            SELECT IC.DOCTO_CC_ACR_ID,
                   SUM(IC.IMPORTE + COALESCE(IC.IMPUESTO, 0)
                       + COALESCE(IC.DSCTO_PPAG, 0)) AS CREDITO_APLICADO
            FROM IMPORTES_DOCTOS_CC IC
            JOIN DOCTOS_CC PC ON IC.DOCTO_CC_ID = PC.DOCTO_CC_ID
            WHERE IC.DOCTO_CC_ACR_ID IS NOT NULL
              AND IC.TIPO_IMPTE <> 'C'
              AND PC.CANCELADO <> 'S'
            GROUP BY IC.DOCTO_CC_ACR_ID
          ) CR ON CR.DOCTO_CC_ACR_ID = D.DOCTO_CC_ID
          WHERE D.CANCELADO <> 'S'
            AND D.NATURALEZA_CONCEPTO = 'C'
          GROUP BY DES.DOCTO_FTE_ID
        ) CXC_BAL ON CXC_BAL.DOCTO_VE_ID = DV.DOCTO_VE_ID
        WHERE DV.TIPO_DOCTO = 'F'
          AND DV.ESTATUS <> 'C'
          AND DV.ESTATUS <> 'L'
          AND DV.IMPORTE_COBRO > 0
      `);
      console.log(`[Microsip] Found ${microsipInvoices.length} invoices with outstanding balance`);
      const customerMap = /* @__PURE__ */ new Map();
      const tenantCustomers = await db.select().from(customers).where(eq4(customers.tenantId, this.tenantId));
      for (const cust of tenantCustomers) {
        if (cust.microsipId) {
          customerMap.set(cust.microsipId, cust.id);
        }
      }
      for (const msInvoice of microsipInvoices) {
        stats.processed++;
        try {
          const customerId = customerMap.get(msInvoice.CLIENTE_ID);
          if (!customerId) {
            console.log(`[Microsip] Skipping invoice ${msInvoice.FOLIO}: customer ${msInvoice.CLIENTE_ID} not found`);
            stats.skipped++;
            continue;
          }
          let [existing] = await db.select().from(invoices).where(and3(
            eq4(invoices.tenantId, this.tenantId),
            eq4(invoices.microsipDoctoId, msInvoice.DOCTO_VE_ID)
          ));
          if (!existing) {
            const folio = msInvoice.FOLIO?.trim() || String(msInvoice.DOCTO_VE_ID);
            const [byFolio] = await db.select().from(invoices).where(and3(
              eq4(invoices.tenantId, this.tenantId),
              eq4(invoices.customerId, customerId),
              eq4(invoices.folio, folio)
            ));
            if (byFolio && !byFolio.microsipDoctoId) {
              console.log(`[Microsip] Linking manual invoice ${folio} (id=${byFolio.id}) to microsipDoctoId=${msInvoice.DOCTO_VE_ID}`);
              existing = byFolio;
            } else if (byFolio && byFolio.microsipDoctoId && byFolio.microsipDoctoId !== msInvoice.DOCTO_VE_ID) {
              console.warn(`[Microsip] Duplicate folio ${folio} detected: existing microsipDoctoId=${byFolio.microsipDoctoId} vs incoming=${msInvoice.DOCTO_VE_ID}. Skipping to avoid duplicate.`);
              stats.skipped++;
              continue;
            }
          }
          const subtotal = msInvoice.IMPORTE_NETO || 0;
          const tax = msInvoice.IMPUESTO || 0;
          const total = msInvoice.IMPORTE_COBRO || subtotal + tax;
          const hasCxcRecord = msInvoice.SALDO_CXC !== null && msInvoice.SALDO_CXC !== void 0;
          const balanceDue = hasCxcRecord ? Number(msInvoice.SALDO_CXC) : msInvoice.IMPORTE_COBRO || total;
          const status = balanceDue <= 5e-3 ? InvoiceStatus.PAID : balanceDue >= total - 5e-3 ? InvoiceStatus.PENDING_PAYMENT : InvoiceStatus.PARTIALLY_PAID;
          const invoiceDate = msInvoice.FECHA || /* @__PURE__ */ new Date();
          let dueDate;
          if (msInvoice.FECHA_VENCE) {
            dueDate = new Date(msInvoice.FECHA_VENCE);
          } else {
            const creditDays = msInvoice.DIAS_PPAG || 0;
            dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + creditDays);
          }
          const invoiceBaseData = {
            customerId,
            cfdiUuid: null,
            serie: "F",
            folio: msInvoice.FOLIO?.trim() || String(msInvoice.DOCTO_VE_ID),
            subtotal: String(subtotal),
            tax: String(tax),
            total: String(total),
            balanceDue: String(balanceDue),
            status,
            paymentMethod: null,
            paymentForm: null,
            issuedAt: invoiceDate,
            dueDate,
            paidAt: null,
            microsipDoctoId: msInvoice.DOCTO_VE_ID,
            microsipSyncedAt: /* @__PURE__ */ new Date()
          };
          if (existing) {
            await db.update(invoices).set(invoiceBaseData).where(eq4(invoices.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(invoices).values({
              ...invoiceBaseData,
              tenantId: this.tenantId
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing invoice ${msInvoice.DOCTO_VE_ID}:`, err);
          stats.skipped++;
        }
      }
      await db.update(microsipConfigs).set({
        lastInvoiceSync: /* @__PURE__ */ new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "success", stats);
      console.log(`[Microsip] Invoice sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
    } catch (err) {
      const error = err;
      console.error("[Microsip] Invoice sync error:", error.message);
      await db.update(microsipConfigs).set({
        lastSyncStatus: "error",
        lastSyncError: error.message,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "error", stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
    return stats;
  }
  async syncPayments() {
    if (!await this.loadConfig(false) || !this.config?.syncPayments) {
      return { created: 0, updated: 0, skipped: 0 };
    }
    const logId = await this.logSync("payments", "started");
    let fbDb = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };
    const affectedInvoiceIds = /* @__PURE__ */ new Set();
    try {
      fbDb = await this.connect(true);
      const microsipPayments = await this.query(fbDb, `
        SELECT 
          P.DOCTO_CC_ID AS DOCTO_CO_ID,
          P.CLIENTE_ID,
          P.FECHA,
          P.FOLIO AS FOLIO_PAGO,
          I.IMPORTE,
          C.DOCTO_CC_ID AS DOCTO_CC_FACTURA_ID,
          DES.DOCTO_FTE_ID AS DOCTO_VE_ID,
          DV.FOLIO AS FOLIO_FACTURA
        FROM DOCTOS_CC P
        JOIN IMPORTES_DOCTOS_CC I ON P.DOCTO_CC_ID = I.DOCTO_CC_ID
        JOIN DOCTOS_CC C ON I.DOCTO_CC_ACR_ID = C.DOCTO_CC_ID
        LEFT JOIN DOCTOS_ENTRE_SIS DES ON DES.DOCTO_DEST_ID = C.DOCTO_CC_ID
        LEFT JOIN DOCTOS_VE DV ON DV.DOCTO_VE_ID = DES.DOCTO_FTE_ID
        WHERE P.NATURALEZA_CONCEPTO = 'R'
          AND P.CANCELADO = 'N'
          AND P.FECHA >= DATEADD(-730 DAY TO CURRENT_DATE)
      `);
      console.log(`[Microsip] Found ${microsipPayments.length} payments to sync`);
      const customerMap = /* @__PURE__ */ new Map();
      for (const cust of await db.select({ id: customers.id, microsipId: customers.microsipId }).from(customers).where(eq4(customers.tenantId, this.tenantId))) {
        if (cust.microsipId) customerMap.set(cust.microsipId, cust.id);
      }
      const invoiceMap = /* @__PURE__ */ new Map();
      for (const inv of await db.select({ id: invoices.id, microsipDoctoId: invoices.microsipDoctoId }).from(invoices).where(eq4(invoices.tenantId, this.tenantId))) {
        if (inv.microsipDoctoId) invoiceMap.set(Number(inv.microsipDoctoId), inv.id);
      }
      const existingPaymentMap = /* @__PURE__ */ new Map();
      for (const p of await db.select({ id: payments.id, microsipDoctoCoId: payments.microsipDoctoCoId }).from(payments).where(eq4(payments.tenantId, this.tenantId))) {
        if (p.microsipDoctoCoId != null) existingPaymentMap.set(p.microsipDoctoCoId, p.id);
      }
      const toInsert = [];
      const toUpdate = [];
      for (const msPayment of microsipPayments) {
        stats.processed++;
        const customerId = customerMap.get(msPayment.CLIENTE_ID);
        if (!customerId) {
          console.log(`[Microsip] Skipping payment ${msPayment.DOCTO_CO_ID}: customer ${msPayment.CLIENTE_ID} not found`);
          stats.skipped++;
          continue;
        }
        const invoiceId = msPayment.DOCTO_VE_ID ? invoiceMap.get(msPayment.DOCTO_VE_ID) || null : null;
        const paymentData = {
          customerId,
          invoiceId,
          amount: String(msPayment.IMPORTE || 0),
          paymentDate: msPayment.FECHA || /* @__PURE__ */ new Date(),
          reference: msPayment.FOLIO_PAGO || null,
          notes: msPayment.FOLIO_FACTURA ? `Factura: ${msPayment.FOLIO_FACTURA.trim()}` : null,
          microsipDoctoCoId: msPayment.DOCTO_CO_ID,
          microsipSyncedAt: /* @__PURE__ */ new Date()
        };
        const existingId = existingPaymentMap.get(msPayment.DOCTO_CO_ID);
        if (existingId) {
          toUpdate.push({ id: existingId, data: paymentData });
          stats.updated++;
        } else {
          toInsert.push({ ...paymentData, tenantId: this.tenantId });
          stats.created++;
        }
        if (invoiceId) affectedInvoiceIds.add(invoiceId);
      }
      const BATCH = 500;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await db.insert(payments).values(toInsert.slice(i, i + BATCH));
      }
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        await Promise.all(batch.map(
          ({ id, data }) => db.update(payments).set(data).where(eq4(payments.id, id))
        ));
      }
      console.log(`[Microsip] Payment records synced. Run invoice sync to refresh balances.`);
      await db.update(microsipConfigs).set({
        lastPaymentSync: /* @__PURE__ */ new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "success", stats);
      console.log(`[Microsip] Payment sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
    } catch (err) {
      const error = err;
      console.error("[Microsip] Payment sync error:", error.message);
      await db.update(microsipConfigs).set({
        lastSyncStatus: "error",
        lastSyncError: error.message,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(microsipConfigs.tenantId, this.tenantId));
      await this.updateLogCompletion(logId, "error", stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
    return stats;
  }
  async syncAll() {
    console.log(`[Microsip] Starting full sync for tenant ${this.tenantId}`);
    const empty = { created: 0, updated: 0, skipped: 0 };
    const safe = async (fn) => {
      try {
        return await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Microsip] syncAll partial error:", msg);
        return { ...empty, error: msg };
      }
    };
    const results = {
      categories: await safe(() => this.syncCategories()),
      customers: await safe(() => this.syncCustomers()),
      products: await safe(() => this.syncProducts()),
      invoices: await safe(() => this.syncInvoices()),
      payments: await safe(() => this.syncPayments())
    };
    console.log(`[Microsip] Full sync complete for tenant ${this.tenantId}`);
    return results;
  }
  /**
   * Query live account statement balances directly from Firebird CXC module.
   * Uses DOCTOS_CC + IMPORTES_DOCTOS_CC (accounts receivable) instead of DOCTOS_VE (sales).
   *
   * - SALDO_TOTAL: full outstanding balance (all history — charges minus credits/payments)
   * - SALDO_VENCIDO: only charges within `lookbackYears` whose due date has passed
   *   (old pre-lookback debt is included in SALDO_TOTAL but not flagged as vencido)
   * - OLDEST_DUE: oldest overdue date within the lookback window
   * - INVOICE_COUNT: number of charge documents within the lookback window
   */
  async queryLiveAccountStatements(lookbackYears = 3) {
    if (!await this.loadConfig(false)) {
      throw new Error("Configuraci\xF3n de Microsip no encontrada");
    }
    let fbDb = null;
    try {
      fbDb = await this.connect(true);
      const rows = await this.query(fbDb, `
        WITH
        CARGOS AS (
          SELECT
            D.CLIENTE_ID,
            D.DOCTO_CC_ID,
            D.FECHA,
            D.COND_PAGO_ID,
            D.TIPO_CAMBIO,
            SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0)) AS CARGO_BRUTO
          FROM DOCTOS_CC D
          JOIN IMPORTES_DOCTOS_CC I ON D.DOCTO_CC_ID = I.DOCTO_CC_ID AND I.TIPO_IMPTE = 'C'
          WHERE D.CANCELADO <> 'S' AND D.NATURALEZA_CONCEPTO = 'C'
          GROUP BY D.CLIENTE_ID, D.DOCTO_CC_ID, D.FECHA, D.COND_PAGO_ID, D.TIPO_CAMBIO
        ),
        CREDITOS AS (
          -- Must filter on the PAYMENT document's CANCELADO, not just the charge's:
          -- cancelling a receipt sets DOCTOS_CC.CANCELADO='S' but leaves its
          -- IMPORTES_DOCTOS_CC application rows, which would otherwise be counted as
          -- phantom credits and understate the balance.
          SELECT
            I.DOCTO_CC_ACR_ID,
            SUM(I.IMPORTE + COALESCE(I.IMPUESTO,0) + COALESCE(I.DSCTO_PPAG,0)) AS CREDITO_APLICADO
          FROM IMPORTES_DOCTOS_CC I
          JOIN DOCTOS_CC P ON I.DOCTO_CC_ID = P.DOCTO_CC_ID
          WHERE I.DOCTO_CC_ACR_ID IS NOT NULL
            AND I.TIPO_IMPTE <> 'C'
            AND P.CANCELADO <> 'S'
          GROUP BY I.DOCTO_CC_ACR_ID
        )
        SELECT
          CA.CLIENTE_ID,
          SUM(CASE
            WHEN CA.FECHA >= DATEADD(-${lookbackYears} YEAR TO CURRENT_DATE)
              AND CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0) > 0
            THEN CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)
            ELSE 0 END) AS SALDO_TOTAL,
          SUM(CASE
            WHEN CA.FECHA >= DATEADD(-${lookbackYears} YEAR TO CURRENT_DATE)
              AND CA.FECHA + COALESCE(PCP.DIAS_PLAZO, 0) < CURRENT_DATE
              AND (CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)) > 0
            THEN CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)
            ELSE 0
          END) AS SALDO_VENCIDO,
          MIN(CASE
            WHEN CA.FECHA >= DATEADD(-${lookbackYears} YEAR TO CURRENT_DATE)
              AND CA.FECHA + COALESCE(PCP.DIAS_PLAZO, 0) < CURRENT_DATE
              AND (CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)) > 0
            THEN CA.FECHA + COALESCE(PCP.DIAS_PLAZO, 0)
            ELSE NULL
          END) AS OLDEST_DUE,
          COUNT(DISTINCT CASE
            WHEN CA.FECHA >= DATEADD(-${lookbackYears} YEAR TO CURRENT_DATE)
              AND (CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)) > 0
            THEN CA.DOCTO_CC_ID
            ELSE NULL
          END) AS INVOICE_COUNT,
          MAX(CASE WHEN CA.TIPO_CAMBIO > 1.5 THEN 1 ELSE 0 END) AS IS_USD
        FROM CARGOS CA
        LEFT JOIN CREDITOS CR ON CR.DOCTO_CC_ACR_ID = CA.DOCTO_CC_ID
        LEFT JOIN PLAZOS_COND_PAG PCP ON CA.COND_PAGO_ID = PCP.COND_PAGO_ID
        GROUP BY CA.CLIENTE_ID
        HAVING SUM(CASE
          WHEN CA.FECHA >= DATEADD(-${lookbackYears} YEAR TO CURRENT_DATE)
            AND CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0) > 0
          THEN CA.CARGO_BRUTO - COALESCE(CR.CREDITO_APLICADO, 0)
          ELSE 0 END) > 0
      `);
      console.log(`[Microsip] queryLiveAccountStatements: ${rows.length} customers with balance`);
      return rows;
    } finally {
      if (fbDb) fbDb.detach();
    }
  }
  /**
   * Query open invoices and recent payments for a single customer directly from CXC.
   * Used by the account-statement PDF endpoint so the PDF matches Microsip's own figures.
   */
  async queryLiveCxcStatementForCustomer(microsipClienteId) {
    if (!await this.loadConfig(false)) {
      throw new Error("Configuraci\xF3n de Microsip no encontrada");
    }
    let fbDb = null;
    try {
      fbDb = await this.connect(true);
      const invoices2 = await this.query(fbDb, `
        SELECT
          COALESCE(NULLIF(FV.FOLIO_VE, ''), D.FOLIO) AS FOLIO,
          D.FECHA,
          D.FECHA + COALESCE(PCP.DIAS_PLAZO, 0) AS FECHA_VEN,
          SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0)) AS IMPORTE_TOTAL,
          SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0))
            - COALESCE(CR.CREDITO_APLICADO, 0) AS SALDO,
          D.TIPO_CAMBIO
        FROM DOCTOS_CC D
        JOIN IMPORTES_DOCTOS_CC I ON D.DOCTO_CC_ID = I.DOCTO_CC_ID AND I.TIPO_IMPTE = 'C'
        LEFT JOIN PLAZOS_COND_PAG PCP ON D.COND_PAGO_ID = PCP.COND_PAGO_ID
        LEFT JOIN (
          /* Sales invoice folio per CXC doc (deduped to avoid row multiplication) */
          SELECT DES.DOCTO_DEST_ID, MIN(TRIM(DV.FOLIO)) AS FOLIO_VE
          FROM DOCTOS_ENTRE_SIS DES
          JOIN DOCTOS_VE DV ON DV.DOCTO_VE_ID = DES.DOCTO_FTE_ID
          GROUP BY DES.DOCTO_DEST_ID
        ) FV ON FV.DOCTO_DEST_ID = D.DOCTO_CC_ID
        LEFT JOIN (
          -- Filter on the PAYMENT document's CANCELADO: a cancelled receipt keeps its
          -- IMPORTES_DOCTOS_CC application rows, which would otherwise be counted as
          -- phantom credits and understate the invoice balance.
          SELECT IC.DOCTO_CC_ACR_ID,
                 SUM(IC.IMPORTE + COALESCE(IC.IMPUESTO,0) + COALESCE(IC.DSCTO_PPAG,0)) AS CREDITO_APLICADO
          FROM IMPORTES_DOCTOS_CC IC
          JOIN DOCTOS_CC PC ON IC.DOCTO_CC_ID = PC.DOCTO_CC_ID
          WHERE IC.DOCTO_CC_ACR_ID IS NOT NULL
            AND IC.TIPO_IMPTE <> 'C'
            AND PC.CANCELADO <> 'S'
          GROUP BY IC.DOCTO_CC_ACR_ID
        ) CR ON CR.DOCTO_CC_ACR_ID = D.DOCTO_CC_ID
        WHERE D.CANCELADO <> 'S'
          AND D.NATURALEZA_CONCEPTO = 'C'
          AND D.CLIENTE_ID = ${microsipClienteId}
          AND D.FECHA >= DATEADD(-5 YEAR TO CURRENT_DATE)
        GROUP BY D.DOCTO_CC_ID, COALESCE(NULLIF(FV.FOLIO_VE, ''), D.FOLIO), D.FECHA, D.TIPO_CAMBIO, PCP.DIAS_PLAZO, CR.CREDITO_APLICADO
        HAVING SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0))
               - COALESCE(CR.CREDITO_APLICADO, 0) > 0.005
        ORDER BY D.FECHA
      `);
      const payments2 = await this.query(fbDb, `
        SELECT FIRST 20
          P.FOLIO AS REFERENCIA,
          P.FECHA,
          SUM(I.IMPORTE) AS IMPORTE,
          MIN(COALESCE(NULLIF(CFV.FOLIO_VE, ''), C.FOLIO)) AS FACTURA_FOLIO
        FROM DOCTOS_CC P
        JOIN IMPORTES_DOCTOS_CC I ON P.DOCTO_CC_ID = I.DOCTO_CC_ID
        LEFT JOIN DOCTOS_CC C ON I.DOCTO_CC_ACR_ID = C.DOCTO_CC_ID
        LEFT JOIN (
          SELECT DES.DOCTO_DEST_ID, MIN(TRIM(DV.FOLIO)) AS FOLIO_VE
          FROM DOCTOS_ENTRE_SIS DES
          JOIN DOCTOS_VE DV ON DV.DOCTO_VE_ID = DES.DOCTO_FTE_ID
          GROUP BY DES.DOCTO_DEST_ID
        ) CFV ON CFV.DOCTO_DEST_ID = C.DOCTO_CC_ID
        WHERE P.CANCELADO <> 'S'
          AND P.NATURALEZA_CONCEPTO = 'R'
          AND P.CLIENTE_ID = ${microsipClienteId}
          AND P.FECHA >= DATEADD(-30 DAY TO CURRENT_DATE)
        GROUP BY P.DOCTO_CC_ID, P.FOLIO, P.FECHA
        ORDER BY P.FECHA DESC
      `);
      return { invoices: invoices2, payments: payments2 };
    } finally {
      if (fbDb) fbDb.detach();
    }
  }
  /**
   * Diagnostic: inspect raw Firebird CXC rows for a single customer to
   * understand what TIPO_IMPTE values and DOCTO_CC_ACR_ID links exist.
   */
  async debugCxcCustomer(clienteId) {
    if (!await this.loadConfig(false)) {
      throw new Error("Configuraci\xF3n de Microsip no encontrada");
    }
    let fbDb = null;
    try {
      fbDb = await this.connect(true);
      const chargeDocs = await this.query(fbDb, `
        SELECT FIRST 20
          D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.NATURALEZA_CONCEPTO, D.CANCELADO
        FROM DOCTOS_CC D
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'C'
          AND D.CANCELADO <> 'S'
        ORDER BY D.FECHA DESC
      `);
      let chargeImportes = [];
      if (chargeDocs.length > 0) {
        const docId = chargeDocs[0].DOCTO_CC_ID;
        chargeImportes = await this.query(fbDb, `
          SELECT I.DOCTO_CC_ID, I.TIPO_IMPTE, I.IMPORTE, I.IMPUESTO,
                 I.DOCTO_CC_ACR_ID, I.DSCTO_PPAG
          FROM IMPORTES_DOCTOS_CC I
          WHERE I.DOCTO_CC_ID = ${docId}
        `);
      }
      const paymentDocs = await this.query(fbDb, `
        SELECT FIRST 20
          D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.NATURALEZA_CONCEPTO
        FROM DOCTOS_CC D
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'R'
          AND D.CANCELADO <> 'S'
          AND D.FECHA >= DATEADD(-730 DAY TO CURRENT_DATE)
        ORDER BY D.FECHA DESC
      `);
      let paymentImportes = [];
      if (paymentDocs.length > 0) {
        const docId = paymentDocs[0].DOCTO_CC_ID;
        paymentImportes = await this.query(fbDb, `
          SELECT I.DOCTO_CC_ID, I.TIPO_IMPTE, I.IMPORTE, I.IMPUESTO,
                 I.DOCTO_CC_ACR_ID, I.DSCTO_PPAG
          FROM IMPORTES_DOCTOS_CC I
          WHERE I.DOCTO_CC_ID = ${docId}
        `);
      }
      const tipoImpteStats = await this.query(fbDb, `
        SELECT I.TIPO_IMPTE, COUNT(*) AS CNT, SUM(I.IMPORTE) AS TOTAL,
               COUNT(I.DOCTO_CC_ACR_ID) AS ACR_ID_COUNT
        FROM IMPORTES_DOCTOS_CC I
        JOIN DOCTOS_CC D ON D.DOCTO_CC_ID = I.DOCTO_CC_ID
        WHERE D.CLIENTE_ID = ${clienteId} AND D.CANCELADO <> 'S'
        GROUP BY I.TIPO_IMPTE
      `);
      const linkedCredits = await this.query(fbDb, `
        SELECT FIRST 20
          I.DOCTO_CC_ID AS PAGO_DOC_ID, I.DOCTO_CC_ACR_ID AS CARGO_DOC_ID,
          I.TIPO_IMPTE, I.IMPORTE, I.DSCTO_PPAG,
          C.FOLIO AS CARGO_FOLIO
        FROM IMPORTES_DOCTOS_CC I
        JOIN DOCTOS_CC C ON I.DOCTO_CC_ACR_ID = C.DOCTO_CC_ID
        WHERE C.CLIENTE_ID = ${clienteId}
          AND C.NATURALEZA_CONCEPTO = 'C'
          AND C.CANCELADO <> 'S'
        ORDER BY I.DOCTO_CC_ID DESC
      `);
      const balanceCheck = await this.query(fbDb, `
        SELECT
          SUM(CASE WHEN I.TIPO_IMPTE = 'C' THEN I.IMPORTE + I.IMPUESTO ELSE 0 END) AS GROSS_CHARGES,
          SUM(CASE WHEN I.TIPO_IMPTE = 'R' THEN I.IMPORTE ELSE 0 END) AS TIPO_R_TOTAL,
          SUM(CASE WHEN I.TIPO_IMPTE = 'A' THEN I.IMPORTE ELSE 0 END) AS TIPO_A_TOTAL,
          COUNT(DISTINCT D.DOCTO_CC_ID) AS DOC_COUNT
        FROM DOCTOS_CC D
        JOIN IMPORTES_DOCTOS_CC I ON D.DOCTO_CC_ID = I.DOCTO_CC_ID
        WHERE D.CLIENTE_ID = ${clienteId} AND D.CANCELADO <> 'S'
      `);
      return {
        clienteId,
        chargeDocs: chargeDocs.slice(0, 5),
        chargeImportes_firstDoc: chargeImportes,
        paymentDocs: paymentDocs.slice(0, 5),
        paymentImportes_firstDoc: paymentImportes,
        tipoImpteStats,
        linkedCredits_viaDOCTO_CC_ACR_ID: linkedCredits,
        balanceCheck: balanceCheck[0] ?? {}
      };
    } finally {
      if (fbDb) fbDb.detach();
    }
  }
  /**
   * Detailed balance breakdown for a single customer.
   * Shows every charge document, every credit applied to each charge,
   * unapplied payments, and the CXC net balance — for direct comparison
   * against Microsip's "Auxiliar de clientes" report.
   */
  async debugBalanceBreakdown(clienteId) {
    if (!await this.loadConfig(false)) {
      throw new Error("Configuraci\xF3n de Microsip no encontrada");
    }
    let fbDb = null;
    try {
      fbDb = await this.connect(true);
      const chargeDocs = await this.query(fbDb, `
        SELECT
          D.DOCTO_CC_ID,
          D.FOLIO,
          D.FECHA,
          D.CANCELADO,
          SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0)) AS CARGO_BRUTO
        FROM DOCTOS_CC D
        JOIN IMPORTES_DOCTOS_CC I ON D.DOCTO_CC_ID = I.DOCTO_CC_ID AND I.TIPO_IMPTE = 'C'
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'C'
          AND D.CANCELADO <> 'S'
        GROUP BY D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.CANCELADO
        ORDER BY D.FECHA
      `);
      const linkedCredits = await this.query(fbDb, `
        SELECT
          I.DOCTO_CC_ACR_ID,
          I.TIPO_IMPTE,
          I.IMPORTE,
          COALESCE(I.IMPUESTO,0)  AS IMPUESTO,
          COALESCE(I.DSCTO_PPAG,0) AS DSCTO_PPAG,
          I.IMPORTE + COALESCE(I.IMPUESTO,0) + COALESCE(I.DSCTO_PPAG,0) AS TOTAL_CREDITO,
          PD.FOLIO  AS PAGO_FOLIO,
          PD.FECHA  AS PAGO_FECHA,
          PD.NATURALEZA_CONCEPTO AS PAGO_NAT
        FROM IMPORTES_DOCTOS_CC I
        JOIN DOCTOS_CC C ON I.DOCTO_CC_ACR_ID = C.DOCTO_CC_ID
        JOIN DOCTOS_CC PD ON I.DOCTO_CC_ID = PD.DOCTO_CC_ID
        WHERE C.CLIENTE_ID = ${clienteId}
          AND C.NATURALEZA_CONCEPTO = 'C'
          AND C.CANCELADO <> 'S'
          AND PD.CANCELADO <> 'S'
          AND I.TIPO_IMPTE <> 'C'
        ORDER BY I.DOCTO_CC_ACR_ID, PD.FECHA
      `);
      const allPaymentDocs = await this.query(fbDb, `
        SELECT
          D.DOCTO_CC_ID,
          D.FOLIO,
          D.FECHA,
          SUM(I.IMPORTE) AS TOTAL_IMPORTE,
          COUNT(I.DOCTO_CC_ACR_ID) AS APPLIED_ROWS
        FROM DOCTOS_CC D
        JOIN IMPORTES_DOCTOS_CC I ON D.DOCTO_CC_ID = I.DOCTO_CC_ID
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'R'
          AND D.CANCELADO <> 'S'
        GROUP BY D.DOCTO_CC_ID, D.FOLIO, D.FECHA
        ORDER BY D.FECHA DESC
      `);
      const creditsByInvoice = {};
      for (const charge of chargeDocs) {
        creditsByInvoice[charge.DOCTO_CC_ID] = {
          cargo_folio: charge.FOLIO,
          cargo_bruto: Number(charge.CARGO_BRUTO),
          credito_aplicado: 0,
          saldo_nexxo: 0,
          creditos: []
        };
      }
      for (const credit of linkedCredits) {
        const id = credit.DOCTO_CC_ACR_ID;
        if (creditsByInvoice[id]) {
          creditsByInvoice[id].credito_aplicado += Number(credit.TOTAL_CREDITO);
          creditsByInvoice[id].creditos.push({
            tipo: credit.TIPO_IMPTE,
            importe: Number(credit.IMPORTE),
            impuesto: Number(credit.IMPUESTO),
            dscto_ppag: Number(credit.DSCTO_PPAG),
            total: Number(credit.TOTAL_CREDITO),
            pago_folio: credit.PAGO_FOLIO,
            pago_fecha: credit.PAGO_FECHA,
            pago_naturaleza: credit.PAGO_NAT
          });
        }
      }
      let totalCargoBruto = 0;
      let totalCreditoAplicado = 0;
      for (const id in creditsByInvoice) {
        const entry = creditsByInvoice[id];
        entry.saldo_nexxo = entry.cargo_bruto - entry.credito_aplicado;
        totalCargoBruto += entry.cargo_bruto;
        totalCreditoAplicado += entry.credito_aplicado;
      }
      const totalSaldoNexxo = totalCargoBruto - totalCreditoAplicado;
      return {
        clienteId,
        summary: {
          total_cargo_bruto: totalCargoBruto,
          total_credito_aplicado: totalCreditoAplicado,
          saldo_nexxo: totalSaldoNexxo
        },
        invoices: Object.values(creditsByInvoice).filter((e) => e.saldo_nexxo > 5e-3 || e.creditos.length > 0),
        allPaymentDocs: allPaymentDocs.map((p) => ({
          folio: p.FOLIO,
          fecha: p.FECHA,
          total_importe: Number(p.TOTAL_IMPORTE),
          applied_rows: Number(p.APPLIED_ROWS),
          unapplied: Number(p.APPLIED_ROWS) === 0
        }))
      };
    } finally {
      if (fbDb) fbDb.detach();
    }
  }
  async testConnection() {
    if (!await this.loadConfig(false)) {
      return { success: false, message: "Configuraci\xF3n no encontrada" };
    }
    let fbDb = null;
    try {
      fbDb = await this.connect();
      try {
        const result = await this.query(fbDb, "SELECT COUNT(*) AS COUNT FROM CLIENTES");
        const count = result[0]?.COUNT || 0;
        return {
          success: true,
          message: `Conexi\xF3n exitosa. Se encontraron ${count} clientes en Microsip.`
        };
      } catch (queryErr) {
        const queryError = queryErr;
        try {
          const tables = await this.query(
            fbDb,
            `SELECT FIRST 10 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0`
          );
          const tableNames = tables.map((t) => t.RDB$RELATION_NAME?.trim()).filter(Boolean).join(", ");
          return {
            success: true,
            message: `Conexi\xF3n exitosa a la base de datos. Tablas encontradas: ${tableNames || "ninguna"}. Nota: La tabla CLIENTES no existe, verifique la estructura de su base de datos.`
          };
        } catch {
          return {
            success: true,
            message: `Conexi\xF3n exitosa, pero error al consultar tablas: ${queryError.message}`
          };
        }
      }
    } catch (err) {
      const error = err;
      const msg = error.message || "";
      if (msg.toLowerCase().includes("wire encryption") || msg.toLowerCase().includes("incompatible wire")) {
        return {
          success: false,
          errorCode: "WIRE_CRYPT",
          message: `Error de cifrado de red: el servidor Firebird tiene WireCrypt=Required pero el cliente no soporta cifrado.

Soluci\xF3n: en el servidor donde est\xE1 instalado Microsip, abre el archivo firebird.conf (generalmente en C:\\Program Files\\Firebird\\Firebird_X_X\\) y cambia la l\xEDnea:
  WireCrypt = Required
por:
  WireCrypt = Enabled

Luego reinicia el servicio de Firebird.`
        };
      }
      return {
        success: false,
        message: `Error de conexi\xF3n: ${msg}`
      };
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
  }
};
async function createMicrosipSyncService(tenantId) {
  return new MicrosipSyncService(tenantId);
}
async function runScheduledSync() {
  console.log("[Microsip] Running scheduled sync for all enabled tenants...");
  const enabledConfigs = await db.select().from(microsipConfigs).where(eq4(microsipConfigs.enabled, true));
  for (const config of enabledConfigs) {
    try {
      const service = await createMicrosipSyncService(config.tenantId);
      const now = /* @__PURE__ */ new Date();
      const shouldSyncMaster = !config.lastCustomerSync || now.getTime() - config.lastCustomerSync.getTime() >= config.masterDataInterval * 60 * 1e3;
      const shouldSyncTransactional = !config.lastInvoiceSync || now.getTime() - config.lastInvoiceSync.getTime() >= config.transactionalInterval * 60 * 1e3;
      if (shouldSyncMaster) {
        if (config.syncCategories) await service.syncCategories();
        if (config.syncCustomers) await service.syncCustomers();
        if (config.syncProducts) await service.syncProducts();
      }
      if (shouldSyncTransactional) {
        if (config.syncInvoices) await service.syncInvoices();
        if (config.syncPayments) await service.syncPayments();
      }
    } catch (err) {
      console.error(`[Microsip] Error syncing tenant ${config.tenantId}:`, err);
    }
  }
  console.log("[Microsip] Scheduled sync complete");
}
async function cleanupOrphanedSyncLogs() {
  try {
    const updated = await db.update(microsipSyncLogs).set({
      status: "error",
      errorMessage: "Sincronizaci\xF3n interrumpida (servidor reiniciado)",
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq4(microsipSyncLogs.status, "started")).returning({ id: microsipSyncLogs.id });
    if (updated.length > 0) {
      console.log(`[Microsip] Cleaned up ${updated.length} orphaned sync log(s) from previous run`);
    }
  } catch (err) {
    console.error("[Microsip] Error cleaning up orphaned sync logs:", err);
  }
}

// server/system-log.ts
init_db();
init_schema();
async function logSystemActivity(entry) {
  try {
    await db.insert(systemLogs).values({
      tenantId: entry.tenantId,
      category: entry.category,
      level: entry.level ?? "info",
      action: entry.action ?? null,
      message: entry.message,
      details: entry.details ?? null
    });
  } catch (err) {
    console.error("[system-log] Failed to write log entry:", err);
  }
}

// server/routes.ts
import { randomBytes as randomBytes2 } from "crypto";
import { eq as eq5, and as and4, sql as sql5, gte, lt, gt as gt2, isNotNull, or as or3, aliasedTable, desc as desc2, inArray as inArray2 } from "drizzle-orm";
function parseEmailList(raw) {
  if (!raw) return [];
  return raw.split(/[;,]/).map((e) => e.trim()).filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}
function useLocalStorage4() {
  return process.env.USE_LOCAL_STORAGE === "true" || process.env.NODE_ENV !== "production" || process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR;
}
function getEffectiveTenantId(req) {
  const user = req.user;
  const tenant = req.tenant;
  if (user?.isSuperAdmin && (!tenant || !tenant.subdomain)) {
    return null;
  }
  if (tenant?.id) {
    return tenant.id;
  }
  return user?.tenantId || null;
}
function requireTenantId(req) {
  const tenantId = getEffectiveTenantId(req);
  if (tenantId) {
    return tenantId;
  }
  if (req.user?.isSuperAdmin) {
    if (req.tenant?.id) {
      return req.tenant.id;
    }
    if (req.user.tenantId) {
      return req.user.tenantId;
    }
    throw new Error("SuperAdmin must access via subdomain for tenant-specific operations");
  }
  if (!req.user?.tenantId) {
    throw new Error("User has no tenant assignment");
  }
  return req.user.tenantId;
}
function assertTenantScope(req, res, record, options = {}) {
  const key = options.messageKey ?? "error";
  const notFoundMessage = options.notFoundMessage ?? "Not found";
  const forbiddenMessage = options.forbiddenMessage ?? notFoundMessage;
  if (!record) {
    res.status(404).json({ [key]: notFoundMessage });
    return false;
  }
  const effectiveTenantId = getEffectiveTenantId(req);
  if (effectiveTenantId && record.tenantId !== effectiveTenantId) {
    res.status(404).json({ [key]: notFoundMessage });
    return false;
  }
  if (options.checkEmpresa) {
    const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
    if (restrictedEmpresaId && record.empresaId !== restrictedEmpresaId) {
      res.status(403).json({ [key]: forbiddenMessage });
      return false;
    }
  }
  return true;
}
async function companyHierarchyMiddleware(req, res, next) {
  try {
    const user = req.user;
    if (!user || user.isSuperAdmin || user.role !== UserRole.ADMIN) {
      return next();
    }
    const selectedTenantId = req.headers["x-selected-tenant-id"];
    const homeTenantId = user.tenantId;
    if (!selectedTenantId || !homeTenantId || selectedTenantId === homeTenantId) {
      return next();
    }
    const accessible = await getAccessibleTenantIds(homeTenantId);
    if (!accessible.includes(selectedTenantId)) {
      return next();
    }
    const childTenant = await getTenantById(selectedTenantId);
    if (childTenant && childTenant.active) {
      req.tenant = childTenant;
    }
    return next();
  } catch (error) {
    console.error("companyHierarchyMiddleware error:", error);
    return next();
  }
}
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.use(companyHierarchyMiddleware);
  app2.get("/api/tenant-config", async (req, res) => {
    if (!req.tenant) {
      return res.status(404).json({ message: "No tenant context" });
    }
    const empresa = req.empresa;
    res.json({
      id: req.tenant.id,
      name: empresa?.name ?? req.tenant.name,
      subdomain: req.tenant.subdomain,
      logoUrl: empresa?.logoUrl ?? req.tenant.logoUrl,
      primaryColor: empresa?.primaryColor ?? req.tenant.primaryColor,
      secondaryColor: empresa?.secondaryColor ?? req.tenant.secondaryColor,
      timezone: req.tenant.timezone || "America/Mexico_City",
      locale: req.tenant.locale || "es",
      empresaId: empresa?.id ?? null,
      empresaName: empresa?.name ?? null
    });
  });
  app2.get("/api/pipeline", isAuthenticated, async (req, res) => {
    try {
      let tenantId = getEffectiveTenantId(req);
      const requestedCompanyId = typeof req.query.tenantId === "string" && req.query.tenantId ? req.query.tenantId : null;
      if (requestedCompanyId && req.user?.role === UserRole.ADMIN && !req.user?.isSuperAdmin && req.user?.tenantId) {
        const accessible = await getAccessibleTenantIds(req.user.tenantId);
        if (!accessible.includes(requestedCompanyId)) {
          return res.status(403).json({ error: "Compa\xF1\xEDa no accesible" });
        }
        tenantId = requestedCompanyId;
      }
      const scopeAll = req.query.scope === "all" && req.user?.role === UserRole.ADMIN && !req.user?.isSuperAdmin;
      let accessibleTenantIds = [];
      const tenantNameMap = /* @__PURE__ */ new Map();
      if (scopeAll && req.user?.tenantId) {
        accessibleTenantIds = await getAccessibleTenantIds(req.user.tenantId);
        if (accessibleTenantIds.length > 1) {
          const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(inArray2(tenants.id, accessibleTenantIds));
          tenantRows.forEach((t) => tenantNameMap.set(t.id, t.name));
        } else {
          accessibleTenantIds = [];
        }
      }
      const useAllTenants = scopeAll && accessibleTenantIds.length > 0;
      const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
      const selectedEmpresaId = !useAllTenants && typeof req.query.empresaId === "string" && req.query.empresaId ? req.query.empresaId : null;
      const empresaId = useAllTenants ? null : restrictedEmpresaId ?? selectedEmpresaId;
      const quotEmpresaFilter = empresaId ? eq5(quotations.empresaId, empresaId) : void 0;
      const orderEmpresaFilter = empresaId ? eq5(orders.empresaId, empresaId) : void 0;
      const shipmentEmpresaFilter = empresaId ? eq5(shipments.empresaId, empresaId) : void 0;
      const tenantFilter = useAllTenants ? inArray2(quotations.tenantId, accessibleTenantIds) : tenantId ? quotEmpresaFilter ? and4(eq5(quotations.tenantId, tenantId), quotEmpresaFilter) : eq5(quotations.tenantId, tenantId) : quotEmpresaFilter;
      const orderTenantFilter = useAllTenants ? inArray2(orders.tenantId, accessibleTenantIds) : tenantId ? orderEmpresaFilter ? and4(eq5(orders.tenantId, tenantId), orderEmpresaFilter) : eq5(orders.tenantId, tenantId) : orderEmpresaFilter;
      const shipmentTenantFilter = useAllTenants ? inArray2(shipments.tenantId, accessibleTenantIds) : tenantId ? shipmentEmpresaFilter ? and4(eq5(shipments.tenantId, tenantId), shipmentEmpresaFilter) : eq5(shipments.tenantId, tenantId) : shipmentEmpresaFilter;
      const quotRows = await db.select({
        q: quotations,
        customerName: customers.name,
        sellerName: users.fullName
      }).from(quotations).leftJoin(customers, eq5(quotations.customerId, customers.id)).leftJoin(users, eq5(quotations.userId, users.id)).where(tenantFilter).orderBy(sql5`${quotations.createdAt} DESC`).limit(200);
      const sellerAlias = aliasedTable(users, "seller");
      const orderRows = await db.select({
        o: orders,
        quotFolio: quotations.folio,
        quotTotal: quotations.total,
        quotCurrency: quotations.currency,
        customerName: customers.name,
        sellerName: sellerAlias.fullName,
        estimatedDelivery: orders.estimatedDelivery
      }).from(orders).leftJoin(quotations, eq5(orders.quotationId, quotations.id)).leftJoin(customers, eq5(quotations.customerId, customers.id)).leftJoin(sellerAlias, eq5(quotations.userId, sellerAlias.id)).where(orderTenantFilter ? and4(orderTenantFilter, eq5(orders.releaseStatus, "approved")) : eq5(orders.releaseStatus, "approved")).orderBy(sql5`${orders.createdAt} DESC`).limit(200);
      const sellerAlias2 = aliasedTable(users, "seller2");
      const shipmentRows = await db.select({
        s: shipments,
        quotFolio: quotations.folio,
        customerName: customers.name,
        sellerName: sellerAlias2.fullName,
        orderId: orders.id
      }).from(shipments).leftJoin(orders, eq5(shipments.orderId, orders.id)).leftJoin(quotations, eq5(orders.quotationId, quotations.id)).leftJoin(customers, eq5(quotations.customerId, customers.id)).leftJoin(sellerAlias2, eq5(quotations.userId, sellerAlias2.id)).where(shipmentTenantFilter).orderBy(sql5`${shipments.createdAt} DESC`).limit(200);
      const sellerAlias3 = aliasedTable(users, "seller3");
      const authRows = await db.select({
        a: creditAuthorizations,
        quotFolio: quotations.folio,
        quotTotal: quotations.total,
        quotCurrency: quotations.currency,
        quotTenantId: quotations.tenantId,
        quotEmpresaId: quotations.empresaId,
        customerName: customers.name,
        sellerName: sellerAlias3.fullName
      }).from(creditAuthorizations).leftJoin(quotations, eq5(creditAuthorizations.quotationId, quotations.id)).leftJoin(customers, eq5(quotations.customerId, customers.id)).leftJoin(sellerAlias3, eq5(quotations.userId, sellerAlias3.id)).where(tenantFilter).orderBy(sql5`${creditAuthorizations.createdAt} DESC`).limit(200);
      const empresaNameMap = /* @__PURE__ */ new Map();
      {
        const empresaRows = await db.select({ id: empresas.id, name: empresas.name }).from(empresas);
        empresaRows.forEach((e) => empresaNameMap.set(e.id, e.name));
      }
      const empresaName = (id) => id ? empresaNameMap.get(id) ?? null : null;
      res.json({
        quotations: quotRows.map((r) => ({ ...r.q, customerName: r.customerName, sellerName: r.sellerName, tenantName: tenantNameMap.get(r.q.tenantId ?? "") ?? null, empresaName: empresaName(r.q.empresaId) })),
        orders: orderRows.map((r) => ({ ...r.o, quotFolio: r.quotFolio, quotTotal: r.quotTotal, quotCurrency: r.quotCurrency, customerName: r.customerName, sellerName: r.sellerName, tenantName: tenantNameMap.get(r.o.tenantId ?? "") ?? null, empresaName: empresaName(r.o.empresaId) })),
        shipments: shipmentRows.map((r) => ({ ...r.s, quotFolio: r.quotFolio, customerName: r.customerName, sellerName: r.sellerName, tenantName: tenantNameMap.get(r.s.tenantId ?? "") ?? null, empresaName: empresaName(r.s.empresaId) })),
        creditAuths: authRows.map((r) => ({ ...r.a, quotFolio: r.quotFolio, quotTotal: r.quotTotal, quotCurrency: r.quotCurrency, customerName: r.customerName, sellerName: r.sellerName, tenantName: tenantNameMap.get(r.quotTenantId ?? "") ?? null, empresaName: empresaName(r.quotEmpresaId) }))
      });
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
      res.status(500).json({ error: "Error fetching pipeline data" });
    }
  });
  app2.get("/api/pipeline/items", isAuthenticated, async (req, res) => {
    try {
      const { type, id } = req.query;
      if (!type || !id) return res.status(400).json({ error: "Missing type or id" });
      const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
      const effectiveTenantId = getEffectiveTenantId(req);
      let allowedTenantIds = effectiveTenantId ? [effectiveTenantId] : null;
      if (req.user?.role === UserRole.ADMIN && !req.user?.isSuperAdmin && req.user?.tenantId) {
        allowedTenantIds = await getAccessibleTenantIds(req.user.tenantId);
      }
      const tenantAllowed = (recordTenantId) => !allowedTenantIds || !!recordTenantId && allowedTenantIds.includes(recordTenantId);
      if (type === "quotation") {
        const q = await db.query.quotations.findFirst({ where: eq5(quotations.id, id), columns: { tenantId: true, empresaId: true } });
        if (!q) return res.json([]);
        if (!tenantAllowed(q.tenantId)) return res.json([]);
        if (restrictedEmpresaId && q.empresaId !== restrictedEmpresaId) return res.json([]);
        const items = await db.query.quotationItems.findMany({
          where: eq5(quotationItems.quotationId, id),
          with: { product: { columns: { name: true, code: true, unitOfMeasure: true } } },
          orderBy: (qi, { asc: asc2 }) => [asc2(qi.position)]
        });
        return res.json(items.map((i) => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unitOfMeasure ?? i.product?.unitOfMeasure,
          unitPrice: i.unitPrice,
          discount: i.discountAmount,
          total: i.total
        })));
      }
      if (type === "order") {
        const order = await db.query.orders.findFirst({
          where: eq5(orders.id, id),
          with: {
            quotation: {
              with: {
                items: {
                  with: { product: { columns: { name: true, code: true, unitOfMeasure: true } } },
                  orderBy: (qi, { asc: asc2 }) => [asc2(qi.position)]
                }
              }
            }
          }
        });
        if (!order?.quotation) return res.json([]);
        if (!tenantAllowed(order.tenantId)) return res.json([]);
        if (restrictedEmpresaId && order.empresaId !== restrictedEmpresaId) return res.json([]);
        return res.json(order.quotation.items.map((i) => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unitOfMeasure ?? i.product?.unitOfMeasure,
          unitPrice: i.unitPrice,
          discount: i.discountAmount,
          total: i.total
        })));
      }
      if (type === "creditAuth") {
        const auth = await db.query.creditAuthorizations.findFirst({
          where: eq5(creditAuthorizations.id, id),
          with: {
            quotation: {
              with: {
                items: {
                  with: { product: { columns: { name: true, code: true, unitOfMeasure: true } } },
                  orderBy: (qi, { asc: asc2 }) => [asc2(qi.position)]
                }
              }
            }
          }
        });
        if (!auth?.quotation) return res.json([]);
        if (!tenantAllowed(auth.quotation.tenantId)) return res.json([]);
        if (restrictedEmpresaId && auth.quotation.empresaId !== restrictedEmpresaId) return res.json([]);
        return res.json(auth.quotation.items.map((i) => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unitOfMeasure ?? i.product?.unitOfMeasure,
          unitPrice: i.unitPrice,
          discount: i.discountAmount,
          total: i.total
        })));
      }
      if (type === "shipment") {
        const s = await db.query.shipments.findFirst({ where: eq5(shipments.id, id), columns: { tenantId: true, empresaId: true } });
        if (!s) return res.json([]);
        if (!tenantAllowed(s.tenantId)) return res.json([]);
        if (restrictedEmpresaId && s.empresaId !== restrictedEmpresaId) return res.json([]);
        const instances = await db.query.shipmentProductInstances.findMany({
          where: eq5(shipmentProductInstances.shipmentId, id),
          with: { product: { columns: { name: true, code: true, unitOfMeasure: true } } }
        });
        return res.json(instances.map((i) => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? "",
          qty: 1,
          unit: i.product?.unitOfMeasure ?? "Pza",
          unitPrice: null,
          discount: null,
          total: null
        })));
      }
      res.status(400).json({ error: "Invalid type" });
    } catch (error) {
      console.error("Error fetching pipeline items:", error);
      res.status(500).json({ error: "Error fetching pipeline items" });
    }
  });
  app2.get("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can access tenants" });
      }
      if (req.tenant && req.tenant.subdomain) {
        return res.status(403).json({ error: "Tenant management only available on main domain" });
      }
      const allTenants = await db.select().from(tenants);
      res.json(allTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Error fetching tenants" });
    }
  });
  app2.post("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can create tenants" });
      }
      if (req.tenant && req.tenant.subdomain) {
        return res.status(403).json({ error: "Tenant management only available on main domain" });
      }
      const validationResult = insertTenantSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid data",
          details: validationResult.error.errors
        });
      }
      const parentId = typeof req.body?.parentId === "string" && req.body.parentId.trim() ? req.body.parentId.trim() : null;
      if (parentId) {
        const parent = await getTenantById(parentId);
        if (!parent) {
          return res.status(400).json({ error: "La compa\xF1\xEDa padre seleccionada no existe" });
        }
      }
      const [newTenant] = await db.insert(tenants).values({ ...validationResult.data, parentId }).returning();
      res.status(201).json(newTenant);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Subdomain already exists" });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Error creating tenant" });
    }
  });
  app2.patch("/api/tenants/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can update tenants" });
      }
      if (req.tenant && req.tenant.subdomain) {
        return res.status(403).json({ error: "Tenant management only available on main domain" });
      }
      const { id } = req.params;
      const updateSchema = insertTenantSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid data",
          details: validationResult.error.errors
        });
      }
      let parentUpdate = {};
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, "parentId")) {
        const parentId = typeof req.body.parentId === "string" && req.body.parentId.trim() ? req.body.parentId.trim() : null;
        if (parentId) {
          if (parentId === id) {
            return res.status(400).json({ error: "Una compa\xF1\xEDa no puede ser su propia compa\xF1\xEDa padre" });
          }
          const parent = await getTenantById(parentId);
          if (!parent) {
            return res.status(400).json({ error: "La compa\xF1\xEDa padre seleccionada no existe" });
          }
          const descendants = await getAccessibleTenantIds(id);
          if (descendants.includes(parentId)) {
            return res.status(400).json({ error: "No puedes asignar como padre a una de sus propias compa\xF1\xEDas hijas" });
          }
        }
        parentUpdate = { parentId };
      }
      const [updatedTenant] = await db.update(tenants).set({ ...validationResult.data, ...parentUpdate, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(tenants.id, id)).returning();
      if (!updatedTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(updatedTenant);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Subdomain already exists" });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Error updating tenant" });
    }
  });
  app2.get("/api/companies", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const homeTenantId = req.user.tenantId;
      if (!homeTenantId) {
        return res.status(400).json({ error: "Usuario sin compa\xF1\xEDa asignada" });
      }
      const accessibleIds = await getAccessibleTenantIds(homeTenantId);
      const companies = await db.select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        parentId: tenants.parentId,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        secondaryColor: tenants.secondaryColor,
        active: tenants.active
      }).from(tenants).where(inArray2(tenants.id, accessibleIds));
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Error al obtener las compa\xF1\xEDas" });
    }
  });
  app2.delete("/api/companies/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const homeTenantId = req.user.tenantId;
      if (!homeTenantId) return res.status(400).json({ error: "Usuario sin compa\xF1\xEDa asignada" });
      if (id === homeTenantId) return res.status(400).json({ error: "No puedes eliminar tu compa\xF1\xEDa principal" });
      const accessible = await getAccessibleTenantIds(homeTenantId);
      if (!accessible.includes(id)) return res.status(403).json({ error: "No tienes acceso a esta compa\xF1\xEDa" });
      await db.update(tenants).set({ active: false }).where(eq5(tenants.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ error: "Error al eliminar la compa\xF1\xEDa" });
    }
  });
  app2.get("/api/empresas", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const list = await scopedStorage.getAllEmpresas();
      res.json(list);
    } catch (error) {
      console.error("Error fetching empresas:", error);
      res.status(500).json({ error: "Error fetching empresas" });
    }
  });
  app2.post("/api/empresas", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).json({ error: "Solo el superadmin puede crear marcas" });
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const tenantId = scopedStorage.getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: "No hay contexto de empresa (tenant)" });
      }
      const validationResult = insertEmpresaSchema.omit({ tenantId: true }).safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inv\xE1lidos",
          details: validationResult.error.errors
        });
      }
      const newEmpresa = await scopedStorage.createEmpresa({ ...validationResult.data, tenantId });
      res.status(201).json(newEmpresa);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "El subdominio ya existe" });
      }
      console.error("Error creating empresa:", error);
      res.status(500).json({ error: "Error creating empresa" });
    }
  });
  app2.delete("/api/empresas/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).json({ error: "Solo el superadmin puede eliminar marcas" });
    try {
      const { id } = req.params;
      const scopedStorage = createTenantScopedStorage(req);
      const existing = await scopedStorage.getEmpresa(id);
      if (!existing) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }
      const deleted = await scopedStorage.deleteEmpresa(id);
      if (!deleted) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting empresa:", error);
      res.status(500).json({ error: "Error al eliminar la empresa" });
    }
  });
  app2.patch("/api/empresas/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    if (!req.user?.isSuperAdmin) return res.status(403).json({ error: "Solo el superadmin puede editar marcas" });
    try {
      const { id } = req.params;
      const scopedStorage = createTenantScopedStorage(req);
      const updateSchema = insertEmpresaSchema.omit({ tenantId: true }).partial();
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inv\xE1lidos",
          details: validationResult.error.errors
        });
      }
      const updated = await scopedStorage.updateEmpresa(id, validationResult.data);
      if (!updated) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }
      res.json(updated);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "El subdominio ya existe" });
      }
      console.error("Error updating empresa:", error);
      res.status(500).json({ error: "Error updating empresa" });
    }
  });
  app2.get("/api/company-settings", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      const tenant = await db.query.tenants.findFirst({
        where: eq5(tenants.id, tenantId)
      });
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ error: "Error fetching company settings" });
    }
  });
  app2.patch("/api/company-settings", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      const allowedFields = [
        "name",
        "legalName",
        "rfc",
        "website",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "zipCode",
        "country",
        "primaryColor",
        "secondaryColor",
        "timezone"
      ];
      const updateData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== void 0) {
          updateData[field] = req.body[field];
        }
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      updateData.updatedAt = /* @__PURE__ */ new Date();
      const [updatedTenant] = await db.update(tenants).set(updateData).where(eq5(tenants.id, tenantId)).returning();
      if (!updatedTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ error: "Error updating company settings" });
    }
  });
  app2.post("/api/company-settings/logo", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      const contentType = req.headers["content-type"] || "image/png";
      if (!contentType.startsWith("image/")) {
        return res.status(400).json({ error: "Solo se permiten im\xE1genes" });
      }
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: "La imagen no puede superar 5MB" });
          }
          const ext = contentType.split("/")[1] || "png";
          const storagePath = await localStorageService.uploadLogo(buffer, tenantId, ext);
          const filename = storagePath.replace("logos/", "");
          const logoUrl = `/api/logos/${filename}`;
          const [updatedTenant] = await db.update(tenants).set({ logoUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(tenants.id, tenantId)).returning();
          console.log(`\u2705 Logo uploaded for tenant ${tenantId}: ${logoUrl}`);
          res.json({ logoUrl, tenant: updatedTenant });
        } catch (error) {
          console.error("Error saving logo:", error);
          res.status(500).json({ error: "Error al guardar el logo" });
        }
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Error al subir el logo" });
    }
  });
  app2.get("/api/logos/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const success = await localStorageService.streamFile(`logos/${filename}`, res);
      if (!success) {
        return res.status(404).json({ error: "Logo not found" });
      }
    } catch (error) {
      console.error("Error serving logo:", error);
      res.status(500).json({ error: "Error serving logo" });
    }
  });
  app2.post("/api/admin/reset-tenant-data", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { confirmPhrase } = req.body;
      if (confirmPhrase !== "CONFIRMAR RESET") {
        return res.status(400).json({ error: "Frase de confirmaci\xF3n incorrecta" });
      }
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ error: "Operaci\xF3n no permitida sin contexto de empresa" });
      }
      await db.execute(sql5`DELETE FROM incident_activities WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM incident_attachments WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM incident_comments WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM incidents WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM shipment_product_instances WHERE shipment_id IN (SELECT id FROM shipments WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM order_releases WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM payments WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM invoices WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM shipments WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM orders WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM credit_authorization_comments WHERE credit_authorization_id IN (SELECT ca.id FROM credit_authorizations ca JOIN quotations q ON q.id = ca.quotation_id WHERE q.tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM credit_authorizations WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM quotations WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM scheduled_visits WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM pending_uploads WHERE checkin_id IN (SELECT id FROM checkins WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM checkins WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM customer_product_prices WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM customer_locations WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = ${tenantId})`);
      await db.execute(sql5`DELETE FROM customers WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM products WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM product_categories WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM microsip_sync_logs WHERE tenant_id = ${tenantId}`);
      await db.execute(sql5`DELETE FROM microsip_configs WHERE tenant_id = ${tenantId}`);
      console.log(`[ADMIN] Tenant data reset by user ${req.user?.id} for tenant ${tenantId}`);
      res.json({ success: true, message: "Datos eliminados correctamente. Solo quedan los usuarios." });
    } catch (error) {
      console.error("Error resetting tenant data:", error);
      res.status(500).json({ error: "Error al eliminar los datos" });
    }
  });
  app2.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const pendingQuotations = tenantId ? await db.select({ count: sql5`count(*)` }).from(quotations).where(and4(eq5(quotations.tenantId, tenantId), sql5`status IN ('draft', 'sent')`)) : await db.select({ count: sql5`count(*)` }).from(quotations).where(sql5`status IN ('draft', 'sent')`);
      const activeOrders = tenantId ? await db.select({ count: sql5`count(*)` }).from(orders).where(and4(eq5(orders.tenantId, tenantId), sql5`status IN ('pending', 'in_production')`)) : await db.select({ count: sql5`count(*)` }).from(orders).where(sql5`status IN ('pending', 'in_production')`);
      const overdueInvoices = tenantId ? await db.select({ count: sql5`count(*)` }).from(invoices).where(and4(eq5(invoices.tenantId, tenantId), sql5`due_date < NOW() AND status != 'paid'`)) : await db.select({ count: sql5`count(*)` }).from(invoices).where(sql5`due_date < NOW() AND status != 'paid'`);
      const monthlyRevenue = tenantId ? await db.select({ sum: sql5`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(and4(eq5(invoices.tenantId, tenantId), sql5`EXTRACT(MONTH FROM issued_at) = EXTRACT(MONTH FROM NOW())`)) : await db.select({ sum: sql5`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(sql5`EXTRACT(MONTH FROM issued_at) = EXTRACT(MONTH FROM NOW())`);
      const todayCheckins = tenantId ? await db.select({ count: sql5`count(*)` }).from(checkins).where(and4(eq5(checkins.tenantId, tenantId), sql5`DATE(checkin_at) = CURRENT_DATE`)) : await db.select({ count: sql5`count(*)` }).from(checkins).where(sql5`DATE(checkin_at) = CURRENT_DATE`);
      const pendingShipments = tenantId ? await db.select({ count: sql5`count(*)` }).from(shipments).where(and4(eq5(shipments.tenantId, tenantId), eq5(shipments.status, "pending"))) : await db.select({ count: sql5`count(*)` }).from(shipments).where(eq5(shipments.status, "pending"));
      const pendingCreditAuth = tenantId ? await db.select({ count: sql5`count(*)` }).from(creditAuthorizations).where(and4(
        sql5`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`,
        eq5(creditAuthorizations.status, "pending")
      )) : await db.select({ count: sql5`count(*)` }).from(creditAuthorizations).where(eq5(creditAuthorizations.status, "pending"));
      const ordersReady = tenantId ? await db.select({ count: sql5`count(*)` }).from(orders).where(and4(eq5(orders.tenantId, tenantId), sql5`status IN ('ready', 'partially_released')`)) : await db.select({ count: sql5`count(*)` }).from(orders).where(sql5`status IN ('ready', 'partially_released')`);
      const annualSales = tenantId ? await db.select({ sum: sql5`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(and4(eq5(invoices.tenantId, tenantId), sql5`EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM NOW())`)) : await db.select({ sum: sql5`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(sql5`EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM NOW())`);
      res.json({
        pendingQuotations: pendingQuotations[0]?.count || 0,
        activeOrders: activeOrders[0]?.count || 0,
        overdueInvoices: overdueInvoices[0]?.count || 0,
        totalRevenue: monthlyRevenue[0]?.sum || 0,
        todayCheckins: todayCheckins[0]?.count || 0,
        pendingShipments: pendingShipments[0]?.count || 0,
        pendingCreditAuth: pendingCreditAuth[0]?.count || 0,
        ordersReadyToDeliver: ordersReady[0]?.count || 0,
        annualSales: annualSales[0]?.sum || 0
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Error fetching dashboard statistics" });
    }
  });
  app2.get("/api/dashboard/sales-by-category", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.json([]);
      }
      const result = await db.execute(sql5`
        SELECT 
          pc.id,
          pc.name as category_name,
          COALESCE(SUM(qi.quantity * qi.unit_price), 0) as total_sales,
          COUNT(DISTINCT q.id) as order_count
        FROM ${productCategories} pc
        LEFT JOIN ${products} p ON p.category_id = pc.id AND p.tenant_id = ${tenantId}
        LEFT JOIN ${quotationItems} qi ON qi.product_id = p.id
        LEFT JOIN ${quotations} q ON q.id = qi.quotation_id 
          AND q.status IN ('approved', 'converted')
          AND EXTRACT(YEAR FROM q.created_at) = EXTRACT(YEAR FROM NOW())
        WHERE pc.tenant_id = ${tenantId}
        GROUP BY pc.id, pc.name
        ORDER BY total_sales DESC
        LIMIT 10
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching sales by category:", error);
      res.status(500).json({ error: "Error fetching sales by category" });
    }
  });
  app2.get("/api/dashboard/recent-contacts", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.json([]);
      }
      const recentCheckins = await db.select({
        id: checkins.id,
        customerId: checkins.customerId,
        customerName: customers.name,
        contactName: customers.contactName,
        contactPhone: customers.phone,
        contactEmail: customers.email,
        checkinAt: checkins.checkinAt,
        notes: checkins.notes
      }).from(checkins).innerJoin(customers, eq5(checkins.customerId, customers.id)).where(
        and4(
          eq5(checkins.tenantId, tenantId),
          eq5(checkins.salesPersonId, user.id),
          sql5`${checkins.checkinAt} >= NOW() - INTERVAL '30 days'`
        )
      ).orderBy(sql5`${checkins.checkinAt} DESC`).limit(10);
      res.json(recentCheckins);
    } catch (error) {
      console.error("Error fetching recent contacts:", error);
      res.status(500).json({ error: "Error fetching recent contacts" });
    }
  });
  app2.get("/api/dashboard/seller-stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const tenantId = getEffectiveTenantId(req);
      const userId = user.id;
      const myPendingQ = await db.select({ count: sql5`count(*)` }).from(quotations).where(
        and4(
          tenantId ? eq5(quotations.tenantId, tenantId) : sql5`1=1`,
          eq5(quotations.userId, userId),
          sql5`${quotations.status} IN ('draft', 'sent')`
        )
      );
      const myCheckins = await db.select({ count: sql5`count(*)` }).from(checkins).where(
        and4(
          tenantId ? eq5(checkins.tenantId, tenantId) : sql5`1=1`,
          eq5(checkins.salesPersonId, userId),
          sql5`DATE(${checkins.checkinAt}) = CURRENT_DATE`
        )
      );
      const myOrdersReady = await db.execute(sql5`
        SELECT COUNT(*) as count
        FROM ${orders} o
        JOIN ${quotations} q ON q.id = o.quotation_id
        WHERE o.status IN ('ready', 'partially_released')
          ${tenantId ? sql5`AND o.tenant_id = ${tenantId}` : sql5``}
          AND q.user_id = ${userId}
      `);
      const myMonthlySales = await db.execute(sql5`
        SELECT COALESCE(SUM(total::numeric), 0) as sum
        FROM ${quotations}
        WHERE user_id = ${userId}
          ${tenantId ? sql5`AND tenant_id = ${tenantId}` : sql5``}
          AND status IN ('approved', 'converted')
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      `);
      const myRecentQuotations = await db.select({
        id: quotations.id,
        folio: quotations.folio,
        status: quotations.status,
        total: quotations.total,
        createdAt: quotations.createdAt,
        customerName: customers.name
      }).from(quotations).leftJoin(customers, eq5(quotations.customerId, customers.id)).where(
        and4(
          tenantId ? eq5(quotations.tenantId, tenantId) : sql5`1=1`,
          eq5(quotations.userId, userId)
        )
      ).orderBy(sql5`${quotations.createdAt} DESC`).limit(5);
      res.json({
        myPendingQuotations: Number(myPendingQ[0]?.count || 0),
        myTodayCheckins: Number(myCheckins[0]?.count || 0),
        myOrdersReady: Number(myOrdersReady.rows[0]?.count || 0),
        myMonthlySales: Number(myMonthlySales.rows[0]?.sum || 0),
        myRecentQuotations
      });
    } catch (error) {
      console.error("Error fetching seller stats:", error);
      res.status(500).json({ error: "Error fetching seller statistics" });
    }
  });
  app2.get("/api/users", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      let allUsers;
      if (tenantId) {
        allUsers = await db.select().from(users).where(eq5(users.tenantId, tenantId)).orderBy(users.createdAt);
      } else {
        allUsers = await storage.getAllUsers();
      }
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error fetching users" });
    }
  });
  app2.patch("/api/users/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z3.object({
        active: z3.boolean().optional(),
        role: z3.enum([
          UserRole.ADMIN,
          UserRole.VENDEDOR,
          UserRole.CREDITO_COBRANZA,
          UserRole.VENTAS_LOGISTICA,
          UserRole.FABRICA,
          UserRole.EMBARQUES,
          UserRole.FACTURACION
        ]).optional(),
        fullName: z3.string().optional(),
        email: z3.string().email().optional(),
        password: z3.string().min(6).optional(),
        empresaId: z3.string().nullable().optional()
      });
      const validated = updateSchema.parse(req.body);
      const targetUser = await storage.getUser(id);
      if (!assertTenantScope(req, res, targetUser, { notFoundMessage: "User not found" })) {
        return;
      }
      if (validated.empresaId) {
        const scopedStorage = createTenantScopedStorage(req);
        const empresa = await scopedStorage.getEmpresa(validated.empresaId);
        if (!empresa || targetUser.tenantId && empresa.tenantId !== targetUser.tenantId) {
          return res.status(400).json({ error: "Empresa inv\xE1lida para este tenant" });
        }
      }
      let updateData = { ...validated };
      if (validated.password) {
        const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
        updateData = { ...validated, password: await hashPassword2(validated.password) };
      }
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Error updating user" });
    }
  });
  app2.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allCustomers = await scopedStorage.getAllCustomers();
      res.json(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Error fetching customers" });
    }
  });
  app2.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const user = req.user;
      let tenantId = user.tenantId;
      if (!tenantId && user.isSuperAdmin) {
        const selectedTenantId = req.headers["x-selected-tenant-id"];
        if (selectedTenantId) {
          const tenant = await db.query.tenants.findFirst({
            where: eq5(tenants.id, selectedTenantId)
          });
          if (!tenant) {
            return res.status(400).json({ error: "El tenant seleccionado no existe." });
          }
          tenantId = selectedTenantId;
        } else if (req.tenant) {
          tenantId = req.tenant.id;
        }
      }
      if (!tenantId) {
        return res.status(400).json({ error: "Seleccione una empresa antes de crear clientes." });
      }
      const bodyWithTenant = { ...req.body, tenantId };
      const validated = insertCustomerSchema.parse(bodyWithTenant);
      const customer = await scopedStorage.createCustomer(validated);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Error creating customer" });
    }
  });
  app2.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const validated = updateCustomerSchema.parse(req.body);
      const updateData = {};
      Object.keys(validated).forEach((key) => {
        const value = validated[key];
        if (value !== void 0) {
          updateData[key] = value;
        }
      });
      const customer = await scopedStorage.updateCustomer(id, updateData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ error: "Error updating customer" });
    }
  });
  app2.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Error fetching customer" });
    }
  });
  app2.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Solo administradores pueden eliminar clientes" });
      }
      const scopedStorage = createTenantScopedStorage(req);
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      const tryExec = async (query) => {
        try {
          await db.execute(query);
        } catch {
        }
      };
      await tryExec(sql5`DELETE FROM pending_uploads WHERE checkin_id IN (SELECT id FROM checkins WHERE customer_id = ${id})`);
      await tryExec(sql5`DELETE FROM checkins WHERE customer_id = ${id}`);
      await tryExec(sql5`DELETE FROM customer_locations WHERE customer_id = ${id}`);
      await tryExec(sql5`DELETE FROM customer_product_prices WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE quotations SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE orders SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE invoices SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE payments SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE incidents SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql5`UPDATE scheduled_visits SET customer_id = NULL WHERE customer_id = ${id}`);
      await db.execute(sql5`DELETE FROM customers WHERE id = ${id}`);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Error al eliminar el cliente" });
    }
  });
  app2.get("/api/customers/:id/summary", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const restrictedEmpresaId = scopedStorage.getRestrictedEmpresaId();
      const pendingInvoices = await scopedStorage.getPendingInvoicesByCustomer(id);
      const overdueInvoices = pendingInvoices.filter(
        (inv) => inv.dueDate && new Date(inv.dueDate) < /* @__PURE__ */ new Date()
      );
      const upcomingInvoices = pendingInvoices.filter(
        (inv) => !inv.dueDate || new Date(inv.dueDate) >= /* @__PURE__ */ new Date()
      );
      const totalBalanceDue = pendingInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || "0");
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      const customerQuotations = await db.query.quotations.findMany({
        where: restrictedEmpresaId ? and4(eq5(quotations.customerId, id), eq5(quotations.empresaId, restrictedEmpresaId)) : eq5(quotations.customerId, id),
        columns: { id: true }
      });
      const quotationIds = customerQuotations.map((q) => q.id);
      let pendingOrders = [];
      if (quotationIds.length > 0) {
        pendingOrders = await db.query.orders.findMany({
          where: and4(
            sql5`${orders.quotationId} IN (${sql5.join(quotationIds.map((id2) => sql5`${id2}`), sql5`, `)})`,
            sql5`${orders.status} IN ('pending', 'in_production')`
          ),
          with: {
            quotation: {
              columns: {
                id: true,
                customerId: true,
                folio: true,
                total: true
              }
            }
          },
          orderBy: (orders2, { desc: desc3 }) => [desc3(orders2.createdAt)],
          limit: 10
        });
      }
      const recentQuotations = await db.query.quotations.findMany({
        where: restrictedEmpresaId ? and4(
          eq5(quotations.customerId, id),
          eq5(quotations.empresaId, restrictedEmpresaId),
          sql5`${quotations.createdAt} > NOW() - INTERVAL '6 months'`
        ) : and4(
          eq5(quotations.customerId, id),
          sql5`${quotations.createdAt} > NOW() - INTERVAL '6 months'`
        ),
        orderBy: (quotations2, { desc: desc3 }) => [desc3(quotations2.createdAt)],
        limit: 10
      });
      const recentCheckins = await db.query.checkins.findMany({
        where: eq5(checkins.customerId, id),
        with: {
          user: true
        },
        orderBy: (checkins2, { desc: desc3 }) => [desc3(checkins2.checkinAt)],
        limit: 5
      });
      const locations = await scopedStorage.getCustomerLocationsByCustomerId(id);
      let creditUsed = pendingInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || "0");
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      creditUsed = Number.isFinite(creditUsed) ? creditUsed : 0;
      const overdueTotal = overdueInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || "0");
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      const upcomingTotal = upcomingInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || "0");
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      let creditLimitNum = parseFloat(customer.creditLimit || "0");
      creditLimitNum = Number.isFinite(creditLimitNum) ? creditLimitNum : 0;
      let creditAvailable = creditLimitNum - creditUsed;
      creditAvailable = Number.isFinite(creditAvailable) ? creditAvailable : 0;
      res.json({
        customer,
        overdueInvoices,
        upcomingInvoices,
        pendingInvoices,
        hasPendingReceivables: pendingInvoices.length > 0,
        totalBalanceDue: parseFloat(totalBalanceDue.toFixed(2)),
        pendingOrders,
        recentQuotations,
        recentCheckins,
        locations,
        creditSummary: {
          creditLimit: parseFloat(creditLimitNum.toFixed(2)),
          creditUsed: parseFloat(creditUsed.toFixed(2)),
          creditAvailable: parseFloat(Math.max(0, creditAvailable).toFixed(2)),
          overdueCount: overdueInvoices.length,
          overdueTotal: parseFloat(overdueTotal.toFixed(2)),
          upcomingCount: upcomingInvoices.length,
          upcomingTotal: parseFloat(upcomingTotal.toFixed(2))
        }
      });
    } catch (error) {
      console.error("Error fetching customer summary:", error);
      res.status(500).json({ error: "Error fetching customer summary" });
    }
  });
  app2.get("/api/checkins", isAuthenticated, async (req, res) => {
    try {
      const tenant = req.tenant;
      const user = req.user;
      const selectedTenantId = req.headers["x-selected-tenant-id"];
      const tenantId = tenant?.id || selectedTenantId || (user.isSuperAdmin ? null : user.tenantId);
      const allCheckins = await db.query.checkins.findMany({
        where: tenantId ? eq5(checkins.tenantId, tenantId) : void 0,
        orderBy: [desc2(checkins.checkinAt)],
        with: {
          customer: true
        }
      });
      res.json(allCheckins);
    } catch (error) {
      console.error("Error fetching checkins:", error);
      res.status(500).json({ error: "Error fetching checkins" });
    }
  });
  app2.get("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const checkin = await db.query.checkins.findFirst({
        where: eq5(checkins.id, id),
        with: {
          customer: true,
          user: true
        }
      });
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      res.json(checkin);
    } catch (error) {
      console.error("Error fetching check-in:", error);
      res.status(500).json({ error: "Error fetching check-in" });
    }
  });
  app2.post("/api/checkins", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const body = {
        ...req.body,
        userId: req.user.id,
        latitude: req.body.latitude === "" ? void 0 : req.body.latitude,
        longitude: req.body.longitude === "" ? void 0 : req.body.longitude
      };
      const validated = insertCheckinSchema.parse(body);
      if (validated.customerLocationId) {
        const location = await scopedStorage.getCustomerLocation(validated.customerLocationId);
        if (!location) {
          return res.status(400).json({ error: "Customer location not found" });
        }
        if (location.customerId !== validated.customerId) {
          return res.status(400).json({ error: "Customer location does not belong to the specified customer" });
        }
      }
      const checkin = await scopedStorage.createCheckin(validated);
      res.status(201).json(checkin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error creating checkin:", error);
      res.status(400).json({ error: "Error creating checkin", detail: message });
    }
  });
  app2.patch("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const updateCheckinSchema2 = z3.object({
        meetingType: z3.enum([MeetingType.LLAMADA, MeetingType.VISITA, MeetingType.VIDEOLLAMADA]).optional(),
        checkoutNotes: z3.string().optional(),
        internalNotes: z3.string().optional()
      }).refine((d) => d.meetingType !== void 0 || d.checkoutNotes !== void 0 || d.internalNotes !== void 0, {
        message: "Se requiere al menos un campo para actualizar"
      });
      const validationResult = updateCheckinSchema2.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inv\xE1lidos", details: validationResult.error.flatten() });
      }
      const { meetingType, checkoutNotes, internalNotes } = validationResult.data;
      const existingCheckin = await db.query.checkins.findFirst({
        where: eq5(checkins.id, id)
      });
      if (!existingCheckin) {
        return res.status(404).json({ error: "Check-in no encontrado" });
      }
      const isOwner = existingCheckin.userId === user.id;
      const isAdmin = user.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "No tienes permiso para editar este check-in" });
      }
      if (existingCheckin.checkoutAt) {
        return res.status(400).json({ error: "No se puede editar un check-in ya finalizado" });
      }
      const updatePayload = {};
      if (meetingType !== void 0) updatePayload.meetingType = meetingType;
      if (checkoutNotes !== void 0) updatePayload.checkoutNotes = checkoutNotes;
      if (internalNotes !== void 0) updatePayload.internalNotes = internalNotes;
      const [updated] = await db.update(checkins).set(updatePayload).where(eq5(checkins.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating check-in:", error);
      res.status(500).json({ error: "Error al actualizar el check-in" });
    }
  });
  app2.delete("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Solo administradores pueden eliminar check-ins" });
      }
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(id);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in no encontrado" });
      }
      await db.execute(sql5`UPDATE scheduled_visits SET checkin_id = NULL WHERE checkin_id = ${id}`);
      await db.execute(sql5`DELETE FROM pending_uploads WHERE checkin_id = ${id}`);
      await db.delete(checkins).where(eq5(checkins.id, id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting check-in:", error);
      res.status(500).json({ error: "Error al eliminar el check-in" });
    }
  });
  app2.get("/api/scheduled-visits", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allVisits = await scopedStorage.getAllScheduledVisits();
      res.json(allVisits);
    } catch (error) {
      console.error("Error fetching scheduled visits:", error);
      res.status(500).json({ error: "Error fetching scheduled visits" });
    }
  });
  app2.get("/api/scheduled-visits/today", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const now = /* @__PURE__ */ new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const todayVisits = await db.query.scheduledVisits.findMany({
        where: and4(
          eq5(scheduledVisits.userId, userId),
          eq5(scheduledVisits.status, ScheduledVisitStatus.SCHEDULED),
          gte(scheduledVisits.scheduledDate, startOfDay),
          lt(scheduledVisits.scheduledDate, endOfDay)
        ),
        with: {
          customer: true,
          customerLocation: true
        },
        orderBy: (scheduledVisits2, { asc: asc2 }) => [asc2(scheduledVisits2.scheduledDate)]
      });
      res.json(todayVisits);
    } catch (error) {
      console.error("Error fetching today's visits:", error);
      res.status(500).json({ error: "Error fetching today's visits" });
    }
  });
  app2.get("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq5(scheduledVisits.id, id),
        with: {
          customer: true,
          user: true,
          customerLocation: true
        }
      });
      if (!assertTenantScope(req, res, visit, { notFoundMessage: "Scheduled visit not found" })) {
        return;
      }
      res.json(visit);
    } catch (error) {
      console.error("Error fetching scheduled visit:", error);
      res.status(500).json({ error: "Error fetching scheduled visit" });
    }
  });
  app2.post("/api/scheduled-visits", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const tenantId = scopedStorage.getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      const validated = insertScheduledVisitSchema.parse({
        ...req.body,
        userId: req.user.id
        // Set userId from authenticated user
      });
      if (validated.customerLocationId) {
        const location = await scopedStorage.getCustomerLocation(validated.customerLocationId);
        if (!location) {
          return res.status(400).json({ error: "Customer location not found" });
        }
        if (location.customerId !== validated.customerId) {
          return res.status(400).json({ error: "Customer location does not belong to the specified customer" });
        }
      }
      const [visit] = await db.insert(scheduledVisits).values({
        ...validated,
        tenantId
      }).returning();
      res.status(201).json(visit);
    } catch (error) {
      console.error("Error creating scheduled visit:", error);
      res.status(400).json({ error: "Error creating scheduled visit" });
    }
  });
  app2.patch("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq5(scheduledVisits.id, id)
      });
      if (!assertTenantScope(req, res, visit, { notFoundMessage: "Scheduled visit not found" })) {
        return;
      }
      if (visit.userId !== userId && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to update this visit" });
      }
      const validated = updateScheduledVisitSchema.parse(req.body);
      const [updatedVisit] = await db.update(scheduledVisits).set({ ...validated, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(scheduledVisits.id, id)).returning();
      res.json(updatedVisit);
    } catch (error) {
      console.error("Error updating scheduled visit:", error);
      res.status(400).json({ error: "Error updating scheduled visit" });
    }
  });
  app2.delete("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq5(scheduledVisits.id, id)
      });
      if (!assertTenantScope(req, res, visit, { notFoundMessage: "Scheduled visit not found" })) {
        return;
      }
      if (visit.userId !== userId && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to delete this visit" });
      }
      await db.update(scheduledVisits).set({ status: ScheduledVisitStatus.CANCELLED, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(scheduledVisits.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error cancelling scheduled visit:", error);
      res.status(500).json({ error: "Error cancelling scheduled visit" });
    }
  });
  app2.post("/api/scheduled-visits/:id/convert", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      if (req.body.latitude == null || req.body.longitude == null) {
        return res.status(400).json({ error: "GPS coordinates are required to start check-in" });
      }
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq5(scheduledVisits.id, id)
      });
      if (!assertTenantScope(req, res, visit, { notFoundMessage: "Scheduled visit not found" })) {
        return;
      }
      if (visit.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to convert this visit" });
      }
      if (visit.status !== ScheduledVisitStatus.SCHEDULED) {
        return res.status(400).json({ error: "Visit already completed or cancelled" });
      }
      const checkinData = {
        userId: visit.userId,
        customerId: visit.customerId,
        customerLocationId: visit.customerLocationId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        topics: visit.topics || [],
        notes: visit.notes || "",
        photos: []
      };
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.createCheckin(checkinData);
      await db.update(scheduledVisits).set({
        status: ScheduledVisitStatus.COMPLETED,
        checkinId: checkin.id,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(scheduledVisits.id, id));
      res.status(201).json(checkin);
    } catch (error) {
      console.error("Error converting scheduled visit to checkin:", error);
      res.status(400).json({ error: "Error converting scheduled visit" });
    }
  });
  app2.get("/api/product-categories", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      let categories;
      if (tenantId) {
        categories = await db.select().from(productCategories).where(eq5(productCategories.tenantId, tenantId)).orderBy(productCategories.name);
      } else {
        categories = await storage.getAllProductCategories();
      }
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ error: "Error fetching product categories" });
    }
  });
  app2.post("/api/product-categories", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const tenantId = scopedStorage.getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      const validated = insertProductCategorySchema.parse(req.body);
      const categoryData = { ...validated, tenantId };
      const category = await scopedStorage.createProductCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(400).json({ error: "Error creating product category" });
    }
  });
  app2.patch("/api/product-categories/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const category = await scopedStorage.updateProductCategory(id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating product category:", error);
      res.status(500).json({ error: "Error updating product category" });
    }
  });
  app2.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { q } = req.query;
      let productsData = await db.query.products.findMany({
        where: and4(
          eq5(products.tenantId, tenantId),
          eq5(products.active, true)
        ),
        with: {
          category: true
        },
        orderBy: (products2, { desc: desc3, asc: asc2 }) => [desc3(products2.listPrice), asc2(products2.name)]
      });
      productsData = productsData.filter((p) => {
        if (!p.categoryId) return true;
        if (!p.category) return false;
        return p.category.active === true;
      });
      if (q && typeof q === "string") {
        const searchLower = q.toLowerCase();
        productsData = productsData.filter(
          (p) => p.code.toLowerCase().includes(searchLower) || p.name.toLowerCase().includes(searchLower) || p.brand?.toLowerCase().includes(searchLower)
        );
      }
      res.json(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Error fetching products" });
    }
  });
  app2.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await db.query.products.findFirst({
        where: eq5(products.id, id),
        with: {
          category: true,
          customerPrices: true
        }
      });
      if (!assertTenantScope(req, res, product, { notFoundMessage: "Product not found" })) {
        return;
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Error fetching product" });
    }
  });
  app2.post("/api/products", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertProductSchema.parse(req.body);
      const existing = await scopedStorage.getProductByCode(validated.code);
      if (existing) {
        return res.status(400).json({ error: "El c\xF3digo del producto ya existe" });
      }
      if (validated.categoryId) {
        const category = await scopedStorage.getProductCategory(validated.categoryId);
        if (!category) {
          return res.status(400).json({ error: "La categor\xEDa seleccionada no existe. Por favor, crea la categor\xEDa primero." });
        }
      }
      const product = await scopedStorage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Datos inv\xE1lidos: " + error.errors?.map((e) => e.message).join(", ") });
      }
      res.status(400).json({ error: error.message || "Error al crear producto" });
    }
  });
  app2.patch("/api/products/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const validated = updateProductSchema.parse(req.body);
      if (validated.code) {
        const existing = await scopedStorage.getProductByCode(validated.code);
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: "Product code already exists" });
        }
      }
      const product = await scopedStorage.updateProduct(id, validated);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Error updating product" });
    }
  });
  app2.post("/api/products/bulk-discount", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { discount, categoryId } = z3.object({
        discount: z3.number().min(0).max(100),
        categoryId: z3.string().optional()
      }).parse(req.body);
      const discountStr = discount.toFixed(2);
      const conditions = [eq5(products.tenantId, tenantId)];
      if (categoryId) {
        conditions.push(eq5(products.categoryId, categoryId));
      }
      const updatedProducts = await db.update(products).set({ maxDiscount: discountStr }).where(and4(...conditions)).returning({ id: products.id });
      if (categoryId) {
        await db.update(productCategories).set({ maxDiscount: discountStr }).where(and4(eq5(productCategories.id, categoryId), eq5(productCategories.tenantId, tenantId)));
      }
      res.json({ updated: updatedProducts.length, discount: discountStr });
    } catch (error) {
      console.error("Error applying bulk discount:", error);
      res.status(500).json({ error: "Error applying bulk discount" });
    }
  });
  app2.post("/api/product-categories/bulk-discount", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const rows = z3.array(z3.object({
        categoryId: z3.string(),
        discount: z3.number().min(0).max(100)
      })).parse(req.body);
      for (const row of rows) {
        await db.update(productCategories).set({ maxDiscount: row.discount.toFixed(2) }).where(and4(eq5(productCategories.id, row.categoryId), eq5(productCategories.tenantId, tenantId)));
      }
      res.json({ updated: rows.length });
    } catch (error) {
      console.error("Error applying category discounts:", error);
      res.status(500).json({ error: "Error applying category discounts" });
    }
  });
  app2.get("/api/customers/:customerId/product-prices", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { customerId } = req.params;
      const prices = await scopedStorage.getCustomerProductPrices(customerId);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching customer product prices:", error);
      res.status(500).json({ error: "Error fetching customer product prices" });
    }
  });
  app2.post("/api/customer-product-prices", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertCustomerProductPriceSchema.parse(req.body);
      const price = await scopedStorage.createCustomerProductPrice(validated);
      res.status(201).json(price);
    } catch (error) {
      console.error("Error creating customer product price:", error);
      res.status(400).json({ error: "Error creating customer product price" });
    }
  });
  app2.get("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allQuotations = await scopedStorage.getAllQuotations();
      res.json(allQuotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ error: "Error fetching quotations" });
    }
  });
  app2.post("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { items, ...quotationData } = req.body;
      if (quotationData.validUntil && typeof quotationData.validUntil === "string") {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      const validated = insertQuotationSchema.parse({
        ...quotationData,
        userId: req.user.id,
        status: QuotationStatus.DRAFT
      });
      const quotation = await scopedStorage.createQuotation(validated);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const validatedItem = insertQuotationItemSchema.parse({
            ...item,
            quotationId: quotation.id
          });
          await scopedStorage.createQuotationItem(validatedItem);
        }
      }
      if (validated.shippingHandledByJoper && quotation.tenantId) {
        (async () => {
          try {
            console.log(`[ShippingEmail] Quotation ${quotation.folio} requires shipping approval \u2014 looking for admins in tenant ${quotation.tenantId}`);
            const adminUsers = await db.query.users.findMany({
              where: and4(
                eq5(users.tenantId, quotation.tenantId),
                eq5(users.role, UserRole.ADMIN)
              )
            });
            console.log(`[ShippingEmail] Found ${adminUsers.length} admin user(s):`, adminUsers.map((u) => u.email));
            const adminEmails = adminUsers.filter((u) => u.email && u.email.includes("@")).map((u) => ({ email: u.email, name: u.fullName || u.username }));
            if (adminEmails.length === 0) {
              console.error(`[ShippingEmail] No admin users with email found for tenant ${quotation.tenantId} \u2014 skipping notification`);
              return;
            }
            const tenant = await db.query.tenants.findFirst({
              where: eq5(tenants.id, quotation.tenantId)
            });
            const customer = await db.query.customers.findFirst({
              where: eq5(customers.id, quotation.customerId)
            });
            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const quotationUrl = `${protocol}://${host}/quotations`;
            const crypto = await import("crypto");
            const shippingToken = crypto.randomBytes(32).toString("hex");
            await db.update(quotations).set({ shippingApprovalToken: shippingToken }).where(eq5(quotations.id, quotation.id));
            const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const { sendShippingApprovalRequestEmail: sendShippingApprovalRequestEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            await sendShippingApprovalRequestEmail2({
              adminEmails,
              quotationData: {
                folio: quotation.folio,
                customerName: customer?.name || quotation.customerId,
                vendedorName: req.user.fullName || req.user.username,
                total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: quotation.currency || "MXN",
                itemsCount: items?.length || 0,
                shippingMethod: validated.shippingMethod || "truck"
              },
              quotationUrl,
              tenantName: tenant?.name || "Nexxo",
              approveUrl,
              rejectUrl
            });
            console.log(`[ShippingEmail] Notification sent to: ${adminEmails.map((a) => a.email).join(", ")}`);
          } catch (emailErr) {
            console.error("[ShippingEmail] Notification failed:", emailErr.message || emailErr);
          }
        })();
      }
      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: `Error creating quotation: ${msg}` });
    }
  });
  app2.get("/api/quotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!assertTenantScope(req, res, quotation, {
        notFoundMessage: "Quotation not found",
        forbiddenMessage: "No autorizado para acceder a esta cotizaci\xF3n",
        checkEmpresa: true
      })) {
        return;
      }
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "No autorizado para acceder a esta cotizaci\xF3n" });
      }
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id),
        orderBy: (items2, { asc: asc2 }) => [asc2(items2.position)]
      });
      res.json({ ...quotation, items });
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ error: "Error fetching quotation" });
    }
  });
  app2.patch("/api/quotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const existingQuotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id)
      });
      if (!assertTenantScope(req, res, existingQuotation, {
        notFoundMessage: "Quotation not found",
        forbiddenMessage: "No autorizado para editar esta cotizaci\xF3n",
        checkEmpresa: true
      })) {
        return;
      }
      const allowedRoles = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA];
      if (existingQuotation.userId !== userId && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "No autorizado para editar esta cotizaci\xF3n" });
      }
      const EDITABLE_STATUSES = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.PENDING_APPROVAL];
      const isPrivilegedRole = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA].includes(userRole);
      if (!EDITABLE_STATUSES.includes(existingQuotation.status) && !isPrivilegedRole) {
        return res.status(400).json({ error: "Solo se pueden editar cotizaciones en estado Borrador, Enviada o Pendiente de Aprobaci\xF3n" });
      }
      const { items, ...quotationData } = req.body;
      delete quotationData.empresaId;
      const requestedStatus = quotationData.status || QuotationStatus.DRAFT;
      const isStatusPreserved = isPrivilegedRole && requestedStatus === existingQuotation.status;
      if (existingQuotation.status !== QuotationStatus.DRAFT && !isStatusPreserved) {
        quotationData.status = QuotationStatus.DRAFT;
        quotationData.approvalToken = null;
        quotationData.approvedAt = null;
      }
      if (quotationData.validUntil && typeof quotationData.validUntil === "string") {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      if (quotationData.shippingApprovedAt && typeof quotationData.shippingApprovedAt === "string") {
        quotationData.shippingApprovedAt = new Date(quotationData.shippingApprovedAt);
      }
      const scopedStorage = createTenantScopedStorage(req);
      const updatedQuotation = await scopedStorage.updateQuotation(id, quotationData);
      if (!updatedQuotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (items && Array.isArray(items)) {
        await db.delete(quotationItems).where(eq5(quotationItems.quotationId, id));
        for (const item of items) {
          const validatedItem = insertQuotationItemSchema.parse({
            ...item,
            quotationId: id
          });
          await scopedStorage.createQuotationItem(validatedItem);
        }
      }
      const finalQuotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      const finalItems = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id),
        orderBy: (items2, { asc: asc2 }) => [asc2(items2.position)]
      });
      const needsShippingEmail = requestedStatus === QuotationStatus.PENDING_APPROVAL && finalQuotation?.shippingHandledByJoper && finalQuotation?.tenantId;
      if (needsShippingEmail) {
        (async () => {
          try {
            console.log(`[ShippingEmail] PATCH: quotation ${finalQuotation.folio} requires shipping approval \u2014 notifying admins`);
            const adminUsers = await db.query.users.findMany({
              where: and4(
                eq5(users.tenantId, finalQuotation.tenantId),
                eq5(users.role, UserRole.ADMIN)
              )
            });
            console.log(`[ShippingEmail] Found ${adminUsers.length} admin(s):`, adminUsers.map((u) => u.email));
            const adminEmails = adminUsers.filter((u) => u.email && u.email.includes("@")).map((u) => ({ email: u.email, name: u.fullName || u.username }));
            if (adminEmails.length === 0) {
              console.error(`[ShippingEmail] No admin emails found \u2014 skipping`);
              return;
            }
            const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, finalQuotation.tenantId) });
            const customer = await db.query.customers.findFirst({ where: eq5(customers.id, finalQuotation.customerId) });
            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const quotationUrl = `${protocol}://${host}/quotations`;
            const crypto = await import("crypto");
            const shippingToken = crypto.randomBytes(32).toString("hex");
            await db.update(quotations).set({ shippingApprovalToken: shippingToken }).where(eq5(quotations.id, finalQuotation.id));
            const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const { sendShippingApprovalRequestEmail: sendShippingApprovalRequestEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            await sendShippingApprovalRequestEmail2({
              adminEmails,
              quotationData: {
                folio: finalQuotation.folio,
                customerName: customer?.name || finalQuotation.customerId,
                vendedorName: req.user.fullName || req.user.username,
                total: parseFloat(finalQuotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: finalQuotation.currency || "MXN",
                itemsCount: finalItems.length,
                shippingMethod: quotationData.shippingMethod || "truck"
              },
              quotationUrl,
              tenantName: tenant?.name || "Nexxo",
              approveUrl,
              rejectUrl
            });
            console.log(`[ShippingEmail] PATCH notification sent to: ${adminEmails.map((a) => a.email).join(", ")}`);
          } catch (emailErr) {
            console.error("[ShippingEmail] PATCH notification failed:", emailErr.message || emailErr);
          }
        })();
      }
      res.json({ ...finalQuotation, items: finalItems });
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Error updating quotation" });
    }
  });
  app2.delete("/api/quotations/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id)
      });
      if (!existing) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      const linkedOrder = await db.query.orders.findFirst({
        where: eq5(orders.quotationId, id)
      });
      if (linkedOrder) {
        const orderId = linkedOrder.id;
        await db.delete(shipmentProductInstances).where(eq5(shipmentProductInstances.orderId, orderId));
        await db.delete(shipments).where(eq5(shipments.orderId, orderId));
        await db.delete(orderReleases).where(eq5(orderReleases.orderId, orderId));
        await db.update(invoices).set({ orderId: null }).where(eq5(invoices.orderId, orderId));
        await db.update(incidents).set({ orderId: null }).where(eq5(incidents.orderId, orderId));
        await db.delete(orders).where(eq5(orders.id, orderId));
      }
      const linkedAuths = await db.query.creditAuthorizations.findMany({
        where: eq5(creditAuthorizations.quotationId, id)
      });
      for (const auth of linkedAuths) {
        await db.delete(creditAuthorizationComments).where(eq5(creditAuthorizationComments.creditAuthorizationId, auth.id));
      }
      await db.delete(creditAuthorizations).where(eq5(creditAuthorizations.quotationId, id));
      await db.delete(quotations).where(eq5(quotations.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ error: "Error al eliminar la cotizaci\xF3n" });
    }
  });
  app2.get("/api/quotations/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!assertTenantScope(req, res, quotation, {
        notFoundMessage: "Quotation not found",
        forbiddenMessage: "No autorizado para acceder a esta cotizaci\xF3n",
        checkEmpresa: true
      })) {
        return;
      }
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "No autorizado para acceder a esta cotizaci\xF3n" });
      }
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id),
        orderBy: (items2, { asc: asc2 }) => [asc2(items2.position)]
      });
      const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
      const hideDiscount = req.query.hideDiscount === "1";
      const { generateQuotationPDFStream: generateQuotationPDFStream2 } = await Promise.resolve().then(() => (init_quotation_pdf_generator(), quotation_pdf_generator_exports));
      const pdfStream = await generateQuotationPDFStream2({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
        tenant,
        hideDiscount
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="cotizacion-${quotation.folio}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating quotation PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });
  app2.post("/api/quotations/:id/send-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { additionalEmails = [], emails = [] } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!assertTenantScope(req, res, quotation, {
        notFoundMessage: "Quotation not found",
        forbiddenMessage: "No autorizado para enviar esta cotizaci\xF3n",
        checkEmpresa: true
      })) {
        return;
      }
      const allowedRoles = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: "No autorizado para enviar esta cotizaci\xF3n" });
      }
      if (quotation.shippingHandledByJoper && quotation.shippingApprovalStatus === "pending") {
        return res.status(403).json({
          error: "Esta cotizaci\xF3n tiene un env\xEDo a cargo de la empresa pendiente de aprobaci\xF3n. Espera a que el administrador apruebe o rechace el env\xEDo antes de enviar la cotizaci\xF3n al cliente.",
          code: "SHIPPING_APPROVAL_PENDING"
        });
      }
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id)
      });
      const crypto = await import("crypto");
      const approvalToken = quotation.approvalToken || crypto.randomBytes(32).toString("hex");
      const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
      const { generateQuotationPDFStream: generateQuotationPDFStream2 } = await Promise.resolve().then(() => (init_quotation_pdf_generator(), quotation_pdf_generator_exports));
      const pdfStream = await generateQuotationPDFStream2({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
        tenant
      });
      let pdfPath;
      if (useLocalStorage4()) {
        pdfPath = await localStorageService.uploadQuotationPdfToStorage(
          pdfStream,
          quotation.folio,
          userId
        );
      } else {
        const objectStorageService = new ObjectStorageService();
        pdfPath = await objectStorageService.uploadQuotationPdfToStorage(
          pdfStream,
          quotation.folio,
          userId
        );
      }
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, { pdfPath, approvalToken });
      const recipients = [];
      if (emails && emails.length > 0) {
        for (const email of emails) {
          if (email && typeof email === "string" && email.includes("@") && !recipients.includes(email)) {
            recipients.push(email.trim().toLowerCase());
          }
        }
      } else {
        if (quotation.customer.email) {
          recipients.push(quotation.customer.email);
        }
      }
      if (recipients.length === 0) {
        return res.status(400).json({ error: "Debes agregar al menos un correo destinatario" });
      }
      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "https";
      const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;
      let emailSent = false;
      let emailError = null;
      try {
        const { sendQuotationEmail: sendQuotationEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
        await sendQuotationEmail2({
          to: recipients,
          quotationData: {
            folio: quotation.folio,
            customerName: quotation.customer.name,
            vendedorName: quotation.user.fullName,
            total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
            currency: quotation.currency || "MXN",
            validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("es-MX") : void 0,
            itemsCount: items.length
          },
          pdfPath,
          approvalUrl
        });
        emailSent = true;
      } catch (err) {
        console.warn("Email send failed, but continuing with approval link generation:", err.message || err);
        emailError = err.message || "Error del servicio de correo";
      }
      await scopedStorage.updateQuotation(id, {
        status: QuotationStatus.PENDING_APPROVAL,
        sentAt: /* @__PURE__ */ new Date(),
        sentMethod: emailSent ? "email" : "manual"
      });
      if (emailSent) {
        res.json({
          success: true,
          message: `Cotizaci\xF3n enviada a: ${recipients.join(", ")}. Esperando aprobaci\xF3n del cliente.`,
          recipients,
          approvalUrl
        });
      } else {
        res.json({
          success: true,
          message: `El correo no pudo enviarse, pero el enlace de aprobaci\xF3n est\xE1 listo. Copia y comparte el enlace con el cliente.`,
          approvalUrl,
          emailError,
          warning: "El servicio de correo tuvo problemas. Comparte el enlace manualmente."
        });
      }
    } catch (error) {
      console.error("Error sending quotation email:", error);
      res.status(500).json({ error: "Error al enviar el correo" });
    }
  });
  app2.get("/api/public/shipping-approval/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true }
      });
      if (!quotation) return res.status(404).json({ error: "Token de autorizaci\xF3n no v\xE1lido o ya expir\xF3" });
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, quotation.id)
      });
      const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
      const alreadyProcessed = quotation.shippingApprovalStatus !== "pending";
      const decision = quotation.shippingApprovalStatus === "approved" ? "approved" : quotation.shippingApprovalStatus === "rejected" ? "rejected" : void 0;
      res.json({
        id: quotation.id,
        folio: quotation.folio,
        currency: quotation.currency,
        total: quotation.total,
        shippingMethod: quotation.shippingMethod,
        shippingApprovalStatus: quotation.shippingApprovalStatus,
        alreadyProcessed,
        decision,
        rejectionReason: quotation.shippingRejectionReason,
        customer: quotation.customer ? { name: quotation.customer.name } : void 0,
        user: quotation.user ? { fullName: quotation.user.fullName || quotation.user.username } : void 0,
        itemsCount: items.length,
        tenantName: tenant?.name || "Nexxo Sistema Comercial"
      });
    } catch (error) {
      console.error("Error fetching public shipping approval:", error);
      res.status(500).json({ error: "Error al cargar la solicitud" });
    }
  });
  app2.post("/api/public/shipping-approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true }
      });
      if (!quotation) return res.status(404).json({ error: "Token no v\xE1lido" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotizaci\xF3n no tiene env\xEDo por Joper" });
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta solicitud ya fue procesada" });
      }
      await db.update(quotations).set({
        shippingApprovalStatus: "approved",
        shippingApprovedAt: /* @__PURE__ */ new Date(),
        status: QuotationStatus.SENT
      }).where(eq5(quotations.id, quotation.id));
      const cryptoMod = await import("crypto");
      const approvalTokenPublic = quotation.approvalToken || cryptoMod.randomBytes(32).toString("hex");
      if (!quotation.approvalToken) {
        await db.update(quotations).set({ approvalToken: approvalTokenPublic }).where(eq5(quotations.id, quotation.id));
      }
      (async () => {
        try {
          const approvalToken = approvalTokenPublic;
          const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
          const items = await db.query.quotationItems.findMany({
            where: eq5(quotationItems.quotationId, quotation.id)
          });
          const { generateQuotationPDFStream: generateQuotationPDFStream2 } = await Promise.resolve().then(() => (init_quotation_pdf_generator(), quotation_pdf_generator_exports));
          const pdfStream = await generateQuotationPDFStream2({
            quotation: { ...quotation, shippingApprovalStatus: "approved" },
            items,
            customer: quotation.customer,
            user: quotation.user,
            tenant
          });
          let pdfPath;
          if (useLocalStorage4()) {
            pdfPath = await localStorageService.uploadQuotationPdfToStorage(pdfStream, quotation.folio, "token-approval");
          } else {
            const objectStorageService = new ObjectStorageService();
            pdfPath = await objectStorageService.uploadQuotationPdfToStorage(pdfStream, quotation.folio, "token-approval");
          }
          await db.update(quotations).set({ pdfPath }).where(eq5(quotations.id, quotation.id));
          const recipients = [];
          if (quotation.customer?.email) recipients.push(quotation.customer.email);
          if (quotation.user?.email) recipients.push(quotation.user.email);
          if (recipients.length > 0) {
            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;
            const { sendQuotationEmail: sendQuotationEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            await sendQuotationEmail2({
              to: recipients,
              quotationData: {
                folio: quotation.folio,
                customerName: quotation.customer.name,
                vendedorName: quotation.user.fullName,
                total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: quotation.currency || "MXN",
                itemsCount: items.length
              },
              pdfPath,
              approvalUrl
            });
          }
        } catch (err) {
          console.warn("[PublicShippingApprove] PDF/email failed:", err.message || err);
        }
      })();
      console.log(`[PublicShippingApprove] Quotation ${quotation.folio} approved via email token`);
      res.json({ success: true, message: "Env\xEDo aprobado. La cotizaci\xF3n ser\xE1 enviada al cliente." });
    } catch (error) {
      console.error("Error in public shipping approve:", error);
      res.status(500).json({ error: "Error al aprobar el env\xEDo" });
    }
  });
  app2.post("/api/public/shipping-reject/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { reason } = req.body;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true }
      });
      if (!quotation) return res.status(404).json({ error: "Token no v\xE1lido" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotizaci\xF3n no tiene env\xEDo por Joper" });
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta solicitud ya fue procesada" });
      }
      await db.update(quotations).set({
        shippingApprovalStatus: "rejected",
        shippingRejectedAt: /* @__PURE__ */ new Date(),
        shippingRejectionReason: reason || "No se proporcion\xF3 motivo",
        status: QuotationStatus.DRAFT
      }).where(eq5(quotations.id, quotation.id));
      (async () => {
        try {
          if (quotation.user?.email) {
            const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
            const { sendShippingRejectionEmail: sendShippingRejectionEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            await sendShippingRejectionEmail2({
              sellerEmail: quotation.user.email,
              sellerName: quotation.user.fullName || quotation.user.username,
              quotationFolio: quotation.folio,
              customerName: quotation.customer?.name || "Cliente",
              rejectionReason: reason || "No se proporcion\xF3 motivo",
              tenantName: tenant?.name || "Nexxo Sistema Comercial"
            });
          }
        } catch (err) {
          console.warn("[PublicShippingReject] Seller notification failed:", err.message || err);
        }
      })();
      console.log(`[PublicShippingReject] Quotation ${quotation.folio} rejected via email token`);
      res.json({ success: true, message: "Env\xEDo rechazado. El vendedor ser\xE1 notificado." });
    } catch (error) {
      console.error("Error in public shipping reject:", error);
      res.status(500).json({ error: "Error al rechazar el env\xEDo" });
    }
  });
  app2.post("/api/quotations/:id/approve-shipping", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (!quotation.shippingHandledByJoper) {
        return res.status(400).json({ error: "Esta cotizaci\xF3n no tiene env\xEDo por cuenta de Joper" });
      }
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta cotizaci\xF3n no est\xE1 pendiente de aprobaci\xF3n de env\xEDo" });
      }
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, {
        shippingApprovalStatus: "approved",
        shippingApprovedBy: adminId,
        shippingApprovedAt: /* @__PURE__ */ new Date(),
        status: QuotationStatus.SENT
      });
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id)
      });
      const crypto = await import("crypto");
      const approvalToken = quotation.approvalToken || crypto.randomBytes(32).toString("hex");
      if (!quotation.approvalToken) {
        await scopedStorage.updateQuotation(id, { approvalToken });
      }
      try {
        const tenant = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
        const { generateQuotationPDFStream: generateQuotationPDFStream2 } = await Promise.resolve().then(() => (init_quotation_pdf_generator(), quotation_pdf_generator_exports));
        const pdfStream = await generateQuotationPDFStream2({
          quotation: { ...quotation, shippingApprovalStatus: "approved" },
          items,
          customer: quotation.customer,
          user: quotation.user,
          tenant
        });
        let pdfPath;
        if (useLocalStorage4()) {
          pdfPath = await localStorageService.uploadQuotationPdfToStorage(
            pdfStream,
            quotation.folio,
            adminId
          );
        } else {
          const objectStorageService = new ObjectStorageService();
          pdfPath = await objectStorageService.uploadQuotationPdfToStorage(
            pdfStream,
            quotation.folio,
            adminId
          );
        }
        await scopedStorage.updateQuotation(id, { pdfPath });
        const recipients = [];
        if (quotation.customer.email) recipients.push(quotation.customer.email);
        if (quotation.user.email) recipients.push(quotation.user.email);
        if (recipients.length > 0) {
          const host = req.get("host") || "localhost:5000";
          const protocol = req.protocol || "https";
          const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;
          try {
            const { sendQuotationEmail: sendQuotationEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            await sendQuotationEmail2({
              to: recipients,
              quotationData: {
                folio: quotation.folio,
                customerName: quotation.customer.name,
                vendedorName: quotation.user.fullName,
                total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: quotation.currency || "MXN",
                validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("es-MX") : void 0,
                itemsCount: items.length
              },
              pdfPath,
              approvalUrl
            });
          } catch (emailErr) {
            console.warn("Email send failed:", emailErr.message || emailErr);
          }
        }
      } catch (emailError) {
        console.warn("PDF/Email failed after shipping approval:", emailError.message || emailError);
      }
      res.json({
        success: true,
        message: "Env\xEDo gratuito aprobado. La cotizaci\xF3n ha sido enviada al cliente para su aprobaci\xF3n."
      });
    } catch (error) {
      console.error("Error approving shipping:", error);
      res.status(500).json({ error: "Error al aprobar el env\xEDo" });
    }
  });
  app2.post("/api/quotations/:id/reject-shipping", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (!quotation.shippingHandledByJoper) {
        return res.status(400).json({ error: "Esta cotizaci\xF3n no tiene env\xEDo por cuenta de Joper" });
      }
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta cotizaci\xF3n no est\xE1 pendiente de aprobaci\xF3n de env\xEDo" });
      }
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, {
        shippingApprovalStatus: "rejected",
        shippingRejectedBy: adminId,
        shippingRejectedAt: /* @__PURE__ */ new Date(),
        shippingRejectionReason: reason || "No se proporcion\xF3 motivo",
        status: QuotationStatus.DRAFT
        // Return to draft for vendor to modify
      });
      try {
        if (quotation.user?.email) {
          const tenantRecord = quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotation.tenantId) }) : null;
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";
          const { sendShippingRejectionEmail: sendShippingRejectionEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
          await sendShippingRejectionEmail2({
            sellerEmail: quotation.user.email,
            sellerName: quotation.user.fullName || quotation.user.username,
            quotationFolio: quotation.folio,
            customerName: quotation.customer?.name || "Cliente",
            rejectionReason: reason || "No se proporcion\xF3 motivo",
            tenantName
          });
        } else {
          console.warn(`Seller has no email \u2014 skipping rejection notification for quotation ${quotation.folio}`);
        }
      } catch (emailError) {
        console.warn("Email notification failed after shipping rejection:", emailError.message || emailError);
      }
      res.json({
        success: true,
        message: "Env\xEDo sin costo rechazado. Se ha notificado al vendedor."
      });
    } catch (error) {
      console.error("Error rejecting shipping:", error);
      res.status(500).json({ error: "Error al rechazar el env\xEDo" });
    }
  });
  app2.get("/api/credit-authorizations", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
      const quotationScope = tenantId ? restrictedEmpresaId ? and4(eq5(quotations.tenantId, tenantId), eq5(quotations.empresaId, restrictedEmpresaId)) : eq5(quotations.tenantId, tenantId) : void 0;
      const allAuths = await db.query.creditAuthorizations.findMany({
        where: quotationScope ? inArray2(
          creditAuthorizations.quotationId,
          db.select({ id: quotations.id }).from(quotations).where(quotationScope)
        ) : void 0,
        with: {
          quotation: {
            with: {
              customer: true
            }
          },
          user: true
        },
        orderBy: (creditAuthorizations2, { desc: desc3 }) => [desc3(creditAuthorizations2.createdAt)]
      });
      res.json(allAuths);
    } catch (error) {
      console.error("Error fetching credit authorizations:", error);
      res.status(500).json({ error: "Error fetching credit authorizations" });
    }
  });
  app2.post("/api/credit-authorizations", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertCreditAuthorizationSchema.parse({
        ...req.body,
        userId: req.user.id,
        status: CreditAuthStatus.PENDING
      });
      const auth = await scopedStorage.createCreditAuthorization(validated);
      res.status(201).json(auth);
      (async () => {
        try {
          const tenantId = req.user?.tenantId;
          if (!tenantId) return;
          const quotForAuth = auth.quotationId ? await db.query.quotations.findFirst({
            where: eq5(quotations.id, auth.quotationId),
            with: { customer: true, user: true }
          }) : null;
          const tenantRecord = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";
          const creditoUsers = await db.select({ email: users.email, fullName: users.fullName }).from(users).where(
            and4(
              eq5(users.tenantId, tenantId),
              eq5(users.role, UserRole.CREDITO_COBRANZA),
              eq5(users.active, true)
            )
          );
          if (creditoUsers.length === 0 || !quotForAuth) return;
          const rawCurrency = quotForAuth.currency;
          const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
          const totalDisplay = new Intl.NumberFormat("es-MX", { style: "currency", currency: safeCurrency }).format(parseFloat(quotForAuth.total || "0"));
          const fmt3 = (val) => val ? `$${parseFloat(val).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "$0.00";
          const { sendCreditAuthNewRequestEmail: sendCreditAuthNewRequestEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
          await sendCreditAuthNewRequestEmail2({
            quotationFolio: quotForAuth.folio,
            customerName: quotForAuth.customer?.name || "\u2014",
            quotationTotal: totalDisplay,
            vendedorName: quotForAuth.user?.fullName || "\u2014",
            creditAvailable: fmt3(auth.creditAvailable),
            creditUsed: fmt3(auth.creditUsed),
            overdueBalance: fmt3(auth.overdueBalance),
            tenantName,
            tenantSubdomain: tenantRecord?.subdomain || void 0,
            recipients: creditoUsers.filter((u) => u.email).map((u) => ({ email: u.email, name: u.fullName }))
          });
        } catch (err) {
          console.warn("[CreditAuth] New request notification email failed:", err);
        }
      })();
    } catch (error) {
      console.error("Error creating credit authorization:", error);
      res.status(400).json({ error: "Error creating credit authorization" });
    }
  });
  app2.patch("/api/credit-authorizations/:id", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, approvalSignature, rejectionNotes } = req.body;
      if (status === CreditAuthStatus.APPROVED && !approvalSignature) {
        return res.status(400).json({ error: "Se requiere firma digital para aprobar" });
      }
      const updateData = {
        status,
        notes
      };
      if (status === CreditAuthStatus.APPROVED) {
        updateData.authorizedAt = /* @__PURE__ */ new Date();
        updateData.approvedById = req.user.id;
        updateData.approvalSignature = approvalSignature;
        updateData.approvalSignedAt = /* @__PURE__ */ new Date();
      } else if (status === CreditAuthStatus.REJECTED) {
        updateData.rejectedById = req.user.id;
        updateData.rejectionNotes = rejectionNotes;
      }
      const scopedStorage = createTenantScopedStorage(req);
      const updatedAuth = await scopedStorage.updateCreditAuthorization(id, updateData);
      if (!updatedAuth) {
        return res.status(404).json({ error: "Credit authorization not found" });
      }
      let order = void 0;
      if (updatedAuth.status === CreditAuthStatus.APPROVED) {
        order = await scopedStorage.createOrder({
          quotationId: updatedAuth.quotationId,
          status: OrderStatus.PENDING
        });
        await scopedStorage.updateQuotation(updatedAuth.quotationId, {
          status: QuotationStatus.CONVERTED,
          authorizedBy: req.user.id,
          authorizedAt: /* @__PURE__ */ new Date(),
          convertedToOrderId: order.id
        });
        (async () => {
          try {
            const { sendOrderReleasePendingEmail: sendOrderReleasePendingEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            const quotForRelease = await db.query.quotations.findFirst({
              where: eq5(quotations.id, updatedAuth.quotationId),
              with: { customer: true, user: true }
            });
            if (!quotForRelease) return;
            const tenantRecord = quotForRelease.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, quotForRelease.tenantId) }) : null;
            const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";
            const adminUsers = quotForRelease.tenantId ? await db.select({ email: users.email, fullName: users.fullName }).from(users).where(and4(
              eq5(users.tenantId, quotForRelease.tenantId),
              sql5`${users.role} IN (${UserRole.ADMIN}, ${UserRole.VENTAS_LOGISTICA})`,
              eq5(users.active, true)
            )) : [];
            const rawCurrency = quotForRelease.currency;
            const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
            const totalDisplay = new Intl.NumberFormat("es-MX", { style: "currency", currency: safeCurrency }).format(parseFloat(quotForRelease.total || "0"));
            await sendOrderReleasePendingEmail2({
              orderFolio: quotForRelease.folio,
              customerName: quotForRelease.customer?.name || "\u2014",
              quotationTotal: totalDisplay,
              vendedorName: quotForRelease.user?.fullName || "\u2014",
              tenantName,
              tenantSubdomain: tenantRecord?.subdomain || void 0,
              adminRecipients: adminUsers.filter((u) => u.email).map((u) => ({ email: u.email, name: u.fullName }))
            });
          } catch (err) {
            console.warn("[OrderRelease] Pending notification email failed:", err);
          }
        })();
      }
      try {
        const authWithDetails = await db.query.creditAuthorizations.findFirst({
          where: eq5(creditAuthorizations.id, id),
          with: {
            quotation: {
              with: {
                customer: true,
                user: true
              }
            }
          }
        });
        if (authWithDetails?.quotation) {
          const q = authWithDetails.quotation;
          const tenantId = q.tenantId;
          const tenantRecord = tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) }) : null;
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";
          const adminUsers = tenantId ? await db.select({ email: users.email, fullName: users.fullName }).from(users).where(
            and4(
              eq5(users.tenantId, tenantId),
              eq5(users.role, UserRole.ADMIN),
              eq5(users.active, true)
            )
          ) : [];
          const creditoUsers = tenantId ? await db.select({ email: users.email, fullName: users.fullName }).from(users).where(
            and4(
              eq5(users.tenantId, tenantId),
              eq5(users.role, UserRole.CREDITO_COBRANZA),
              eq5(users.active, true)
            )
          ) : [];
          const emailMap = /* @__PURE__ */ new Map();
          if (q.user?.email) emailMap.set(q.user.email, q.user.fullName || q.user.username);
          if (q.customer?.email) emailMap.set(q.customer.email, q.customer.name);
          for (const admin of adminUsers) {
            if (admin.email) emailMap.set(admin.email, admin.fullName);
          }
          for (const cu of creditoUsers) {
            if (cu.email) emailMap.set(cu.email, cu.fullName);
          }
          const totalVal = parseFloat(q.total || "0");
          const totalDisplay = `$${totalVal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
          const recipientList = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
          const { sendCreditAuthStatusEmail: sendCreditAuthStatusEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
          await sendCreditAuthStatusEmail2({
            status: updatedAuth.status === CreditAuthStatus.APPROVED ? "approved" : "rejected",
            quotationFolio: q.folio,
            customerName: q.customer?.name || "Cliente",
            quotationTotal: totalDisplay,
            rejectionNotes,
            tenantName,
            recipients: recipientList
          });
        }
      } catch (emailError) {
        console.warn("Email notification failed for credit auth:", emailError.message || emailError);
      }
      if (order) return res.json({ ...updatedAuth, order });
      res.json(updatedAuth);
    } catch (error) {
      console.error("Error updating credit authorization:", error);
      res.status(500).json({ error: "Error updating credit authorization" });
    }
  });
  app2.get("/api/credit-authorizations/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const comments = await db.query.creditAuthorizationComments.findMany({
        where: eq5(creditAuthorizationComments.creditAuthorizationId, id),
        with: {
          user: true
        },
        orderBy: (comments2, { desc: desc3 }) => [desc3(comments2.createdAt)]
      });
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Error fetching comments" });
    }
  });
  app2.post("/api/credit-authorizations/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "El contenido del comentario es requerido" });
      }
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const [comment] = await db.insert(creditAuthorizationComments).values({
        creditAuthorizationId: id,
        userId: req.user.id,
        content: content.trim()
      }).returning();
      const commentWithUser = await db.query.creditAuthorizationComments.findFirst({
        where: eq5(creditAuthorizationComments.id, comment.id),
        with: {
          user: true
        }
      });
      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Error adding comment" });
    }
  });
  app2.get("/api/credit-authorizations/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq5(creditAuthorizations.id, id),
        with: {
          quotation: {
            with: {
              customer: true
            }
          },
          user: true
        }
      });
      if (!auth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      let approvedBy = null;
      if (auth.approvedById) {
        approvedBy = await db.query.users.findFirst({
          where: eq5(users.id, auth.approvedById)
        });
      }
      const tenantForPdf = auth.quotation.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, auth.quotation.tenantId) }) : null;
      const { generateCreditAuthPDFStream: generateCreditAuthPDFStream2 } = await Promise.resolve().then(() => (init_credit_auth_pdf_generator(), credit_auth_pdf_generator_exports));
      const pdfStream = await generateCreditAuthPDFStream2({
        authorization: auth,
        quotation: auth.quotation,
        customer: auth.quotation.customer,
        requestedBy: auth.user,
        approvedBy,
        tenant: tenantForPdf
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="autorizacion-credito-${auth.quotation.folio}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating credit authorization PDF:", error);
      res.status(500).json({ error: "Error al generar el PDF" });
    }
  });
  app2.put("/api/credit-authorizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, creditAvailable, creditUsed, overdueBalance } = req.body;
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq5(creditAuthorizations.id, id)
      });
      if (!auth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      if (auth.status !== CreditAuthStatus.PENDING) {
        return res.status(400).json({ error: "Solo se pueden editar autorizaciones pendientes" });
      }
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.CREDITO_COBRANZA && req.user.id !== auth.userId) {
        return res.status(403).json({ error: "No tiene permisos para editar esta autorizaci\xF3n" });
      }
      const [updated] = await db.update(creditAuthorizations).set({
        notes,
        creditAvailable,
        creditUsed,
        overdueBalance,
        lastEditedById: req.user.id,
        lastEditedAt: /* @__PURE__ */ new Date()
      }).where(eq5(creditAuthorizations.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating credit authorization:", error);
      res.status(500).json({ error: "Error updating credit authorization" });
    }
  });
  app2.get("/api/credit-authorizations/:id/analyze-rules", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq5(creditAuthorizations.id, id),
        with: {
          quotation: {
            with: {
              customer: true
            }
          },
          user: true
        }
      });
      if (!auth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const customer = auth.quotation.customer;
      const quotation = auth.quotation;
      const customerInvoices = await db.query.invoices.findMany({
        where: eq5(invoices.customerId, customer.id),
        orderBy: (invoices2, { desc: desc3 }) => [desc3(invoices2.issuedAt)],
        limit: 50
      });
      const customerPayments = await db.query.payments.findMany({
        where: eq5(payments.customerId, customer.id),
        orderBy: (payments2, { desc: desc3 }) => [desc3(payments2.paymentDate)],
        limit: 50
      });
      const totalInvoices = customerInvoices.length;
      const overdueInvoices = customerInvoices.filter(
        (inv) => inv.dueDate && new Date(inv.dueDate) < /* @__PURE__ */ new Date() && parseFloat(inv.balanceDue || "0") > 0
      );
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || "0"), 0);
      const totalPaid = customerPayments.reduce((sum, pay) => sum + parseFloat(pay.amount || "0"), 0);
      const paidInvoices = customerInvoices.filter((inv) => parseFloat(inv.balanceDue || "0") === 0);
      const creditLimit = parseFloat(customer.creditLimit || "0");
      const creditUsed = parseFloat(auth.creditUsed || "0");
      const creditAvailable = parseFloat(auth.creditAvailable || "0");
      const quotationTotal = parseFloat(quotation.total || "0");
      let score = 100;
      const positiveFactors = [];
      const negativeFactors = [];
      const conditions = [];
      const exceedsCreditLimit = quotationTotal > creditAvailable;
      if (exceedsCreditLimit) {
        score -= 30;
        negativeFactors.push(`El monto ($${quotationTotal.toLocaleString("es-MX")}) excede el cr\xE9dito disponible ($${creditAvailable.toLocaleString("es-MX")})`);
        conditions.push("Solicitar anticipo o pago parcial");
      } else {
        positiveFactors.push("El monto est\xE1 dentro del l\xEDmite de cr\xE9dito disponible");
      }
      const hasOverdueBalance = overdueAmount > 0;
      if (hasOverdueBalance) {
        score -= 25;
        negativeFactors.push(`Tiene ${overdueInvoices.length} factura(s) vencida(s) por $${overdueAmount.toLocaleString("es-MX")}`);
        conditions.push("Regularizar saldos vencidos antes de autorizar");
      } else if (totalInvoices > 0) {
        positiveFactors.push("Sin facturas vencidas");
      }
      const creditUtilization = creditLimit > 0 ? creditUsed / creditLimit * 100 : 0;
      if (creditUtilization > 80) {
        score -= 15;
        negativeFactors.push(`Alta utilizaci\xF3n de cr\xE9dito (${creditUtilization.toFixed(1)}%)`);
        conditions.push("Considerar aumentar l\xEDmite de cr\xE9dito");
      } else if (creditUtilization > 50) {
        score -= 5;
        negativeFactors.push(`Utilizaci\xF3n de cr\xE9dito moderada (${creditUtilization.toFixed(1)}%)`);
      } else if (creditLimit > 0) {
        positiveFactors.push(`Baja utilizaci\xF3n de cr\xE9dito (${creditUtilization.toFixed(1)}%)`);
      }
      if (paidInvoices.length >= 3) {
        positiveFactors.push(`Historial de pago con ${paidInvoices.length} facturas liquidadas`);
        score = Math.min(100, score + 10);
      } else if (totalInvoices === 0) {
        negativeFactors.push("Sin historial de cr\xE9dito previo");
        score -= 10;
        conditions.push("Considerar cr\xE9dito reducido para primera compra");
      }
      if (quotation.customerApprovedAt) {
        positiveFactors.push("Cotizaci\xF3n aprobada formalmente por el cliente");
        score = Math.min(100, score + 5);
      }
      const recentPayments = customerPayments.filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        const thirtyDaysAgo = /* @__PURE__ */ new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return paymentDate >= thirtyDaysAgo;
      });
      if (recentPayments.length > 0) {
        positiveFactors.push(`${recentPayments.length} pago(s) registrado(s) en los \xFAltimos 30 d\xEDas`);
        score = Math.min(100, score + 5);
      }
      score = Math.max(0, Math.min(100, score));
      let riskLevel;
      let recommendation;
      if (score >= 80) {
        riskLevel = "bajo";
        recommendation = "aprobar";
      } else if (score >= 60) {
        riskLevel = "medio";
        recommendation = conditions.length > 0 ? "aprobar_con_condiciones" : "aprobar";
      } else if (score >= 40) {
        riskLevel = "alto";
        recommendation = "revisar_manualmente";
      } else {
        riskLevel = "muy_alto";
        recommendation = "rechazar";
      }
      let summary = "";
      if (recommendation === "aprobar") {
        summary = `Cliente con buen perfil crediticio. Score ${score}/100 indica bajo riesgo.`;
      } else if (recommendation === "aprobar_con_condiciones") {
        summary = `Se puede aprobar con condiciones. Score ${score}/100 indica riesgo moderado.`;
      } else if (recommendation === "revisar_manualmente") {
        summary = `Requiere revisi\xF3n manual. Score ${score}/100 indica factores de riesgo importantes.`;
      } else {
        summary = `Se recomienda rechazar. Score ${score}/100 indica alto riesgo de incumplimiento.`;
      }
      const analysis = {
        riskLevel,
        recommendation,
        score,
        summary,
        factors: {
          positive: positiveFactors,
          negative: negativeFactors
        },
        conditions,
        reasoning: `An\xE1lisis autom\xE1tico basado en: l\xEDmite de cr\xE9dito, saldos vencidos, utilizaci\xF3n de cr\xE9dito, e historial de pagos.`
      };
      const analysisContext = {
        customer: {
          name: customer.name,
          rfc: customer.rfc,
          creditLimit,
          creditUsed,
          creditAvailable,
          paymentTerms: customer.paymentTerms || "Contado",
          createdAt: customer.createdAt
        },
        quotation: {
          folio: quotation.folio,
          total: quotationTotal,
          validUntil: quotation.validUntil,
          customerApprovedAt: quotation.customerApprovedAt
        },
        history: {
          totalInvoices,
          overdueInvoicesCount: overdueInvoices.length,
          overdueAmount,
          totalPaid,
          recentPaymentsCount: customerPayments.length
        },
        analysis: {
          exceedsCreditLimit,
          creditUtilization: creditUtilization.toFixed(1),
          hasOverdueBalance
        }
      };
      res.json({
        success: true,
        analysis,
        context: analysisContext,
        type: "rules"
      });
    } catch (error) {
      console.error("Error in rule-based credit analysis:", error);
      res.status(500).json({ error: "Error al analizar la solicitud de cr\xE9dito" });
    }
  });
  app2.post("/api/credit-authorizations/:id/analyze", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq5(creditAuthorizations.id, id),
        with: {
          quotation: {
            with: {
              customer: true
            }
          },
          user: true
        }
      });
      if (!auth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const scopedAuth = await createTenantScopedStorage(req).getCreditAuthorization(id);
      if (!scopedAuth) {
        return res.status(404).json({ error: "Autorizaci\xF3n no encontrada" });
      }
      const customer = auth.quotation.customer;
      const quotation = auth.quotation;
      const customerInvoices = await db.query.invoices.findMany({
        where: eq5(invoices.customerId, customer.id),
        orderBy: (invoices2, { desc: desc3 }) => [desc3(invoices2.issuedAt)],
        limit: 20
      });
      const customerPayments = await db.query.payments.findMany({
        where: eq5(payments.customerId, customer.id),
        orderBy: (payments2, { desc: desc3 }) => [desc3(payments2.paymentDate)],
        limit: 20
      });
      const totalInvoices = customerInvoices.length;
      const overdueInvoices = customerInvoices.filter(
        (inv) => inv.dueDate && new Date(inv.dueDate) < /* @__PURE__ */ new Date() && parseFloat(inv.balanceDue || "0") > 0
      );
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || "0"), 0);
      const totalPaid = customerPayments.reduce((sum, pay) => sum + parseFloat(pay.amount || "0"), 0);
      const creditLimit = parseFloat(customer.creditLimit || "0");
      const creditUsed = parseFloat(auth.creditUsed || "0");
      const creditAvailable = parseFloat(auth.creditAvailable || "0");
      const quotationTotal = parseFloat(quotation.total || "0");
      const analysisContext = {
        customer: {
          name: customer.name,
          rfc: customer.rfc,
          creditLimit,
          creditUsed,
          creditAvailable,
          paymentTerms: customer.paymentTerms || "Contado",
          createdAt: customer.createdAt
        },
        quotation: {
          folio: quotation.folio,
          total: quotationTotal,
          validUntil: quotation.validUntil,
          customerApprovedAt: quotation.customerApprovedAt
        },
        history: {
          totalInvoices,
          overdueInvoicesCount: overdueInvoices.length,
          overdueAmount,
          totalPaid,
          recentPaymentsCount: customerPayments.length
        },
        analysis: {
          exceedsCreditLimit: quotationTotal > creditAvailable,
          creditUtilization: creditLimit > 0 ? (creditUsed / creditLimit * 100).toFixed(1) : "N/A",
          hasOverdueBalance: overdueAmount > 0
        }
      };
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      });
      const prompt = `Eres un analista de cr\xE9dito experto para una empresa comercial mexicana. Analiza la siguiente solicitud de autorizaci\xF3n de cr\xE9dito y proporciona una evaluaci\xF3n detallada con recomendaci\xF3n.

DATOS DEL CLIENTE:
- Nombre: ${analysisContext.customer.name}
- RFC: ${analysisContext.customer.rfc}
- L\xEDmite de cr\xE9dito: $${creditLimit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Cr\xE9dito utilizado: $${creditUsed.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Cr\xE9dito disponible: $${creditAvailable.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Condiciones de pago: ${analysisContext.customer.paymentTerms}
- Cliente desde: ${format(new Date(analysisContext.customer.createdAt), "PP", { locale: es })}

COTIZACI\xD3N SOLICITADA:
- Folio: ${analysisContext.quotation.folio}
- Monto: $${quotationTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Aprobada por cliente: ${analysisContext.quotation.customerApprovedAt ? "S\xED" : "No"}

HISTORIAL:
- Total de facturas: ${totalInvoices}
- Facturas vencidas: ${overdueInvoices.length}
- Monto vencido: $${overdueAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Total pagado hist\xF3ricamente: $${totalPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}

AN\xC1LISIS PRELIMINAR:
- Excede l\xEDmite de cr\xE9dito: ${analysisContext.analysis.exceedsCreditLimit ? "S\xCD" : "NO"}
- Utilizaci\xF3n del cr\xE9dito: ${analysisContext.analysis.creditUtilization}%
- Tiene saldo vencido: ${analysisContext.analysis.hasOverdueBalance ? "S\xCD" : "NO"}

Proporciona tu an\xE1lisis en el siguiente formato JSON:
{
  "riskLevel": "bajo|medio|alto|muy_alto",
  "recommendation": "aprobar|aprobar_con_condiciones|rechazar|revisar_manualmente",
  "score": (n\xFAmero del 0 al 100 indicando la probabilidad de pago),
  "summary": "Resumen ejecutivo de 2-3 oraciones",
  "factors": {
    "positive": ["lista de factores positivos"],
    "negative": ["lista de factores negativos"]
  },
  "conditions": ["condiciones recomendadas si aplica"],
  "reasoning": "Explicaci\xF3n detallada del an\xE1lisis"
}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un analista de cr\xE9dito experto. Responde \xFAnicamente con JSON v\xE1lido, sin markdown ni texto adicional."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1e3
      });
      const responseText = completion.choices[0]?.message?.content || "";
      let analysis;
      try {
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError, responseText);
        analysis = {
          riskLevel: "revisar",
          recommendation: "revisar_manualmente",
          score: 50,
          summary: "No se pudo completar el an\xE1lisis autom\xE1tico. Se requiere revisi\xF3n manual.",
          factors: { positive: [], negative: ["Error en an\xE1lisis autom\xE1tico"] },
          conditions: [],
          reasoning: responseText
        };
      }
      res.json({
        success: true,
        analysis,
        context: analysisContext
      });
    } catch (error) {
      console.error("Error analyzing credit authorization:", error);
      res.status(500).json({ error: "Error al analizar la solicitud de cr\xE9dito" });
    }
  });
  app2.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allOrders = await scopedStorage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });
  app2.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertOrderSchema.parse({
        ...req.body,
        status: OrderStatus.PENDING
      });
      const order = await scopedStorage.createOrder(validated);
      await scopedStorage.updateQuotation(validated.quotationId, {
        status: QuotationStatus.CONVERTED
      });
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Error creating order" });
    }
  });
  app2.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const updateData = { ...req.body };
      delete updateData.empresaId;
      if (updateData.status === OrderStatus.CLOSED || updateData.status === OrderStatus.CANCELLED) {
        return res.status(403).json({ error: "Usa la opci\xF3n de Cerrar o Cancelar pedido (solo administradores)" });
      }
      if (updateData.estimatedDelivery) {
        updateData.estimatedDelivery = new Date(updateData.estimatedDelivery);
      }
      const updatedOrder = await scopedStorage.updateOrder(id, {
        ...updateData,
        lastUpdatedBy: req.user.id,
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Error updating order" });
    }
  });
  app2.post("/api/orders/:id/cancel", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      const existing = await scopedStorage.getOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existing.status === OrderStatus.CANCELLED) {
        return res.status(400).json({ error: "El pedido ya est\xE1 cancelado" });
      }
      const stamp = format(/* @__PURE__ */ new Date(), "dd/MM/yyyy");
      const cancelNote = `[Cancelado ${stamp} por ${req.user.fullName || req.user.username}]${reason ? ` ${reason}` : ""}`;
      const factoryNotes = existing.factoryNotes ? `${existing.factoryNotes}
${cancelNote}` : cancelNote;
      const updatedOrder = await scopedStorage.updateOrder(id, {
        status: OrderStatus.CANCELLED,
        factoryNotes,
        lastUpdatedBy: req.user.id,
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(updatedOrder);
      if (existing.tenantId) {
        const cancelledByName = req.user.fullName || req.user.username;
        const protocol = req.protocol || "https";
        const host = req.get("host") || "localhost:5000";
        (async () => {
          try {
            const adminUsers = await db.query.users.findMany({
              where: and4(
                eq5(users.tenantId, existing.tenantId),
                eq5(users.role, UserRole.ADMIN)
              )
            });
            const adminEmails = adminUsers.filter((u) => u.email && u.email.includes("@")).map((u) => ({ email: u.email, name: u.fullName || u.username }));
            if (adminEmails.length === 0) {
              console.warn(`[CancelEmail] No admin emails found for tenant ${existing.tenantId}`);
              return;
            }
            const quotation = await db.query.quotations.findFirst({
              where: eq5(quotations.id, existing.quotationId)
            });
            const customer = quotation ? await db.query.customers.findFirst({ where: eq5(customers.id, quotation.customerId) }) : void 0;
            const tenant = await db.query.tenants.findFirst({
              where: eq5(tenants.id, existing.tenantId)
            });
            const { sendOrderCancellationEmail: sendOrderCancellationEmail2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
            await sendOrderCancellationEmail2({
              to: adminEmails,
              orderData: {
                folio: quotation?.folio || existing.id,
                customerName: customer?.name || "Cliente",
                cancelledBy: cancelledByName,
                cancelDate: stamp,
                reason
              },
              orderUrl: `${protocol}://${host}/orders`,
              tenantName: tenant?.name || "Nexxo"
            });
          } catch (emailErr) {
            console.error("[CancelEmail] Notification failed:", emailErr?.message || emailErr);
          }
        })();
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ error: "Error cancelling order" });
    }
  });
  app2.post("/api/orders/:id/close", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const existing = await scopedStorage.getOrder(id);
      if (!existing) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (existing.status === OrderStatus.CLOSED) {
        return res.status(400).json({ error: "El pedido ya est\xE1 cerrado" });
      }
      if (existing.status === OrderStatus.CANCELLED) {
        return res.status(400).json({ error: "No se puede cerrar un pedido cancelado" });
      }
      if (existing.status !== OrderStatus.SHIPPED && existing.status !== OrderStatus.DELIVERED) {
        return res.status(400).json({ error: "Solo se pueden cerrar pedidos embarcados o entregados" });
      }
      const stamp = format(/* @__PURE__ */ new Date(), "dd/MM/yyyy");
      const closeNote = `[Cerrado ${stamp} por ${req.user.fullName || req.user.username}]`;
      const factoryNotes = existing.factoryNotes ? `${existing.factoryNotes}
${closeNote}` : closeNote;
      const updatedOrder = await scopedStorage.updateOrder(id, {
        status: OrderStatus.CLOSED,
        factoryNotes,
        lastUpdatedBy: req.user.id,
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error closing order:", error);
      res.status(500).json({ error: "Error closing order" });
    }
  });
  app2.get("/api/orders/:id/details", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await db.query.orders.findFirst({
        where: eq5(orders.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
              items: {
                with: {
                  product: true
                }
              }
            }
          }
        }
      });
      if (!assertTenantScope(req, res, order, {
        notFoundMessage: "Order not found",
        forbiddenMessage: "No autorizado para acceder a este pedido",
        checkEmpresa: true
      })) {
        return;
      }
      const scopedStorage = createTenantScopedStorage(req);
      const releases = await scopedStorage.getOrderReleases(id);
      res.json({ ...order, releases });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Error fetching order details" });
    }
  });
  app2.get("/api/orders/:id/releases", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const releases = await scopedStorage.getOrderReleases(id);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching order releases:", error);
      res.status(500).json({ error: "Error fetching order releases" });
    }
  });
  app2.post("/api/orders/:id/releases", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.EMBARQUES), async (req, res) => {
    try {
      const { id } = req.params;
      const { createInvoice, createShipment, shipmentData, ...releaseData } = req.body;
      if (createShipment && shipmentData) {
        const validTransportTypes = ["propio", "paqueteria"];
        if (shipmentData.transportType && !validTransportTypes.includes(shipmentData.transportType)) {
          return res.status(400).json({ error: "Tipo de transporte inv\xE1lido. Debe ser 'propio' o 'paqueteria'" });
        }
      }
      const order = await db.query.orders.findFirst({
        where: eq5(orders.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
              items: {
                with: {
                  product: true
                }
              }
            }
          }
        }
      });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const quotationItem = order.quotation.items.find((i) => i.id === releaseData.quotationItemId);
      if (!quotationItem) {
        return res.status(400).json({ error: "Producto no encontrado en la cotizaci\xF3n" });
      }
      const quantityToRelease = Number(releaseData.quantityReleased);
      if (isNaN(quantityToRelease) || quantityToRelease <= 0) {
        return res.status(400).json({ error: "Cantidad inv\xE1lida" });
      }
      insertOrderReleaseSchema.parse({
        quotationItemId: releaseData.quotationItemId,
        quantityReleased: String(releaseData.quantityReleased),
        orderId: id,
        releasedById: req.user.id,
        notes: releaseData.notes
      });
      const scopedStorage = createTenantScopedStorage(req);
      let invoiceId;
      let shipmentId;
      if (createInvoice) {
        const unitPrice = Number(quotationItem.unitPrice);
        const subtotal = unitPrice * quantityToRelease;
        const customerRfc = order.quotation.customer?.rfc ?? "";
        const isForeignCustomer = customerRfc === "XEXX010101000";
        const itemTaxRate = isForeignCustomer ? 0 : Number(quotationItem.taxRate ?? 16) / 100;
        const tax = subtotal * itemTaxRate;
        const total = subtotal + tax;
        const invoice = await scopedStorage.createInvoice({
          orderId: id,
          customerId: order.quotation.customerId,
          serie: "A",
          folio: `INV-${Date.now()}`,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          balanceDue: total.toFixed(2),
          currency: "MXN"
        });
        invoiceId = invoice.id;
      }
      if (createShipment && shipmentData) {
        const shipment = await scopedStorage.createShipment({
          orderId: id,
          transporter: shipmentData.transporter || "Por definir",
          transportType: shipmentData.transportType || "propio",
          trackingNumber: shipmentData.trackingNumber,
          driverName: shipmentData.driverName,
          vehiclePlates: shipmentData.vehiclePlates
        });
        shipmentId = shipment.id;
      }
      const release = await scopedStorage.createOrderRelease({
        quotationItemId: releaseData.quotationItemId,
        quantityReleased: String(releaseData.quantityReleased),
        orderId: id,
        releasedById: req.user.id,
        notes: releaseData.notes,
        invoiceId,
        shipmentId
      });
      const quotationItemsResult = order.quotation.items;
      const allReleases = await scopedStorage.getOrderReleases(id);
      const releasedByItem = {};
      for (const rel of allReleases) {
        releasedByItem[rel.quotationItemId] = (releasedByItem[rel.quotationItemId] || 0) + Number(rel.quantityReleased);
      }
      let allFullyReleased = true;
      let someReleased = false;
      for (const item of quotationItemsResult) {
        const released = releasedByItem[item.id] || 0;
        const quantity = Number(item.quantity);
        if (released > 0) someReleased = true;
        if (released < quantity) allFullyReleased = false;
      }
      if (allFullyReleased) {
        await scopedStorage.updateOrder(id, { status: OrderStatus.SHIPPED });
      } else if (someReleased) {
        await scopedStorage.updateOrder(id, { status: OrderStatus.PARTIALLY_RELEASED });
      }
      res.status(201).json({ release, invoiceId, shipmentId });
    } catch (error) {
      console.error("Error creating order release:", error);
      res.status(400).json({ error: error.message || "Error creating order release" });
    }
  });
  app2.get("/api/order-release", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { status } = req.query;
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const orderRows = await db.query.orders.findMany({
        where: resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0,
        with: {
          quotation: {
            with: {
              customer: true,
              items: true,
              user: true
            }
          }
        },
        orderBy: (o, { desc: desc3 }) => [desc3(o.createdAt)]
      });
      const allShipments = await db.query.shipments.findMany({
        where: resolvedTenantId ? eq5(shipments.tenantId, resolvedTenantId) : void 0
      });
      const shipmentByOrder = new Map(allShipments.map((s) => [s.orderId, s]));
      const allCreditAuths = await db.query.creditAuthorizations.findMany({
        where: resolvedTenantId ? sql5`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${resolvedTenantId})` : void 0
      });
      const creditAuthByQuotation = new Map(allCreditAuths.map((c) => [c.quotationId, c]));
      const releasedByIds = [...new Set(orderRows.map((o) => o.releasedById).filter(Boolean))];
      const releasedByUsers = releasedByIds.length > 0 ? await db.query.users.findMany({ where: sql5`${users.id} = ANY(${sql5.raw(`ARRAY['${releasedByIds.join("','")}']::varchar[]`)})` }) : [];
      const releasedByMap = new Map(releasedByUsers.map((u) => [u.id, u]));
      let filtered = orderRows;
      if (status === "pending") {
        filtered = orderRows.filter((o) => o.releaseStatus === "pending");
      } else if (status === "history") {
        filtered = orderRows.filter((o) => o.releaseStatus === "approved" || o.releaseStatus === "rejected" || o.releaseStatus === "closed");
      }
      const releaseEmpresaMap = /* @__PURE__ */ new Map();
      {
        const empresaRows = await db.select({ id: empresas.id, name: empresas.name }).from(empresas).where(resolvedTenantId ? eq5(empresas.tenantId, resolvedTenantId) : void 0);
        empresaRows.forEach((e) => releaseEmpresaMap.set(e.id, e.name));
      }
      const result = filtered.map((o) => {
        const shipment = shipmentByOrder.get(o.id);
        const creditAuth = creditAuthByQuotation.get(o.quotationId);
        const releasedBy = o.releasedById ? releasedByMap.get(o.releasedById) : null;
        const quotation = o.quotation;
        const vendedor = quotation?.user;
        const rawCurrency = quotation?.currency;
        const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
        return {
          id: o.id,
          folio: quotation?.folio || o.id.substring(0, 8),
          empresaId: o.empresaId ?? null,
          empresaName: o.empresaId ? releaseEmpresaMap.get(o.empresaId) ?? null : null,
          customerName: quotation?.customer?.name || "\u2014",
          customerRfc: quotation?.customer?.rfc || null,
          vendedorName: vendedor?.fullName || "\u2014",
          vendedorEmail: vendedor?.email || null,
          purchaseOrder: quotation?.purchaseOrder || null,
          quotationTotal: quotation?.total || "0",
          currency: safeCurrency,
          creditReleaseDate: creditAuth?.authorizedAt || null,
          shippingDate: shipment?.shippedAt || null,
          notes: quotation?.notes || null,
          releaseStatus: o.releaseStatus,
          releaseNotes: o.releaseNotes || null,
          releasedAt: o.releasedAt || null,
          releasedByName: releasedBy?.fullName || null,
          createdAt: o.createdAt,
          paymentTerms: quotation?.paymentTerms || null,
          deliveryTime: quotation?.deliveryTime || null,
          conditions: quotation?.conditions || null,
          subtotal: quotation?.subtotal || "0",
          globalDiscount: quotation?.globalDiscount || "0",
          tax: quotation?.tax || "0",
          exchangeRate: quotation?.exchangeRate || null,
          shippingHandledByJoper: quotation?.shippingHandledByJoper || false,
          shippingMethod: quotation?.shippingMethod || null,
          shippingCost: quotation?.shippingCost || "0",
          quotationId: o.quotationId,
          items: (quotation?.items || []).map((item) => ({
            id: item.id,
            productCode: item.productCode || null,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice || "0",
            discountPercent: item.discountPercent || "0",
            subtotal: item.subtotal || "0",
            currency: item.currency || safeCurrency
          }))
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching order release list:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });
  app2.post("/api/order-release/:id/approve", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const order = await db.query.orders.findFirst({
        where: and4(eq5(orders.id, id), resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0),
        with: {
          quotation: {
            with: { customer: true, user: true }
          }
        }
      });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Order is not pending release" });
      const { releaseNotes: approveNotes } = req.body;
      await db.update(orders).set({
        releaseStatus: OrderReleaseStatus.APPROVED,
        releasedById: req.user.id,
        releasedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        ...approveNotes?.trim() && { releaseNotes: approveNotes.trim() }
      }).where(eq5(orders.id, id));
      const ADVANCED_STATUSES = [
        OrderStatus.IN_PRODUCTION,
        OrderStatus.READY,
        OrderStatus.PARTIALLY_RELEASED,
        OrderStatus.RELEASED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED
      ];
      const skipEmail = ADVANCED_STATUSES.includes(order.status);
      if (!skipEmail) {
        (async () => {
          try {
            const { sendOrderReleaseEmail: sendOrderReleaseEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
            const quotation = order.quotation;
            const tenantName = req.tenant?.name || "Sistema Comercial";
            const releasedByName = req.user.fullName;
            const allUsers = await db.query.users.findMany({
              where: resolvedTenantId ? eq5(users.tenantId, resolvedTenantId) : void 0
            });
            const recipients = allUsers.filter((u) => [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA].includes(u.role) || u.id === quotation?.userId).filter((u) => u.email).map((u) => ({ email: u.email, name: u.fullName }));
            const vendedorEmail = quotation?.user?.email;
            const vendedorName = quotation?.user?.fullName;
            if (vendedorEmail && !recipients.find((r) => r.email === vendedorEmail)) {
              recipients.push({ email: vendedorEmail, name: vendedorName || "Vendedor" });
            }
            const uniqueRecipients = [...new Map(recipients.map((r) => [r.email, r])).values()];
            const total = new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: quotation?.currency || "MXN"
            }).format(parseFloat(quotation?.total || "0"));
            await sendOrderReleaseEmail2({
              status: "approved",
              orderFolio: quotation?.folio || id,
              customerName: quotation?.customer?.name || "\u2014",
              quotationTotal: total,
              tenantName,
              releasedByName,
              recipients: uniqueRecipients
            });
          } catch (emailErr) {
            console.warn("[OrderRelease] Approve email failed:", emailErr);
          }
        })();
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving order release:", error);
      res.status(500).json({ error: "Error approving order release" });
    }
  });
  app2.post("/api/order-release/:id/reject", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { releaseNotes } = req.body;
      if (!releaseNotes?.trim()) return res.status(400).json({ error: "Motivo de rechazo requerido" });
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const order = await db.query.orders.findFirst({
        where: and4(eq5(orders.id, id), resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0),
        with: {
          quotation: {
            with: { customer: true, user: true }
          }
        }
      });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Order is not pending release" });
      await db.update(orders).set({
        releaseStatus: OrderReleaseStatus.REJECTED,
        releaseNotes: releaseNotes.trim(),
        releasedById: req.user.id,
        releasedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(orders.id, id));
      (async () => {
        try {
          const { sendOrderReleaseEmail: sendOrderReleaseEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
          const quotation = order.quotation;
          const tenantName = req.tenant?.name || "Sistema Comercial";
          const releasedByName = req.user.fullName;
          const allUsers = await db.query.users.findMany({
            where: resolvedTenantId ? eq5(users.tenantId, resolvedTenantId) : void 0
          });
          const recipients = allUsers.filter((u) => [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA].includes(u.role) || u.id === quotation?.userId).filter((u) => u.email).map((u) => ({ email: u.email, name: u.fullName }));
          const vendedorEmail = quotation?.user?.email;
          const vendedorName = quotation?.user?.fullName;
          if (vendedorEmail && !recipients.find((r) => r.email === vendedorEmail)) {
            recipients.push({ email: vendedorEmail, name: vendedorName || "Vendedor" });
          }
          const uniqueRecipients = [...new Map(recipients.map((r) => [r.email, r])).values()];
          const total = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: quotation?.currency || "MXN"
          }).format(parseFloat(quotation?.total || "0"));
          await sendOrderReleaseEmail2({
            status: "rejected",
            orderFolio: quotation?.folio || id,
            customerName: quotation?.customer?.name || "\u2014",
            quotationTotal: total,
            releaseNotes: releaseNotes.trim(),
            tenantName,
            releasedByName,
            recipients: uniqueRecipients
          });
        } catch (emailErr) {
          console.warn("[OrderRelease] Reject email failed:", emailErr);
        }
      })();
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting order release:", error);
      res.status(500).json({ error: "Error rejecting order release" });
    }
  });
  app2.post("/api/order-release/:id/close", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { releaseNotes } = req.body;
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const order = await db.query.orders.findFirst({
        where: and4(eq5(orders.id, id), resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0)
      });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Order is not pending release" });
      await db.update(orders).set({
        releaseStatus: OrderReleaseStatus.CLOSED,
        status: OrderStatus.CLOSED,
        releaseNotes: releaseNotes?.trim() || null,
        releasedById: req.user.id,
        releasedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(orders.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error closing order release:", error);
      res.status(500).json({ error: "Error closing order release" });
    }
  });
  app2.patch("/api/order-release/:id/adjust", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { items, notes, conditions } = req.body;
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const order = await db.query.orders.findFirst({
        where: and4(eq5(orders.id, id), resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0),
        with: { quotation: { with: { items: true } } }
      });
      if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Solo se pueden ajustar pedidos pendientes de liberaci\xF3n" });
      const quotation = order.quotation;
      if (!quotation) return res.status(400).json({ error: "Cotizaci\xF3n no encontrada" });
      if (items && items.length > 0) {
        for (const adj of items) {
          const qty = Math.max(0.01, adj.quantity);
          const price = Math.max(0, adj.unitPrice);
          const disc = Math.min(100, Math.max(0, adj.discountPercent));
          const subtotal = qty * price * (1 - disc / 100);
          const taxRate = 16;
          const taxAmount = subtotal * (taxRate / 100);
          const total = subtotal + taxAmount;
          await db.update(quotationItems).set({
            quantity: String(qty),
            unitPrice: String(price),
            discountPercent: String(disc),
            discountAmount: String(qty * price * (disc / 100)),
            subtotal: String(subtotal),
            taxAmount: String(taxAmount),
            total: String(total)
          }).where(eq5(quotationItems.id, adj.id));
        }
      }
      const updatedItems = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, quotation.id)
      });
      const newSubtotal = updatedItems.reduce((sum, i) => sum + parseFloat(i.subtotal || "0"), 0);
      const globalDiscountPct = parseFloat(quotation.globalDiscount || "0");
      const discountAmt = newSubtotal * (globalDiscountPct / 100);
      const shippingCost = parseFloat(quotation.shippingCost || "0");
      const taxableBase = newSubtotal - discountAmt;
      const newTax = taxableBase * 0.16;
      const newTotal = taxableBase + newTax + shippingCost;
      const quotationUpdate = {
        subtotal: String(newSubtotal),
        tax: String(newTax),
        total: String(newTotal),
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (notes !== void 0) quotationUpdate.notes = notes;
      if (conditions !== void 0) quotationUpdate.conditions = conditions;
      await db.update(quotations).set(quotationUpdate).where(eq5(quotations.id, quotation.id));
      res.json({ success: true, newTotal: String(newTotal) });
    } catch (error) {
      console.error("Error adjusting order:", error);
      res.status(500).json({ error: "Error al ajustar el pedido" });
    }
  });
  app2.get("/api/reports/orders", isAuthenticated, async (req, res) => {
    try {
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const isSuperAdminGlobal = req.user?.isSuperAdmin && !resolvedTenantId;
      const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
      const { dateFrom, dateTo, customerId, status, activeOnly } = req.query;
      const tenantWhere = !isSuperAdminGlobal && resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0;
      const orderRows = await db.query.orders.findMany({
        where: tenantWhere,
        with: {
          quotation: {
            with: {
              customer: true,
              items: true
            }
          }
        },
        orderBy: (o, { desc: desc3 }) => [desc3(o.createdAt)]
      });
      const shipmentWhere = !isSuperAdminGlobal && resolvedTenantId ? eq5(shipments.tenantId, resolvedTenantId) : void 0;
      const allShipments = await db.query.shipments.findMany({
        where: shipmentWhere
      });
      const shipmentByOrder = new Map(allShipments.map((s) => [s.orderId, s]));
      const allCreditAuths = await db.query.creditAuthorizations.findMany({
        where: !isSuperAdminGlobal && resolvedTenantId ? sql5`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${resolvedTenantId})` : void 0
      });
      const creditAuthByQuotation = new Map(allCreditAuths.map((c) => [c.quotationId, c]));
      let filtered = orderRows;
      if (restrictedEmpresaId) {
        filtered = filtered.filter((o) => o.empresaId === restrictedEmpresaId);
      }
      const showActiveOnly = activeOnly !== "false";
      if (showActiveOnly && (!status || status === "all")) {
        filtered = filtered.filter((o) => o.status !== "shipped" && o.status !== "delivered");
      }
      if (status && status !== "all") {
        filtered = filtered.filter((o) => o.status === status);
      }
      if (customerId) {
        filtered = filtered.filter((o) => o.quotation?.customerId === customerId);
      }
      if (dateFrom) {
        const from = new Date(dateFrom);
        filtered = filtered.filter((o) => {
          const d = o.createdAt;
          return d && new Date(d) >= from;
        });
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter((o) => {
          const d = o.createdAt;
          return d && new Date(d) <= to;
        });
      }
      const result = filtered.map((o) => {
        const shipment = shipmentByOrder.get(o.id);
        const creditAuth = creditAuthByQuotation.get(o.quotationId);
        return {
          id: o.id,
          folio: o.quotation?.folio || o.id.substring(0, 8),
          customerName: o.quotation?.customer?.name || "\u2014",
          customerRfc: o.quotation?.customer?.rfc || null,
          purchaseOrder: o.quotation?.purchaseOrder || null,
          closeDate: o.quotation?.customerApprovedAt || null,
          shippingDate: shipment?.shippedAt || null,
          creditReleaseDate: creditAuth?.authorizedAt || null,
          comments: o.factoryNotes || null,
          notes: o.quotation?.notes || null,
          status: o.status,
          createdAt: o.createdAt,
          items: (o.quotation?.items || []).map((item) => ({
            productCode: item.productCode || null,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice ?? null
          }))
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders report:", error);
      res.status(500).json({ error: "Error generating report" });
    }
  });
  app2.post("/api/reports/incidents/pdf", isAuthenticated, async (req, res) => {
    try {
      const { incidents: incidentData } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const tenantBranding = tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) }) ?? null : null;
      const cutoffDate = (/* @__PURE__ */ new Date()).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
      const { generateIncidentsReportPDF: generateIncidentsReportPDF2 } = await Promise.resolve().then(() => (init_reports_pdf_generator(), reports_pdf_generator_exports));
      const pdfStream = await generateIncidentsReportPDF2({
        incidents: incidentData,
        tenant: tenantBranding,
        cutoffDate
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="reporte-incidentes-${Date.now()}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating incidents PDF:", error);
      res.status(500).json({ error: "Error al generar el PDF" });
    }
  });
  app2.post("/api/reports/orders/pdf", isAuthenticated, async (req, res) => {
    try {
      const { filters = {}, orders: orderData } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const tenantBranding = tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) }) ?? null : null;
      const { generateOrdersReportPDF: generateOrdersReportPDF2 } = await Promise.resolve().then(() => (init_reports_pdf_generator(), reports_pdf_generator_exports));
      const pdfStream = await generateOrdersReportPDF2({
        orders: orderData,
        tenant: tenantBranding,
        filters
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="reporte-pedidos-${Date.now()}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating orders PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });
  app2.get("/api/board/orders", isAuthenticated, async (req, res) => {
    try {
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const isSuperAdminGlobal = req.user?.isSuperAdmin && !resolvedTenantId;
      const restrictedEmpresaId = createTenantScopedStorage(req).getRestrictedEmpresaId();
      const boardTenantConds = [
        !isSuperAdminGlobal && resolvedTenantId ? eq5(orders.tenantId, resolvedTenantId) : void 0,
        restrictedEmpresaId ? eq5(orders.empresaId, restrictedEmpresaId) : void 0
      ].filter(Boolean);
      const boardTenantWhere = boardTenantConds.length > 0 ? and4(...boardTenantConds) : void 0;
      const orderRows = await db.query.orders.findMany({
        where: boardTenantWhere,
        with: {
          quotation: {
            with: {
              customer: true,
              items: { with: { product: true } }
            }
          }
        },
        orderBy: (o, { asc: asc2, desc: desc3 }) => [asc2(o.estimatedDelivery), desc3(o.createdAt)]
      });
      const sevenDaysAgo = /* @__PURE__ */ new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const filtered = orderRows.filter((o) => {
        if (o.status === "delivered") {
          const deliveredAt = o.actualDelivery ? new Date(o.actualDelivery) : new Date(o.updatedAt);
          return deliveredAt >= sevenDaysAgo;
        }
        if (o.status === "shipped") {
          return true;
        }
        return true;
      });
      const boardEmpresaMap = /* @__PURE__ */ new Map();
      {
        const empresaRows = await db.select({ id: empresas.id, name: empresas.name }).from(empresas).where(!isSuperAdminGlobal && resolvedTenantId ? eq5(empresas.tenantId, resolvedTenantId) : void 0);
        empresaRows.forEach((e) => boardEmpresaMap.set(e.id, e.name));
      }
      const result = filtered.map((o) => {
        const q = o.quotation;
        const now = /* @__PURE__ */ new Date();
        const estimatedDelivery = o.estimatedDelivery ? new Date(o.estimatedDelivery) : null;
        const daysRemaining = estimatedDelivery ? Math.ceil((estimatedDelivery.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : null;
        return {
          id: o.id,
          folio: q?.folio || "\u2014",
          status: o.status,
          productionProgress: o.productionProgress,
          estimatedDelivery: o.estimatedDelivery,
          actualDelivery: o.actualDelivery,
          factoryNotes: o.factoryNotes,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          daysRemaining,
          empresaId: o.empresaId ?? null,
          empresaName: o.empresaId ? boardEmpresaMap.get(o.empresaId) ?? null : null,
          customerName: q?.customer?.name || "\u2014",
          customerCity: q?.customer?.city || null,
          purchaseOrder: q?.purchaseOrder || null,
          deliveryTime: q?.deliveryTime || null,
          shippingNotes: q?.shippingNotes || null,
          itemCount: q?.items?.length || 0,
          items: (q?.items || []).map((item) => ({
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure
          }))
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching board orders:", error);
      res.status(500).json({ error: "Error fetching board orders" });
    }
  });
  app2.get("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allShipments = await scopedStorage.getAllShipments();
      res.json(allShipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ error: "Error fetching shipments" });
    }
  });
  app2.post("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertShipmentSchema.parse(req.body);
      if (validated.orderId) {
        const existing = await db.query.shipments.findFirst({
          where: eq5(shipments.orderId, validated.orderId)
        });
        if (existing) {
          return res.status(409).json({ error: "Ya existe un embarque para este pedido" });
        }
      }
      const shipment = await scopedStorage.createShipment(validated);
      if (validated.orderId) {
        await scopedStorage.updateOrder(validated.orderId, { status: OrderStatus.SHIPPED });
      }
      res.status(201).json(shipment);
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(400).json({ error: "Error creating shipment" });
    }
  });
  app2.patch("/api/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      if (req.body.status) {
        const current = await scopedStorage.getShipment(id);
        if (!current) return res.status(404).json({ error: "Shipment not found" });
        const order = [ShipmentStatus.PENDING, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED];
        const currentIdx = order.indexOf(current.status);
        const newIdx = order.indexOf(req.body.status);
        if (newIdx <= currentIdx) {
          return res.status(409).json({ error: "El embarque ya tiene ese estado o uno posterior" });
        }
      }
      const data = { ...req.body };
      delete data.empresaId;
      if (data.shippedAt && typeof data.shippedAt === "string") {
        data.shippedAt = new Date(data.shippedAt);
      }
      if (data.deliveredAt && typeof data.deliveredAt === "string") {
        data.deliveredAt = new Date(data.deliveredAt);
      }
      const updatedShipment = await scopedStorage.updateShipment(id, data);
      if (!updatedShipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }
      res.json(updatedShipment);
    } catch (error) {
      console.error("Error updating shipment:", error);
      res.status(500).json({ error: "Error updating shipment" });
    }
  });
  app2.get("/api/shipments/:id/remision", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const shipment = await db.query.shipments.findFirst({
        where: eq5(shipments.id, id),
        with: {
          productInstances: { with: { product: true } }
        }
      });
      if (!assertTenantScope(req, res, shipment, {
        notFoundMessage: "Embarque no encontrado",
        forbiddenMessage: "No autorizado para acceder a este embarque",
        checkEmpresa: true
      })) {
        return;
      }
      const order = await db.query.orders.findFirst({
        where: eq5(orders.id, shipment.orderId),
        with: {
          quotation: {
            with: {
              customer: true,
              items: { with: { product: true } }
            }
          }
        }
      });
      if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
      const customer = order.quotation.customer;
      let tenantBranding = null;
      if (tenantId) {
        tenantBranding = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
      }
      const instancesByProduct = {};
      for (const inst of shipment.productInstances ?? []) {
        if (!instancesByProduct[inst.productId]) instancesByProduct[inst.productId] = [];
        instancesByProduct[inst.productId].push(inst.serialNumber);
      }
      const remisionProducts = order.quotation.items.map((item) => ({
        name: item.product?.name ?? item.description ?? "Producto",
        quantity: parseFloat(item.quantity ?? "1"),
        unitOfMeasure: item.product?.unitOfMeasure ?? "Unidades",
        desde: tenantBranding?.city ? `${tenantBranding.city}/Salida` : "Almac\xE9n/Salida",
        serialNumbers: instancesByProduct[item.productId ?? ""] ?? []
      }));
      const { generateShipmentRemisionPDF: generateShipmentRemisionPDF2 } = await Promise.resolve().then(() => (init_shipment_remision_pdf_generator(), shipment_remision_pdf_generator_exports));
      const stream = await generateShipmentRemisionPDF2({
        folio: order.quotation.folio,
        orderStatus: order.status,
        scheduledDate: order.estimatedDelivery ? order.estimatedDelivery.toString() : null,
        customerName: customer.name,
        customerAddress: [customer.city, customer.state].filter(Boolean).join(", ") || null,
        transporter: shipment.transporter,
        transportType: shipment.transportType,
        driverName: shipment.driverName,
        vehiclePlates: shipment.vehiclePlates,
        trackingNumber: shipment.trackingNumber,
        shippedAt: shipment.shippedAt ? shipment.shippedAt.toString() : null,
        invoiceNumber: shipment.invoiceNumber || null,
        products: remisionProducts,
        tenant: tenantBranding
      });
      const safeCustomer = customer.name.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 30);
      const safeOrder = order.quotation.folio.replace(/[^a-zA-Z0-9_\-]/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="remision-${safeOrder}-${safeCustomer}.pdf"`);
      stream.pipe(res);
    } catch (error) {
      console.error("Error generating shipment remision PDF:", error);
      res.status(500).json({ error: "Error al generar la remisi\xF3n" });
    }
  });
  app2.get("/api/product-instances", isAuthenticated, async (req, res) => {
    try {
      const { customerId, shipmentId, productId } = req.query;
      const instances = await db.query.shipmentProductInstances.findMany({
        where: and4(
          customerId ? eq5(shipmentProductInstances.customerId, customerId) : void 0,
          shipmentId ? eq5(shipmentProductInstances.shipmentId, shipmentId) : void 0,
          productId ? eq5(shipmentProductInstances.productId, productId) : void 0
        ),
        with: {
          product: true,
          shipment: true,
          customer: true
        },
        orderBy: (instances2, { desc: desc3 }) => [desc3(instances2.createdAt)]
      });
      res.json(instances);
    } catch (error) {
      console.error("Error fetching product instances:", error);
      res.status(500).json({ error: "Error fetching product instances" });
    }
  });
  app2.get("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const instance = await db.query.shipmentProductInstances.findFirst({
        where: eq5(shipmentProductInstances.id, id),
        with: {
          product: true,
          shipment: true,
          customer: true
        }
      });
      if (!instance) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      const scopedShipment = await createTenantScopedStorage(req).getShipment(instance.shipmentId);
      if (!scopedShipment) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json(instance);
    } catch (error) {
      console.error("Error fetching product instance:", error);
      res.status(500).json({ error: "Error fetching product instance" });
    }
  });
  app2.post("/api/product-instances", isAuthenticated, async (req, res) => {
    try {
      const validated = insertShipmentProductInstanceSchema.parse(req.body);
      const [instance] = await db.insert(shipmentProductInstances).values(validated).returning();
      res.status(201).json(instance);
    } catch (error) {
      console.error("Error creating product instance:", error);
      if (error?.code === "23505") {
        return res.status(400).json({ error: "El n\xFAmero de serie ya existe" });
      }
      res.status(400).json({ error: "Error creating product instance" });
    }
  });
  app2.post("/api/product-instances/bulk", isAuthenticated, async (req, res) => {
    try {
      const { instances } = req.body;
      if (!Array.isArray(instances) || instances.length === 0) {
        return res.status(400).json({ error: "Se requiere un arreglo de instancias" });
      }
      const validated = instances.map((i) => insertShipmentProductInstanceSchema.parse(i));
      const created = await db.insert(shipmentProductInstances).values(validated).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating product instances:", error);
      if (error?.code === "23505") {
        return res.status(400).json({ error: "Uno o m\xE1s n\xFAmeros de serie ya existen" });
      }
      res.status(400).json({ error: "Error creating product instances" });
    }
  });
  app2.patch("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveredAt, serialNumber } = req.body;
      const targetInstance = await db.query.shipmentProductInstances.findFirst({
        where: eq5(shipmentProductInstances.id, id),
        columns: { shipmentId: true }
      });
      if (!targetInstance) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      const scopedShipment = await createTenantScopedStorage(req).getShipment(targetInstance.shipmentId);
      if (!scopedShipment) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      if (serialNumber !== void 0) {
        const existing = await db.query.shipmentProductInstances.findFirst({
          where: and4(
            eq5(shipmentProductInstances.serialNumber, serialNumber),
            sql5`${shipmentProductInstances.id} != ${id}`
          )
        });
        if (existing) {
          return res.status(400).json({ error: "El n\xFAmero de serie ya existe en otro producto" });
        }
      }
      const [updated] = await db.update(shipmentProductInstances).set({ ...status !== void 0 && { status }, ...notes !== void 0 && { notes }, ...deliveredAt !== void 0 && { deliveredAt }, ...serialNumber !== void 0 && { serialNumber } }).where(eq5(shipmentProductInstances.id, id)).returning();
      if (!updated) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating product instance:", error);
      res.status(500).json({ error: "Error updating product instance" });
    }
  });
  app2.delete("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const targetInstance = await db.query.shipmentProductInstances.findFirst({
        where: eq5(shipmentProductInstances.id, id),
        columns: { shipmentId: true }
      });
      if (!targetInstance) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      const scopedShipment = await createTenantScopedStorage(req).getShipment(targetInstance.shipmentId);
      if (!scopedShipment) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      const [deleted] = await db.delete(shipmentProductInstances).where(eq5(shipmentProductInstances.id, id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product instance:", error);
      res.status(500).json({ error: "Error deleting product instance" });
    }
  });
  app2.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allInvoices = await scopedStorage.getAllInvoices();
      res.json(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Error fetching invoices" });
    }
  });
  app2.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertInvoiceSchema.parse(req.body);
      const invoice = await scopedStorage.createInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ error: "Error creating invoice" });
    }
  });
  app2.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const updatedInvoice = await scopedStorage.updateInvoice(id, req.body);
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Error updating invoice" });
    }
  });
  app2.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq5(invoices.id, id),
        with: { customer: true, order: true }
      });
      if (!assertTenantScope(req, res, invoice, { notFoundMessage: "Invoice not found" })) {
        return;
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Error fetching invoice" });
    }
  });
  app2.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq5(invoices.id, id),
        with: { customer: true, order: true }
      });
      if (!assertTenantScope(req, res, invoice, { notFoundMessage: "Invoice not found" })) {
        return;
      }
      const tenantForPdf = invoice.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, invoice.tenantId) }) : null;
      const { generateInvoicePDFStream: generateInvoicePDFStream2 } = await Promise.resolve().then(() => (init_invoice_pdf_generator(), invoice_pdf_generator_exports));
      const pdfStream = await generateInvoicePDFStream2({ invoice, customer: invoice.customer, tenant: tenantForPdf });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="factura-${invoice.serie}-${invoice.folio}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });
  app2.post("/api/invoices/:id/send-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq5(invoices.id, id),
        with: { customer: true }
      });
      if (!assertTenantScope(req, res, invoice, { notFoundMessage: "Invoice not found" })) {
        return;
      }
      if (!invoice.customer.email) {
        return res.status(400).json({ error: "El cliente no tiene correo electr\xF3nico configurado" });
      }
      const { sendInvoiceEmail: sendInvoiceEmail2 } = await Promise.resolve().then(() => (init_invoice_email_service(), invoice_email_service_exports));
      await sendInvoiceEmail2({
        invoice,
        customer: invoice.customer,
        recipientEmail: invoice.customer.email,
        ccEmails: req.user?.email ? [req.user.email] : []
      });
      res.json({
        success: true,
        message: `Factura ${invoice.serie}-${invoice.folio} enviada exitosamente`
      });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Error al enviar la factura por correo" });
    }
  });
  const accountStatementsCache = /* @__PURE__ */ new Map();
  const ACCOUNT_STATEMENTS_TTL_MS = 6e4;
  app2.get("/api/account-statements", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant no encontrado" });
      const forceRefresh = req.query.force === "1" || req.query.force === "true";
      const cachedStmt = accountStatementsCache.get(tenantId);
      if (!forceRefresh && cachedStmt && Date.now() - cachedStmt.at < ACCOUNT_STATEMENTS_TTL_MS) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cachedStmt.data);
      }
      res.setHeader("X-Cache", forceRefresh ? "BYPASS" : "MISS");
      const microsipCfg = await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId)).limit(1);
      if (microsipCfg.length > 0) {
        try {
          const service = await createMicrosipSyncService(tenantId);
          const cxcBalances = await service.queryLiveAccountStatements(3);
          const tenantCustomers = await db.select().from(customers).where(
            and4(eq5(customers.tenantId, tenantId), isNotNull(customers.microsipId))
          );
          const customerByMicrosipId = /* @__PURE__ */ new Map();
          for (const c of tenantCustomers) {
            if (c.microsipId) customerByMicrosipId.set(c.microsipId, c);
          }
          const result2 = cxcBalances.flatMap((bal) => {
            const customer = customerByMicrosipId.get(bal.CLIENTE_ID);
            if (!customer) return [];
            const totalBalance = Number(bal.SALDO_TOTAL) || 0;
            if (totalBalance <= 0) return [];
            return [{
              customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                rfc: customer.rfc,
                phone: customer.phone
              },
              totalBalance,
              overdueBalance: Math.max(0, Number(bal.SALDO_VENCIDO) || 0),
              invoiceCount: Number(bal.INVOICE_COUNT) || 0,
              oldestDueDate: bal.OLDEST_DUE ? bal.OLDEST_DUE instanceof Date ? bal.OLDEST_DUE.toISOString() : String(bal.OLDEST_DUE) : null,
              currency: Number(bal.IS_USD) === 1 ? "USD" : "MXN"
            }];
          }).sort((a, b) => b.overdueBalance - a.overdueBalance || b.totalBalance - a.totalBalance);
          accountStatementsCache.set(tenantId, { at: Date.now(), data: result2 });
          return res.json(result2);
        } catch (msErr) {
          console.error("[account-statements] Microsip live query failed, falling back to local DB:", msErr);
        }
      }
      const allInvoices = await db.query.invoices.findMany({
        where: and4(
          eq5(invoices.tenantId, tenantId),
          or3(
            eq5(invoices.status, "pending_payment"),
            eq5(invoices.status, "partially_paid")
          )
        ),
        with: { customer: true },
        orderBy: (invoices2, { desc: desc3 }) => [desc3(invoices2.issuedAt)]
      });
      const byCustomer = /* @__PURE__ */ new Map();
      const now = /* @__PURE__ */ new Date();
      for (const inv of allInvoices) {
        const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0");
        if (!Number.isFinite(bal) || bal <= 0) continue;
        const existing = byCustomer.get(inv.customerId) ?? {
          customer: inv.customer,
          totalBalance: 0,
          overdueBalance: 0,
          invoiceCount: 0,
          oldestDueDate: null
        };
        existing.totalBalance += bal;
        existing.invoiceCount += 1;
        if (inv.dueDate && new Date(inv.dueDate) < now) {
          existing.overdueBalance += bal;
          const d = new Date(inv.dueDate);
          if (!existing.oldestDueDate || d < existing.oldestDueDate) existing.oldestDueDate = d;
        }
        byCustomer.set(inv.customerId, existing);
      }
      const result = Array.from(byCustomer.values()).sort((a, b) => b.overdueBalance - a.overdueBalance || b.totalBalance - a.totalBalance);
      accountStatementsCache.set(tenantId, { at: Date.now(), data: result });
      res.json(result);
    } catch (error) {
      console.error("Error fetching account statements:", error);
      res.status(500).json({ error: "Error al obtener estados de cuenta" });
    }
  });
  app2.post("/api/customers/:id/send-account-statement", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const { additionalEmails = [] } = req.body;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
      const recipientEmails = [];
      if (customer.email) {
        for (const e of customer.email.split(/[;,]/).map((s) => s.trim()).filter(Boolean)) {
          if (e.includes("@")) recipientEmails.push(e.toLowerCase());
        }
      }
      for (const e of additionalEmails) {
        if (e && typeof e === "string" && e.includes("@") && !recipientEmails.includes(e.toLowerCase())) {
          recipientEmails.push(e.toLowerCase());
        }
      }
      if (recipientEmails.length === 0) {
        return res.status(400).json({ error: "El cliente no tiene correo electr\xF3nico configurado" });
      }
      const [custInvoices, custPayments] = await Promise.all([
        scopedStorage.getInvoicesByCustomer(id),
        scopedStorage.getPaymentsByCustomer(id)
      ]);
      const tenantId = getEffectiveTenantId(req);
      let tenantName = "Nexxo";
      if (tenantId) {
        const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
        if (tenant?.name) tenantName = tenant.name;
      }
      let liveData;
      if (tenantId && customer.microsipId) {
        const hasMicrosip = (await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId)).limit(1)).length > 0;
        if (hasMicrosip) {
          try {
            const msService = await createMicrosipSyncService(tenantId);
            liveData = await msService.queryLiveCxcStatementForCustomer(customer.microsipId);
          } catch (_e) {
            console.warn("[account-statement] Live CXC fetch failed:", _e?.message);
            return res.status(502).json({ error: "No se pudo consultar Microsip para obtener el saldo actualizado. El env\xEDo se cancel\xF3 para no mandar datos incorrectos. Intenta de nuevo." });
          }
        }
      }
      const { sendAccountStatementEmail: sendAccountStatementEmail2 } = await Promise.resolve().then(() => (init_account_statement_email_service(), account_statement_email_service_exports));
      await sendAccountStatementEmail2({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails,
        tenantName,
        liveData
      });
      if (tenantId) {
        await logSystemActivity({
          tenantId,
          category: "account_statement",
          action: "manual_send",
          level: "info",
          message: `Estado de cuenta enviado manualmente a ${customer.name} (${recipientEmails.join(", ")}).`,
          details: { customerId: customer.id, recipientEmails, usedLiveData: !!liveData, sentBy: req.user?.fullName ?? null }
        });
      }
      res.json({ success: true, message: `Estado de cuenta enviado a ${recipientEmails.join(", ")}` });
    } catch (error) {
      console.error("Error sending account statement:", error);
      res.status(500).json({ error: error.message ?? "Error al enviar estado de cuenta" });
    }
  });
  app2.post("/api/account-statements/send-bulk", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { customerIds = [] } = req.body;
      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ error: "Se requiere al menos un cliente" });
      }
      const tenantId = getEffectiveTenantId(req);
      let tenantName = "Nexxo";
      if (tenantId) {
        const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
        if (tenant?.name) tenantName = tenant.name;
      }
      const { sendAccountStatementEmail: sendAccountStatementEmail2 } = await Promise.resolve().then(() => (init_account_statement_email_service(), account_statement_email_service_exports));
      const results = [];
      let msService = null;
      if (tenantId) {
        const hasMicrosip = (await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId)).limit(1)).length > 0;
        if (hasMicrosip) {
          try {
            msService = await createMicrosipSyncService(tenantId);
          } catch (initErr) {
            console.error("[send-bulk] Microsip service init failed:", initErr?.message);
            return res.status(502).json({ error: "No se pudo conectar con Microsip. El env\xEDo masivo se cancel\xF3 para no mandar datos desactualizados." });
          }
        }
      }
      for (const custId of customerIds) {
        try {
          const customer = await scopedStorage.getCustomer(custId);
          if (!customer) {
            results.push({ customerId: custId, name: "?", success: false, error: "No encontrado" });
            continue;
          }
          const recipientEmails = (customer.email ?? "").split(/[;,]/).map((s) => s.trim()).filter((e) => e.includes("@")).map((e) => e.toLowerCase());
          if (recipientEmails.length === 0) {
            results.push({ customerId: custId, name: customer.name, success: false, error: "Sin correo" });
            continue;
          }
          const [custInvoices, custPayments] = await Promise.all([
            scopedStorage.getInvoicesByCustomer(custId),
            scopedStorage.getPaymentsByCustomer(custId)
          ]);
          let liveData;
          if (msService && customer.microsipId) {
            try {
              liveData = await msService.queryLiveCxcStatementForCustomer(customer.microsipId);
            } catch (liveErr) {
              results.push({ customerId: custId, name: customer.name, success: false, error: `Microsip no disponible: ${liveErr?.message ?? "error"}` });
              continue;
            }
          }
          await sendAccountStatementEmail2({ customer, invoices: custInvoices, payments: custPayments, recipientEmails, tenantName, liveData });
          results.push({ customerId: custId, name: customer.name, success: true });
          await new Promise((r) => setTimeout(r, 2e3));
        } catch (e) {
          const c = await scopedStorage.getCustomer(custId).catch(() => null);
          results.push({ customerId: custId, name: c?.name ?? custId, success: false, error: e.message });
        }
      }
      const sent = results.filter((r) => r.success).length;
      const failed = results.length - sent;
      if (tenantId) {
        await logSystemActivity({
          tenantId,
          category: "account_statement",
          action: "manual_bulk_send",
          level: failed > 0 ? "warning" : "info",
          message: `Env\xEDo masivo manual de estados de cuenta: ${sent} enviados, ${failed} fallidos.`,
          details: { sent, failed, sentBy: req.user?.fullName ?? null, results }
        });
      }
      res.json({ sent, failed, results });
    } catch (error) {
      console.error("Error bulk sending account statements:", error);
      res.status(500).json({ error: error.message ?? "Error al enviar estados de cuenta" });
    }
  });
  app2.get("/api/system-logs", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant requerido" });
      const allowedCategories = ["all", "account_statement", "microsip_sync", "system"];
      const rawCategory = typeof req.query.category === "string" ? req.query.category : "all";
      const category = allowedCategories.includes(rawCategory) ? rawCategory : "all";
      const parsedLimit = parseInt(String(req.query.limit ?? "200"), 10);
      const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 200, 1), 500);
      const { systemLogs: systemLogs2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const sysRows = await db.select().from(systemLogs2).where(eq5(systemLogs2.tenantId, tenantId)).orderBy(sql5`${systemLogs2.createdAt} DESC`).limit(limit);
      const sysNormalized = sysRows.map((r) => ({
        id: r.id,
        source: "system",
        category: r.category,
        level: r.level,
        action: r.action,
        message: r.message,
        details: r.details,
        createdAt: r.createdAt
      }));
      const msRows = await db.select().from(microsipSyncLogs).where(eq5(microsipSyncLogs.tenantId, tenantId)).orderBy(sql5`${microsipSyncLogs.startedAt} DESC`).limit(limit);
      const typeLabels = {
        customers: "Clientes",
        products: "Productos",
        categories: "Categor\xEDas",
        invoices: "Facturas",
        payments: "Pagos",
        full: "Completa"
      };
      const msNormalized = msRows.map((r) => {
        const level = r.status === "error" ? "error" : r.status === "started" ? "warning" : "info";
        const typeLabel = typeLabels[r.syncType] ?? r.syncType;
        const statusLabel3 = r.status === "success" ? "exitosa" : r.status === "error" ? "con error" : "en proceso";
        let message = `Sincronizaci\xF3n Microsip (${typeLabel}) ${statusLabel3}`;
        if (r.status === "success") {
          message += `: ${r.recordsCreated ?? 0} nuevos, ${r.recordsUpdated ?? 0} actualizados, ${r.recordsSkipped ?? 0} omitidos.`;
        } else if (r.status === "error" && r.errorMessage) {
          message += `: ${r.errorMessage}`;
        }
        return {
          id: r.id,
          source: "microsip",
          category: "microsip_sync",
          level,
          action: r.syncType,
          message,
          details: {
            recordsCreated: r.recordsCreated,
            recordsUpdated: r.recordsUpdated,
            recordsSkipped: r.recordsSkipped,
            recordsProcessed: r.recordsProcessed,
            errorMessage: r.errorMessage,
            errorDetails: r.errorDetails,
            completedAt: r.completedAt
          },
          createdAt: r.startedAt
        };
      });
      let merged = [...sysNormalized, ...msNormalized];
      if (category && category !== "all") merged = merged.filter((m) => m.category === category);
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(merged.slice(0, limit));
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ error: "Error al obtener registros de actividad" });
    }
  });
  app2.get("/api/account-statement-schedule", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant requerido" });
      const { accountStatementSchedules: accountStatementSchedules2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq7 } = await import("drizzle-orm");
      const row = await db.query.accountStatementSchedules.findFirst({
        where: eq7(accountStatementSchedules2.tenantId, tenantId)
      });
      res.json(row ?? null);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.put("/api/account-statement-schedule", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant requerido" });
      const { enabled, scheduleDays, sendHour, onlyOverdue } = req.body;
      if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) {
        return res.status(400).json({ error: "scheduleDays debe ser un arreglo con al menos un d\xEDa" });
      }
      if (typeof sendHour !== "number" || sendHour < 0 || sendHour > 23) {
        return res.status(400).json({ error: "sendHour debe ser entre 0 y 23" });
      }
      const { accountStatementSchedules: accountStatementSchedules2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq7 } = await import("drizzle-orm");
      const existing = await db.query.accountStatementSchedules.findFirst({
        where: eq7(accountStatementSchedules2.tenantId, tenantId)
      });
      const now = /* @__PURE__ */ new Date();
      if (existing) {
        const [updated] = await db.update(accountStatementSchedules2).set({ enabled, scheduleDays, sendHour, onlyOverdue, updatedAt: now }).where(eq7(accountStatementSchedules2.id, existing.id)).returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(accountStatementSchedules2).values({ tenantId, enabled, scheduleDays, sendHour, onlyOverdue }).returning();
        res.json(created);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/customers/:id/account-statement-pdf", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
      const tenantId = getEffectiveTenantId(req);
      let tenant = null;
      if (tenantId) tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
      let cxcData;
      if (tenantId && customer.microsipId) {
        const microsipCfg = await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId)).limit(1);
        if (microsipCfg.length > 0) {
          try {
            const service = await createMicrosipSyncService(tenantId);
            const raw = await service.queryLiveCxcStatementForCustomer(customer.microsipId);
            const now = /* @__PURE__ */ new Date();
            cxcData = {
              invoices: raw.invoices.map((inv) => ({
                folio: String(inv.FOLIO),
                issueDate: inv.FECHA,
                dueDate: inv.FECHA_VEN ?? null,
                total: Number(inv.IMPORTE_TOTAL) || 0,
                balance: Number(inv.SALDO) || 0,
                currency: inv.TIPO_CAMBIO && inv.TIPO_CAMBIO > 1.5 ? "USD" : "MXN"
              })),
              payments: raw.payments.map((pay) => ({
                reference: String(pay.REFERENCIA),
                date: pay.FECHA,
                amount: Number(pay.IMPORTE) || 0,
                invoiceFolio: pay.FACTURA_FOLIO ? String(pay.FACTURA_FOLIO) : null
              }))
            };
          } catch (cxcErr) {
            console.warn("[PDF] CXC live query failed, falling back to local DB:", cxcErr.message);
          }
        }
      }
      const [custInvoices, custPayments] = cxcData ? [[], []] : await Promise.all([
        scopedStorage.getInvoicesByCustomer(id),
        scopedStorage.getPaymentsByCustomer(id)
      ]);
      const { generateAccountStatementPDF: generateAccountStatementPDF2 } = await Promise.resolve().then(() => (init_account_statement_pdf_generator(), account_statement_pdf_generator_exports));
      const pdfStream = await generateAccountStatementPDF2({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        tenant,
        cxcData
      });
      const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="estado-cuenta-${safeName}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating account statement PDF:", error);
      res.status(500).json({ error: error.message ?? "Error al generar PDF" });
    }
  });
  app2.get("/api/customers/:id/account-statement-link", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
      const tenantId = getEffectiveTenantId(req);
      const { createHmac } = await import("crypto");
      const secret = process.env.SESSION_SECRET || "nexxo-secret";
      const payload = Buffer.from(JSON.stringify({
        customerId: id,
        tenantId,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1e3
        // 7 days
      })).toString("base64url");
      const sig = createHmac("sha256", secret).update(payload).digest("hex");
      const token = `${payload}.${sig}`;
      res.json({ token, customerName: customer.name });
    } catch (error) {
      console.error("Error generating account statement link:", error);
      res.status(500).json({ error: error.message ?? "Error al generar enlace" });
    }
  });
  app2.get("/api/public/account-statement/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const parts = token.split(".");
      if (parts.length < 2) return res.status(400).json({ error: "Token inv\xE1lido" });
      const sig = parts.pop();
      const payload = parts.join(".");
      const { createHmac } = await import("crypto");
      const secret = process.env.SESSION_SECRET || "nexxo-secret";
      const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
      if (sig !== expectedSig) return res.status(403).json({ error: "Token inv\xE1lido o expirado" });
      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (data.exp < Date.now()) return res.status(403).json({ error: "El enlace ha expirado" });
      const { customerId, tenantId } = data;
      const customer = await db.query.customers.findFirst({ where: eq5(customers.id, customerId) });
      if (!customer || customer.tenantId !== tenantId) return res.status(404).json({ error: "No encontrado" });
      const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
      const [custInvoices, custPayments] = await Promise.all([
        db.select().from(invoices).where(eq5(invoices.customerId, customerId)).orderBy(desc2(invoices.issuedAt)),
        db.select().from(payments).where(eq5(payments.customerId, customerId)).orderBy(desc2(payments.paymentDate))
      ]);
      res.json({ customer, invoices: custInvoices, payments: custPayments, tenant: tenant ?? null });
    } catch (error) {
      console.error("Error fetching public account statement:", error);
      res.status(500).json({ error: "Error al obtener estado de cuenta" });
    }
  });
  app2.get("/api/accounts-receivable", isAuthenticated, async (req, res) => {
    try {
      const { customerId, status } = req.query;
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant not found" });
      }
      let receivables;
      if (customerId) {
        receivables = await db.query.invoices.findMany({
          where: and4(
            eq5(invoices.tenantId, tenantId),
            eq5(invoices.customerId, customerId),
            status === "pending" ? eq5(invoices.status, "pending_payment") : void 0
          ),
          with: {
            customer: true
          },
          orderBy: (invoices2, { desc: desc3 }) => [desc3(invoices2.dueDate)]
        });
      } else {
        receivables = await db.query.invoices.findMany({
          where: and4(
            eq5(invoices.tenantId, tenantId),
            status ? eq5(invoices.status, status) : void 0
          ),
          with: {
            customer: true
          },
          orderBy: (invoices2, { desc: desc3 }) => [desc3(invoices2.dueDate)]
        });
      }
      res.json(receivables);
    } catch (error) {
      console.error("Error fetching accounts receivable:", error);
      res.status(500).json({ error: "Error fetching accounts receivable" });
    }
  });
  app2.get("/api/accounts-receivable/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq5(invoices.id, id),
        with: {
          customer: true
        }
      });
      if (!assertTenantScope(req, res, invoice, { notFoundMessage: "Invoice not found" })) {
        return;
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Error fetching invoice" });
    }
  });
  app2.post("/api/accounts-receivable", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertInvoiceSchema.parse(req.body);
      const invoiceData = {
        ...validated,
        status: validated.status || "pending_payment",
        balanceDue: validated.balanceDue || validated.total
        // Initialize balance to total
      };
      const invoice = await scopedStorage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating account receivable:", error);
      res.status(400).json({ error: "Error creating account receivable" });
    }
  });
  app2.patch("/api/accounts-receivable/:id", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.FACTURACION, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const updatedInvoice = await scopedStorage.updateInvoice(id, req.body);
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating account receivable:", error);
      res.status(500).json({ error: "Error updating account receivable" });
    }
  });
  app2.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant not found" });
      }
      const allPayments = await db.query.payments.findMany({
        where: and4(
          eq5(payments.tenantId, tenantId),
          gt2(payments.amount, "0")
        ),
        with: {
          customer: true,
          invoice: true
        },
        orderBy: (payments2, { desc: desc3 }) => [desc3(payments2.paymentDate)]
      });
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Error fetching payments" });
    }
  });
  app2.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertPaymentSchema.parse({
        ...req.body,
        registeredBy: req.user.id,
        paymentDate: new Date(req.body.paymentDate)
      });
      const invoice = await scopedStorage.getInvoice(validated.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }
      const payment = await scopedStorage.createPayment(validated);
      const paymentAmount = parseFloat(validated.amount);
      const currentBalance = parseFloat(invoice.balanceDue || invoice.total);
      const newBalance = Math.max(0, currentBalance - paymentAmount);
      let newStatus = invoice.status;
      if (newBalance === 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newBalance < parseFloat(invoice.total)) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }
      await scopedStorage.updateInvoice(invoice.id, {
        balanceDue: newBalance.toFixed(2),
        status: newStatus
      });
      const fullPayment = await db.query.payments.findFirst({
        where: eq5(payments.id, payment.id),
        with: {
          invoice: true,
          customer: true,
          registeredBy: true
        }
      });
      res.status(201).json(fullPayment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(400).json({ error: "Error al registrar el pago" });
    }
  });
  app2.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const objectPath = req.params.objectPath;
    if (useLocalStorage4()) {
      try {
        let filePath = objectPath;
        if (!filePath.includes("/")) {
          filePath = `photos/${objectPath}`;
        }
        const extensions = ["", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
        let served = false;
        for (const ext of extensions) {
          const tryPath = filePath + ext;
          if (await localStorageService.streamFile(tryPath, res)) {
            served = true;
            break;
          }
        }
        if (!served) {
          return res.sendStatus(404);
        }
        return;
      } catch (error) {
        console.error("Error serving local file:", error);
        return res.sendStatus(500);
      }
    }
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        objectPath
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: "read" /* READ */
      });
      if (!canAccess) {
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  app2.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const schema = z3.object({
        checkinId: z3.string().uuid()
      });
      const { checkinId } = schema.parse(req.body);
      const userId = req.user.id;
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      if (checkin.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      if (useLocalStorage4()) {
        const entityId2 = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const expiresAt2 = new Date(Date.now() + 60 * 60 * 1e3);
        const validatedUpload2 = insertPendingUploadSchema.parse({
          entityId: entityId2,
          userId,
          checkinId,
          used: false,
          expiresAt: expiresAt2
        });
        await db.insert(pendingUploads).values(validatedUpload2);
        return res.json({
          uploadURL: `/api/objects/upload-direct/${entityId2}`,
          entityId: entityId2,
          useDirectUpload: true
        });
      }
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorageService.getObjectEntityUploadURL();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      const validatedUpload = insertPendingUploadSchema.parse({
        entityId,
        userId,
        checkinId,
        used: false,
        expiresAt
      });
      await db.insert(pendingUploads).values(validatedUpload);
      res.json({ uploadURL, entityId });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Error getting upload URL" });
    }
  });
  app2.put("/api/objects/upload-direct/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityId } = req.params;
      const userId = req.user.id;
      const pendingUpload = await db.query.pendingUploads.findFirst({
        where: and4(
          eq5(pendingUploads.entityId, entityId),
          eq5(pendingUploads.userId, userId),
          eq5(pendingUploads.used, false)
        )
      });
      if (!pendingUpload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }
      const contentType = req.headers["content-type"] || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : "jpg";
      const filename = `${entityId}.${ext}`;
      const storagePath = await localStorageService.uploadPhotoToStorage(buffer, filename, contentType);
      console.log(`\u2705 Photo uploaded to local storage: ${storagePath}`);
      res.status(200).json({ success: true, path: storagePath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Error uploading file" });
    }
  });
  app2.put("/api/checkin-photos", isAuthenticated, async (req, res) => {
    try {
      const schema = z3.object({
        checkinId: z3.string().uuid(),
        entityId: z3.string().refine(
          (val) => {
            return !val.includes("..") && !val.includes("\\");
          },
          { message: "Invalid entityId: path traversal detected" }
        )
      });
      const { checkinId, entityId } = schema.parse(req.body);
      const userId = req.user.id;
      const pendingUpload = await db.query.pendingUploads.findFirst({
        where: eq5(pendingUploads.entityId, entityId)
      });
      if (!pendingUpload) {
        return res.status(403).json({ error: "Invalid or inaccessible photo" });
      }
      if (pendingUpload.userId !== userId || pendingUpload.checkinId !== checkinId || pendingUpload.used || pendingUpload.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "Invalid or inaccessible photo" });
      }
      let checkin;
      let updatedPhotos;
      try {
        checkin = await db.transaction(async (tx) => {
          const [locked] = await tx.select().from(checkins).where(eq5(checkins.id, checkinId)).for("update");
          if (!locked) {
            throw new Error("CHECKIN_NOT_FOUND");
          }
          if (locked.userId !== userId) {
            throw new Error("NOT_AUTHORIZED");
          }
          const currentPhotos = locked.photos || [];
          if (currentPhotos.includes(entityId)) {
            throw new Error("DUPLICATE_PHOTO");
          }
          if (currentPhotos.length >= 20) {
            throw new Error("MAX_PHOTOS_REACHED");
          }
          await tx.update(pendingUploads).set({ used: true }).where(eq5(pendingUploads.entityId, entityId));
          return locked;
        });
      } catch (txError) {
        if (txError.message === "CHECKIN_NOT_FOUND") {
          return res.status(404).json({ error: "Check-in not found" });
        }
        if (txError.message === "NOT_AUTHORIZED") {
          return res.status(403).json({ error: "Not authorized" });
        }
        if (txError.message === "DUPLICATE_PHOTO") {
          return res.status(409).json({ error: "Photo already attached to this check-in" });
        }
        if (txError.message === "MAX_PHOTOS_REACHED") {
          return res.status(409).json({ error: "Maximum 20 photos per check-in" });
        }
        throw txError;
      }
      if (!useLocalStorage4()) {
        const objectStorageService = new ObjectStorageService();
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(entityId);
          await setObjectAclPolicy(objectFile, {
            owner: userId,
            visibility: "private"
          });
        } catch (aclError) {
          await db.update(pendingUploads).set({ used: false }).where(eq5(pendingUploads.entityId, entityId));
          console.error("ACL update failed, reset pending upload:", aclError);
          return res.status(500).json({ error: "Failed to set photo permissions" });
        }
      }
      try {
        updatedPhotos = await db.transaction(async (tx) => {
          const [current] = await tx.select().from(checkins).where(eq5(checkins.id, checkinId));
          const currentPhotos = current.photos || [];
          const newPhotos = [...currentPhotos, entityId];
          await tx.update(checkins).set({ photos: newPhotos }).where(eq5(checkins.id, checkinId));
          return newPhotos;
        });
      } catch (updateError) {
        await db.update(pendingUploads).set({ used: false }).where(eq5(pendingUploads.entityId, entityId));
        console.error("Photos update failed, reset pending upload:", updateError);
        return res.status(500).json({ error: "Failed to update check-in photos" });
      }
      res.status(200).json({
        entityId,
        photos: updatedPhotos
      });
    } catch (error) {
      console.error("Error setting check-in photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  const pendingDocumentUploads = /* @__PURE__ */ new Map();
  const DOCUMENT_UPLOAD_TTL_MS = 30 * 60 * 1e3;
  const cleanupPendingDocumentUploads = () => {
    const now = Date.now();
    Array.from(pendingDocumentUploads.entries()).forEach(([key, val]) => {
      if (val.expiresAt < now) pendingDocumentUploads.delete(key);
    });
  };
  app2.post("/api/documents/upload", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const userId = req.user.id;
      cleanupPendingDocumentUploads();
      if (useLocalStorage4()) {
        const entityId2 = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        pendingDocumentUploads.set(entityId2, { userId, expiresAt: Date.now() + DOCUMENT_UPLOAD_TTL_MS });
        return res.json({
          uploadURL: `/api/documents/upload-direct/${entityId2}`,
          entityId: entityId2,
          useDirectUpload: true
        });
      }
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorageService.getObjectEntityUploadURL();
      pendingDocumentUploads.set(entityId, { userId, expiresAt: Date.now() + DOCUMENT_UPLOAD_TTL_MS });
      res.json({ uploadURL, entityId });
    } catch (error) {
      console.error("Error getting document upload URL:", error);
      res.status(500).json({ error: "Error getting upload URL" });
    }
  });
  app2.put("/api/documents/upload-direct/:entityId", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { entityId } = req.params;
      if (!/^doc-[0-9]+-[a-z0-9]+$/.test(entityId)) {
        return res.status(400).json({ error: "Invalid document identifier" });
      }
      const pending = pendingDocumentUploads.get(entityId);
      if (!pending || pending.userId !== req.user.id || pending.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Invalid or expired upload" });
      }
      const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
      const chunks = [];
      let totalBytes = 0;
      let tooLarge = false;
      for await (const chunk of req) {
        const buf = chunk;
        totalBytes += buf.length;
        if (totalBytes > MAX_DOCUMENT_BYTES) {
          tooLarge = true;
          break;
        }
        chunks.push(buf);
      }
      if (tooLarge) {
        req.destroy();
        return res.status(413).json({ error: "File too large (max 100MB)" });
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }
      if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }
      const storagePath = await localStorageService.uploadDocument(buffer, entityId);
      console.log(`\u2705 Document uploaded to local storage: ${storagePath}`);
      res.status(200).json({ success: true, entityId });
    } catch (error) {
      console.error("Error uploading document file:", error);
      res.status(500).json({ error: "Error uploading document" });
    }
  });
  app2.post("/api/documents", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const userId = req.user.id;
      const schema = insertDocumentSchema.extend({
        fileUrl: z3.string().refine(
          (val) => !val.includes("..") && !val.includes("\\"),
          { message: "Invalid file path" }
        )
      });
      const data = schema.parse(req.body);
      const pending = pendingDocumentUploads.get(data.fileUrl);
      if (!pending || pending.userId !== userId || pending.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Archivo de carga no v\xE1lido o expirado" });
      }
      const scopedStorage = createTenantScopedStorage(req);
      if (data.productId) {
        const product = await scopedStorage.getProduct(data.productId);
        if (!product) {
          return res.status(400).json({ error: "Producto no v\xE1lido" });
        }
      }
      if (!useLocalStorage4()) {
        const objectStorageService = new ObjectStorageService();
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(data.fileUrl);
          await setObjectAclPolicy(objectFile, {
            owner: userId,
            visibility: "private"
          });
        } catch (aclError) {
          console.error("Document ACL update failed:", aclError);
          return res.status(500).json({ error: "No se pudo asegurar el archivo" });
        }
      }
      const document = await scopedStorage.createDocument({
        ...data,
        uploadedBy: userId
      });
      pendingDocumentUploads.delete(data.fileUrl);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ error: "Datos inv\xE1lidos", details: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Error al crear el documento" });
    }
  });
  app2.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const documentsList = await scopedStorage.getAllDocuments();
      res.json(documentsList);
    } catch (error) {
      console.error("Error listing documents:", error);
      res.status(500).json({ error: "Error al obtener documentos" });
    }
  });
  app2.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const document = await scopedStorage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      const safeName = (document.fileName || "documento.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      const disposition = req.query.download === "1" ? "attachment" : "inline";
      if (useLocalStorage4()) {
        const relativePath = `documents/${document.fileUrl}.pdf`;
        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="${safeName}"`
        });
        const served = await localStorageService.streamFile(relativePath, res);
        if (!served) {
          return res.status(404).json({ error: "Archivo no encontrado" });
        }
        return;
      }
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(document.fileUrl);
      res.set("Content-Disposition", `${disposition}; filename="${safeName}"`);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading document:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      res.status(500).json({ error: "Error al descargar el documento" });
    }
  });
  app2.delete("/api/documents/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const document = await scopedStorage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      try {
        if (useLocalStorage4()) {
          await localStorageService.deleteFile(`documents/${document.fileUrl}.pdf`);
        } else {
          const objectStorageService = new ObjectStorageService();
          const objectFile = await objectStorageService.getObjectEntityFile(document.fileUrl);
          await objectFile.delete();
        }
      } catch (fileError) {
        console.error("Could not delete document file (continuing):", fileError);
      }
      await scopedStorage.deleteDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Error al eliminar el documento" });
    }
  });
  app2.delete("/api/checkin-photos", isAuthenticated, async (req, res) => {
    try {
      const schema = z3.object({
        checkinId: z3.string().uuid(),
        entityId: z3.string().refine(
          (val) => !val.includes("..") && !val.includes("\\"),
          { message: "Invalid entityId" }
        )
      });
      const { checkinId, entityId } = schema.parse(req.body);
      const userId = req.user.id;
      const isAdmin = req.user.role === UserRole.ADMIN || req.user.isSuperAdmin;
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) return res.status(404).json({ error: "Check-in not found" });
      if (checkin.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const currentPhotos = checkin.photos || [];
      if (!currentPhotos.includes(entityId)) {
        return res.status(404).json({ error: "Photo not found in this check-in" });
      }
      const updatedPhotos = currentPhotos.filter((p) => p !== entityId);
      await db.update(checkins).set({ photos: updatedPhotos }).where(eq5(checkins.id, checkinId));
      try {
        if (useLocalStorage4()) {
          const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ""];
          for (const ext of extensions) {
            try {
              await localStorageService.deleteFile(`photos/${entityId}${ext}`);
            } catch {
            }
          }
        } else {
          const objectStorageService = new ObjectStorageService();
          try {
            const objectFile = await objectStorageService.getObjectEntityFile(entityId);
            await objectFile.delete();
          } catch {
          }
        }
      } catch (storageErr) {
        console.warn("Could not delete photo from storage (non-fatal):", storageErr);
      }
      return res.status(200).json({ photos: updatedPhotos });
    } catch (error) {
      console.error("Error deleting check-in photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/checkins/:id/email-recipients", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) return res.status(404).json({ error: "Check-in not found" });
      const customer = await scopedStorage.getCustomer(checkin.customerId);
      const user = await storage.getUser(checkin.userId);
      const recipients = [];
      if (user?.email) recipients.push({ email: user.email, label: `Vendedor \u2014 ${user.fullName}` });
      for (const email of parseEmailList(customer?.email)) {
        recipients.push({ email, label: `Cliente \u2014 ${customer.name}` });
      }
      const admins = await db.query.users.findMany({ where: eq5(users.role, UserRole.ADMIN) });
      for (const admin of admins) {
        if (admin.email && !recipients.find((r) => r.email === admin.email)) {
          recipients.push({ email: admin.email, label: `Admin \u2014 ${admin.fullName}` });
        }
      }
      res.json({ recipients });
    } catch (error) {
      console.error("Error fetching email recipients:", error);
      res.status(500).json({ error: "Error fetching recipients" });
    }
  });
  app2.post("/api/checkins/:id/checkout", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    const userId = req.user.id;
    try {
      const schema = z3.object({
        checkoutNotes: z3.string().optional(),
        internalNotes: z3.string().optional(),
        recipients: z3.array(z3.string()).optional()
      });
      const parsed = schema.parse(req.body);
      const { checkoutNotes, internalNotes } = parsed;
      const overrideRecipients = parsed.recipients ? parsed.recipients.flatMap((r) => parseEmailList(r)).filter((e, i, arr) => arr.indexOf(e) === i) : void 0;
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      const canCheckout = checkin.userId === userId || req.user.role === UserRole.ADMIN || req.user.role === UserRole.VENTAS_LOGISTICA;
      if (!canCheckout) {
        return res.status(403).json({ error: "Not authorized to checkout this check-in" });
      }
      if (checkin.checkoutAt) {
        return res.status(400).json({ error: "Check-in already checked out" });
      }
      const customer = checkin.customerId ? await scopedStorage.getCustomer(checkin.customerId) : null;
      if (checkin.customerId && !customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const effectiveCustomer = customer ?? {
        id: "",
        name: "Sin cliente",
        rfc: null,
        contactName: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        email: null,
        tenantId: checkin.tenantId,
        microsipCode: null,
        microsipId: null,
        creditLimit: null,
        creditBalance: null,
        paymentTerms: null,
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        secondaryPhone: null,
        website: null,
        notes: null,
        country: null,
        zipCode: null,
        salesRepId: null
      };
      const user = await storage.getUser(checkin.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const tenant = checkin.tenantId ? await db.query.tenants.findFirst({ where: eq5(tenants.id, checkin.tenantId) }) : null;
      console.log(`Generating and uploading PDF for check-in ${checkinId}...`);
      const { generateMinutePDFStream: generateMinutePDFStream2 } = await Promise.resolve().then(() => (init_pdf_generator(), pdf_generator_exports));
      const pdfStream = await generateMinutePDFStream2({
        checkin,
        customer: effectiveCustomer,
        user,
        checkoutNotes,
        tenant
      });
      let pdfPath;
      if (useLocalStorage4()) {
        console.log("Using local storage for PDF...");
        pdfPath = await localStorageService.uploadPdfStreamToStorage(
          pdfStream,
          checkinId,
          userId
        );
      } else {
        const objectStorageService = new ObjectStorageService();
        pdfPath = await objectStorageService.uploadPdfStreamToStorage(
          pdfStream,
          checkinId,
          userId
        );
      }
      console.log(`Updating check-in with checkout time and PDF path...`);
      const updatedCheckin = await scopedStorage.updateCheckin(checkinId, {
        checkoutAt: /* @__PURE__ */ new Date(),
        checkoutNotes,
        internalNotes,
        minutePdfPath: pdfPath
      });
      try {
        console.log(`Sending email notifications...`);
        let recipients;
        if (overrideRecipients && overrideRecipients.length > 0) {
          recipients = overrideRecipients;
        } else {
          recipients = [];
          if (user.email) recipients.push(user.email);
          for (const email of parseEmailList(effectiveCustomer.email)) {
            if (!recipients.includes(email)) recipients.push(email);
          }
          const adminWhere = checkin.tenantId ? and4(eq5(users.role, UserRole.ADMIN), eq5(users.tenantId, checkin.tenantId)) : eq5(users.role, UserRole.ADMIN);
          const admins = await db.query.users.findMany({ where: adminWhere });
          admins.forEach((admin) => {
            if (admin.email && !recipients.includes(admin.email)) recipients.push(admin.email);
          });
        }
        if (recipients.length > 0) {
          await sendCheckoutEmail({
            to: recipients,
            checkinData: {
              customerName: customer.name,
              vendedorName: user.fullName,
              checkoutDate: format(/* @__PURE__ */ new Date(), "PPP 'a las' p", { locale: es }),
              notes: checkoutNotes
            },
            pdfPath
          });
          console.log(`\u2705 Emails sent to: ${recipients.join(", ")}`);
        } else {
          console.warn("\u26A0\uFE0F No recipients found for email notification");
        }
      } catch (emailError) {
        console.error("\u274C Error sending emails:", emailError);
      }
      res.status(200).json({
        checkin: updatedCheckin,
        pdfPath
      });
    } catch (error) {
      console.error(`Error during checkout for check-in ${checkinId}:`, error);
      res.status(500).json({ error: "Error processing checkout" });
    }
  });
  app2.get("/api/checkins/:id/pdf", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    const userId = req.user.id;
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      if (checkin.userId !== userId && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to access this PDF" });
      }
      if (!checkin.minutePdfPath) {
        return res.status(404).json({ error: "PDF not yet generated for this check-in" });
      }
      if (checkin.minutePdfPath.includes("..")) {
        console.error(`Invalid PDF path detected: ${checkin.minutePdfPath}`);
        return res.status(400).json({ error: "Invalid PDF path" });
      }
      if (useLocalStorage4()) {
        const success = await localStorageService.streamFile(checkin.minutePdfPath, res);
        if (!success) {
          return res.status(404).json({ error: "PDF file not found" });
        }
      } else {
        const objectStorageService = new ObjectStorageService();
        await objectStorageService.downloadObjectByPath(checkin.minutePdfPath, res, {
          isPublic: false,
          contentType: "application/pdf",
          disposition: "attachment",
          filename: `minuta-${checkinId}.pdf`
        });
      }
    } catch (error) {
      console.error(`Error downloading PDF for check-in ${checkinId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading PDF" });
      }
    }
  });
  app2.get("/api/public/quotations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.approvalToken, token),
        with: {
          customer: true,
          user: true
        }
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (quotation.customerApprovedAt) {
        return res.json({
          ...quotation,
          alreadyProcessed: true,
          decision: "approved",
          processedAt: quotation.customerApprovedAt
        });
      }
      if (quotation.customerRejectedAt) {
        return res.json({
          ...quotation,
          alreadyProcessed: true,
          decision: "rejected",
          processedAt: quotation.customerRejectedAt,
          rejectionReason: quotation.customerRejectionReason
        });
      }
      if (quotation.validUntil) {
        const expiry = new Date(quotation.validUntil);
        expiry.setUTCHours(23, 59, 59, 999);
        if (expiry < /* @__PURE__ */ new Date()) {
          return res.json({
            ...quotation,
            alreadyProcessed: true,
            decision: "expired"
          });
        }
      }
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, quotation.id),
        orderBy: (items2, { asc: asc2 }) => [asc2(items2.position)]
      });
      res.json({
        ...quotation,
        items,
        alreadyProcessed: false
      });
    } catch (error) {
      console.error("Error fetching quotation by token:", error);
      res.status(500).json({ error: "Error al cargar la cotizaci\xF3n" });
    }
  });
  app2.post("/api/public/quotations/:token/approve", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.approvalToken, token),
        with: {
          customer: true
        }
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (quotation.customerApprovedAt || quotation.customerRejectedAt) {
        return res.status(400).json({ error: "Esta cotizaci\xF3n ya fue procesada" });
      }
      if (quotation.validUntil) {
        const expiry = new Date(quotation.validUntil);
        expiry.setUTCHours(23, 59, 59, 999);
        if (expiry < /* @__PURE__ */ new Date()) {
          return res.status(400).json({ error: "Esta cotizaci\xF3n ha expirado" });
        }
      }
      const now = /* @__PURE__ */ new Date();
      const existingAuth = await db.query.creditAuthorizations.findFirst({
        where: eq5(creditAuthorizations.quotationId, quotation.id)
      });
      if (existingAuth) {
        return res.status(400).json({ error: "Ya existe una solicitud de autorizaci\xF3n para esta cotizaci\xF3n" });
      }
      const [updated] = await db.update(quotations).set({
        customerApprovedAt: now,
        status: QuotationStatus.PENDING_AUTHORIZATION,
        requiresApproval: true,
        approvalReason: "Aprobada por el cliente - pendiente autorizaci\xF3n de cr\xE9dito",
        updatedAt: now
      }).where(eq5(quotations.id, quotation.id)).returning();
      await db.insert(creditAuthorizations).values({
        quotationId: quotation.id,
        userId: quotation.userId,
        status: CreditAuthStatus.PENDING,
        notes: `Solicitud autom\xE1tica: Cliente aprob\xF3 cotizaci\xF3n ${quotation.folio} - Total: $${quotation.total}`
      });
      res.json({
        success: true,
        message: "Cotizaci\xF3n aprobada exitosamente. Se ha enviado para autorizaci\xF3n de cr\xE9dito.",
        quotation: updated
      });
    } catch (error) {
      console.error("Error approving quotation:", error);
      res.status(500).json({ error: "Error al aprobar la cotizaci\xF3n" });
    }
  });
  app2.post("/api/public/quotations/:token/reject", async (req, res) => {
    try {
      const { token } = req.params;
      const { reason } = req.body;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.approvalToken, token)
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (quotation.customerApprovedAt || quotation.customerRejectedAt) {
        return res.status(400).json({ error: "Esta cotizaci\xF3n ya fue procesada" });
      }
      const now = /* @__PURE__ */ new Date();
      const [updated] = await db.update(quotations).set({
        customerRejectedAt: now,
        customerRejectionReason: reason || "Sin raz\xF3n especificada",
        status: QuotationStatus.REJECTED,
        updatedAt: now
      }).where(eq5(quotations.id, quotation.id)).returning();
      res.json({
        success: true,
        message: "Cotizaci\xF3n rechazada.",
        quotation: updated
      });
    } catch (error) {
      console.error("Error rejecting quotation:", error);
      res.status(500).json({ error: "Error al rechazar la cotizaci\xF3n" });
    }
  });
  app2.get("/api/public/quotations/:token/pdf", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.approvalToken, token)
      });
      if (!quotation) {
        return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      }
      if (!quotation.pdfPath) {
        return res.status(404).json({ error: "PDF no disponible" });
      }
      if (useLocalStorage4()) {
        const success = await localStorageService.streamFile(quotation.pdfPath, res);
        if (!success) {
          return res.status(404).json({ error: "PDF no encontrado en almacenamiento local" });
        }
      } else {
        const objectStorageService = new ObjectStorageService();
        await objectStorageService.downloadObjectByPath(quotation.pdfPath, res, {
          isPublic: false,
          contentType: "application/pdf",
          disposition: "inline",
          filename: `cotizacion-${quotation.folio}.pdf`
        });
      }
    } catch (error) {
      console.error("Error downloading quotation PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al descargar el PDF" });
      }
    }
  });
  async function generateTicketNumber(tenantId) {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const result = await db.execute(sql5`
      SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'INC-[0-9]+-([0-9]+)$') AS INTEGER)), 0) AS maxnum
      FROM ${incidents}
      WHERE tenant_id = ${tenantId}
      AND ticket_number LIKE ${`INC-${year}-%`}
    `);
    const next = Number(result.rows[0].maxnum) + 1;
    return `INC-${year}-${String(next).padStart(5, "0")}`;
  }
  async function insertIncidentWithTicket(tenantId, buildValues) {
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNumber = await generateTicketNumber(tenantId);
      try {
        const [newIncident] = await db.insert(incidents).values(buildValues(ticketNumber)).returning();
        return newIncident;
      } catch (err) {
        if (err?.code === "23505" && attempt < 4) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }
  async function logIncidentActivity(incidentId, action, userId, previousValue, newValue, details, isFromCustomer = false) {
    await db.insert(incidentActivities).values({
      incidentId,
      userId,
      action,
      previousValue,
      newValue,
      details,
      isFromCustomer
    });
  }
  async function getTenantAdminEmails(tenantId) {
    try {
      const admins = await db.query.users.findMany({
        where: and4(
          eq5(users.tenantId, tenantId),
          eq5(users.role, UserRole.ADMIN),
          eq5(users.active, true)
        )
      });
      return admins.map((a) => a.email).filter((e) => !!e && e.includes("@"));
    } catch (error) {
      console.error("Error fetching admin emails:", error);
      return [];
    }
  }
  async function notifyAdminsOfIncident(params) {
    try {
      const { tenantId, eventType, incident, customerName, extraMessage } = params;
      const adminEmails = await getTenantAdminEmails(tenantId);
      if (adminEmails.length === 0) return;
      const tenant = await db.query.tenants.findFirst({
        where: eq5(tenants.id, tenantId)
      });
      const { sendIncidentNotificationEmail: sendIncidentNotificationEmail2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
      await sendIncidentNotificationEmail2({
        to: adminEmails,
        eventType,
        incident: {
          ticketNumber: incident.ticketNumber,
          customerName,
          type: incident.type,
          urgency: incident.urgency,
          status: incident.status,
          subject: incident.subject,
          description: incident.description,
          contactName: incident.contactName,
          contactEmail: incident.contactEmail,
          contactPhone: incident.contactPhone
        },
        extraMessage,
        tenantName: tenant?.name || "Nexxo"
      });
    } catch (error) {
      console.error("Error notifying admins of incident:", error);
    }
  }
  app2.get("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const { status, type, urgency, customerId, assignedTo, search, fromDate, toDate } = req.query;
      const scopedStorage = createTenantScopedStorage(req);
      let allIncidents = await scopedStorage.getAllIncidents();
      if (status && typeof status === "string") {
        allIncidents = allIncidents.filter((i) => i.status === status);
      }
      if (type && typeof type === "string") {
        allIncidents = allIncidents.filter((i) => i.type === type);
      }
      if (urgency && typeof urgency === "string") {
        allIncidents = allIncidents.filter((i) => i.urgency === urgency);
      }
      if (customerId && typeof customerId === "string") {
        allIncidents = allIncidents.filter((i) => i.customerId === customerId);
      }
      if (assignedTo && typeof assignedTo === "string") {
        allIncidents = allIncidents.filter((i) => i.assignedTo === assignedTo);
      }
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        allIncidents = allIncidents.filter(
          (i) => i.ticketNumber.toLowerCase().includes(searchLower) || i.subject.toLowerCase().includes(searchLower) || i.description.toLowerCase().includes(searchLower)
        );
      }
      if (fromDate && typeof fromDate === "string") {
        const from = new Date(fromDate);
        allIncidents = allIncidents.filter((i) => new Date(i.createdAt) >= from);
      }
      if (toDate && typeof toDate === "string") {
        const to = new Date(toDate);
        allIncidents = allIncidents.filter((i) => new Date(i.createdAt) <= to);
      }
      res.json(allIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Error al obtener incidentes" });
    }
  });
  app2.get("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id),
        with: {
          customer: true,
          assignee: true,
          creator: true,
          resolver: true,
          closer: true,
          product: true,
          order: true,
          invoice: true,
          comments: {
            with: { user: true },
            orderBy: (comments, { asc: asc2 }) => [asc2(comments.createdAt)]
          },
          attachments: {
            with: { uploader: true },
            orderBy: (attachments, { desc: desc3 }) => [desc3(attachments.createdAt)]
          },
          activities: {
            with: { user: true },
            orderBy: (activities, { desc: desc3 }) => [desc3(activities.createdAt)]
          }
        }
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ error: "Error al obtener el incidente" });
    }
  });
  app2.post("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const userTenantId = user.tenantId;
      const customerId = req.body.customerId;
      if (!customerId) {
        return res.status(400).json({ error: "Se requiere un cliente para crear el incidente" });
      }
      const customer = await db.query.customers.findFirst({
        where: eq5(customers.id, customerId)
      });
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      let tenantId;
      if (userTenantId) {
        if (customer.tenantId !== userTenantId) {
          return res.status(403).json({ error: "No tiene permiso para crear incidentes para este cliente" });
        }
        tenantId = userTenantId;
      } else if (user.isSuperAdmin) {
        tenantId = customer.tenantId;
      } else {
        return res.status(400).json({ error: "No se pudo determinar el tenant para el incidente" });
      }
      const accessToken = randomBytes2(32).toString("hex");
      const accessTokenExpires = null;
      const validated = insertIncidentSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      const newIncident = await insertIncidentWithTicket(tenantId, (ticketNumber) => ({
        ...validated,
        tenantId,
        ticketNumber,
        accessToken,
        accessTokenExpires
      }));
      await logIncidentActivity(
        newIncident.id,
        "created",
        user.id,
        void 0,
        void 0,
        `Incidente creado con n\xFAmero ${newIncident.ticketNumber}`
      );
      notifyAdminsOfIncident({
        tenantId,
        eventType: "created",
        incident: newIncident,
        customerName: customer.name,
        extraMessage: `Se ha creado un nuevo incidente (${newIncident.ticketNumber}) por ${user.fullName}.`
      });
      res.status(201).json(newIncident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(400).json({ error: "Error al crear el incidente" });
    }
  });
  app2.patch("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const tenantId = user.tenantId;
      const updates = req.body;
      const existing = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!existing) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (updates.status && updates.status !== existing.status) {
        await logIncidentActivity(id, "status_change", user.id, existing.status, updates.status);
      }
      if (updates.assignedTo && updates.assignedTo !== existing.assignedTo) {
        await logIncidentActivity(id, "assignment_change", user.id, existing.assignedTo || "Sin asignar", updates.assignedTo);
        if (updates.status === void 0 && existing.status === IncidentStatus.NUEVO) {
          updates.status = IncidentStatus.ASIGNADO;
        }
      }
      if (updates.type && updates.type !== existing.type) {
        await logIncidentActivity(id, "type_change", user.id, existing.type, updates.type);
      }
      if (updates.urgency && updates.urgency !== existing.urgency) {
        await logIncidentActivity(id, "urgency_change", user.id, existing.urgency, updates.urgency);
      }
      if (updates.resolution && !existing.resolution) {
        updates.resolvedAt = /* @__PURE__ */ new Date();
        updates.resolvedBy = user.id;
        if (!updates.status) {
          updates.status = IncidentStatus.RESUELTO;
        }
      }
      if (updates.status === IncidentStatus.CERRADO && existing.status !== IncidentStatus.CERRADO) {
        if (!existing.resolution && !updates.resolution) {
          return res.status(400).json({ error: "No se puede cerrar un incidente sin resoluci\xF3n" });
        }
        updates.closedAt = /* @__PURE__ */ new Date();
        updates.closedBy = user.id;
      }
      const [updated] = await db.update(incidents).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(incidents.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ error: "Error al actualizar el incidente" });
    }
  });
  app2.post("/api/quotations/:id/resend-shipping-notification", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq5(quotations.id, id),
        with: { customer: true, user: true }
      });
      if (!quotation) return res.status(404).json({ error: "Cotizaci\xF3n no encontrada" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotizaci\xF3n no tiene env\xEDo por Joper" });
      const apiKey = process.env.MAILERSEND_API_KEY;
      if (!apiKey) return res.status(503).json({ error: "MAILERSEND_API_KEY no configurado en el servidor" });
      const tenantId = quotation.tenantId;
      const adminUsers = await db.query.users.findMany({
        where: and4(eq5(users.tenantId, tenantId), eq5(users.role, UserRole.ADMIN))
      });
      console.log(`[ResendShippingEmail] Admins found (${adminUsers.length}):`, adminUsers.map((u) => `${u.fullName} <${u.email}>`));
      const adminEmails = adminUsers.filter((u) => u.email && u.email.includes("@")).map((u) => ({ email: u.email, name: u.fullName || u.username }));
      if (adminEmails.length === 0) {
        return res.status(400).json({ error: "No se encontraron usuarios administradores con correo en este tenant" });
      }
      const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, tenantId) });
      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "https";
      const quotationUrl = `${protocol}://${host}/quotations`;
      const items = await db.query.quotationItems.findMany({
        where: eq5(quotationItems.quotationId, id)
      });
      const crypto = await import("crypto");
      const shippingToken = crypto.randomBytes(32).toString("hex");
      await db.update(quotations).set({ shippingApprovalToken: shippingToken }).where(eq5(quotations.id, id));
      const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
      const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
      const { sendShippingApprovalRequestEmail: sendShippingApprovalRequestEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
      await sendShippingApprovalRequestEmail2({
        adminEmails,
        quotationData: {
          folio: quotation.folio,
          customerName: quotation.customer?.name || quotation.customerId,
          vendedorName: quotation.user?.fullName || quotation.userId,
          total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
          currency: quotation.currency || "MXN",
          itemsCount: items.length,
          shippingMethod: quotation.shippingMethod || "truck"
        },
        quotationUrl,
        tenantName: tenant?.name || "Nexxo",
        approveUrl,
        rejectUrl
      });
      console.log(`[ResendShippingEmail] Sent to: ${adminEmails.map((a) => a.email).join(", ")}`);
      res.json({ success: true, sentTo: adminEmails.map((a) => a.email) });
    } catch (error) {
      console.error("[ResendShippingEmail] Error:", error.message || error);
      res.status(500).json({ error: error.message || "Error al reenviar la notificaci\xF3n" });
    }
  });
  app2.post("/api/incidents/:id/renew-token", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const tenantId = user.tenantId;
      const existing = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });
      const newToken = randomBytes2(32).toString("hex");
      const [updated] = await db.update(incidents).set({ accessToken: newToken, accessTokenExpires: null }).where(eq5(incidents.id, id)).returning();
      res.json({ accessToken: updated.accessToken });
    } catch (error) {
      console.error("Error renewing incident token:", error);
      res.status(500).json({ error: "Error al renovar el enlace" });
    }
  });
  app2.post("/api/incidents/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const tenantId = user.tenantId;
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      const validated = insertIncidentCommentSchema.parse({
        ...req.body,
        incidentId: id,
        userId: user.id
      });
      const [comment] = await db.insert(incidentComments).values(validated).returning();
      await logIncidentActivity(
        id,
        "comment_added",
        user.id,
        void 0,
        void 0,
        validated.visibility === CommentVisibility.CUSTOMER ? "Comentario visible para cliente" : "Comentario interno"
      );
      if (incident.status === IncidentStatus.ESPERANDO_CLIENTE && validated.visibility === CommentVisibility.CUSTOMER) {
        await db.update(incidents).set({ status: IncidentStatus.EN_PROCESO, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(incidents.id, id));
      }
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(400).json({ error: "Error al agregar comentario" });
    }
  });
  app2.get("/api/incidents/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      const comments = await db.query.incidentComments.findMany({
        where: eq5(incidentComments.incidentId, id),
        with: { user: true },
        orderBy: (c, { asc: asc2 }) => [asc2(c.createdAt)]
      });
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Error al obtener comentarios" });
    }
  });
  app2.get("/api/incidents/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      const activities = await db.query.incidentActivities.findMany({
        where: eq5(incidentActivities.incidentId, id),
        with: { user: true },
        orderBy: (a, { desc: desc3 }) => [desc3(a.createdAt)]
      });
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Error al obtener actividades" });
    }
  });
  app2.get("/api/incidents/:incidentId/attachments/:attachmentId/download", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, attachmentId } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, incidentId), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, incidentId)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      const attachment = await db.query.incidentAttachments.findFirst({
        where: and4(
          eq5(incidentAttachments.id, attachmentId),
          eq5(incidentAttachments.incidentId, incidentId)
        )
      });
      if (!attachment) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      const encodedFilename = encodeURIComponent(attachment.originalName);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodedFilename}`);
      res.setHeader("Content-Type", attachment.mimeType);
      if (useLocalStorage4()) {
        const tryPaths = [
          `incidents/${attachment.storagePath}`,
          attachment.storagePath
        ];
        for (const tryPath of tryPaths) {
          const ok = await localStorageService.streamFile(tryPath, res);
          if (ok) return;
        }
        return res.status(404).json({ error: "Archivo no encontrado en almacenamiento" });
      }
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(attachment.storagePath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ error: "Error al descargar el archivo" });
    }
  });
  app2.post("/api/incidents/:incidentId/attachments/upload-url", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { filename, mimeType } = req.body;
      const tenantId = getEffectiveTenantId(req);
      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
      }
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, incidentId), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, incidentId)
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      if (useLocalStorage4()) {
        const ext = filename.split(".").pop() || "bin";
        const entityId2 = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const uploadURL2 = `${baseUrl}/api/incidents/upload-direct-auth`;
        return res.json({ uploadURL: uploadURL2, entityId: entityId2, incidentId, useDirectUpload: true });
      }
      const objectStorage = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorage.getObjectEntityUploadURL();
      res.json({ uploadURL, entityId, incidentId });
    } catch (error) {
      console.error("Error getting authenticated upload URL:", error);
      res.status(500).json({ error: "Error al obtener URL de subida" });
    }
  });
  app2.post("/api/incidents/upload-direct-auth", isAuthenticated, async (req, res) => {
    try {
      const entityId = req.headers["x-entity-id"];
      const contentType = req.headers["content-type"] || "application/octet-stream";
      if (!entityId) return res.status(400).json({ error: "Se requiere X-Entity-Id header" });
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const storagePath = await localStorageService.uploadIncidentAttachment(buffer, entityId, contentType);
          res.status(200).json({ success: true, path: storagePath });
        } catch (error) {
          console.error("Error saving authenticated incident attachment:", error);
          res.status(500).json({ error: "Error al guardar archivo" });
        }
      });
    } catch (error) {
      console.error("Error in direct auth upload:", error);
      res.status(500).json({ error: "Error al subir archivo" });
    }
  });
  app2.post("/api/incidents/:incidentId/attachments/confirm", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { entityId, filename, originalName, mimeType, size } = req.body;
      const tenantId = getEffectiveTenantId(req);
      const userId = req.user.id;
      if (!entityId || !filename || !originalName || !mimeType || !size) {
        return res.status(400).json({ error: "Faltan datos del archivo" });
      }
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, incidentId), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, incidentId)
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      if (useLocalStorage4()) {
        const fileBuffer = await localStorageService.getFile(`incidents/${entityId}`);
        if (!fileBuffer) return res.status(400).json({ error: "El archivo no se encontr\xF3 en el almacenamiento" });
      } else {
        const objectStorage = new ObjectStorageService();
        try {
          await objectStorage.getObjectEntityFile(entityId);
        } catch {
          return res.status(400).json({ error: "El archivo no se encontr\xF3 en el almacenamiento" });
        }
      }
      const [attachment] = await db.insert(incidentAttachments).values({
        incidentId: incident.id,
        filename,
        originalName,
        mimeType,
        size,
        storagePath: entityId,
        uploadedBy: userId,
        isFromCustomer: false
      }).returning();
      await logIncidentActivity(
        incident.id,
        "attachment_added",
        userId,
        void 0,
        void 0,
        `Archivo adjuntado: ${originalName}`,
        false
      );
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error confirming attachment:", error);
      res.status(500).json({ error: "Error al guardar el archivo" });
    }
  });
  app2.delete("/api/incidents/:incidentId/attachments/:attachmentId", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, attachmentId } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const incident = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, incidentId), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, incidentId)
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      const attachment = await db.query.incidentAttachments.findFirst({
        where: and4(eq5(incidentAttachments.id, attachmentId), eq5(incidentAttachments.incidentId, incidentId))
      });
      if (!attachment) return res.status(404).json({ error: "Archivo no encontrado" });
      await db.delete(incidentAttachments).where(eq5(incidentAttachments.id, attachmentId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "Error al eliminar el archivo" });
    }
  });
  app2.get("/api/public/customers/search", async (req, res) => {
    try {
      const { q, tenant } = req.query;
      if (!q || typeof q !== "string" || q.trim().length < 3) {
        return res.status(400).json({ error: "La b\xFAsqueda debe tener al menos 3 caracteres" });
      }
      const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const searchTerm = normalize(q.trim());
      const tenantId = req.tenant?.id;
      const allCustomers = await db.query.customers.findMany({
        columns: {
          id: true,
          name: true,
          rfc: true,
          microsipCode: true,
          city: true
        },
        where: tenantId ? eq5(customers.tenantId, tenantId) : void 0
      });
      const filtered = allCustomers.filter(
        (c) => normalize(c.name || "").includes(searchTerm) || normalize(c.rfc || "").includes(searchTerm) || normalize(c.microsipCode || "").includes(searchTerm)
      ).slice(0, 15).map((c) => ({
        id: c.id,
        name: c.name,
        rfc: c.rfc,
        city: c.city
      }));
      res.json(filtered);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ error: "Error al buscar clientes" });
    }
  });
  app2.post("/api/public/incidents", async (req, res) => {
    try {
      const { customerId, type, urgency, subject, description, contactName, contactEmail, contactPhone, warrantySerialNumber, attachments } = req.body;
      if (!customerId || !type || !subject || !description || !contactName || !contactEmail) {
        return res.status(400).json({
          error: "Faltan campos requeridos: empresa, tipo, asunto, descripci\xF3n, nombre de contacto y correo"
        });
      }
      if (type === IncidentType.GARANTIA && (!warrantySerialNumber || warrantySerialNumber.trim().length < 3)) {
        return res.status(400).json({
          error: "Para incidentes de garant\xEDa se requiere el n\xFAmero de serie del producto"
        });
      }
      const customer = await db.query.customers.findFirst({
        where: eq5(customers.id, customerId)
      });
      if (!customer) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }
      const tenantId = customer.tenantId;
      const accessToken = randomBytes2(32).toString("hex");
      const accessTokenExpires = null;
      const newIncident = await insertIncidentWithTicket(tenantId, (ticketNumber) => ({
        customerId,
        tenantId,
        type,
        urgency: urgency || IncidentUrgency.MEDIA,
        status: IncidentStatus.NUEVO,
        subject,
        description,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        warrantySerialNumber: type === IncidentType.GARANTIA ? warrantySerialNumber : null,
        ticketNumber,
        accessToken,
        accessTokenExpires,
        isFromCustomerPortal: true
      }));
      await logIncidentActivity(
        newIncident.id,
        "created",
        null,
        void 0,
        void 0,
        `Incidente creado desde portal de clientes con n\xFAmero ${newIncident.ticketNumber}`,
        true
      );
      notifyAdminsOfIncident({
        tenantId,
        eventType: "created",
        incident: newIncident,
        customerName: customer.name,
        extraMessage: `Un cliente ha creado un nuevo incidente (${newIncident.ticketNumber}) desde el portal de clientes.`
      });
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];
        const maxFileSize = 50 * 1024 * 1024;
        const objectStorageService = new ObjectStorageService();
        for (const att of attachments) {
          if (att.entityId && att.filename && att.originalName && att.mimeType && att.size) {
            if (!allowedMimeTypes.includes(att.mimeType)) {
              console.warn("Invalid MIME type skipped:", att.mimeType);
              continue;
            }
            if (att.size > maxFileSize) {
              console.warn("File too large skipped:", att.size);
              continue;
            }
            try {
              await objectStorageService.getObjectEntityFile(att.entityId);
              await db.insert(incidentAttachments).values({
                incidentId: newIncident.id,
                filename: att.filename,
                originalName: att.originalName,
                mimeType: att.mimeType,
                size: att.size,
                storagePath: att.entityId,
                isFromCustomer: true
              });
            } catch (error) {
              console.error("Error saving attachment:", att.entityId, error);
            }
          }
        }
      }
      res.status(201).json({
        success: true,
        ticketNumber: newIncident.ticketNumber,
        accessToken: newIncident.accessToken,
        message: `Su ticket #${newIncident.ticketNumber} ha sido creado exitosamente.`
      });
    } catch (error) {
      console.error("Error creating public incident:", error);
      res.status(500).json({ error: "Error al crear el incidente" });
    }
  });
  app2.get("/api/public/incidents/lookup/:ticketNumber", async (req, res) => {
    try {
      const { ticketNumber } = req.params;
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Se requiere el correo electr\xF3nico para verificar" });
      }
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.ticketNumber, ticketNumber)
      });
      if (!incident) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      if (incident.contactEmail?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ error: "El correo no coincide con el registrado para este ticket" });
      }
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace de acceso ha expirado" });
      }
      res.json({ accessToken: incident.accessToken });
    } catch (error) {
      console.error("Error looking up incident:", error);
      res.status(500).json({ error: "Error al buscar el ticket" });
    }
  });
  async function buildWarrantyData(incidentId, tenantId, overrides = {}) {
    const incident = await db.query.incidents.findFirst({
      where: tenantId ? and4(eq5(incidents.id, incidentId), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, incidentId),
      with: { customer: true, assignee: true, product: true, order: true, invoice: true }
    });
    if (!incident) return null;
    const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, incident.tenantId) });
    return {
      incident,
      tenant,
      pdfData: {
        ticketNumber: incident.ticketNumber,
        type: incident.type,
        status: incident.status,
        urgency: incident.urgency,
        subject: overrides.subject ?? incident.subject,
        description: overrides.description ?? incident.description,
        createdAt: incident.createdAt,
        customerName: incident.customer?.name || "\u2014",
        customerAddress: incident.customer?.address,
        customerCity: [incident.customer?.city, incident.customer?.state].filter(Boolean).join(", ") || null,
        contactName: overrides.contactName ?? incident.contactName,
        contactEmail: overrides.contactEmail ?? incident.contactEmail,
        contactPhone: overrides.contactPhone ?? incident.contactPhone,
        productName: overrides.productName ?? incident.product?.name ?? null,
        productSku: overrides.productSku ?? incident.product?.code ?? null,
        warrantySerialNumber: overrides.warrantySerialNumber ?? incident.warrantySerialNumber,
        referenceNumber: overrides.referenceNumber ?? incident.referenceNumber,
        orderFolio: incident.order?.folio ?? null,
        invoiceFolio: overrides.invoiceNumber || incident.invoice?.folio || null,
        assigneeName: incident.assignee?.fullName ?? null,
        assignedArea: incident.assignedArea,
        resolution: overrides.resolution ?? incident.resolution,
        observations: overrides.observations ?? null,
        tenant: tenant ?? null
      }
    };
  }
  app2.delete("/api/incidents/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const existing = await db.query.incidents.findFirst({
        where: tenantId ? and4(eq5(incidents.id, id), eq5(incidents.tenantId, tenantId)) : eq5(incidents.id, id)
      });
      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });
      await db.transaction(async (tx) => {
        await tx.delete(incidentComments).where(eq5(incidentComments.incidentId, id));
        await tx.delete(incidentActivities).where(eq5(incidentActivities.incidentId, id));
        await tx.delete(incidentAttachments).where(eq5(incidentAttachments.incidentId, id));
        await tx.delete(incidents).where(eq5(incidents.id, id));
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting incident:", error);
      res.status(500).json({ error: "Error al eliminar el incidente" });
    }
  });
  app2.post("/api/incidents/:id/warranty-pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId ?? null;
      const result = await buildWarrantyData(id, tenantId, req.body || {});
      if (!result) return res.status(404).json({ error: "Incidente no encontrado" });
      const { generateIncidentWarrantyPDF: generateIncidentWarrantyPDF2 } = await Promise.resolve().then(() => (init_incident_warranty_pdf_generator(), incident_warranty_pdf_generator_exports));
      const stream = await generateIncidentWarrantyPDF2(result.pdfData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Garantia-${result.incident.ticketNumber}.pdf"`);
      stream.pipe(res);
    } catch (error) {
      console.error("Error generating warranty PDF:", error);
      res.status(500).json({ error: error.message || "Error al generar la hoja de garant\xEDa" });
    }
  });
  app2.post("/api/incidents/:id/send-warranty-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenantId ?? null;
      const { toEmail, toName, ccAdmins = true, overrides = {} } = req.body || {};
      if (!toEmail) return res.status(400).json({ error: "Se requiere correo del destinatario" });
      const result = await buildWarrantyData(id, tenantId, overrides);
      if (!result) return res.status(404).json({ error: "Incidente no encontrado" });
      const { generateIncidentWarrantyPDF: generateIncidentWarrantyPDF2 } = await Promise.resolve().then(() => (init_incident_warranty_pdf_generator(), incident_warranty_pdf_generator_exports));
      const stream = await generateIncidentWarrantyPDF2(result.pdfData);
      const chunks = [];
      await new Promise((resolve2, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", resolve2);
        stream.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);
      let ccEmails = [];
      if (ccAdmins && tenantId) {
        const admins = await db.query.users.findMany({
          where: and4(eq5(users.tenantId, tenantId), eq5(users.role, UserRole.ADMIN))
        });
        ccEmails = admins.filter((u) => u.email && u.email.includes("@") && u.email !== toEmail).map((u) => ({ email: u.email, name: u.fullName || u.username }));
      }
      const { sendWarrantySheetEmail: sendWarrantySheetEmail2 } = await Promise.resolve().then(() => (init_quotation_email_service(), quotation_email_service_exports));
      await sendWarrantySheetEmail2({
        toEmail,
        toName: toName || result.incident.customer?.name || "Cliente",
        ccEmails,
        ticketNumber: result.incident.ticketNumber,
        customerName: result.incident.customer?.name || "\u2014",
        subject: overrides.subject || result.incident.subject,
        tenantName: result.tenant?.name || "Nexxo",
        pdfBuffer
      });
      res.json({ success: true, sentTo: toEmail, cc: ccEmails.map((c) => c.email) });
    } catch (error) {
      console.error("Error sending warranty email:", error);
      res.status(500).json({ error: error.message || "Error al enviar el correo de garant\xEDa" });
    }
  });
  app2.get("/api/public/incidents/:token/pdf", async (req, res) => {
    try {
      const { token } = req.params;
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token),
        with: {
          customer: true,
          assignee: true,
          comments: {
            where: eq5(incidentComments.visibility, CommentVisibility.CUSTOMER),
            with: { user: true },
            orderBy: (c, { asc: asc2 }) => [asc2(c.createdAt)]
          }
        }
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }
      const tenant = await db.query.tenants.findFirst({ where: eq5(tenants.id, incident.tenantId) });
      const PDFDocument9 = (await import("pdfkit")).default;
      const doc = new PDFDocument9({ size: "LETTER", margin: 0, autoFirstPage: true });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Incidente-${incident.ticketNumber}.pdf"`);
      doc.pipe(res);
      const primaryColor = tenant?.primaryColor || "#1a365d";
      const lighten = (hex, amt) => {
        const c = hex.replace("#", "");
        const r = Math.min(255, parseInt(c.substring(0, 2), 16) + Math.round((255 - parseInt(c.substring(0, 2), 16)) * amt));
        const g = Math.min(255, parseInt(c.substring(2, 4), 16) + Math.round((255 - parseInt(c.substring(2, 4), 16)) * amt));
        const b = Math.min(255, parseInt(c.substring(4, 6), 16) + Math.round((255 - parseInt(c.substring(4, 6), 16)) * amt));
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      };
      const lightColor = lighten(primaryColor, 0.92);
      const mediumColor = lighten(primaryColor, 0.75);
      const PAGE_W = 612;
      const MARGIN = 40;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      doc.rect(0, 0, PAGE_W, 90).fill(primaryColor);
      doc.fontSize(18).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(tenant?.legalName || tenant?.name || "Empresa", MARGIN, 18, { width: CONTENT_W });
      doc.fontSize(10).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
      doc.text("REPORTE DE INCIDENTE / TICKET DE SERVICIO", MARGIN, 44, { width: CONTENT_W });
      if (tenant?.rfc) doc.text(`RFC: ${tenant.rfc}`, MARGIN, 58, { width: CONTENT_W });
      doc.rect(0, 90, PAGE_W, 28).fill(mediumColor);
      doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text(incident.ticketNumber, MARGIN, 97, { width: CONTENT_W * 0.5 });
      doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
      const statusMap = { nuevo: "Nuevo", asignado: "Asignado", en_proceso: "En Proceso", esperando_cliente: "Esperando Cliente", esperando_interno: "En Revisi\xF3n", resuelto: "Resuelto", cerrado: "Cerrado", cancelado: "Cancelado" };
      doc.text(`Estado: ${statusMap[incident.status] || incident.status}`, MARGIN + CONTENT_W * 0.5, 100, { width: CONTENT_W * 0.5, align: "right" });
      let Y = 130;
      const infoItems = [
        ["Tipo", { garantia: "Garant\xEDa", retrabajo: "Retrabajo", queja: "Queja", consulta: "Consulta", administrativo: "Administrativo" }[incident.type] || incident.type],
        ["Urgencia", { baja: "Baja", media: "Media", alta: "Alta", critica: "Cr\xEDtica" }[incident.urgency] || incident.urgency],
        ["Asignado a", incident.assignee?.fullName || "Sin asignar"],
        ["Fecha creaci\xF3n", new Date(incident.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })],
        ["Asunto", incident.subject]
      ];
      const COL_W = CONTENT_W / 2 - 6;
      infoItems.forEach((pair, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = MARGIN + col * (COL_W + 12);
        const by = Y + row * 38;
        doc.rect(bx, by, COL_W, 34).fill(lightColor);
        doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
        doc.text(pair[0].toUpperCase(), bx + 6, by + 5, { width: COL_W - 12 });
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827");
        doc.text(pair[1], bx + 6, by + 16, { width: COL_W - 12, lineBreak: false, ellipsis: true });
      });
      Y += Math.ceil(infoItems.length / 2) * 38 + 16;
      doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("DESCRIPCI\xD3N", MARGIN + 6, Y + 3);
      Y += 14;
      const descH = Math.max(40, doc.heightOfString(incident.description, { width: CONTENT_W - 12 }) + 16);
      doc.rect(MARGIN, Y, CONTENT_W, descH).fill(lightColor);
      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      doc.text(incident.description, MARGIN + 6, Y + 8, { width: CONTENT_W - 12 });
      Y += descH + 14;
      if (incident.resolution) {
        doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("RESOLUCI\xD3N", MARGIN + 6, Y + 3);
        Y += 14;
        const resH = Math.max(40, doc.heightOfString(incident.resolution, { width: CONTENT_W - 12 }) + 16);
        doc.rect(MARGIN, Y, CONTENT_W, resH).fill(lightColor);
        doc.fontSize(9).font("Helvetica").fillColor("#374151");
        doc.text(incident.resolution, MARGIN + 6, Y + 8, { width: CONTENT_W - 12 });
        Y += resH + 14;
      }
      if (incident.comments && incident.comments.length > 0) {
        doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("CONVERSACI\xD3N", MARGIN + 6, Y + 3);
        Y += 14;
        for (const comment of incident.comments) {
          const who = comment.isFromCustomer ? "Cliente" : comment.user?.fullName || "Soporte";
          const when = new Date(comment.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
          const cH = Math.max(32, doc.heightOfString(comment.content, { width: CONTENT_W - 24 }) + 20);
          if (Y + cH > 720) {
            doc.addPage({ size: "LETTER", margin: 0 });
            Y = 40;
          }
          doc.rect(MARGIN, Y, CONTENT_W, cH).fill(comment.isFromCustomer ? lighten(primaryColor, 0.85) : lightColor);
          doc.fontSize(7).font("Helvetica-Bold").fillColor("#374151");
          doc.text(`${who}  \xB7  ${when}`, MARGIN + 8, Y + 6, { width: CONTENT_W - 16 });
          doc.fontSize(8.5).font("Helvetica").fillColor("#111827");
          doc.text(comment.content, MARGIN + 8, Y + 17, { width: CONTENT_W - 16 });
          Y += cH + 4;
        }
        Y += 10;
      }
      if (Y > 720) {
        doc.addPage({ size: "LETTER", margin: 0 });
        Y = 40;
      }
      doc.rect(0, 755, PAGE_W, 37).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
      const footerParts = [tenant?.rfc ? `RFC: ${tenant.rfc}` : null, tenant?.email, tenant?.phone].filter(Boolean);
      doc.text(footerParts.join("   |   "), MARGIN, 763, { width: CONTENT_W, align: "center" });
      doc.text(`Generado el ${(/* @__PURE__ */ new Date()).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, MARGIN, 775, { width: CONTENT_W, align: "center" });
      doc.end();
    } catch (error) {
      console.error("Error generating incident PDF:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error al generar el PDF" });
    }
  });
  app2.get("/api/public/incidents/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token),
        with: {
          customer: true,
          assignee: true,
          product: true,
          comments: {
            where: eq5(incidentComments.visibility, CommentVisibility.CUSTOMER),
            with: { user: true },
            orderBy: (c, { asc: asc2 }) => [asc2(c.createdAt)]
          },
          attachments: true
        }
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }
      const activities = await db.query.incidentActivities.findMany({
        where: and4(
          eq5(incidentActivities.incidentId, incident.id),
          eq5(incidentActivities.isFromCustomer, false)
        ),
        orderBy: (a, { desc: desc3 }) => [desc3(a.createdAt)]
      });
      res.json({ ...incident, activities });
    } catch (error) {
      console.error("Error fetching public incident:", error);
      res.status(500).json({ error: "Error al obtener el incidente" });
    }
  });
  app2.post("/api/public/incidents/:token/comments", async (req, res) => {
    try {
      const { token } = req.params;
      const { content, attachments } = req.body;
      const hasContent = content && typeof content === "string" && content.trim().length > 0;
      const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;
      if (!hasContent && !hasAttachments) {
        return res.status(400).json({ error: "El comentario no puede estar vac\xEDo" });
      }
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }
      if (incident.status === IncidentStatus.CERRADO) {
        return res.status(400).json({ error: "No se pueden agregar comentarios a un incidente cerrado" });
      }
      const [comment] = await db.insert(incidentComments).values({
        incidentId: incident.id,
        content: hasContent ? content.trim() : "[Evidencia adjunta]",
        visibility: CommentVisibility.CUSTOMER,
        isFromCustomer: true
      }).returning();
      if (hasAttachments) {
        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ];
        const maxFileSize = 50 * 1024 * 1024;
        const objectStorage = new ObjectStorageService();
        for (const att of attachments) {
          if (att.entityId && att.filename && att.originalName && att.mimeType && att.size) {
            if (!allowedMimeTypes.includes(att.mimeType)) continue;
            if (att.size > maxFileSize) continue;
            try {
              await objectStorage.getObjectEntityFile(att.entityId);
              await db.insert(incidentAttachments).values({
                incidentId: incident.id,
                filename: att.filename,
                originalName: att.originalName,
                mimeType: att.mimeType,
                size: att.size,
                storagePath: att.entityId,
                isFromCustomer: true
              });
            } catch (error) {
              console.error("Error saving comment attachment:", att.entityId, error);
            }
          }
        }
      }
      await logIncidentActivity(
        incident.id,
        "customer_comment",
        null,
        void 0,
        void 0,
        hasAttachments ? "Comentario con evidencia agregado por el cliente" : "Comentario agregado por el cliente",
        true
      );
      const commentCustomer = await db.query.customers.findFirst({
        where: eq5(customers.id, incident.customerId)
      });
      notifyAdminsOfIncident({
        tenantId: incident.tenantId,
        eventType: "customer_comment",
        incident,
        customerName: commentCustomer?.name || "Cliente",
        extraMessage: hasContent ? `El cliente respondi\xF3 en el incidente ${incident.ticketNumber}: "${content.trim()}"` : `El cliente agreg\xF3 evidencia al incidente ${incident.ticketNumber}.`
      });
      if (incident.status === IncidentStatus.ESPERANDO_CLIENTE) {
        await db.update(incidents).set({ status: IncidentStatus.EN_PROCESO, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(incidents.id, incident.id));
      }
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding customer comment:", error);
      res.status(500).json({ error: "Error al agregar comentario" });
    }
  });
  app2.post("/api/public/incidents/:token/attachments/upload-url", async (req, res) => {
    try {
      const { token } = req.params;
      const { filename, mimeType } = req.body;
      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
      }
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }
      if (useLocalStorage4()) {
        const ext = filename.split(".").pop() || "bin";
        const entityId2 = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const uploadURL2 = `${baseUrl}/api/public/incidents/upload-direct`;
        res.json({ uploadURL: uploadURL2, entityId: entityId2, incidentId: incident.id, useDirectUpload: true });
        return;
      }
      const objectStorage = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorage.getObjectEntityUploadURL();
      res.json({ uploadURL, entityId, incidentId: incident.id });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Error al obtener URL de subida" });
    }
  });
  app2.post("/api/public/incidents/:token/attachments", async (req, res) => {
    try {
      const { token } = req.params;
      const { entityId, filename, originalName, mimeType, size } = req.body;
      if (!entityId || !filename || !originalName || !mimeType || !size) {
        return res.status(400).json({ error: "Faltan datos del archivo" });
      }
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (useLocalStorage4()) {
        const fileBuffer = await localStorageService.getFile(`incidents/${entityId}`);
        if (!fileBuffer) {
          return res.status(400).json({ error: "El archivo no se encontr\xF3 en el almacenamiento" });
        }
      } else {
        const objectStorage = new ObjectStorageService();
        try {
          await objectStorage.getObjectEntityFile(entityId);
        } catch (error) {
          return res.status(400).json({ error: "El archivo no se encontr\xF3 en el almacenamiento" });
        }
      }
      const [attachment] = await db.insert(incidentAttachments).values({
        incidentId: incident.id,
        filename,
        originalName,
        mimeType,
        size,
        storagePath: entityId,
        isFromCustomer: true
      }).returning();
      await logIncidentActivity(
        incident.id,
        "attachment_added",
        null,
        void 0,
        void 0,
        `Cliente adjunt\xF3 archivo: ${originalName}`,
        true
      );
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error saving attachment:", error);
      res.status(500).json({ error: "Error al guardar el archivo" });
    }
  });
  app2.post("/api/public/incidents/upload-url", async (req, res) => {
    try {
      const { filename, mimeType } = req.body;
      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
      }
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Tipo de archivo no permitido" });
      }
      if (useLocalStorage4()) {
        const ext = filename.split(".").pop() || "bin";
        const entityId2 = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const uploadURL2 = `${baseUrl}/api/public/incidents/upload-direct`;
        res.json({ uploadURL: uploadURL2, entityId: entityId2, useDirectUpload: true });
        return;
      }
      const objectStorage = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorage.getObjectEntityUploadURL();
      res.json({ uploadURL, entityId });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Error al obtener URL de subida" });
    }
  });
  app2.post("/api/public/incidents/upload-direct", async (req, res) => {
    try {
      const entityId = req.headers["x-entity-id"];
      const contentType = req.headers["content-type"] || "application/octet-stream";
      if (!entityId) {
        return res.status(400).json({ error: "Se requiere X-Entity-Id header" });
      }
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const storagePath = await localStorageService.uploadIncidentAttachment(buffer, entityId, contentType);
          console.log(`\u2705 Incident attachment uploaded to local storage: ${storagePath}`);
          res.status(200).json({ success: true, path: storagePath });
        } catch (error) {
          console.error("Error saving incident attachment:", error);
          res.status(500).json({ error: "Error al guardar archivo" });
        }
      });
    } catch (error) {
      console.error("Error uploading incident attachment:", error);
      res.status(500).json({ error: "Error al subir archivo" });
    }
  });
  app2.get("/api/public/incidents/:token/attachments/:attachmentId", async (req, res) => {
    try {
      const { token, attachmentId } = req.params;
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < /* @__PURE__ */ new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }
      const attachment = await db.query.incidentAttachments.findFirst({
        where: and4(
          eq5(incidentAttachments.id, attachmentId),
          eq5(incidentAttachments.incidentId, incident.id)
        )
      });
      if (!attachment) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      const encodedFilename = encodeURIComponent(attachment.originalName);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodedFilename}`);
      res.setHeader("Content-Type", attachment.mimeType);
      if (useLocalStorage4()) {
        const success = await localStorageService.streamFile(`incidents/${attachment.storagePath}`, res);
        if (!success) {
          return res.status(404).json({ error: "Archivo no encontrado" });
        }
      } else {
        const objectStorage = new ObjectStorageService();
        const objectFile = await objectStorage.getObjectEntityFile(attachment.storagePath);
        objectStorage.downloadObject(objectFile, res);
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ error: "Error al descargar el archivo" });
    }
  });
  app2.post("/api/public/incidents/:token/confirm-close", async (req, res) => {
    try {
      const { token } = req.params;
      const incident = await db.query.incidents.findFirst({
        where: eq5(incidents.accessToken, token)
      });
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      if (incident.status !== IncidentStatus.RESUELTO) {
        return res.status(400).json({ error: "Solo se pueden confirmar incidentes resueltos" });
      }
      const [updated] = await db.update(incidents).set({
        status: IncidentStatus.CERRADO,
        customerConfirmedClose: true,
        closedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(incidents.id, incident.id)).returning();
      await logIncidentActivity(
        incident.id,
        "customer_confirmed_close",
        null,
        IncidentStatus.RESUELTO,
        IncidentStatus.CERRADO,
        "Cliente confirm\xF3 el cierre del incidente",
        true
      );
      res.json(updated);
    } catch (error) {
      console.error("Error confirming closure:", error);
      res.status(500).json({ error: "Error al confirmar el cierre" });
    }
  });
  app2.get("/api/microsip/config", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const [config] = await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId));
      if (!config) {
        return res.json({ configured: false });
      }
      const { password, ...safeConfig } = config;
      res.json({ configured: true, ...safeConfig, password: password ? "********" : null });
    } catch (error) {
      console.error("Error getting Microsip config:", error);
      res.status(500).json({ error: "Error al obtener configuraci\xF3n de Microsip" });
    }
  });
  app2.post("/api/microsip/config", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const validated = insertMicrosipConfigSchema.parse({
        ...req.body,
        tenantId
      });
      const [existing] = await db.select().from(microsipConfigs).where(eq5(microsipConfigs.tenantId, tenantId));
      if (existing) {
        const updateData = { ...validated, updatedAt: /* @__PURE__ */ new Date() };
        if (validated.password === "********") {
          delete updateData.password;
        }
        const [updated] = await db.update(microsipConfigs).set(updateData).where(eq5(microsipConfigs.id, existing.id)).returning();
        const { password, ...safeConfig } = updated;
        res.json({ ...safeConfig, password: "********" });
      } else {
        const [created] = await db.insert(microsipConfigs).values(validated).returning();
        const { password, ...safeConfig } = created;
        res.json({ ...safeConfig, password: "********" });
      }
    } catch (error) {
      console.error("Error saving Microsip config:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ error: "Datos inv\xE1lidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al guardar configuraci\xF3n de Microsip" });
    }
  });
  app2.post("/api/microsip/test-connection", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Microsip connection:", error);
      res.status(500).json({ success: false, message: `Error: ${error.message}` });
    }
  });
  const microsipQuerySchema = z3.object({
    sql: z3.string().min(1).max(2e3).trim()
  });
  app2.post("/api/microsip/query", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const validated = microsipQuerySchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ error: "Consulta SQL inv\xE1lida", details: validated.error.errors });
      }
      const { sql: sql6 } = validated.data;
      console.log(`[Microsip Query] Tenant: ${tenantId}, Query: ${sql6.substring(0, 100)}...`);
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.executeReadOnlyQuery(sql6);
      res.json(result);
    } catch (error) {
      console.error("Error executing Microsip query:", error);
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/microsip/sync", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { type } = req.body;
      const service = await createMicrosipSyncService(tenantId);
      res.json({ success: true, message: "Sincronizaci\xF3n iniciada en segundo plano. Revisa el historial para ver el resultado." });
      (async () => {
        try {
          switch (type) {
            case "customers":
              await service.syncCustomers();
              break;
            case "products":
              await service.syncProducts();
              break;
            case "categories":
              await service.syncCategories();
              break;
            case "invoices":
              await service.syncInvoices();
              break;
            case "payments":
              await service.syncPayments();
              break;
            case "all":
            default:
              await service.syncAll();
              break;
          }
        } catch (bgErr) {
          console.error("[Microsip] Background sync error:", bgErr.message);
        }
      })();
    } catch (error) {
      console.error("Error during Microsip sync:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app2.get("/api/microsip/logs", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const logs = await db.select().from(microsipSyncLogs).where(eq5(microsipSyncLogs.tenantId, tenantId)).orderBy(sql5`${microsipSyncLogs.startedAt} DESC`).limit(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error getting Microsip logs:", error);
      res.status(500).json({ error: "Error al obtener logs de sincronizaci\xF3n" });
    }
  });
  app2.patch("/api/microsip/toggle", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { enabled } = req.body;
      const [updated] = await db.update(microsipConfigs).set({ enabled: !!enabled, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(microsipConfigs.tenantId, tenantId)).returning();
      if (!updated) {
        return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
      }
      const { password, ...safeConfig } = updated;
      res.json({ ...safeConfig, password: "********" });
    } catch (error) {
      console.error("Error toggling Microsip sync:", error);
      res.status(500).json({ error: "Error al cambiar estado de sincronizaci\xF3n" });
    }
  });
  app2.get("/api/microsip/debug-cxc/:clienteId", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const clienteId = parseInt(req.params.clienteId);
      if (isNaN(clienteId)) return res.status(400).json({ error: "clienteId must be numeric" });
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.debugCxcCustomer(clienteId);
      res.json(result);
    } catch (err) {
      console.error("[debug-cxc] error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app2.get("/api/microsip/debug-balance/:clienteId", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const clienteId = parseInt(req.params.clienteId);
      if (isNaN(clienteId)) return res.status(400).json({ error: "clienteId must be numeric" });
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.debugBalanceBreakdown(clienteId);
      res.json(result);
    } catch (err) {
      console.error("[debug-balance] error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/migrate.ts
init_db();
var MIGRATIONS = [
  {
    id: "001_add_timezone_to_tenants",
    sql: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Mexico_City'`
  },
  {
    id: "002_add_microsip_cxc_database",
    sql: `ALTER TABLE microsip_configs ADD COLUMN IF NOT EXISTS cxc_database text`
  },
  {
    id: "003b_add_locale_to_tenants",
    sql: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS locale text DEFAULT 'es'`
  },
  {
    id: "004_add_shipping_approval_token",
    sql: `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_approval_token text UNIQUE`
  },
  {
    id: "005_add_order_release_fields",
    sql: `
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_notes text;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_by_id varchar;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_at timestamptz;
    `
  },
  {
    id: "003_create_account_statement_schedules",
    sql: `CREATE TABLE IF NOT EXISTS account_statement_schedules (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id text NOT NULL REFERENCES tenants(id),
      enabled boolean NOT NULL DEFAULT false,
      schedule_days integer[] NOT NULL DEFAULT '{1,15}',
      send_hour integer NOT NULL DEFAULT 9,
      only_overdue boolean NOT NULL DEFAULT false,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
  },
  {
    id: "006_create_system_logs",
    sql: `
      CREATE TABLE IF NOT EXISTS system_logs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL REFERENCES tenants(id),
        category text NOT NULL,
        level text NOT NULL DEFAULT 'info',
        action text,
        message text NOT NULL,
        details jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_created ON system_logs (tenant_id, created_at DESC);
    `
  },
  {
    id: "007_create_documents",
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL REFERENCES tenants(id),
        title text NOT NULL,
        description text,
        type text NOT NULL DEFAULT 'operativo',
        category text,
        product_id varchar REFERENCES products(id),
        file_url text NOT NULL,
        file_name text NOT NULL,
        file_size integer,
        uploaded_by varchar REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents (tenant_id);
    `
  }
];
async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    for (const migration of MIGRATIONS) {
      const { rows } = await client.query(
        `SELECT id FROM _schema_migrations WHERE id = $1`,
        [migration.id]
      );
      if (rows.length === 0) {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO _schema_migrations (id) VALUES ($1)`,
          [migration.id]
        );
        log(`Migration applied: ${migration.id}`);
      }
    }
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// server/account-statement-scheduler.ts
init_db();
init_schema();
import { eq as eq6, and as and5 } from "drizzle-orm";
function todayInMexico(tz = "America/Mexico_City") {
  return (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: tz });
}
function hourInMexico(tz = "America/Mexico_City") {
  return parseInt((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10);
}
function dayOfMonthInMexico(tz = "America/Mexico_City") {
  return parseInt((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: tz, day: "numeric" }), 10);
}
async function runAccountStatementScheduler() {
  const tz = "America/Mexico_City";
  const todayDay = dayOfMonthInMexico(tz);
  const currentHour = hourInMexico(tz);
  const todayStr = todayInMexico(tz);
  const schedules = await db.query.accountStatementSchedules.findMany({
    where: eq6(accountStatementSchedules.enabled, true)
  });
  for (const schedule of schedules) {
    if (!schedule.scheduleDays.includes(todayDay)) continue;
    if (currentHour < schedule.sendHour) continue;
    if (schedule.lastRunAt) {
      const lastRunDay = new Date(schedule.lastRunAt).toLocaleDateString("en-CA", { timeZone: tz });
      if (lastRunDay === todayStr) {
        continue;
      }
    }
    console.log(`[StatementScheduler] Sending for tenant ${schedule.tenantId} (day ${todayDay}, hour ${currentHour})`);
    try {
      await runForTenant(schedule.tenantId, schedule.onlyOverdue);
      await db.update(accountStatementSchedules).set({ lastRunAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq6(accountStatementSchedules.id, schedule.id));
      console.log(`[StatementScheduler] Done for tenant ${schedule.tenantId}`);
    } catch (err) {
      console.error(`[StatementScheduler] Error for tenant ${schedule.tenantId}:`, err);
    }
  }
}
async function runForTenant(tenantId, onlyOverdue) {
  const tenant = await db.query.tenants.findFirst({ where: eq6(tenants.id, tenantId) });
  if (!tenant) return;
  const allCustomers = await db.query.customers.findMany({
    where: eq6(customers.tenantId, tenantId)
  });
  const adminUsers = await db.query.users.findMany({
    where: and5(eq6(users.tenantId, tenantId))
  });
  const ccEmails = adminUsers.filter((u) => u.role === "admin" || u.role === "credito_cobranza").flatMap((u) => (u.email ?? "").split(/[;,]/).map((e) => e.trim())).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const microsipConfigured = (await db.select().from(microsipConfigs).where(eq6(microsipConfigs.tenantId, tenantId)).limit(1)).length > 0;
  let msService = null;
  try {
    msService = await createMicrosipSyncService(tenantId);
  } catch (_e) {
    if (microsipConfigured) {
      console.error(`[StatementScheduler] Microsip configured but unavailable for tenant ${tenantId}; linked customers will be skipped`);
    } else {
      console.warn(`[StatementScheduler] Microsip not configured for tenant ${tenantId}, using local DB`);
    }
  }
  if (msService) {
    try {
      const invResult = await msService.syncInvoices();
      const payResult = await msService.syncPayments();
      console.log(
        `[StatementScheduler] Pre-send refresh for tenant ${tenantId}: facturas (+${invResult.created} nuevas, ${invResult.updated} actualizadas), pagos (+${payResult.created} nuevos, ${payResult.updated} actualizados)`
      );
      await logSystemActivity({
        tenantId,
        category: "account_statement",
        action: "pre_send_refresh",
        level: "info",
        message: `Datos actualizados desde Microsip antes del env\xEDo: ${invResult.created} facturas nuevas, ${invResult.updated} actualizadas; ${payResult.created} pagos nuevos, ${payResult.updated} actualizados.`,
        details: { invoices: invResult, payments: payResult }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[StatementScheduler] Pre-send refresh failed for tenant ${tenantId} (se enviar\xE1 con datos disponibles):`, err);
      await logSystemActivity({
        tenantId,
        category: "account_statement",
        action: "pre_send_refresh",
        level: "warning",
        message: `No se pudo actualizar con Microsip antes del env\xEDo; se enviar\xE1 con los datos disponibles. (${msg})`
      });
    }
  } else {
    await logSystemActivity({
      tenantId,
      category: "account_statement",
      action: "pre_send_refresh",
      level: "warning",
      message: "Microsip no est\xE1 configurado o no disponible; se enviar\xE1 con los datos locales disponibles."
    });
  }
  const { sendAccountStatementEmail: sendAccountStatementEmail2 } = await Promise.resolve().then(() => (init_account_statement_email_service(), account_statement_email_service_exports));
  const now = /* @__PURE__ */ new Date();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failedCustomers = [];
  for (const customer of allCustomers) {
    const emails = (customer.email ?? "").split(/[;,]/).map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (customer.skipStatementEmail) {
      skipped++;
      continue;
    }
    if (emails.length === 0) {
      skipped++;
      continue;
    }
    const [custInvoices, custPayments] = await Promise.all([
      db.query.invoices.findMany({ where: eq6(invoices.customerId, customer.id) }),
      db.query.payments.findMany({ where: eq6(payments.customerId, customer.id) })
    ]);
    let liveData;
    if (microsipConfigured && !msService && customer.microsipId) {
      failed++;
      failedCustomers.push(`${customer.name} (Microsip no disponible)`);
      continue;
    }
    if (msService && customer.microsipId) {
      try {
        liveData = await msService.queryLiveCxcStatementForCustomer(customer.microsipId);
      } catch (_e) {
        failed++;
        failedCustomers.push(`${customer.name} (Microsip no disponible)`);
        console.error(`[StatementScheduler] Live CXC failed for ${customer.name}, skipping:`, _e?.message);
        continue;
      }
    }
    let hasActive;
    let hasOverdue;
    if (liveData) {
      hasActive = liveData.invoices.length > 0;
      hasOverdue = liveData.invoices.some((i) => i.FECHA_VEN && new Date(i.FECHA_VEN) < now);
    } else {
      const activeInvoices = custInvoices.filter(
        (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
      );
      hasActive = activeInvoices.length > 0;
      hasOverdue = activeInvoices.some((inv) => inv.dueDate && new Date(inv.dueDate) < now);
    }
    if (!hasActive) {
      skipped++;
      continue;
    }
    if (onlyOverdue && !hasOverdue) {
      skipped++;
      continue;
    }
    try {
      await sendAccountStatementEmail2({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails: emails,
        tenantName: tenant.name,
        liveData,
        ccEmails: ccEmails.length > 0 ? ccEmails : void 0
      });
      sent++;
      await new Promise((r) => setTimeout(r, 2e3));
    } catch (err) {
      failed++;
      failedCustomers.push(customer.name);
      console.error(`[StatementScheduler] Failed to send to ${customer.name}:`, err);
    }
  }
  console.log(`[StatementScheduler] ${tenant.name}: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos`);
  await logSystemActivity({
    tenantId,
    category: "account_statement",
    action: "auto_send",
    level: failed > 0 ? "warning" : "info",
    message: `Env\xEDo autom\xE1tico completado: ${sent} enviados, ${skipped} omitidos, ${failed} fallidos.` + (onlyOverdue ? " (solo clientes con saldo vencido)" : ""),
    details: { sent, skipped, failed, failedCustomers, onlyOverdue }
  });
}

// server/index.ts
var app = express2();
app.use("/static", express2.static(path4.join(process.cwd(), "public")));
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.use(tenantMiddleware);
(async () => {
  await runMigrations();
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
  cleanupOrphanedSyncLogs().catch(
    (err) => console.error("[Microsip] Startup cleanup error:", err)
  );
  const MICROSIP_POLL_MS = 5 * 60 * 1e3;
  setInterval(() => {
    runScheduledSync().catch(
      (err) => console.error("[Microsip] Scheduler error:", err)
    );
  }, MICROSIP_POLL_MS);
  log(`Microsip scheduler started (poll every 5 min)`);
  const STATEMENT_POLL_MS = 60 * 60 * 1e3;
  setInterval(() => {
    runAccountStatementScheduler().catch(
      (err) => console.error("[StatementScheduler] Error:", err)
    );
  }, STATEMENT_POLL_MS);
  setTimeout(() => {
    runAccountStatementScheduler().catch(
      (err) => console.error("[StatementScheduler] Startup check error:", err)
    );
  }, 3e4);
  log(`Account statement scheduler started (poll every 60 min)`);
})();
