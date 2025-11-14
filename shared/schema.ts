import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export const UserRole = {
  ADMIN: "admin",
  VENDEDOR: "vendedor",
  CREDITO_COBRANZA: "credito_cobranza",
  VENTAS_LOGISTICA: "ventas_logistica",
  FABRICA: "fabrica",
  EMBARQUES: "embarques",
  FACTURACION: "facturacion",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Enum for quotation status
export const QuotationStatus = {
  DRAFT: "draft",
  SENT: "sent",
  AUTHORIZED: "authorized",
  CONVERTED: "converted",
  REJECTED: "rejected",
} as const;

export type QuotationStatusType = typeof QuotationStatus[keyof typeof QuotationStatus];

// Enum for order status
export const OrderStatus = {
  PENDING: "pending",
  IN_PRODUCTION: "in_production",
  READY: "ready",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
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

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  rfc: text("rfc"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  creditDays: integer("credit_days").notNull().default(30),
  blocked: boolean("blocked").notNull().default(false),
  contactName: text("contact_name"),
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
  userId: varchar("user_id").notNull().references(() => users.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  customerLocationId: varchar("customer_location_id").references(() => customerLocations.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  checkinAt: timestamp("checkin_at").notNull().defaultNow(),
  checkoutAt: timestamp("checkout_at"),
  topics: text("topics").array(),
  notes: text("notes"),
  checkoutNotes: text("checkout_notes"), // Acuerdos/comentarios del checkout
  photos: text("photos").array(),
  minutePdfPath: text("minute_pdf_path"),
});

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
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  folio: text("folio").notNull().unique(),
  status: text("status").notNull().default(QuotationStatus.DRAFT),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  pdfPath: text("pdf_path"),
  authorizedBy: varchar("authorized_by").references(() => users.id),
  authorizedAt: timestamp("authorized_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quotation items table
export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id),
  status: text("status").notNull().default(OrderStatus.PENDING),
  productionProgress: integer("production_progress").notNull().default(0),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  factoryNotes: text("factory_notes"),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Shipments table
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  cfdiUuid: text("cfdi_uuid"),
  serie: text("serie").notNull(),
  folio: text("folio").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MXN"),
  paymentMethod: text("payment_method"),
  paymentForm: text("payment_form"),
  xmlPath: text("xml_path"),
  pdfPath: text("pdf_path"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  registeredBy: varchar("registered_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  checkins: many(checkins),
  quotations: many(quotations),
  creditAuthorizations: many(creditAuthorizations),
  paymentsRegistered: many(payments),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  checkins: many(checkins),
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
}));

export const creditAuthorizationsRelations = relations(creditAuthorizations, ({ one }) => ({
  quotation: one(quotations, {
    fields: [creditAuthorizations.quotationId],
    references: [quotations.id],
  }),
  user: one(users, {
    fields: [creditAuthorizations.userId],
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
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerLocationSchema = createInsertSchema(customerLocations).omit({
  id: true,
  createdAt: true,
});

export const insertCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
  checkinAt: true,
});

// Schema for updating check-ins (includes checkout fields)
export const updateCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
}).partial();

export const insertPendingUploadSchema = createInsertSchema(pendingUploads).omit({
  createdAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
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

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  issuedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerLocation = z.infer<typeof insertCustomerLocationSchema>;
export type CustomerLocation = typeof customerLocations.$inferSelect;

export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type UpdateCheckin = z.infer<typeof updateCheckinSchema>;
export type Checkin = typeof checkins.$inferSelect;

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;

export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

export type InsertCreditAuthorization = z.infer<typeof insertCreditAuthorizationSchema>;
export type CreditAuthorization = typeof creditAuthorizations.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
