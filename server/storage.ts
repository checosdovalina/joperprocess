import {
  users,
  customers,
  checkins,
  quotations,
  quotationItems,
  creditAuthorizations,
  orders,
  shipments,
  invoices,
  payments,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Checkin,
  type InsertCheckin,
  type Quotation,
  type InsertQuotation,
  type QuotationItem,
  type InsertQuotationItem,
  type CreditAuthorization,
  type InsertCreditAuthorization,
  type Order,
  type InsertOrder,
  type Shipment,
  type InsertShipment,
  type Invoice,
  type InsertInvoice,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Check-ins
  getCheckin(id: string): Promise<Checkin | undefined>;
  getAllCheckins(): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;
  updateCheckin(id: string, data: Partial<InsertCheckin>): Promise<Checkin | undefined>;

  // Quotations
  getQuotation(id: string): Promise<Quotation | undefined>;
  getAllQuotations(): Promise<Quotation[]>;
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

  // Shipments
  getShipment(id: string): Promise<Shipment | undefined>;
  getAllShipments(): Promise<Shipment[]>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, data: Partial<InsertShipment>): Promise<Shipment | undefined>;

  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async updateCheckin(id: string, data: Partial<InsertCheckin>): Promise<Checkin | undefined> {
    const [checkin] = await db.update(checkins).set(data).where(eq(checkins.id, id)).returning();
    return checkin || undefined;
  }

  // Quotations
  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async getAllQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    // Generate folio (simple implementation - could be improved)
    const folioNumber = Date.now().toString().slice(-6);
    const folio = `COT-${folioNumber}`;
    
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
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order || undefined;
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

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }
}

export const storage = new DatabaseStorage();
