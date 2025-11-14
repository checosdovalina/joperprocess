import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasRole } from "./auth";
import { db } from "./db";
import { z } from "zod";
import { 
  insertCustomerSchema,
  insertCheckinSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertCreditAuthorizationSchema,
  insertOrderSchema,
  insertShipmentSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  UserRole,
  QuotationStatus,
  CreditAuthStatus,
  OrderStatus,
} from "@shared/schema";
import { customers, quotations, checkins, users, orders, creditAuthorizations, shipments, invoices, payments } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM ${quotations} WHERE status IN ('draft', 'sent')) as "pendingQuotations",
          (SELECT COUNT(*) FROM ${orders} WHERE status IN ('pending', 'in_production')) as "activeOrders",
          (SELECT COUNT(*) FROM ${invoices} WHERE due_date < NOW()) as "overdueInvoices",
          (SELECT COALESCE(SUM(total::numeric), 0) FROM ${invoices} WHERE EXTRACT(MONTH FROM issued_at) = EXTRACT(MONTH FROM NOW())) as "totalRevenue",
          (SELECT COUNT(*) FROM ${checkins} WHERE DATE(checkin_at) = CURRENT_DATE) as "todayCheckins",
          (SELECT COUNT(*) FROM ${shipments} WHERE status = 'pending') as "pendingShipments",
          (SELECT COUNT(*) FROM ${creditAuthorizations} WHERE status = 'pending') as "pendingCreditAuth"
      `);

      const stats = result.rows[0];
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Error fetching dashboard statistics" });
    }
  });

  // Users endpoints (Admin only)
  app.get("/api/users", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error fetching users" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Only allow updating specific safe fields
      const updateSchema = z.object({
        active: z.boolean().optional(),
        role: z.enum([
          UserRole.ADMIN,
          UserRole.VENDEDOR,
          UserRole.CREDITO_COBRANZA,
          UserRole.VENTAS_LOGISTICA,
          UserRole.FABRICA,
          UserRole.EMBARQUES,
          UserRole.FACTURACION,
        ]).optional(),
        fullName: z.string().optional(),
        email: z.string().email().optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(id, validated);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Error updating user" });
    }
  });

  // Customers endpoints
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const allCustomers = await storage.getAllCustomers();
      res.json(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Error fetching customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validated);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Error creating customer" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Error fetching customer" });
    }
  });

  // Customer summary for check-in (facturas vencidas, pedidos pendientes, historial)
  app.get("/api/customers/:id/summary", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify customer exists
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Get overdue invoices
      const overdueInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.customerId, id),
          sql`${invoices.dueDate} < NOW()`
        ),
        orderBy: (invoices, { desc }) => [desc(invoices.dueDate)],
        limit: 10,
      });

      // Get customer's quotation IDs first
      const customerQuotations = await db.query.quotations.findMany({
        where: eq(quotations.customerId, id),
        columns: { id: true },
      });
      const quotationIds = customerQuotations.map(q => q.id);
      
      // Get pending orders for this customer's quotations
      let pendingOrders: any[] = [];
      if (quotationIds.length > 0) {
        pendingOrders = await db.query.orders.findMany({
          where: and(
            sql`${orders.quotationId} IN (${sql.join(quotationIds.map(id => sql`${id}`), sql`, `)})`,
            sql`${orders.status} IN ('pending', 'in_production')`
          ),
          with: {
            quotation: {
              columns: {
                id: true,
                customerId: true,
                folio: true,
                total: true,
              },
            },
          },
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
          limit: 10,
        });
      }

      // Get recent quotations (last 6 months)
      const recentQuotations = await db.query.quotations.findMany({
        where: and(
          eq(quotations.customerId, id),
          sql`${quotations.createdAt} > NOW() - INTERVAL '6 months'`
        ),
        orderBy: (quotations, { desc }) => [desc(quotations.createdAt)],
        limit: 10,
      });

      // Get recent check-ins
      const recentCheckins = await db.query.checkins.findMany({
        where: eq(checkins.customerId, id),
        with: {
          user: true,
        },
        orderBy: (checkins, { desc }) => [desc(checkins.checkinAt)],
        limit: 5,
      });

      // Get customer locations
      const locations = await storage.getCustomerLocationsByCustomerId(id);

      // Calculate credit usage (ALL authorized/converted quotations, not just recent)
      const creditUsageResult = await db.execute(sql`
        SELECT COALESCE(SUM(total::numeric), 0) as total_used
        FROM ${quotations}
        WHERE customer_id = ${id}
        AND status IN ('authorized', 'converted')
      `);
      
      const creditUsed = parseFloat(creditUsageResult.rows[0].total_used as string) || 0;
      const creditLimitNum = parseFloat(customer.creditLimit || '0');
      const creditAvailable = creditLimitNum - creditUsed;

      res.json({
        customer,
        overdueInvoices,
        pendingOrders,
        recentQuotations,
        recentCheckins,
        locations,
        creditSummary: {
          creditLimit: creditLimitNum,
          creditUsed: parseFloat(creditUsed.toFixed(2)),
          creditAvailable: parseFloat(Math.max(0, creditAvailable).toFixed(2)),
        },
      });
    } catch (error) {
      console.error("Error fetching customer summary:", error);
      res.status(500).json({ error: "Error fetching customer summary" });
    }
  });

  // Check-ins endpoints
  app.get("/api/checkins", isAuthenticated, async (req, res) => {
    try {
      const allCheckins = await db.query.checkins.findMany({
        with: {
          customer: true,
          user: true,
        },
        orderBy: (checkins, { desc }) => [desc(checkins.checkinAt)],
      });
      res.json(allCheckins);
    } catch (error) {
      console.error("Error fetching checkins:", error);
      res.status(500).json({ error: "Error fetching checkins" });
    }
  });

  app.post("/api/checkins", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCheckinSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      // Validate that customerLocationId belongs to the specified customerId
      if (validated.customerLocationId) {
        const location = await storage.getCustomerLocation(validated.customerLocationId);
        if (!location) {
          return res.status(400).json({ error: "Customer location not found" });
        }
        if (location.customerId !== validated.customerId) {
          return res.status(400).json({ error: "Customer location does not belong to the specified customer" });
        }
      }

      const checkin = await storage.createCheckin(validated);
      res.status(201).json(checkin);
    } catch (error) {
      console.error("Error creating checkin:", error);
      res.status(400).json({ error: "Error creating checkin" });
    }
  });

  // Quotations endpoints
  app.get("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const allQuotations = await db.query.quotations.findMany({
        with: {
          customer: true,
          user: true,
          items: true,
        },
        orderBy: (quotations, { desc }) => [desc(quotations.createdAt)],
      });
      res.json(allQuotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ error: "Error fetching quotations" });
    }
  });

  app.post("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const { items, ...quotationData } = req.body;
      
      const validated = insertQuotationSchema.parse({
        ...quotationData,
        userId: req.user!.id,
        status: QuotationStatus.DRAFT,
      });

      const quotation = await storage.createQuotation(validated);

      // Create quotation items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const validatedItem = insertQuotationItemSchema.parse({
            ...item,
            quotationId: quotation.id,
          });
          await storage.createQuotationItem(validatedItem);
        }
      }

      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      res.status(400).json({ error: "Error creating quotation" });
    }
  });

  app.patch("/api/quotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedQuotation = await storage.updateQuotation(id, req.body);
      if (!updatedQuotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Error updating quotation" });
    }
  });

  // Credit Authorizations endpoints
  app.get("/api/credit-authorizations", isAuthenticated, async (req, res) => {
    try {
      const allAuths = await db.query.creditAuthorizations.findMany({
        with: {
          quotation: {
            with: {
              customer: true,
            },
          },
          user: true,
        },
        orderBy: (creditAuthorizations, { desc }) => [desc(creditAuthorizations.createdAt)],
      });
      res.json(allAuths);
    } catch (error) {
      console.error("Error fetching credit authorizations:", error);
      res.status(500).json({ error: "Error fetching credit authorizations" });
    }
  });

  app.post("/api/credit-authorizations", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCreditAuthorizationSchema.parse({
        ...req.body,
        userId: req.user!.id,
        status: CreditAuthStatus.PENDING,
      });
      const auth = await storage.createCreditAuthorization(validated);
      res.status(201).json(auth);
    } catch (error) {
      console.error("Error creating credit authorization:", error);
      res.status(400).json({ error: "Error creating credit authorization" });
    }
  });

  app.patch("/api/credit-authorizations/:id", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;
      const updatedAuth = await storage.updateCreditAuthorization(id, {
        ...req.body,
        authorizedAt: req.body.status === CreditAuthStatus.APPROVED ? new Date() : undefined,
      });
      if (!updatedAuth) {
        return res.status(404).json({ error: "Credit authorization not found" });
      }

      // If approved, update quotation status
      if (updatedAuth.status === CreditAuthStatus.APPROVED) {
        await storage.updateQuotation(updatedAuth.quotationId, {
          status: QuotationStatus.AUTHORIZED,
          authorizedBy: req.user!.id,
          authorizedAt: new Date(),
        });
      }

      res.json(updatedAuth);
    } catch (error) {
      console.error("Error updating credit authorization:", error);
      res.status(500).json({ error: "Error updating credit authorization" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const allOrders = await db.query.orders.findMany({
        with: {
          quotation: {
            with: {
              customer: true,
            },
          },
        },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const validated = insertOrderSchema.parse({
        ...req.body,
        status: OrderStatus.PENDING,
      });
      const order = await storage.createOrder(validated);

      // Update quotation status to converted
      await storage.updateQuotation(validated.quotationId, {
        status: QuotationStatus.CONVERTED,
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: "Error creating order" });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedOrder = await storage.updateOrder(id, {
        ...req.body,
        lastUpdatedBy: req.user!.id,
        updatedAt: new Date(),
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

  // Shipments endpoints
  app.get("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const allShipments = await db.query.shipments.findMany({
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
        orderBy: (shipments, { desc }) => [desc(shipments.createdAt)],
      });
      res.json(allShipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ error: "Error fetching shipments" });
    }
  });

  app.post("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const validated = insertShipmentSchema.parse(req.body);
      const shipment = await storage.createShipment(validated);
      res.status(201).json(shipment);
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(400).json({ error: "Error creating shipment" });
    }
  });

  app.patch("/api/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedShipment = await storage.updateShipment(id, req.body);
      if (!updatedShipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }
      res.json(updatedShipment);
    } catch (error) {
      console.error("Error updating shipment:", error);
      res.status(500).json({ error: "Error updating shipment" });
    }
  });

  // Invoices endpoints
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const allInvoices = await db.query.invoices.findMany({
        with: {
          customer: true,
          order: true,
        },
        orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
      });
      res.json(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Error fetching invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const validated = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validated);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ error: "Error creating invoice" });
    }
  });

  // Payments endpoints
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const allPayments = await db.query.payments.findMany({
        with: {
          invoice: true,
          customer: true,
          registeredBy: true,
        },
        orderBy: (payments, { desc }) => [desc(payments.createdAt)],
      });
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Error fetching payments" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const validated = insertPaymentSchema.parse({
        ...req.body,
        registeredBy: req.user!.id,
      });
      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(400).json({ error: "Error creating payment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
