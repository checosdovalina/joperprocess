import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hasRole } from "./auth";
import { db } from "./db";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy, getObjectAclPolicy } from "./objectAcl";
import { sendCheckoutEmail } from "./email-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import OpenAI from "openai";
import { 
  insertCustomerSchema,
  updateCustomerSchema,
  insertCheckinSchema,
  insertScheduledVisitSchema,
  updateScheduledVisitSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertCreditAuthorizationSchema,
  insertOrderSchema,
  insertShipmentSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertPendingUploadSchema,
  insertProductCategorySchema,
  insertProductSchema,
  updateProductSchema,
  insertCustomerProductPriceSchema,
  type InsertCustomer,
  type InsertCheckin,
  UserRole,
  QuotationStatus,
  CreditAuthStatus,
  OrderStatus,
  ScheduledVisitStatus,
} from "@shared/schema";
import { customers, quotations, quotationItems, checkins, scheduledVisits, users, orders, creditAuthorizations, creditAuthorizationComments, shipments, invoices, payments, pendingUploads, products, productCategories } from "@shared/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";

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

  app.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validated = updateCustomerSchema.parse(req.body);
      
      // Filter out undefined values to prevent NULL assignments
      const updateData: Partial<InsertCustomer> = {};
      Object.keys(validated).forEach(key => {
        const value = validated[key as keyof typeof validated];
        if (value !== undefined) {
          (updateData as any)[key] = value;
        }
      });
      
      const customer = await storage.updateCustomer(id, updateData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ error: "Error updating customer" });
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

      // Get pending/overdue invoices (accounts receivable)
      const pendingInvoices = await storage.getPendingInvoicesByCustomer(id);
      
      const overdueInvoices = pendingInvoices.filter(inv => 
        inv.dueDate && new Date(inv.dueDate) < new Date()
      );
      
      const upcomingInvoices = pendingInvoices.filter(inv =>
        !inv.dueDate || new Date(inv.dueDate) >= new Date()
      );

      // Calculate total balance due
      const totalBalanceDue = pendingInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || '0');
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);

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

      // Calculate credit usage based on UNPAID INVOICES (pending_payment status)
      // Use balanceDue (outstanding balance) instead of total to account for partial payments
      // Credit Used = Sum of all outstanding balances on pending invoices
      let creditUsed = pendingInvoices.reduce((sum, inv) => {
        // Use balanceDue if available, otherwise fall back to total
        const balance = parseFloat(inv.balanceDue || inv.total || '0');
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      creditUsed = Number.isFinite(creditUsed) ? creditUsed : 0;
      
      // Calculate overdue and upcoming totals separately (using outstanding balance)
      const overdueTotal = overdueInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || '0');
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      
      const upcomingTotal = upcomingInvoices.reduce((sum, inv) => {
        const balance = parseFloat(inv.balanceDue || inv.total || '0');
        return sum + (Number.isFinite(balance) ? balance : 0);
      }, 0);
      
      // Sanitize credit values to prevent NaN
      let creditLimitNum = parseFloat(customer.creditLimit || '0');
      creditLimitNum = Number.isFinite(creditLimitNum) ? creditLimitNum : 0;
      
      // Available Credit = Credit Limit - Credit Used (unpaid invoices)
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
          upcomingTotal: parseFloat(upcomingTotal.toFixed(2)),
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

  app.get("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const checkin = await db.query.checkins.findFirst({
        where: eq(checkins.id, id),
        with: {
          customer: true,
          user: true,
        },
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

  // Scheduled visits endpoints
  app.get("/api/scheduled-visits", isAuthenticated, async (req, res) => {
    try {
      const allVisits = await db.query.scheduledVisits.findMany({
        with: {
          customer: true,
          user: true,
        },
        orderBy: (scheduledVisits, { asc }) => [asc(scheduledVisits.scheduledDate)],
      });
      res.json(allVisits);
    } catch (error) {
      console.error("Error fetching scheduled visits:", error);
      res.status(500).json({ error: "Error fetching scheduled visits" });
    }
  });

  app.get("/api/scheduled-visits/today", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const todayVisits = await db.query.scheduledVisits.findMany({
        where: and(
          eq(scheduledVisits.userId, userId),
          eq(scheduledVisits.status, ScheduledVisitStatus.SCHEDULED),
          gte(scheduledVisits.scheduledDate, startOfDay),
          lt(scheduledVisits.scheduledDate, endOfDay)
        ),
        with: {
          customer: true,
          customerLocation: true,
        },
        orderBy: (scheduledVisits, { asc }) => [asc(scheduledVisits.scheduledDate)],
      });
      res.json(todayVisits);
    } catch (error) {
      console.error("Error fetching today's visits:", error);
      res.status(500).json({ error: "Error fetching today's visits" });
    }
  });

  app.get("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq(scheduledVisits.id, id),
        with: {
          customer: true,
          user: true,
          customerLocation: true,
        },
      });

      if (!visit) {
        return res.status(404).json({ error: "Scheduled visit not found" });
      }

      res.json(visit);
    } catch (error) {
      console.error("Error fetching scheduled visit:", error);
      res.status(500).json({ error: "Error fetching scheduled visit" });
    }
  });

  app.post("/api/scheduled-visits", isAuthenticated, async (req, res) => {
    try {
      const validated = insertScheduledVisitSchema.parse({
        ...req.body,
        userId: req.user!.id, // Set userId from authenticated user
      });

      // customerLocationId is optional - only validate if provided
      if (validated.customerLocationId) {
        const location = await storage.getCustomerLocation(validated.customerLocationId);
        if (!location) {
          return res.status(400).json({ error: "Customer location not found" });
        }
        if (location.customerId !== validated.customerId) {
          return res.status(400).json({ error: "Customer location does not belong to the specified customer" });
        }
      }

      const [visit] = await db.insert(scheduledVisits).values(validated).returning();
      res.status(201).json(visit);
    } catch (error) {
      console.error("Error creating scheduled visit:", error);
      res.status(400).json({ error: "Error creating scheduled visit" });
    }
  });

  app.patch("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Check if visit exists and user owns it
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq(scheduledVisits.id, id),
      });

      if (!visit) {
        return res.status(404).json({ error: "Scheduled visit not found" });
      }

      // Only owner or admin can update
      if (visit.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to update this visit" });
      }

      const validated = updateScheduledVisitSchema.parse(req.body);
      const [updatedVisit] = await db
        .update(scheduledVisits)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(scheduledVisits.id, id))
        .returning();

      res.json(updatedVisit);
    } catch (error) {
      console.error("Error updating scheduled visit:", error);
      res.status(400).json({ error: "Error updating scheduled visit" });
    }
  });

  app.delete("/api/scheduled-visits/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Check if visit exists and user owns it
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq(scheduledVisits.id, id),
      });

      if (!visit) {
        return res.status(404).json({ error: "Scheduled visit not found" });
      }

      // Only owner or admin can delete
      if (visit.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to delete this visit" });
      }

      // Mark as cancelled instead of deleting
      await db
        .update(scheduledVisits)
        .set({ status: ScheduledVisitStatus.CANCELLED, updatedAt: new Date() })
        .where(eq(scheduledVisits.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error cancelling scheduled visit:", error);
      res.status(500).json({ error: "Error cancelling scheduled visit" });
    }
  });

  app.post("/api/scheduled-visits/:id/convert", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate GPS coordinates are provided (allow 0 values)
      if (req.body.latitude == null || req.body.longitude == null) {
        return res.status(400).json({ error: "GPS coordinates are required to start check-in" });
      }

      // Get scheduled visit
      const visit = await db.query.scheduledVisits.findFirst({
        where: eq(scheduledVisits.id, id),
      });

      if (!visit) {
        return res.status(404).json({ error: "Scheduled visit not found" });
      }

      // Only owner can convert
      if (visit.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to convert this visit" });
      }

      if (visit.status !== ScheduledVisitStatus.SCHEDULED) {
        return res.status(400).json({ error: "Visit already completed or cancelled" });
      }

      // Create checkin from scheduled visit with GPS coordinates
      const checkinData: InsertCheckin = {
        userId: visit.userId,
        customerId: visit.customerId,
        customerLocationId: visit.customerLocationId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        topics: visit.topics || [],
        notes: visit.notes || "",
        photos: [],
      };

      const checkin = await storage.createCheckin(checkinData);

      // Update scheduled visit to completed
      await db
        .update(scheduledVisits)
        .set({ 
          status: ScheduledVisitStatus.COMPLETED, 
          checkinId: checkin.id,
          updatedAt: new Date() 
        })
        .where(eq(scheduledVisits.id, id));

      res.status(201).json(checkin);
    } catch (error) {
      console.error("Error converting scheduled visit to checkin:", error);
      res.status(400).json({ error: "Error converting scheduled visit" });
    }
  });

  // Product Categories endpoints
  app.get("/api/product-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllProductCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ error: "Error fetching product categories" });
    }
  });

  app.post("/api/product-categories", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const validated = insertProductCategorySchema.parse(req.body);
      const category = await storage.createProductCategory(validated);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating product category:", error);
      res.status(400).json({ error: "Error creating product category" });
    }
  });

  app.patch("/api/product-categories/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateProductCategory(id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating product category:", error);
      res.status(500).json({ error: "Error updating product category" });
    }
  });

  // Products endpoints
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      let productsData;
      
      if (q && typeof q === 'string') {
        productsData = await storage.searchProducts(q);
      } else {
        productsData = await db.query.products.findMany({
          with: {
            category: true,
          },
          orderBy: (products, { asc }) => [asc(products.name)],
        });
      }
      
      res.json(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Error fetching products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await db.query.products.findFirst({
        where: eq(products.id, id),
        with: {
          category: true,
          customerPrices: true,
        },
      });
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Error fetching product" });
    }
  });

  app.post("/api/products", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      
      // Check if code already exists
      const existing = await storage.getProductByCode(validated.code);
      if (existing) {
        return res.status(400).json({ error: "El código del producto ya existe" });
      }

      // Validate category exists if provided
      if (validated.categoryId) {
        const category = await storage.getProductCategory(validated.categoryId);
        if (!category) {
          return res.status(400).json({ error: "La categoría seleccionada no existe. Por favor, crea la categoría primero." });
        }
      }
      
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: "Error al crear producto" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const validated = updateProductSchema.parse(req.body);
      
      // Check if code already exists for another product
      if (validated.code) {
        const existing = await storage.getProductByCode(validated.code);
        if (existing && existing.id !== id) {
          return res.status(400).json({ error: "Product code already exists" });
        }
      }
      
      const product = await storage.updateProduct(id, validated);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Error updating product" });
    }
  });

  // Customer Product Prices endpoints
  app.get("/api/customers/:customerId/product-prices", isAuthenticated, async (req, res) => {
    try {
      const { customerId } = req.params;
      const prices = await storage.getCustomerProductPrices(customerId);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching customer product prices:", error);
      res.status(500).json({ error: "Error fetching customer product prices" });
    }
  });

  app.post("/api/customer-product-prices", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const validated = insertCustomerProductPriceSchema.parse(req.body);
      const price = await storage.createCustomerProductPrice(validated);
      res.status(201).json(price);
    } catch (error) {
      console.error("Error creating customer product price:", error);
      res.status(400).json({ error: "Error creating customer product price" });
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
      
      // Convert validUntil from string to Date if present
      if (quotationData.validUntil && typeof quotationData.validUntil === 'string') {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      
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

  // Get single quotation with all details
  app.get("/api/quotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Authorization check: user must own the quotation or have authorized role
      // Vendedores can view all quotations for sales follow-up purposes
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole as any)) {
        return res.status(403).json({ error: "No autorizado para acceder a esta cotización" });
      }

      // Get items
      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
        orderBy: (items, { asc }) => [asc(items.position)],
      });

      res.json({ ...quotation, items });
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ error: "Error fetching quotation" });
    }
  });

  app.patch("/api/quotations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Check quotation exists and user has permission
      const existingQuotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
      });

      if (!existingQuotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Authorization check
      const allowedRoles = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA];
      if (existingQuotation.userId !== userId && !allowedRoles.includes(userRole as any)) {
        return res.status(403).json({ error: "No autorizado para editar esta cotización" });
      }

      // Only allow editing DRAFT quotations
      if (existingQuotation.status !== QuotationStatus.DRAFT) {
        return res.status(400).json({ error: "Solo se pueden editar cotizaciones en estado Borrador" });
      }

      const { items, ...quotationData } = req.body;

      // Update quotation data
      const updatedQuotation = await storage.updateQuotation(id, quotationData);

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));

        // Create new items
        for (const item of items) {
          const validatedItem = insertQuotationItemSchema.parse({
            ...item,
            quotationId: id,
          });
          await storage.createQuotationItem(validatedItem);
        }
      }

      // Fetch updated quotation with items
      const finalQuotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });
      const finalItems = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
        orderBy: (items, { asc }) => [asc(items.position)],
      });

      res.json({ ...finalQuotation, items: finalItems });
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Error updating quotation" });
    }
  });

  // Generate and download quotation PDF
  app.get("/api/quotations/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Authorization check: user must own the quotation or be admin/credit/sales role
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole as any)) {
        return res.status(403).json({ error: "No autorizado para acceder a esta cotización" });
      }

      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
        orderBy: (items, { asc }) => [asc(items.position)],
      });

      const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
      const pdfStream = generateQuotationPDFStream({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="cotizacion-${quotation.folio}.pdf"`);

      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating quotation PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });

  // Send quotation by email
  app.post("/api/quotations/:id/send-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { additionalEmails = [] } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Authorization check: user must own the quotation or be admin
      const allowedRoles = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA];
      if (quotation.userId !== userId && !allowedRoles.includes(userRole as any)) {
        return res.status(403).json({ error: "No autorizado para enviar esta cotización" });
      }

      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
      });

      // Generate approval token for customer workflow
      const crypto = await import("crypto");
      const approvalToken = crypto.randomBytes(32).toString("hex");

      // Generate PDF and upload to storage
      const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
      const pdfStream = generateQuotationPDFStream({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
      });

      const objectStorageService = new ObjectStorageService();
      const pdfPath = await objectStorageService.uploadQuotationPdfToStorage(
        pdfStream,
        quotation.folio,
        userId
      );

      // Update quotation with PDF path and approval token
      await storage.updateQuotation(id, { pdfPath, approvalToken });

      // Collect recipients - only send to customer to comply with MailerSend free tier limits
      const recipients: string[] = [];
      
      // Add customer email if exists (primary recipient)
      if (quotation.customer.email) {
        recipients.push(quotation.customer.email);
      }

      // Note: Additional recipients removed due to MailerSend free tier limitations
      // For production, consider upgrading the email service plan

      if (recipients.length === 0) {
        return res.status(400).json({ error: "El cliente no tiene email registrado" });
      }

      // Build approval URL
      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "https";
      const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;

      // Try to send email, but don't fail if email service has issues
      let emailSent = false;
      let emailError = null;
      try {
        const { sendQuotationEmail } = await import("./quotation-email-service");
        await sendQuotationEmail({
          to: recipients,
          quotationData: {
            folio: quotation.folio,
            customerName: quotation.customer.name,
            vendedorName: quotation.user.fullName,
            total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
            currency: quotation.currency || "MXN",
            validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("es-MX") : undefined,
            itemsCount: items.length,
          },
          pdfPath,
          approvalUrl,
        });
        emailSent = true;
      } catch (err: any) {
        console.warn("Email send failed, but continuing with approval link generation:", err.message || err);
        emailError = err.message || "Error del servicio de correo";
      }

      // Update quotation status to pending customer approval
      await storage.updateQuotation(id, { 
        status: QuotationStatus.PENDING_APPROVAL,
        sentAt: new Date(),
        sentMethod: emailSent ? "email" : "manual",
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: `Cotización enviada a: ${recipients.join(", ")}. Esperando aprobación del cliente.`,
          recipients,
          approvalUrl,
        });
      } else {
        // Email failed but we still have the approval URL
        res.json({ 
          success: true, 
          message: `El correo no pudo enviarse, pero el enlace de aprobación está listo. Copia y comparte el enlace con el cliente.`,
          approvalUrl,
          emailError,
          warning: "El servicio de correo tuvo problemas. Comparte el enlace manualmente.",
        });
      }
    } catch (error) {
      console.error("Error sending quotation email:", error);
      res.status(500).json({ error: "Error al enviar el correo" });
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
      const { status, notes, approvalSignature, rejectionNotes } = req.body;
      
      // Require signature for approval
      if (status === CreditAuthStatus.APPROVED && !approvalSignature) {
        return res.status(400).json({ error: "Se requiere firma digital para aprobar" });
      }

      const updateData: any = {
        status,
        notes,
      };

      if (status === CreditAuthStatus.APPROVED) {
        updateData.authorizedAt = new Date();
        updateData.approvedById = req.user!.id;
        updateData.approvalSignature = approvalSignature;
        updateData.approvalSignedAt = new Date();
      } else if (status === CreditAuthStatus.REJECTED) {
        updateData.rejectedById = req.user!.id;
        updateData.rejectionNotes = rejectionNotes;
      }

      const updatedAuth = await storage.updateCreditAuthorization(id, updateData);
      if (!updatedAuth) {
        return res.status(404).json({ error: "Credit authorization not found" });
      }

      // If approved, create order and update quotation status to converted
      if (updatedAuth.status === CreditAuthStatus.APPROVED) {
        // Create order from quotation
        const order = await storage.createOrder({
          quotationId: updatedAuth.quotationId,
          status: OrderStatus.PENDING,
        });

        // Update quotation status to converted and link to order
        await storage.updateQuotation(updatedAuth.quotationId, {
          status: QuotationStatus.CONVERTED,
          authorizedBy: req.user!.id,
          authorizedAt: new Date(),
          convertedToOrderId: order.id,
        });

        return res.json({ ...updatedAuth, order });
      }

      res.json(updatedAuth);
    } catch (error) {
      console.error("Error updating credit authorization:", error);
      res.status(500).json({ error: "Error updating credit authorization" });
    }
  });

  // Get comments for a credit authorization
  app.get("/api/credit-authorizations/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await db.query.creditAuthorizationComments.findMany({
        where: eq(creditAuthorizationComments.creditAuthorizationId, id),
        with: {
          user: true,
        },
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      });
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Error fetching comments" });
    }
  });

  // Add comment to credit authorization
  app.post("/api/credit-authorizations/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "El contenido del comentario es requerido" });
      }

      const [comment] = await db.insert(creditAuthorizationComments).values({
        creditAuthorizationId: id,
        userId: req.user!.id,
        content: content.trim(),
      }).returning();

      // Fetch the comment with user info
      const commentWithUser = await db.query.creditAuthorizationComments.findFirst({
        where: eq(creditAuthorizationComments.id, comment.id),
        with: {
          user: true,
        },
      });

      res.status(201).json(commentWithUser);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Error adding comment" });
    }
  });

  // Update credit authorization (edit notes/details while pending)
  app.put("/api/credit-authorizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, creditAvailable, creditUsed, overdueBalance } = req.body;

      // Check if authorization exists and is pending
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq(creditAuthorizations.id, id),
      });

      if (!auth) {
        return res.status(404).json({ error: "Autorización no encontrada" });
      }

      if (auth.status !== CreditAuthStatus.PENDING) {
        return res.status(400).json({ error: "Solo se pueden editar autorizaciones pendientes" });
      }

      // Only admin, credit/collection, or the requester can edit
      if (req.user!.role !== UserRole.ADMIN && 
          req.user!.role !== UserRole.CREDITO_COBRANZA && 
          req.user!.id !== auth.userId) {
        return res.status(403).json({ error: "No tiene permisos para editar esta autorización" });
      }

      const [updated] = await db.update(creditAuthorizations)
        .set({
          notes,
          creditAvailable,
          creditUsed,
          overdueBalance,
          lastEditedById: req.user!.id,
          lastEditedAt: new Date(),
        })
        .where(eq(creditAuthorizations.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating credit authorization:", error);
      res.status(500).json({ error: "Error updating credit authorization" });
    }
  });

  // Rule-based Credit Analysis endpoint (free, instant)
  app.get("/api/credit-authorizations/:id/analyze-rules", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;

      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq(creditAuthorizations.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
            },
          },
          user: true,
        },
      });

      if (!auth) {
        return res.status(404).json({ error: "Autorización no encontrada" });
      }

      const customer = auth.quotation.customer;
      const quotation = auth.quotation;

      // Get customer's invoice history
      const customerInvoices = await db.query.invoices.findMany({
        where: eq(invoices.customerId, customer.id),
        orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
        limit: 50,
      });

      // Get customer's payment history
      const customerPayments = await db.query.payments.findMany({
        where: eq(payments.customerId, customer.id),
        orderBy: (payments, { desc }) => [desc(payments.paymentDate)],
        limit: 50,
      });

      // Calculate metrics
      const totalInvoices = customerInvoices.length;
      const overdueInvoices = customerInvoices.filter(inv => 
        inv.dueDate && new Date(inv.dueDate) < new Date() && parseFloat(inv.balanceDue || "0") > 0
      );
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || "0"), 0);
      const totalPaid = customerPayments.reduce((sum, pay) => sum + parseFloat(pay.amount || "0"), 0);
      const paidInvoices = customerInvoices.filter(inv => parseFloat(inv.balanceDue || "0") === 0);
      
      const creditLimit = parseFloat(customer.creditLimit || "0");
      const creditUsed = parseFloat(auth.creditUsed || "0");
      const creditAvailable = parseFloat(auth.creditAvailable || "0");
      const quotationTotal = parseFloat(quotation.total || "0");

      // Rule-based scoring system
      let score = 100;
      const positiveFactors: string[] = [];
      const negativeFactors: string[] = [];
      const conditions: string[] = [];

      // Rule 1: Credit limit check (-30 points if exceeds)
      const exceedsCreditLimit = quotationTotal > creditAvailable;
      if (exceedsCreditLimit) {
        score -= 30;
        negativeFactors.push(`El monto ($${quotationTotal.toLocaleString("es-MX")}) excede el crédito disponible ($${creditAvailable.toLocaleString("es-MX")})`);
        conditions.push("Solicitar anticipo o pago parcial");
      } else {
        positiveFactors.push("El monto está dentro del límite de crédito disponible");
      }

      // Rule 2: Overdue invoices (-25 points if has overdue)
      const hasOverdueBalance = overdueAmount > 0;
      if (hasOverdueBalance) {
        score -= 25;
        negativeFactors.push(`Tiene ${overdueInvoices.length} factura(s) vencida(s) por $${overdueAmount.toLocaleString("es-MX")}`);
        conditions.push("Regularizar saldos vencidos antes de autorizar");
      } else if (totalInvoices > 0) {
        positiveFactors.push("Sin facturas vencidas");
      }

      // Rule 3: Credit utilization (-15 points if over 80%)
      const creditUtilization = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
      if (creditUtilization > 80) {
        score -= 15;
        negativeFactors.push(`Alta utilización de crédito (${creditUtilization.toFixed(1)}%)`);
        conditions.push("Considerar aumentar límite de crédito");
      } else if (creditUtilization > 50) {
        score -= 5;
        negativeFactors.push(`Utilización de crédito moderada (${creditUtilization.toFixed(1)}%)`);
      } else if (creditLimit > 0) {
        positiveFactors.push(`Baja utilización de crédito (${creditUtilization.toFixed(1)}%)`);
      }

      // Rule 4: Payment history (+10 if good history)
      if (paidInvoices.length >= 3) {
        positiveFactors.push(`Historial de pago con ${paidInvoices.length} facturas liquidadas`);
        score = Math.min(100, score + 10);
      } else if (totalInvoices === 0) {
        negativeFactors.push("Sin historial de crédito previo");
        score -= 10;
        conditions.push("Considerar crédito reducido para primera compra");
      }

      // Rule 5: Customer approved the quotation (+5)
      if (quotation.customerApprovedAt) {
        positiveFactors.push("Cotización aprobada formalmente por el cliente");
        score = Math.min(100, score + 5);
      }

      // Rule 6: Recent payments (+5)
      const recentPayments = customerPayments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return paymentDate >= thirtyDaysAgo;
      });
      if (recentPayments.length > 0) {
        positiveFactors.push(`${recentPayments.length} pago(s) registrado(s) en los últimos 30 días`);
        score = Math.min(100, score + 5);
      }

      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));

      // Determine risk level and recommendation
      let riskLevel: string;
      let recommendation: string;

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

      // Generate summary
      let summary = "";
      if (recommendation === "aprobar") {
        summary = `Cliente con buen perfil crediticio. Score ${score}/100 indica bajo riesgo.`;
      } else if (recommendation === "aprobar_con_condiciones") {
        summary = `Se puede aprobar con condiciones. Score ${score}/100 indica riesgo moderado.`;
      } else if (recommendation === "revisar_manualmente") {
        summary = `Requiere revisión manual. Score ${score}/100 indica factores de riesgo importantes.`;
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
          negative: negativeFactors,
        },
        conditions,
        reasoning: `Análisis automático basado en: límite de crédito, saldos vencidos, utilización de crédito, e historial de pagos.`,
      };

      const analysisContext = {
        customer: {
          name: customer.name,
          rfc: customer.rfc,
          creditLimit,
          creditUsed,
          creditAvailable,
          paymentTerms: (customer as any).paymentTerms || "Contado",
          createdAt: customer.createdAt,
        },
        quotation: {
          folio: quotation.folio,
          total: quotationTotal,
          validUntil: quotation.validUntil,
          customerApprovedAt: quotation.customerApprovedAt,
        },
        history: {
          totalInvoices,
          overdueInvoicesCount: overdueInvoices.length,
          overdueAmount,
          totalPaid,
          recentPaymentsCount: customerPayments.length,
        },
        analysis: {
          exceedsCreditLimit,
          creditUtilization: creditUtilization.toFixed(1),
          hasOverdueBalance,
        },
      };

      res.json({
        success: true,
        analysis,
        context: analysisContext,
        type: "rules",
      });
    } catch (error) {
      console.error("Error in rule-based credit analysis:", error);
      res.status(500).json({ error: "Error al analizar la solicitud de crédito" });
    }
  });

  // AI Credit Analysis endpoint (optional, uses credits)
  app.post("/api/credit-authorizations/:id/analyze", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;

      // Get the credit authorization with all related data
      const auth = await db.query.creditAuthorizations.findFirst({
        where: eq(creditAuthorizations.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
            },
          },
          user: true,
        },
      });

      if (!auth) {
        return res.status(404).json({ error: "Autorización no encontrada" });
      }

      const customer = auth.quotation.customer;
      const quotation = auth.quotation;

      // Get customer's invoice history
      const customerInvoices = await db.query.invoices.findMany({
        where: eq(invoices.customerId, customer.id),
        orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
        limit: 20,
      });

      // Get customer's payment history
      const customerPayments = await db.query.payments.findMany({
        where: eq(payments.customerId, customer.id),
        orderBy: (payments, { desc }) => [desc(payments.paymentDate)],
        limit: 20,
      });

      // Calculate metrics
      const totalInvoices = customerInvoices.length;
      const overdueInvoices = customerInvoices.filter(inv => 
        inv.dueDate && new Date(inv.dueDate) < new Date() && parseFloat(inv.balanceDue || "0") > 0
      );
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || "0"), 0);
      const totalPaid = customerPayments.reduce((sum, pay) => sum + parseFloat(pay.amount || "0"), 0);
      
      const creditLimit = parseFloat(customer.creditLimit || "0");
      const creditUsed = parseFloat(auth.creditUsed || "0");
      const creditAvailable = parseFloat(auth.creditAvailable || "0");
      const quotationTotal = parseFloat(quotation.total || "0");

      // Prepare context for AI analysis
      const analysisContext = {
        customer: {
          name: customer.name,
          rfc: customer.rfc,
          creditLimit,
          creditUsed,
          creditAvailable,
          paymentTerms: (customer as any).paymentTerms || "Contado",
          createdAt: customer.createdAt,
        },
        quotation: {
          folio: quotation.folio,
          total: quotationTotal,
          validUntil: quotation.validUntil,
          customerApprovedAt: quotation.customerApprovedAt,
        },
        history: {
          totalInvoices,
          overdueInvoicesCount: overdueInvoices.length,
          overdueAmount,
          totalPaid,
          recentPaymentsCount: customerPayments.length,
        },
        analysis: {
          exceedsCreditLimit: quotationTotal > creditAvailable,
          creditUtilization: creditLimit > 0 ? ((creditUsed / creditLimit) * 100).toFixed(1) : "N/A",
          hasOverdueBalance: overdueAmount > 0,
        },
      };

      // Initialize OpenAI client with Replit AI Integrations
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `Eres un analista de crédito experto para una empresa comercial mexicana. Analiza la siguiente solicitud de autorización de crédito y proporciona una evaluación detallada con recomendación.

DATOS DEL CLIENTE:
- Nombre: ${analysisContext.customer.name}
- RFC: ${analysisContext.customer.rfc}
- Límite de crédito: $${creditLimit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Crédito utilizado: $${creditUsed.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Crédito disponible: $${creditAvailable.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Condiciones de pago: ${analysisContext.customer.paymentTerms}
- Cliente desde: ${format(new Date(analysisContext.customer.createdAt), "PP", { locale: es })}

COTIZACIÓN SOLICITADA:
- Folio: ${analysisContext.quotation.folio}
- Monto: $${quotationTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Aprobada por cliente: ${analysisContext.quotation.customerApprovedAt ? "Sí" : "No"}

HISTORIAL:
- Total de facturas: ${totalInvoices}
- Facturas vencidas: ${overdueInvoices.length}
- Monto vencido: $${overdueAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
- Total pagado históricamente: $${totalPaid.toLocaleString("es-MX", { minimumFractionDigits: 2 })}

ANÁLISIS PRELIMINAR:
- Excede límite de crédito: ${analysisContext.analysis.exceedsCreditLimit ? "SÍ" : "NO"}
- Utilización del crédito: ${analysisContext.analysis.creditUtilization}%
- Tiene saldo vencido: ${analysisContext.analysis.hasOverdueBalance ? "SÍ" : "NO"}

Proporciona tu análisis en el siguiente formato JSON:
{
  "riskLevel": "bajo|medio|alto|muy_alto",
  "recommendation": "aprobar|aprobar_con_condiciones|rechazar|revisar_manualmente",
  "score": (número del 0 al 100 indicando la probabilidad de pago),
  "summary": "Resumen ejecutivo de 2-3 oraciones",
  "factors": {
    "positive": ["lista de factores positivos"],
    "negative": ["lista de factores negativos"]
  },
  "conditions": ["condiciones recomendadas si aplica"],
  "reasoning": "Explicación detallada del análisis"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un analista de crédito experto. Responde únicamente con JSON válido, sin markdown ni texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      
      // Parse the JSON response
      let analysis;
      try {
        // Remove potential markdown code blocks
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError, responseText);
        analysis = {
          riskLevel: "revisar",
          recommendation: "revisar_manualmente",
          score: 50,
          summary: "No se pudo completar el análisis automático. Se requiere revisión manual.",
          factors: { positive: [], negative: ["Error en análisis automático"] },
          conditions: [],
          reasoning: responseText,
        };
      }

      res.json({
        success: true,
        analysis,
        context: analysisContext,
      });
    } catch (error) {
      console.error("Error analyzing credit authorization:", error);
      res.status(500).json({ error: "Error al analizar la solicitud de crédito" });
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

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedInvoice = await storage.updateInvoice(id, req.body);
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Error updating invoice" });
    }
  });

  // Get single invoice with details
  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: { customer: true, order: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Error fetching invoice" });
    }
  });

  // Generate and download invoice PDF
  app.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: { customer: true, order: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const { generateInvoicePDFStream } = await import("./invoice-pdf-generator");
      const pdfStream = generateInvoicePDFStream({ invoice, customer: invoice.customer });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="factura-${invoice.serie}-${invoice.folio}.pdf"`);

      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });

  // Send invoice by email
  app.post("/api/invoices/:id/send-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: { customer: true },
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (!invoice.customer.email) {
        return res.status(400).json({ error: "El cliente no tiene correo electrónico configurado" });
      }

      const { sendInvoiceEmail } = await import("./invoice-email-service");
      await sendInvoiceEmail({
        invoice,
        customer: invoice.customer,
        recipientEmail: invoice.customer.email,
        ccEmails: req.user?.email ? [req.user.email] : [],
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

  // Accounts Receivable endpoints (facturas por cobrar)
  app.get("/api/accounts-receivable", isAuthenticated, async (req, res) => {
    try {
      const { customerId, status } = req.query;
      
      let receivables;
      if (customerId) {
        // Fetch with customer data joined
        receivables = await db.query.invoices.findMany({
          where: and(
            eq(invoices.customerId, customerId as string),
            status === "pending" ? eq(invoices.status, "pending_payment") : undefined
          ),
          with: {
            customer: true,
          },
          orderBy: (invoices, { desc }) => [desc(invoices.dueDate)],
        });
      } else {
        receivables = await db.query.invoices.findMany({
          where: status ? eq(invoices.status, status as string) : undefined,
          with: {
            customer: true,
          },
          orderBy: (invoices, { desc }) => [desc(invoices.dueDate)],
        });
      }
      
      res.json(receivables);
    } catch (error) {
      console.error("Error fetching accounts receivable:", error);
      res.status(500).json({ error: "Error fetching accounts receivable" });
    }
  });

  app.get("/api/accounts-receivable/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: {
          customer: true,
        },
      });
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Error fetching invoice" });
    }
  });

  app.post("/api/accounts-receivable", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.FACTURACION), async (req, res) => {
    try {
      const validated = insertInvoiceSchema.parse(req.body);
      
      // Set default values for new receivable
      const invoiceData = {
        ...validated,
        status: validated.status || "pending_payment",
        balanceDue: validated.balanceDue || validated.total, // Initialize balance to total
      };
      
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating account receivable:", error);
      res.status(400).json({ error: "Error creating account receivable" });
    }
  });

  app.patch("/api/accounts-receivable/:id", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.FACTURACION, UserRole.CREDITO_COBRANZA), async (req, res) => {
    try {
      const { id } = req.params;
      const updatedInvoice = await storage.updateInvoice(id, req.body);
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating account receivable:", error);
      res.status(500).json({ error: "Error updating account receivable" });
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

  // Object Storage endpoints for check-in photos
  app.get("/public-objects/:filePath(*)", async (req, res) => {
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

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user!.id;
    const objectPath = req.params.objectPath;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        objectPath,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
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

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        checkinId: z.string().uuid(),
      });

      const { checkinId } = schema.parse(req.body);
      const userId = req.user!.id;

      // Verify checkin exists and user owns it
      const checkin = await storage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      if (checkin.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const objectStorageService = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorageService.getObjectEntityUploadURL();

      // Create pending upload entry (expires in 1 hour) with schema validation
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const validatedUpload = insertPendingUploadSchema.parse({
        entityId,
        userId,
        checkinId,
        used: false,
        expiresAt,
      });
      await db.insert(pendingUploads).values(validatedUpload);

      res.json({ uploadURL, entityId });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Error getting upload URL" });
    }
  });

  app.put("/api/checkin-photos", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        checkinId: z.string().uuid(),
        entityId: z.string().refine(
          (val) => {
            // Prevent path traversal: no ".." or "\\"
            // Allow "/" for valid paths like "uploads/<uuid>"
            return !val.includes("..") && !val.includes("\\");
          },
          { message: "Invalid entityId: path traversal detected" }
        ),
      });

      const { checkinId, entityId } = schema.parse(req.body);
      const userId = req.user!.id;

      // Pre-verify issuance (outside transaction) to prevent oracle exposure
      const pendingUpload = await db.query.pendingUploads.findFirst({
        where: eq(pendingUploads.entityId, entityId),
      });

      if (!pendingUpload) {
        return res.status(403).json({ error: "Invalid or inaccessible photo" });
      }

      // Verify ownership, checkin match, unused, and not expired
      if (
        pendingUpload.userId !== userId ||
        pendingUpload.checkinId !== checkinId ||
        pendingUpload.used ||
        pendingUpload.expiresAt < new Date()
      ) {
        return res.status(403).json({ error: "Invalid or inaccessible photo" });
      }

      // Transaction 1: verify constraints + mark issuance used
      let checkin;
      let updatedPhotos: string[];
      try {
        checkin = await db.transaction(async (tx) => {
          // Lock checkin row for update to prevent races
          const [locked] = await tx
            .select()
            .from(checkins)
            .where(eq(checkins.id, checkinId))
            .for("update");

          if (!locked) {
            throw new Error("CHECKIN_NOT_FOUND");
          }

          if (locked.userId !== userId) {
            throw new Error("NOT_AUTHORIZED");
          }

          const currentPhotos = locked.photos || [];

          // Verify constraints
          if (currentPhotos.includes(entityId)) {
            throw new Error("DUPLICATE_PHOTO");
          }

          if (currentPhotos.length >= 6) {
            throw new Error("MAX_PHOTOS_REACHED");
          }

          // Mark issuance used
          await tx
            .update(pendingUploads)
            .set({ used: true })
            .where(eq(pendingUploads.entityId, entityId));

          return locked;
        });
      } catch (txError: any) {
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
          return res.status(409).json({ error: "Maximum 6 photos per check-in" });
        }
        throw txError;
      }

      // Set ACL (after issuance marked, before photos update)
      const objectStorageService = new ObjectStorageService();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(entityId);
        await setObjectAclPolicy(objectFile, {
          owner: userId,
          visibility: "private",
        });
      } catch (aclError) {
        // ACL failed - reset used flag and abort
        await db.update(pendingUploads)
          .set({ used: false })
          .where(eq(pendingUploads.entityId, entityId));
        
        console.error("ACL update failed, reset pending upload:", aclError);
        return res.status(500).json({ error: "Failed to set photo permissions" });
      }

      // Transaction 2: update photos (only if ACL succeeded)
      try {
        updatedPhotos = await db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(checkins)
            .where(eq(checkins.id, checkinId));

          const currentPhotos = current.photos || [];
          const newPhotos = [...currentPhotos, entityId];

          await tx
            .update(checkins)
            .set({ photos: newPhotos })
            .where(eq(checkins.id, checkinId));

          return newPhotos;
        });
      } catch (updateError) {
        // Photos update failed - reset used flag
        await db.update(pendingUploads)
          .set({ used: false })
          .where(eq(pendingUploads.entityId, entityId));
        
        console.error("Photos update failed, reset pending upload:", updateError);
        return res.status(500).json({ error: "Failed to update check-in photos" });
      }

      res.status(200).json({
        entityId: entityId,
        photos: updatedPhotos,
      });
    } catch (error) {
      console.error("Error setting check-in photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/checkins/:id/checkout", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    const userId = req.user!.id;

    try {
      // Parse optional checkoutNotes from body
      const schema = z.object({
        checkoutNotes: z.string().optional(),
      });
      const { checkoutNotes } = schema.parse(req.body);

      const checkin = await storage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      // Verify authorization: user must own the check-in or be an admin
      if (checkin.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to checkout this check-in" });
      }

      if (checkin.checkoutAt) {
        return res.status(400).json({ error: "Check-in already checked out" });
      }

      const customer = await storage.getCustomer(checkin.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const user = await storage.getUser(checkin.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`Generating and uploading PDF for check-in ${checkinId}...`);
      const { generateMinutePDFStream } = await import("./pdf-generator");
      const pdfStream = await generateMinutePDFStream({ 
        checkin, 
        customer, 
        user, 
        checkoutNotes 
      });

      const objectStorageService = new ObjectStorageService();
      const pdfPath = await objectStorageService.uploadPdfStreamToStorage(
        pdfStream,
        checkinId,
        userId
      );

      console.log(`Updating check-in with checkout time and PDF path...`);
      const updatedCheckin = await storage.updateCheckin(checkinId, {
        checkoutAt: new Date(),
        checkoutNotes,
        minutePdfPath: pdfPath,
      });

      // Send email notifications with PDF attachment
      try {
        console.log(`Sending email notifications...`);
        const recipients: string[] = [];
        
        // TEMPORAL: Solo enviar al vendedor para trial de Mailersend (límite 1 destinatario)
        // TODO: Una vez verificado el dominio, descomentar las otras líneas
        
        // Add salesperson (user) email - PRIORIDAD
        if (user.email) {
          recipients.push(user.email);
        }
        
        /* DESCOMENTAR cuando se verifique dominio en Mailersend:
        // Add customer email if exists
        if (customer.email) {
          recipients.push(customer.email);
        }
        
        // Get admin emails
        const admins = await db.query.users.findMany({
          where: eq(users.role, UserRole.ADMIN),
        });
        
        admins.forEach(admin => {
          if (admin.email && !recipients.includes(admin.email)) {
            recipients.push(admin.email);
          }
        });
        */
        
        if (recipients.length > 0) {
          await sendCheckoutEmail({
            to: recipients,
            checkinData: {
              customerName: customer.name,
              vendedorName: user.fullName,
              checkoutDate: format(new Date(), "PPP 'a las' p", { locale: es }),
              notes: checkoutNotes,
            },
            pdfPath,
          });
          console.log(`✅ Emails sent to: ${recipients.join(', ')}`);
        } else {
          console.warn('⚠️ No recipients found for email notification');
        }
      } catch (emailError) {
        // Log the error but don't fail the checkout
        console.error('❌ Error sending emails:', emailError);
      }

      res.status(200).json({
        checkin: updatedCheckin,
        pdfPath: pdfPath,
      });
    } catch (error) {
      console.error(`Error during checkout for check-in ${checkinId}:`, error);
      res.status(500).json({ error: "Error processing checkout" });
    }
  });

  // Download check-in PDF
  app.get("/api/checkins/:id/pdf", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    const userId = req.user!.id;

    try {
      const checkin = await storage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      // Verify authorization: user must own the check-in or be an admin
      if (checkin.userId !== userId && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Not authorized to access this PDF" });
      }

      if (!checkin.minutePdfPath) {
        return res.status(404).json({ error: "PDF not yet generated for this check-in" });
      }

      // Validate path to prevent path traversal attacks
      if (checkin.minutePdfPath.includes('..')) {
        console.error(`Invalid PDF path detected: ${checkin.minutePdfPath}`);
        return res.status(400).json({ error: "Invalid PDF path" });
      }

      // Stream PDF from object storage
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObjectByPath(checkin.minutePdfPath, res, {
        isPublic: false,
        contentType: "application/pdf",
        disposition: "attachment",
        filename: `minuta-${checkinId}.pdf`,
      });
    } catch (error) {
      console.error(`Error downloading PDF for check-in ${checkinId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading PDF" });
      }
    }
  });

  // ==========================================
  // PUBLIC QUOTATION APPROVAL ENDPOINTS
  // These don't require authentication - they use approval tokens
  // ==========================================

  // Get quotation by approval token (public)
  app.get("/api/public/quotations/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.approvalToken, token),
        with: {
          customer: true,
          user: true,
        },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      // Check if already approved/rejected
      if (quotation.customerApprovedAt) {
        return res.json({
          ...quotation,
          alreadyProcessed: true,
          decision: "approved",
          processedAt: quotation.customerApprovedAt,
        });
      }

      if (quotation.customerRejectedAt) {
        return res.json({
          ...quotation,
          alreadyProcessed: true,
          decision: "rejected",
          processedAt: quotation.customerRejectedAt,
          rejectionReason: quotation.customerRejectionReason,
        });
      }

      // Check if expired
      if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
        return res.json({
          ...quotation,
          alreadyProcessed: true,
          decision: "expired",
        });
      }

      // Get items
      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, quotation.id),
        orderBy: (items, { asc }) => [asc(items.position)],
      });

      res.json({
        ...quotation,
        items,
        alreadyProcessed: false,
      });
    } catch (error) {
      console.error("Error fetching quotation by token:", error);
      res.status(500).json({ error: "Error al cargar la cotización" });
    }
  });

  // Customer approves quotation (public)
  app.post("/api/public/quotations/:token/approve", async (req, res) => {
    try {
      const { token } = req.params;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.approvalToken, token),
        with: {
          customer: true,
        },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      // Check if already processed
      if (quotation.customerApprovedAt || quotation.customerRejectedAt) {
        return res.status(400).json({ error: "Esta cotización ya fue procesada" });
      }

      // Check if expired
      if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
        return res.status(400).json({ error: "Esta cotización ha expirado" });
      }

      const now = new Date();

      // Check if credit authorization already exists (idempotency)
      const existingAuth = await db.query.creditAuthorizations.findFirst({
        where: eq(creditAuthorizations.quotationId, quotation.id),
      });

      if (existingAuth) {
        return res.status(400).json({ error: "Ya existe una solicitud de autorización para esta cotización" });
      }

      // Update quotation: mark as customer approved and move to credit authorization
      const [updated] = await db.update(quotations)
        .set({
          customerApprovedAt: now,
          status: QuotationStatus.PENDING_AUTHORIZATION,
          requiresApproval: true,
          approvalReason: "Aprobada por el cliente - pendiente autorización de crédito",
          updatedAt: now,
        })
        .where(eq(quotations.id, quotation.id))
        .returning();

      // Create credit authorization request automatically
      // Note: userId is the sales rep who created the quotation
      await db.insert(creditAuthorizations).values({
        quotationId: quotation.id,
        userId: quotation.userId,
        status: CreditAuthStatus.PENDING,
        notes: `Solicitud automática: Cliente aprobó cotización ${quotation.folio} - Total: $${quotation.total}`,
      });

      res.json({
        success: true,
        message: "Cotización aprobada exitosamente. Se ha enviado para autorización de crédito.",
        quotation: updated,
      });
    } catch (error) {
      console.error("Error approving quotation:", error);
      res.status(500).json({ error: "Error al aprobar la cotización" });
    }
  });

  // Customer rejects quotation (public)
  app.post("/api/public/quotations/:token/reject", async (req, res) => {
    try {
      const { token } = req.params;
      const { reason } = req.body;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.approvalToken, token),
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      // Check if already processed
      if (quotation.customerApprovedAt || quotation.customerRejectedAt) {
        return res.status(400).json({ error: "Esta cotización ya fue procesada" });
      }

      const now = new Date();

      // Update quotation: mark as rejected by customer
      const [updated] = await db.update(quotations)
        .set({
          customerRejectedAt: now,
          customerRejectionReason: reason || "Sin razón especificada",
          status: QuotationStatus.REJECTED,
          updatedAt: now,
        })
        .where(eq(quotations.id, quotation.id))
        .returning();

      res.json({
        success: true,
        message: "Cotización rechazada.",
        quotation: updated,
      });
    } catch (error) {
      console.error("Error rejecting quotation:", error);
      res.status(500).json({ error: "Error al rechazar la cotización" });
    }
  });

  // Download quotation PDF by token (public)
  app.get("/api/public/quotations/:token/pdf", async (req, res) => {
    try {
      const { token } = req.params;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.approvalToken, token),
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      if (!quotation.pdfPath) {
        return res.status(404).json({ error: "PDF no disponible" });
      }

      const objectStorageService = new ObjectStorageService();
      await objectStorageService.downloadObjectByPath(quotation.pdfPath, res, {
        isPublic: false,
        contentType: "application/pdf",
        disposition: "inline",
        filename: `cotizacion-${quotation.folio}.pdf`,
      });
    } catch (error) {
      console.error("Error downloading quotation PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al descargar el PDF" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
