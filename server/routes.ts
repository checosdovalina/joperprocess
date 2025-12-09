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
import { customers, quotations, quotationItems, checkins, scheduledVisits, users, orders, creditAuthorizations, shipments, invoices, payments, pendingUploads, products, productCategories } from "@shared/schema";
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

      // Calculate credit usage (ALL authorized/converted quotations, not just recent)
      const creditUsageResult = await db.execute(sql`
        SELECT COALESCE(SUM(total::numeric), 0) as total_used
        FROM ${quotations}
        WHERE customer_id = ${id}
        AND status IN ('authorized', 'converted')
      `);
      
      // Sanitize credit values to prevent NaN
      let creditUsed = parseFloat(creditUsageResult.rows[0].total_used as string);
      creditUsed = Number.isFinite(creditUsed) ? creditUsed : 0;
      
      let creditLimitNum = parseFloat(customer.creditLimit || '0');
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
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA];
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

      // Authorization check: user must own the quotation or be admin/credit role
      const allowedRoles = [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA];
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

      // Update quotation with PDF path
      await storage.updateQuotation(id, { pdfPath });

      // Collect recipients
      const recipients: string[] = [];
      
      // Add customer email if exists
      if (quotation.customer.email) {
        recipients.push(quotation.customer.email);
      }

      // Add seller email
      if (quotation.user.email) {
        recipients.push(quotation.user.email);
      }

      // Add any additional emails
      if (additionalEmails && Array.isArray(additionalEmails)) {
        additionalEmails.forEach((email: string) => {
          if (email && !recipients.includes(email)) {
            recipients.push(email);
          }
        });
      }

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No hay destinatarios de correo válidos" });
      }

      // Send email
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
      });

      // Update quotation status to sent
      await storage.updateQuotation(id, { 
        status: QuotationStatus.SENT,
        sentAt: new Date(),
        sentMethod: "email",
      });

      // Automatically create credit authorization request
      const authReason = quotation.requiresApproval 
        ? `Requiere autorización: ${quotation.approvalReason || "Descuento excede límite permitido"}`
        : "Cotización enviada - Pendiente de autorización de crédito";

      const creditAuth = await storage.createCreditAuthorization({
        quotationId: id,
        userId: req.user!.id,
        status: CreditAuthStatus.PENDING,
        notes: authReason,
      });

      // Update quotation to pending authorization status
      await storage.updateQuotation(id, { 
        status: QuotationStatus.PENDING_AUTHORIZATION,
      });

      res.json({ 
        success: true, 
        message: `Cotización enviada a: ${recipients.join(", ")}. Ahora está en proceso de autorización.`,
        recipients,
        creditAuthorizationId: creditAuth.id,
      });
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

  const httpServer = createServer(app);

  return httpServer;
}
