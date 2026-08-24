import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, jsonb, bigint, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== SESSION TABLE (connect-pg-simple) ====================
// This table is managed by connect-pg-simple for session storage
// We define it here so Drizzle doesn't try to delete it
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// ==================== MULTI-TENANCY ====================

// Tenants (Empresas) table - stores company configuration
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(), // e.g., "joper" for joper.nexxo.com.mx
  // Jerarquía de compañías (Opción B): una compañía puede tener una compañía "padre".
  // Las compañías hijas tienen sus PROPIOS datos aislados, pero el admin de la compañía
  // padre puede entrar a administrar cualquier compañía descendiente. FK se define en
  // scripts/vps-schema-changes.sql (auto-referencia). null = compañía raíz.
  parentId: varchar("parent_id"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#4DA3FF"), // Nexxo blue default
  secondaryColor: text("secondary_color").default("#1F3C88"),
  active: boolean("active").notNull().default(true),
  // Company legal info
  legalName: text("legal_name"), // Razón social
  rfc: text("rfc"), // RFC fiscal
  website: text("website"),
  // Contact info
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("México"),
  timezone: text("timezone").default("America/Mexico_City"),
  locale: text("locale").default("es"), // es | en | pt
  // Billing/subscription info (for future)
  plan: text("plan").default("basic"), // basic, professional, enterprise
  maxUsers: integer("max_users").default(10),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ==================== EMPRESAS (marcas comerciales dentro de un tenant) ====================
// Una "empresa" es un nivel comercial POR DEBAJO del tenant. Todas las empresas de un
// tenant comparten la misma base de datos, clientes, productos y Microsip. Sólo cambia
// la marca (logo/colores) y sirve para segmentar cotizaciones/pedidos/embarques y a qué
// empresa pertenece cada vendedor. NO es un tenant nuevo (eso rompería el compartir datos).
export const empresas = pgTable("empresas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(), // p.ej. "Joper Ligero", "Joper Móvil"
  clave: text("clave"), // clave corta interna, p.ej. "LIGERO" / "MOVIL"
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#4DA3FF"),
  secondaryColor: text("secondary_color").default("#1F3C88"),
  subdomain: text("subdomain").unique(), // opcional: marca por subdominio (último paso)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmpresaSchema = createInsertSchema(empresas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

// ==================== END MULTI-TENANCY ====================

// Enum for user roles
export const UserRole = {
  ADMIN: "admin",
  VENDEDOR: "vendedor",
  CREDITO_COBRANZA: "credito_cobranza",
  VENTAS_LOGISTICA: "ventas_logistica",
  FABRICA: "fabrica",
  EMBARQUES: "embarques",
  FACTURACION: "facturacion",
  SERVICIO_CLIENTE: "servicio_cliente",
  SERVICIO_TECNICO: "servicio_tecnico",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Enum for quotation status
export const QuotationStatus = {
  DRAFT: "draft",
  SENT: "sent",
  PENDING_APPROVAL: "pending_approval",
  PENDING_AUTHORIZATION: "pending_authorization",
  AUTHORIZED: "authorized",
  CONVERTED: "converted",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;

export type QuotationStatusType = typeof QuotationStatus[keyof typeof QuotationStatus];

// Enum for shipping cost status in quotations
export const ShippingCostStatus = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
} as const;

export type ShippingCostStatusType = typeof ShippingCostStatus[keyof typeof ShippingCostStatus];

// Enum for shipping approval status (when Joper handles shipping for free)
export const ShippingApprovalStatus = {
  NOT_REQUIRED: "not_required",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ShippingApprovalStatusType = typeof ShippingApprovalStatus[keyof typeof ShippingApprovalStatus];

// Enum for order status
export const OrderStatus = {
  PENDING: "pending",
  IN_PRODUCTION: "in_production",
  READY: "ready",
  PARTIALLY_RELEASED: "partially_released",
  RELEASED: "released",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CLOSED: "closed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Enum for shipment status
export const ShipmentStatus = {
  PENDING: "pending",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
} as const;

export type ShipmentStatusType = typeof ShipmentStatus[keyof typeof ShipmentStatus];

// Enum for credit authorization status
export const CreditAuthStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type CreditAuthStatusType = typeof CreditAuthStatus[keyof typeof CreditAuthStatus];

// Enum for scheduled visit status
export const ScheduledVisitStatus = {
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type ScheduledVisitStatusType = typeof ScheduledVisitStatus[keyof typeof ScheduledVisitStatus];

// Enum for meeting type
export const MeetingType = {
  LLAMADA: "llamada",
  VISITA: "visita",
  VIDEOLLAMADA: "videollamada",
} as const;

export type MeetingTypeType = typeof MeetingType[keyof typeof MeetingType];

// Enum for incident type
export const IncidentType = {
  GARANTIA: "garantia",
  RETRABAJO: "retrabajo",
  QUEJA: "queja",
  CONSULTA: "consulta",
  ADMINISTRATIVO: "administrativo",
} as const;

export type IncidentTypeType = typeof IncidentType[keyof typeof IncidentType];

// Enum for incident status
export const IncidentStatus = {
  NUEVO: "nuevo",
  ASIGNADO: "asignado",
  EN_PROCESO: "en_proceso",
  ESPERANDO_CLIENTE: "esperando_cliente",
  ESPERANDO_INTERNO: "esperando_interno",
  RESUELTO: "resuelto",
  CERRADO: "cerrado",
  CANCELADO: "cancelado",
} as const;

export type IncidentStatusType = typeof IncidentStatus[keyof typeof IncidentStatus];

// Enum for incident urgency
export const IncidentUrgency = {
  BAJA: "baja",
  MEDIA: "media",
  ALTA: "alta",
  CRITICA: "critica",
} as const;

export type IncidentUrgencyType = typeof IncidentUrgency[keyof typeof IncidentUrgency];

// Enum for incident comment visibility
export const CommentVisibility = {
  INTERNAL: "internal",
  CUSTOMER: "customer",
} as const;

export type CommentVisibilityType = typeof CommentVisibility[keyof typeof CommentVisibility];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  empresaId: varchar("empresa_id").references(() => empresas.id), // vendedor pertenece a UNA empresa; null = rol global (ve todas)
  username: text("username").notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false), // For platform-level admins
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Customers table
export const customers = pgTable("customers", {
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
  microsipId: integer("microsip_id"), // CLIENTE_ID from Microsip CLIENTES table
  microsipCode: text("microsip_code"), // CLAVE from Microsip CLIENTES table
  microsipSyncedAt: timestamp("microsip_synced_at"), // Last sync timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Customer locations table (for GPS validation and multi-site support)
export const customerLocations = pgTable("customer_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  name: text("name"), // Optional: "Sucursal Centro", "Bodega Norte", etc.
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(100), // Validation radius
  isPrimary: boolean("is_primary").notNull().default(false),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Check-ins table
export const checkins = pgTable("checkins", {
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
  checkoutNotes: text("checkout_notes"), // Acuerdos/comentarios del checkout
  photos: text("photos").array(),
  minutePdfPath: text("minute_pdf_path"),
  internalNotes: text("internal_notes"), // Notas internas que NO se envían al cliente
  salesPersonId: varchar("sales_person_id").references(() => users.id), // Vendedor asignado
});

// Scheduled visits table (for pre-checkin planning)
export const scheduledVisits = pgTable("scheduled_visits", {
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
  checkinId: varchar("checkin_id").unique().references(() => checkins.id), // Unique: one visit maps to at most one checkin
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Composite index for daily agenda queries (userId + date range)
  userScheduledIdx: sql`CREATE INDEX scheduled_visits_user_date_idx ON ${table} (user_id, scheduled_date)`,
  // Index for customer lookup with status filtering
  customerStatusIdx: sql`CREATE INDEX scheduled_visits_customer_status_idx ON ${table} (customer_id, status)`,
}));

// Pending uploads table (for secure photo upload tracking)
export const pendingUploads = pgTable("pending_uploads", {
  entityId: text("entity_id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkinId: varchar("checkin_id").notNull().references(() => checkins.id),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  empresaId: varchar("empresa_id").references(() => empresas.id), // empresa (marca) a la que pertenece esta cotización
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
  taxRate: decimal("tax_rate", { precision: 8, scale: 2 }).default("16"),
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
  approvalToken: text("approval_token").unique(), // Unique token for customer approval link
  customerApprovedAt: timestamp("customer_approved_at"),
  customerRejectedAt: timestamp("customer_rejected_at"),
  customerRejectionReason: text("customer_rejection_reason"),
  // Exchange rate (tipo de cambio) — used to unify mixed-currency totals
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).default("18.0000"), // MXN per 1 USD
  // Shipping fields
  shippingHandledByJoper: boolean("shipping_handled_by_joper").notNull().default(false),
  shippingMethod: text("shipping_method").default("truck"), // truck (camión), parcel (paquetería)
  requiresPallet: boolean("requires_pallet").default(false),
  shippingNotes: text("shipping_notes"), // Notas de envío (no van en la cotización)
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default("0"),
  shippingCostStatus: text("shipping_cost_status").default("confirmed"), // confirmed, pending
  shippingApprovalStatus: text("shipping_approval_status").default("not_required"), // not_required, pending, approved, rejected
  shippingApprovalToken: text("shipping_approval_token").unique(),
  shippingApprovedBy: varchar("shipping_approved_by").references(() => users.id),
  shippingApprovedAt: timestamp("shipping_approved_at"),
  shippingRejectedBy: varchar("shipping_rejected_by").references(() => users.id),
  shippingRejectedAt: timestamp("shipping_rejected_at"),
  shippingRejectionReason: text("shipping_rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Quotation items table
export const quotationItems = pgTable("quotation_items", {
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
  currency: text("currency").notNull().default("MXN"), // Moneda por partida (MXN, USD)
});

// Credit authorizations table
export const creditAuthorizations = pgTable("credit_authorizations", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Credit authorization comments table
export const creditAuthorizationComments = pgTable("credit_authorization_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creditAuthorizationId: varchar("credit_authorization_id").notNull().references(() => creditAuthorizations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Order Release Status
export const OrderReleaseStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CLOSED: "closed",
} as const;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  empresaId: varchar("empresa_id").references(() => empresas.id), // heredada de la cotización
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Order releases table - tracks partial/full product releases for invoicing/shipping
export const orderReleases = pgTable("order_releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  quotationItemId: varchar("quotation_item_id").notNull().references(() => quotationItems.id),
  quantityReleased: decimal("quantity_released", { precision: 10, scale: 2 }).notNull(),
  releasedById: varchar("released_by_id").notNull().references(() => users.id),
  invoiceId: varchar("invoice_id"),
  shipmentId: varchar("shipment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shipments table
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  empresaId: varchar("empresa_id").references(() => empresas.id), // heredada del pedido
  orderId: varchar("order_id").notNull().references(() => orders.id),
  transporter: text("transporter").notNull(),
  transportType: text("transport_type").notNull(), // 'propio' or 'paqueteria'
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shipment Product Instances - for tracking serial numbers
export const shipmentProductInstances = pgTable("shipment_product_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").notNull().references(() => shipments.id),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  serialNumber: text("serial_number").notNull().unique(),
  status: text("status").notNull().default("active"), // active, returned, defective
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Invoice Status
export const InvoiceStatus = {
  DRAFT: "draft",
  PENDING_PAYMENT: "pending_payment",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

// Invoices table
export const invoices = pgTable("invoices", {
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
  microsipDoctoId: bigint("microsip_docto_id", { mode: "number" }), // DOCTO_VE_ID from Microsip DOCTOS_VE
  microsipSyncedAt: timestamp("microsip_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id), // Made optional for Microsip synced payments
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  registeredBy: varchar("registered_by").references(() => users.id), // Made optional for Microsip synced payments
  // Microsip integration fields
  microsipDoctoCoId: bigint("microsip_docto_co_id", { mode: "number" }), // DOCTO_CO_ID from Microsip DOCTOS_CO
  microsipSyncedAt: timestamp("microsip_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product Categories table
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  active: boolean("active").notNull().default(true),
  // Microsip integration fields
  microsipLineaId: integer("microsip_linea_id"), // LINEA_ARTICULO_ID from Microsip LINEAS_ARTICULOS
  microsipSyncedAt: timestamp("microsip_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Products table
export const products = pgTable("products", {
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
  currency: text("currency").notNull().default("MXN"), // MXN or USD from Microsip MONEDA_ID
  // Microsip integration fields
  microsipArticuloId: integer("microsip_articulo_id"), // ARTICULO_ID from Microsip ARTICULOS
  microsipSyncedAt: timestamp("microsip_synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("products_tenant_code_unique").on(table.tenantId, table.code),
]);

// Customer-specific product prices
export const customerProductPrices = pgTable("customer_product_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  specialPrice: decimal("special_price", { precision: 12, scale: 2 }).notNull(),
  maxDiscount: decimal("max_discount", { precision: 5, scale: 2 }),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Documents / Manuals table (operational manuals + parts breakdowns)
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("operativo"), // 'operativo' | 'despiece'
  category: text("category"),
  productId: varchar("product_id").references(() => products.id),
  fileUrl: text("file_url").notNull(), // storage entityId / relative path
  fileName: text("file_name").notNull(), // original filename
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Incidents (Tickets) table
export const incidents = pgTable("incidents", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Incident comments table
export const incidentComments = pgTable("incident_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id),
  userId: varchar("user_id").references(() => users.id),
  content: text("content").notNull(),
  visibility: text("visibility").notNull().default(CommentVisibility.INTERNAL),
  isFromCustomer: boolean("is_from_customer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Incident attachments table
export const incidentAttachments = pgTable("incident_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  isFromCustomer: boolean("is_from_customer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Incident activity log (bitácora)
export const incidentActivities = pgTable("incident_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => incidents.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  details: text("details"),
  isFromCustomer: boolean("is_from_customer").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  checkins: many(checkins),
  scheduledVisits: many(scheduledVisits),
  quotations: many(quotations),
  creditAuthorizations: many(creditAuthorizations),
  paymentsRegistered: many(payments),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  checkins: many(checkins),
  scheduledVisits: many(scheduledVisits),
  quotations: many(quotations),
  invoices: many(invoices),
  payments: many(payments),
  locations: many(customerLocations),
}));

export const customerLocationsRelations = relations(customerLocations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerLocations.customerId],
    references: [customers.id],
  }),
  checkins: many(checkins),
  scheduledVisits: many(scheduledVisits),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  user: one(users, {
    fields: [checkins.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [checkins.customerId],
    references: [customers.id],
  }),
  customerLocation: one(customerLocations, {
    fields: [checkins.customerLocationId],
    references: [customerLocations.id],
  }),
}));

export const scheduledVisitsRelations = relations(scheduledVisits, ({ one }) => ({
  user: one(users, {
    fields: [scheduledVisits.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [scheduledVisits.customerId],
    references: [customers.id],
  }),
  customerLocation: one(customerLocations, {
    fields: [scheduledVisits.customerLocationId],
    references: [customerLocations.id],
  }),
  checkin: one(checkins, {
    fields: [scheduledVisits.checkinId],
    references: [checkins.id],
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [quotations.userId],
    references: [users.id],
  }),
  items: many(quotationItems),
  creditAuthorization: many(creditAuthorizations),
  order: many(orders),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  customerPrices: many(customerProductPrices),
  quotationItems: many(quotationItems),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [documents.productId],
    references: [products.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const customerProductPricesRelations = relations(customerProductPrices, ({ one }) => ({
  customer: one(customers, {
    fields: [customerProductPrices.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [customerProductPrices.productId],
    references: [products.id],
  }),
}));

export const creditAuthorizationsRelations = relations(creditAuthorizations, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [creditAuthorizations.quotationId],
    references: [quotations.id],
  }),
  user: one(users, {
    fields: [creditAuthorizations.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [creditAuthorizations.approvedById],
    references: [users.id],
  }),
  rejectedBy: one(users, {
    fields: [creditAuthorizations.rejectedById],
    references: [users.id],
  }),
  lastEditedBy: one(users, {
    fields: [creditAuthorizations.lastEditedById],
    references: [users.id],
  }),
  comments: many(creditAuthorizationComments),
}));

export const creditAuthorizationCommentsRelations = relations(creditAuthorizationComments, ({ one }) => ({
  creditAuthorization: one(creditAuthorizations, {
    fields: [creditAuthorizationComments.creditAuthorizationId],
    references: [creditAuthorizations.id],
  }),
  user: one(users, {
    fields: [creditAuthorizationComments.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [orders.quotationId],
    references: [quotations.id],
  }),
  shipment: many(shipments),
  invoice: many(invoices),
  releases: many(orderReleases),
}));

export const orderReleasesRelations = relations(orderReleases, ({ one }) => ({
  order: one(orders, {
    fields: [orderReleases.orderId],
    references: [orders.id],
  }),
  quotationItem: one(quotationItems, {
    fields: [orderReleases.quotationItemId],
    references: [quotationItems.id],
  }),
  releasedBy: one(users, {
    fields: [orderReleases.releasedById],
    references: [users.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  productInstances: many(shipmentProductInstances),
}));

export const shipmentProductInstancesRelations = relations(shipmentProductInstances, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentProductInstances.shipmentId],
    references: [shipments.id],
  }),
  order: one(orders, {
    fields: [shipmentProductInstances.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [shipmentProductInstances.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [shipmentProductInstances.productId],
    references: [products.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  registeredBy: one(users, {
    fields: [payments.registeredBy],
    references: [users.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  customer: one(customers, {
    fields: [incidents.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [incidents.productId],
    references: [products.id],
  }),
  productInstance: one(shipmentProductInstances, {
    fields: [incidents.productInstanceId],
    references: [shipmentProductInstances.id],
  }),
  order: one(orders, {
    fields: [incidents.orderId],
    references: [orders.id],
  }),
  invoice: one(invoices, {
    fields: [incidents.invoiceId],
    references: [invoices.id],
  }),
  assignee: one(users, {
    fields: [incidents.assignedTo],
    references: [users.id],
    relationName: "assignedIncidents",
  }),
  resolver: one(users, {
    fields: [incidents.resolvedBy],
    references: [users.id],
    relationName: "resolvedIncidents",
  }),
  closer: one(users, {
    fields: [incidents.closedBy],
    references: [users.id],
    relationName: "closedIncidents",
  }),
  creator: one(users, {
    fields: [incidents.createdBy],
    references: [users.id],
    relationName: "createdIncidents",
  }),
  comments: many(incidentComments),
  attachments: many(incidentAttachments),
  activities: many(incidentActivities),
}));

export const incidentCommentsRelations = relations(incidentComments, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentComments.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentComments.userId],
    references: [users.id],
  }),
}));

export const incidentAttachmentsRelations = relations(incidentAttachments, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentAttachments.incidentId],
    references: [incidents.id],
  }),
  uploader: one(users, {
    fields: [incidentAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const incidentActivitiesRelations = relations(incidentActivities, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentActivities.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentActivities.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const updateCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
}).partial();

export const insertCustomerLocationSchema = createInsertSchema(customerLocations).omit({
  id: true,
  createdAt: true,
});

export const insertCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
  tenantId: true,
  checkinAt: true,
}).extend({
  userId: z.string().optional(), // Allow backend to set it
});

// Schema for updating check-ins (includes checkout fields)
export const updateCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
}).partial();

export const insertScheduledVisitSchema = createInsertSchema(scheduledVisits).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.string().optional(), // Allow backend to set it
  scheduledDate: z.coerce.date().refine((date) => {
    // Allow scheduling for today or future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, {
    message: "La fecha programada no puede ser en el pasado",
  }),
});

export const updateScheduledVisitSchema = createInsertSchema(scheduledVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  userId: z.string().optional(), // Allow backend to preserve it
  scheduledDate: z.coerce.date().refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, {
    message: "La fecha programada no puede ser en el pasado",
  }).optional(),
});

export const insertPendingUploadSchema = createInsertSchema(pendingUploads).omit({
  createdAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  folio: true,
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
  id: true,
});

export const insertCreditAuthorizationSchema = createInsertSchema(creditAuthorizations).omit({
  id: true,
  createdAt: true,
});

export const insertCreditAuthorizationCommentSchema = createInsertSchema(creditAuthorizationComments).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderReleaseSchema = createInsertSchema(orderReleases).omit({
  id: true,
  createdAt: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertShipmentProductInstanceSchema = createInsertSchema(shipmentProductInstances).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  tenantId: true,
  issuedAt: true,
  createdAt: true,
}).extend({
  dueDate: z.coerce.date().optional(),
  paidAt: z.coerce.date().optional(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Helper to transform empty strings to null for optional numeric fields
const emptyToNull = z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional());
// Helper to transform empty strings to "0" for required numeric fields with defaults
const emptyToZero = z.preprocess((val) => (val === "" ? "0" : val), z.string());

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cost: emptyToNull,
  stock: emptyToZero,
  minStock: emptyToNull,
  maxDiscount: emptyToNull,
  taxRate: emptyToZero,
});

export const updateProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  tenantId: true,
  createdAt: true,
}).extend({
  type: z.enum(["operativo", "despiece"]),
});

export const insertCustomerProductPriceSchema = createInsertSchema(customerProductPrices).omit({
  id: true,
  createdAt: true,
});

export const updateQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  folio: true,
}).partial();

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  tenantId: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  accessToken: true,
  accessTokenExpires: true,
}).extend({
  productInstanceId: emptyToNull,
  orderId: emptyToNull,
  shipmentId: emptyToNull,
  invoiceId: emptyToNull,
  assignedToId: emptyToNull,
});

export const updateIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
  accessToken: true,
  accessTokenExpires: true,
}).partial();

export const insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentAttachmentSchema = createInsertSchema(incidentAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentActivitySchema = createInsertSchema(incidentActivities).omit({
  id: true,
  createdAt: true,
});

// ==================== MICROSIP INTEGRATION ====================

// Microsip sync configuration per tenant
export const microsipConfigs = pgTable("microsip_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id).unique(),
  // Firebird connection settings
  host: text("host").notNull(), // Firebird server IP or hostname
  port: integer("port").notNull().default(3050), // Default Firebird port
  database: text("database").notNull(), // Path to .fdb file on the server (inventory/master data)
  cxcDatabase: text("cxc_database"), // Optional: separate .fdb for CXC/facturas (DOCTOS_VE, DOCTOS_CC)
  username: text("username").notNull(),
  password: text("password").notNull(), // Encrypted in production
  // Sync settings
  enabled: boolean("enabled").notNull().default(false),
  syncCustomers: boolean("sync_customers").notNull().default(true),
  syncProducts: boolean("sync_products").notNull().default(true),
  syncCategories: boolean("sync_categories").notNull().default(true),
  syncInvoices: boolean("sync_invoices").notNull().default(true),
  syncPayments: boolean("sync_payments").notNull().default(true),
  // Sync intervals in minutes
  masterDataInterval: integer("master_data_interval").notNull().default(120), // 2 hours for customers, products
  transactionalInterval: integer("transactional_interval").notNull().default(60), // 1 hour for invoices, payments
  // Last sync timestamps
  lastCustomerSync: timestamp("last_customer_sync"),
  lastProductSync: timestamp("last_product_sync"),
  lastCategorySync: timestamp("last_category_sync"),
  lastInvoiceSync: timestamp("last_invoice_sync"),
  lastPaymentSync: timestamp("last_payment_sync"),
  // Status
  lastSyncStatus: text("last_sync_status"), // 'success', 'error', 'running'
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sync logs for debugging and monitoring
export const microsipSyncLogs = pgTable("microsip_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  syncType: text("sync_type").notNull(), // 'customers', 'products', 'categories', 'invoices', 'payments', 'full'
  status: text("status").notNull(), // 'started', 'success', 'error'
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  errorMessage: text("error_message"),
  errorDetails: text("error_details"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertMicrosipConfigSchema = createInsertSchema(microsipConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCustomerSync: true,
  lastProductSync: true,
  lastCategorySync: true,
  lastInvoiceSync: true,
  lastPaymentSync: true,
  lastSyncStatus: true,
  lastSyncError: true,
});

export const updateMicrosipConfigSchema = insertMicrosipConfigSchema.partial();

export type InsertMicrosipConfig = z.infer<typeof insertMicrosipConfigSchema>;
export type UpdateMicrosipConfig = z.infer<typeof updateMicrosipConfigSchema>;
export type MicrosipConfig = typeof microsipConfigs.$inferSelect;
export type MicrosipSyncLog = typeof microsipSyncLogs.$inferSelect;

// ==================== END MICROSIP INTEGRATION ====================

// ==================== ACCOUNT STATEMENT SCHEDULES ====================

export const accountStatementSchedules = pgTable("account_statement_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  enabled: boolean("enabled").notNull().default(false),
  scheduleDays: integer("schedule_days").array().notNull().default([1, 15]),
  sendHour: integer("send_hour").notNull().default(9),
  onlyOverdue: boolean("only_overdue").notNull().default(false),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountStatementScheduleSchema = createInsertSchema(accountStatementSchedules).omit({
  id: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAccountStatementSchedule = z.infer<typeof insertAccountStatementScheduleSchema>;
export type AccountStatementSchedule = typeof accountStatementSchedules.$inferSelect;

// ==================== END ACCOUNT STATEMENT SCHEDULES ====================

// ==================== SYSTEM ACTIVITY LOGS ====================

// General activity/audit log for background jobs and important events
// (automatic account-statement sends, manual sends, errors, etc.).
// Microsip sync activity lives in `microsipSyncLogs` and is merged in at the API layer.
export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  category: text("category").notNull(), // 'account_statement' | 'microsip_sync' | 'system'
  level: text("level").notNull().default("info"), // 'info' | 'warning' | 'error'
  action: text("action"), // short label, e.g. 'auto_send', 'manual_send', 'pre_send_refresh'
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

// ==================== END SYSTEM ACTIVITY LOGS ====================

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerLocation = z.infer<typeof insertCustomerLocationSchema>;
export type CustomerLocation = typeof customerLocations.$inferSelect;

export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type UpdateCheckin = z.infer<typeof updateCheckinSchema>;
export type Checkin = typeof checkins.$inferSelect;

export type InsertScheduledVisit = z.infer<typeof insertScheduledVisitSchema>;
export type UpdateScheduledVisit = z.infer<typeof updateScheduledVisitSchema>;
export type ScheduledVisit = typeof scheduledVisits.$inferSelect;

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;

export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

export type InsertCreditAuthorization = z.infer<typeof insertCreditAuthorizationSchema>;
export type CreditAuthorization = typeof creditAuthorizations.$inferSelect;

export type InsertCreditAuthorizationComment = z.infer<typeof insertCreditAuthorizationCommentSchema>;
export type CreditAuthorizationComment = typeof creditAuthorizationComments.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderRelease = z.infer<typeof insertOrderReleaseSchema>;
export type OrderRelease = typeof orderReleases.$inferSelect;

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

export type InsertShipmentProductInstance = z.infer<typeof insertShipmentProductInstanceSchema>;
export type ShipmentProductInstance = typeof shipmentProductInstances.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertCustomerProductPrice = z.infer<typeof insertCustomerProductPriceSchema>;
export type CustomerProductPrice = typeof customerProductPrices.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type UpdateQuotation = z.infer<typeof updateQuotationSchema>;

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type UpdateIncident = z.infer<typeof updateIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type InsertIncidentComment = z.infer<typeof insertIncidentCommentSchema>;
export type IncidentComment = typeof incidentComments.$inferSelect;

export type InsertIncidentAttachment = z.infer<typeof insertIncidentAttachmentSchema>;
export type IncidentAttachment = typeof incidentAttachments.$inferSelect;

export type InsertIncidentActivity = z.infer<typeof insertIncidentActivitySchema>;
export type IncidentActivity = typeof incidentActivities.$inferSelect;
