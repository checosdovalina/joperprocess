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
  insertOrderReleaseSchema,
  insertShipmentSchema,
  insertShipmentProductInstanceSchema,
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
  InvoiceStatus,
  ScheduledVisitStatus,
  MeetingType,
  IncidentType,
  IncidentStatus,
  IncidentUrgency,
  CommentVisibility,
  insertIncidentSchema,
  insertIncidentCommentSchema,
  insertIncidentAttachmentSchema,
} from "@shared/schema";
import { customers, quotations, quotationItems, checkins, scheduledVisits, users, orders, orderReleases, creditAuthorizations, creditAuthorizationComments, shipments, shipmentProductInstances, invoices, payments, pendingUploads, products, productCategories, incidents, incidentComments, incidentAttachments, incidentActivities } from "@shared/schema";
import { randomBytes } from "crypto";
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

  // Update check-in (only allowed for in-progress check-ins, by owner or admin)
  app.patch("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Validate request body with Zod schema
      const updateCheckinSchema = z.object({
        meetingType: z.enum([MeetingType.LLAMADA, MeetingType.VISITA, MeetingType.VIDEOLLAMADA]),
      });

      const validationResult = updateCheckinSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Tipo de reunión inválido" });
      }

      const { meetingType } = validationResult.data;

      // Fetch the existing check-in
      const existingCheckin = await db.query.checkins.findFirst({
        where: eq(checkins.id, id),
      });

      if (!existingCheckin) {
        return res.status(404).json({ error: "Check-in no encontrado" });
      }

      // Check ownership or admin role
      const isOwner = existingCheckin.userId === user.id;
      const isAdmin = user.role === UserRole.ADMIN;
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "No tienes permiso para editar este check-in" });
      }

      // Only allow editing if check-in is still in progress (no checkout)
      if (existingCheckin.checkoutAt) {
        return res.status(400).json({ error: "No se puede editar un check-in ya finalizado" });
      }

      // Update the check-in
      const [updated] = await db
        .update(checkins)
        .set({ meetingType })
        .where(eq(checkins.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating check-in:", error);
      res.status(500).json({ error: "Error al actualizar el check-in" });
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

      // Convert date strings to Date objects for Drizzle
      if (quotationData.validUntil && typeof quotationData.validUntil === 'string') {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      if (quotationData.shippingApprovedAt && typeof quotationData.shippingApprovedAt === 'string') {
        quotationData.shippingApprovedAt = new Date(quotationData.shippingApprovedAt);
      }

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

  // Approve free shipping for a quotation (Admin only)
  app.post("/api/quotations/:id/approve-shipping", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      if (!quotation.shippingHandledByJoper) {
        return res.status(400).json({ error: "Esta cotización no tiene envío por cuenta de Joper" });
      }

      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta cotización no está pendiente de aprobación de envío" });
      }

      // Update quotation with shipping approval - change to SENT status so customer can approve
      // After customer approves, it will go to credit authorization
      await storage.updateQuotation(id, {
        shippingApprovalStatus: "approved",
        shippingApprovedBy: adminId,
        shippingApprovedAt: new Date(),
        status: QuotationStatus.SENT,
      });

      // Get quotation items for email
      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
      });

      // Generate PDF and send to customer for approval
      try {
        const crypto = await import("crypto");
        const approvalToken = quotation.approvalToken || crypto.randomBytes(32).toString("hex");
        
        const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
        const pdfStream = generateQuotationPDFStream({
          quotation: { ...quotation, shippingApprovalStatus: "approved" },
          items,
          customer: quotation.customer,
          user: quotation.user,
        });

        const objectStorageService = new ObjectStorageService();
        const pdfPath = await objectStorageService.uploadQuotationPdfToStorage(
          pdfStream,
          quotation.folio,
          adminId
        );

        // Update PDF path and approval token
        await storage.updateQuotation(id, { pdfPath, approvalToken });

        // Send email to customer and salesperson with approval link
        const recipients: string[] = [];
        if (quotation.customer.email) recipients.push(quotation.customer.email);
        if (quotation.user.email) recipients.push(quotation.user.email);

        if (recipients.length > 0) {
          const host = req.get("host") || "localhost:5000";
          const protocol = req.protocol || "https";
          const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;

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
          } catch (emailErr: any) {
            console.warn("Email send failed:", emailErr.message || emailErr);
          }
        }
      } catch (emailError: any) {
        console.warn("PDF/Email failed after shipping approval:", emailError.message || emailError);
      }

      res.json({ 
        success: true, 
        message: "Envío gratuito aprobado. La cotización ha sido enviada al cliente para su aprobación." 
      });
    } catch (error) {
      console.error("Error approving shipping:", error);
      res.status(500).json({ error: "Error al aprobar el envío" });
    }
  });

  // Reject free shipping for a quotation (Admin only)
  app.post("/api/quotations/:id/reject-shipping", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.id;

      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      if (!quotation.shippingHandledByJoper) {
        return res.status(400).json({ error: "Esta cotización no tiene envío por cuenta de Joper" });
      }

      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta cotización no está pendiente de aprobación de envío" });
      }

      // Update quotation with shipping rejection
      await storage.updateQuotation(id, {
        shippingApprovalStatus: "rejected",
        shippingRejectedBy: adminId,
        shippingRejectedAt: new Date(),
        shippingRejectionReason: reason || "No se proporcionó motivo",
        status: QuotationStatus.DRAFT, // Return to draft for vendor to modify
      });

      // Send notification to salesperson
      try {
        if (quotation.user.email) {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          await resend.emails.send({
            from: "GRUPO JOPER <noreply@resend.dev>",
            to: quotation.user.email,
            subject: `Envío sin costo rechazado - Cotización ${quotation.folio}`,
            html: `
              <h2>Cotización ${quotation.folio}</h2>
              <p>El envío sin costo por cuenta de Joper ha sido <strong>rechazado</strong>.</p>
              <p><strong>Motivo:</strong> ${reason || "No se proporcionó motivo"}</p>
              <p>Por favor, modifica la cotización y ajusta el costo de envío según sea necesario.</p>
              <p>Saludos,<br>Sistema GRUPO JOPER</p>
            `,
          });
        }
      } catch (emailError: any) {
        console.warn("Email notification failed after shipping rejection:", emailError.message || emailError);
      }

      res.json({ 
        success: true, 
        message: "Envío sin costo rechazado. Se ha notificado al vendedor." 
      });
    } catch (error) {
      console.error("Error rejecting shipping:", error);
      res.status(500).json({ error: "Error al rechazar el envío" });
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

  // Download credit authorization as PDF
  app.get("/api/credit-authorizations/:id/pdf", isAuthenticated, async (req, res) => {
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

      // Get approved by user if exists
      let approvedBy = null;
      if (auth.approvedById) {
        approvedBy = await db.query.users.findFirst({
          where: eq(users.id, auth.approvedById),
        });
      }

      const { generateCreditAuthPDFStream } = await import("./credit-auth-pdf-generator");
      
      const pdfStream = generateCreditAuthPDFStream({
        authorization: auth,
        quotation: auth.quotation,
        customer: auth.quotation.customer,
        requestedBy: auth.user,
        approvedBy,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="autorizacion-credito-${auth.quotation.folio}.pdf"`);
      
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating credit authorization PDF:", error);
      res.status(500).json({ error: "Error al generar el PDF" });
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

  // Get order with full details including quotation items and releases
  app.get("/api/orders/:id/details", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
              items: {
                with: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Get all releases for this order
      const releases = await storage.getOrderReleases(id);

      res.json({ ...order, releases });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Error fetching order details" });
    }
  });

  // Get order releases
  app.get("/api/orders/:id/releases", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const releases = await storage.getOrderReleases(id);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching order releases:", error);
      res.status(500).json({ error: "Error fetching order releases" });
    }
  });

  // Create order release (partial or total release of products)
  // Roles allowed: ADMIN, VENTAS_LOGISTICA, EMBARQUES
  app.post("/api/orders/:id/releases", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.EMBARQUES), async (req, res) => {
    try {
      const { id } = req.params;
      const { createInvoice, createShipment, shipmentData, ...releaseData } = req.body;
      
      // Validate shipmentData if createShipment is requested
      if (createShipment && shipmentData) {
        const validTransportTypes = ["propio", "paqueteria"];
        if (shipmentData.transportType && !validTransportTypes.includes(shipmentData.transportType)) {
          return res.status(400).json({ error: "Tipo de transporte inválido. Debe ser 'propio' o 'paqueteria'" });
        }
      }
      
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
          quotation: {
            with: {
              customer: true,
              items: {
                with: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // VALIDATE FIRST before creating any records to prevent orphaned invoices/shipments
      const quotationItem = order.quotation.items.find(i => i.id === releaseData.quotationItemId);
      if (!quotationItem) {
        return res.status(400).json({ error: "Producto no encontrado en la cotización" });
      }

      // Validate quantity
      const quantityToRelease = Number(releaseData.quantityReleased);
      if (isNaN(quantityToRelease) || quantityToRelease <= 0) {
        return res.status(400).json({ error: "Cantidad inválida" });
      }

      // Pre-validate release data schema (without invoice/shipment IDs for now)
      insertOrderReleaseSchema.parse({
        quotationItemId: releaseData.quotationItemId,
        quantityReleased: String(releaseData.quantityReleased),
        orderId: id,
        releasedById: req.user!.id,
        notes: releaseData.notes,
      });

      // Now safe to create invoice and shipment
      let invoiceId: string | undefined;
      let shipmentId: string | undefined;

      // Create invoice if requested
      if (createInvoice) {
        const unitPrice = Number(quotationItem.unitPrice);
        const subtotal = unitPrice * quantityToRelease;
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        const invoice = await storage.createInvoice({
          orderId: id,
          customerId: order.quotation.customerId,
          serie: "A",
          folio: `INV-${Date.now()}`,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          balanceDue: total.toFixed(2),
          currency: "MXN",
        });
        invoiceId = invoice.id;
      }

      // Create shipment if requested
      if (createShipment && shipmentData) {
        const shipment = await storage.createShipment({
          orderId: id,
          transporter: shipmentData.transporter || "Por definir",
          transportType: shipmentData.transportType || "propio",
          trackingNumber: shipmentData.trackingNumber,
          driverName: shipmentData.driverName,
          vehiclePlates: shipmentData.vehiclePlates,
        });
        shipmentId = shipment.id;
      }

      // Create the release with validated data
      const release = await storage.createOrderRelease({
        quotationItemId: releaseData.quotationItemId,
        quantityReleased: String(releaseData.quantityReleased),
        orderId: id,
        releasedById: req.user!.id,
        notes: releaseData.notes,
        invoiceId,
        shipmentId,
      });

      // Check if all items are fully released to update order status
      const quotationItemsResult = order.quotation.items;

      const allReleases = await storage.getOrderReleases(id);

      // Calculate total released per item
      const releasedByItem: Record<string, number> = {};
      for (const rel of allReleases) {
        releasedByItem[rel.quotationItemId] = (releasedByItem[rel.quotationItemId] || 0) + Number(rel.quantityReleased);
      }

      // Check if all items are fully released
      let allFullyReleased = true;
      let someReleased = false;

      for (const item of quotationItemsResult) {
        const released = releasedByItem[item.id] || 0;
        const quantity = Number(item.quantity);
        if (released > 0) someReleased = true;
        if (released < quantity) allFullyReleased = false;
      }

      // Update order status based on release state
      if (allFullyReleased) {
        await storage.updateOrder(id, { status: OrderStatus.SHIPPED });
      } else if (someReleased) {
        await storage.updateOrder(id, { status: OrderStatus.PARTIALLY_RELEASED });
      }

      res.status(201).json({ release, invoiceId, shipmentId });
    } catch (error: any) {
      console.error("Error creating order release:", error);
      res.status(400).json({ error: error.message || "Error creating order release" });
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

  // Product Instances (Serial Numbers) endpoints
  app.get("/api/product-instances", isAuthenticated, async (req, res) => {
    try {
      const { customerId, shipmentId, productId } = req.query;
      const instances = await db.query.shipmentProductInstances.findMany({
        where: and(
          customerId ? eq(shipmentProductInstances.customerId, customerId as string) : undefined,
          shipmentId ? eq(shipmentProductInstances.shipmentId, shipmentId as string) : undefined,
          productId ? eq(shipmentProductInstances.productId, productId as string) : undefined,
        ),
        with: {
          product: true,
          shipment: true,
          customer: true,
        },
        orderBy: (instances, { desc }) => [desc(instances.createdAt)],
      });
      res.json(instances);
    } catch (error) {
      console.error("Error fetching product instances:", error);
      res.status(500).json({ error: "Error fetching product instances" });
    }
  });

  app.get("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const instance = await db.query.shipmentProductInstances.findFirst({
        where: eq(shipmentProductInstances.id, id),
        with: {
          product: true,
          shipment: true,
          customer: true,
        },
      });
      if (!instance) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json(instance);
    } catch (error) {
      console.error("Error fetching product instance:", error);
      res.status(500).json({ error: "Error fetching product instance" });
    }
  });

  app.post("/api/product-instances", isAuthenticated, async (req, res) => {
    try {
      const validated = insertShipmentProductInstanceSchema.parse(req.body);
      const [instance] = await db.insert(shipmentProductInstances).values(validated).returning();
      res.status(201).json(instance);
    } catch (error: any) {
      console.error("Error creating product instance:", error);
      if (error?.code === '23505') {
        return res.status(400).json({ error: "El número de serie ya existe" });
      }
      res.status(400).json({ error: "Error creating product instance" });
    }
  });

  app.post("/api/product-instances/bulk", isAuthenticated, async (req, res) => {
    try {
      const { instances } = req.body;
      if (!Array.isArray(instances) || instances.length === 0) {
        return res.status(400).json({ error: "Se requiere un arreglo de instancias" });
      }
      const validated = instances.map(i => insertShipmentProductInstanceSchema.parse(i));
      const created = await db.insert(shipmentProductInstances).values(validated).returning();
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating product instances:", error);
      if (error?.code === '23505') {
        return res.status(400).json({ error: "Uno o más números de serie ya existen" });
      }
      res.status(400).json({ error: "Error creating product instances" });
    }
  });

  app.patch("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, deliveredAt } = req.body;
      const [updated] = await db
        .update(shipmentProductInstances)
        .set({ status, notes, deliveredAt })
        .where(eq(shipmentProductInstances.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating product instance:", error);
      res.status(500).json({ error: "Error updating product instance" });
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
        paymentDate: new Date(req.body.paymentDate),
      });

      // Get the invoice to update balance
      const invoice = await storage.getInvoice(validated.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      // Create the payment
      const payment = await storage.createPayment(validated);

      // Calculate new balance
      const paymentAmount = parseFloat(validated.amount);
      const currentBalance = parseFloat(invoice.balanceDue || invoice.total);
      const newBalance = Math.max(0, currentBalance - paymentAmount);

      // Determine new status
      let newStatus = invoice.status;
      if (newBalance === 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newBalance < parseFloat(invoice.total)) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      // Update invoice balance and status
      await storage.updateInvoice(invoice.id, {
        balanceDue: newBalance.toFixed(2),
        status: newStatus,
      });

      // Fetch full payment with relations
      const fullPayment = await db.query.payments.findFirst({
        where: eq(payments.id, payment.id),
        with: {
          invoice: true,
          customer: true,
          registeredBy: true,
        },
      });

      res.status(201).json(fullPayment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(400).json({ error: "Error al registrar el pago" });
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
        
        // Add salesperson (user) email
        if (user.email) {
          recipients.push(user.email);
        }
        
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

  // ========== INCIDENTS MODULE ==========

  // Helper function to generate ticket number
  async function generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM ${incidents} 
      WHERE EXTRACT(YEAR FROM created_at) = ${year}
    `);
    const count = Number(result.rows[0].count) + 1;
    return `INC-${year}-${String(count).padStart(5, '0')}`;
  }

  // Helper function to log incident activity
  async function logIncidentActivity(
    incidentId: string,
    action: string,
    userId: string | null,
    previousValue?: string,
    newValue?: string,
    details?: string,
    isFromCustomer: boolean = false
  ) {
    await db.insert(incidentActivities).values({
      incidentId,
      userId,
      action,
      previousValue,
      newValue,
      details,
      isFromCustomer,
    });
  }

  // Get all incidents (with filters)
  app.get("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const { status, type, urgency, customerId, assignedTo, search, fromDate, toDate } = req.query;

      let allIncidents = await db.query.incidents.findMany({
        with: {
          customer: true,
          assignee: true,
          creator: true,
          product: true,
        },
        orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
      });

      // Apply filters
      if (status && typeof status === 'string') {
        allIncidents = allIncidents.filter(i => i.status === status);
      }
      if (type && typeof type === 'string') {
        allIncidents = allIncidents.filter(i => i.type === type);
      }
      if (urgency && typeof urgency === 'string') {
        allIncidents = allIncidents.filter(i => i.urgency === urgency);
      }
      if (customerId && typeof customerId === 'string') {
        allIncidents = allIncidents.filter(i => i.customerId === customerId);
      }
      if (assignedTo && typeof assignedTo === 'string') {
        allIncidents = allIncidents.filter(i => i.assignedTo === assignedTo);
      }
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        allIncidents = allIncidents.filter(i => 
          i.ticketNumber.toLowerCase().includes(searchLower) ||
          i.subject.toLowerCase().includes(searchLower) ||
          i.description.toLowerCase().includes(searchLower)
        );
      }
      if (fromDate && typeof fromDate === 'string') {
        const from = new Date(fromDate);
        allIncidents = allIncidents.filter(i => new Date(i.createdAt) >= from);
      }
      if (toDate && typeof toDate === 'string') {
        const to = new Date(toDate);
        allIncidents = allIncidents.filter(i => new Date(i.createdAt) <= to);
      }

      res.json(allIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Error al obtener incidentes" });
    }
  });

  // Get single incident with details
  app.get("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, id),
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
            orderBy: (comments, { asc }) => [asc(comments.createdAt)],
          },
          attachments: {
            with: { uploader: true },
            orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
          },
          activities: {
            with: { user: true },
            orderBy: (activities, { desc }) => [desc(activities.createdAt)],
          },
        },
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

  // Create new incident
  app.post("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const ticketNumber = await generateTicketNumber();
      const accessToken = randomBytes(32).toString('hex');
      const accessTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const validated = insertIncidentSchema.parse({
        ...req.body,
        createdBy: user.id,
      });

      const [newIncident] = await db.insert(incidents).values({
        ...validated,
        ticketNumber,
        accessToken,
        accessTokenExpires,
      }).returning();

      await logIncidentActivity(
        newIncident.id,
        'created',
        user.id,
        undefined,
        undefined,
        `Incidente creado con número ${ticketNumber}`
      );

      res.status(201).json(newIncident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(400).json({ error: "Error al crear el incidente" });
    }
  });

  // Update incident
  app.patch("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updates = req.body;

      const existing = await db.query.incidents.findFirst({
        where: eq(incidents.id, id),
      });

      if (!existing) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      // Log changes
      if (updates.status && updates.status !== existing.status) {
        await logIncidentActivity(id, 'status_change', user.id, existing.status, updates.status);
      }
      if (updates.assignedTo && updates.assignedTo !== existing.assignedTo) {
        await logIncidentActivity(id, 'assignment_change', user.id, existing.assignedTo || 'Sin asignar', updates.assignedTo);
        if (updates.status === undefined && existing.status === IncidentStatus.NUEVO) {
          updates.status = IncidentStatus.ASIGNADO;
        }
      }
      if (updates.type && updates.type !== existing.type) {
        await logIncidentActivity(id, 'type_change', user.id, existing.type, updates.type);
      }
      if (updates.urgency && updates.urgency !== existing.urgency) {
        await logIncidentActivity(id, 'urgency_change', user.id, existing.urgency, updates.urgency);
      }

      // Handle resolution
      if (updates.resolution && !existing.resolution) {
        updates.resolvedAt = new Date();
        updates.resolvedBy = user.id;
        if (!updates.status) {
          updates.status = IncidentStatus.RESUELTO;
        }
      }

      // Handle closing
      if (updates.status === IncidentStatus.CERRADO && existing.status !== IncidentStatus.CERRADO) {
        if (!existing.resolution && !updates.resolution) {
          return res.status(400).json({ error: "No se puede cerrar un incidente sin resolución" });
        }
        updates.closedAt = new Date();
        updates.closedBy = user.id;
      }

      const [updated] = await db.update(incidents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(incidents.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ error: "Error al actualizar el incidente" });
    }
  });

  // Add comment to incident
  app.post("/api/incidents/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, id),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      const validated = insertIncidentCommentSchema.parse({
        ...req.body,
        incidentId: id,
        userId: user.id,
      });

      const [comment] = await db.insert(incidentComments).values(validated).returning();

      await logIncidentActivity(
        id,
        'comment_added',
        user.id,
        undefined,
        undefined,
        validated.visibility === CommentVisibility.CUSTOMER ? 'Comentario visible para cliente' : 'Comentario interno'
      );

      // Update incident status if waiting for customer and agent comments
      if (incident.status === IncidentStatus.ESPERANDO_CLIENTE && validated.visibility === CommentVisibility.CUSTOMER) {
        await db.update(incidents)
          .set({ status: IncidentStatus.EN_PROCESO, updatedAt: new Date() })
          .where(eq(incidents.id, id));
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(400).json({ error: "Error al agregar comentario" });
    }
  });

  // Get incident comments
  app.get("/api/incidents/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const comments = await db.query.incidentComments.findMany({
        where: eq(incidentComments.incidentId, id),
        with: { user: true },
        orderBy: (c, { asc }) => [asc(c.createdAt)],
      });

      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Error al obtener comentarios" });
    }
  });

  // Get incident activity log
  app.get("/api/incidents/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const activities = await db.query.incidentActivities.findMany({
        where: eq(incidentActivities.incidentId, id),
        with: { user: true },
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });

      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Error al obtener actividades" });
    }
  });

  // ========== PUBLIC INCIDENTS (Customer Portal) ==========

  // Search customers for public portal (minimal info for security)
  app.get("/api/public/customers/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 3) {
        return res.status(400).json({ error: "La búsqueda debe tener al menos 3 caracteres" });
      }

      const searchTerm = q.trim().toLowerCase();
      
      const allCustomers = await db.query.customers.findMany({
        columns: {
          id: true,
          name: true,
        },
      });

      // Filter by name only (don't expose RFC for search to protect PII)
      const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
      ).slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
      })); // Only return id and name

      res.json(filtered);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ error: "Error al buscar clientes" });
    }
  });

  // Create incident from public portal (no auth required)
  app.post("/api/public/incidents", async (req, res) => {
    try {
      const { customerId, type, urgency, subject, description, contactName, contactEmail, contactPhone, warrantySerialNumber } = req.body;

      // Validate required fields
      if (!customerId || !type || !subject || !description || !contactName || !contactEmail) {
        return res.status(400).json({ 
          error: "Faltan campos requeridos: empresa, tipo, asunto, descripción, nombre de contacto y correo" 
        });
      }

      // Validate serial number for warranty incidents
      if (type === IncidentType.GARANTIA && (!warrantySerialNumber || warrantySerialNumber.trim().length < 3)) {
        return res.status(400).json({
          error: "Para incidentes de garantía se requiere el número de serie del producto"
        });
      }

      // Verify customer exists
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }

      // Generate ticket number and access token
      const ticketNumber = await generateTicketNumber();
      const accessToken = randomBytes(32).toString('hex');
      const accessTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create the incident
      const [newIncident] = await db.insert(incidents).values({
        customerId,
        type: type as typeof IncidentType[keyof typeof IncidentType],
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
        isFromCustomerPortal: true,
      }).returning();

      await logIncidentActivity(
        newIncident.id,
        'created',
        null,
        undefined,
        undefined,
        `Incidente creado desde portal de clientes con número ${ticketNumber}`,
        true
      );

      // Return the ticket info and access URL
      res.status(201).json({
        success: true,
        ticketNumber: newIncident.ticketNumber,
        accessToken: newIncident.accessToken,
        message: `Su ticket #${newIncident.ticketNumber} ha sido creado exitosamente.`,
      });
    } catch (error) {
      console.error("Error creating public incident:", error);
      res.status(500).json({ error: "Error al crear el incidente" });
    }
  });

  // Look up incident by ticket number (public)
  app.get("/api/public/incidents/lookup/:ticketNumber", async (req, res) => {
    try {
      const { ticketNumber } = req.params;
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Se requiere el correo electrónico para verificar" });
      }

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.ticketNumber, ticketNumber),
      });

      if (!incident) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      // Verify email matches the contact email
      if (incident.contactEmail?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ error: "El correo no coincide con el registrado para este ticket" });
      }

      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < new Date()) {
        return res.status(403).json({ error: "El enlace de acceso ha expirado" });
      }

      res.json({ accessToken: incident.accessToken });
    } catch (error) {
      console.error("Error looking up incident:", error);
      res.status(500).json({ error: "Error al buscar el ticket" });
    }
  });

  // Get incident by access token (public)
  app.get("/api/public/incidents/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
        with: {
          customer: true,
          assignee: true,
          product: true,
          comments: {
            where: eq(incidentComments.visibility, CommentVisibility.CUSTOMER),
            with: { user: true },
            orderBy: (c, { asc }) => [asc(c.createdAt)],
          },
          attachments: true,
        },
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }

      // Filter activities to show only non-internal ones
      const activities = await db.query.incidentActivities.findMany({
        where: and(
          eq(incidentActivities.incidentId, incident.id),
          eq(incidentActivities.isFromCustomer, false)
        ),
        orderBy: (a, { desc }) => [desc(a.createdAt)],
      });

      res.json({ ...incident, activities });
    } catch (error) {
      console.error("Error fetching public incident:", error);
      res.status(500).json({ error: "Error al obtener el incidente" });
    }
  });

  // Add customer comment (public)
  app.post("/api/public/incidents/:token/comments", async (req, res) => {
    try {
      const { token } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "El comentario no puede estar vacío" });
      }

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }

      if (incident.status === IncidentStatus.CERRADO) {
        return res.status(400).json({ error: "No se pueden agregar comentarios a un incidente cerrado" });
      }

      const [comment] = await db.insert(incidentComments).values({
        incidentId: incident.id,
        content: content.trim(),
        visibility: CommentVisibility.CUSTOMER,
        isFromCustomer: true,
      }).returning();

      await logIncidentActivity(
        incident.id,
        'customer_comment',
        null,
        undefined,
        undefined,
        'Comentario agregado por el cliente',
        true
      );

      // Update status if waiting for customer
      if (incident.status === IncidentStatus.ESPERANDO_CLIENTE) {
        await db.update(incidents)
          .set({ status: IncidentStatus.EN_PROCESO, updatedAt: new Date() })
          .where(eq(incidents.id, incident.id));
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding customer comment:", error);
      res.status(500).json({ error: "Error al agregar comentario" });
    }
  });

  // Confirm incident closure (public)
  app.post("/api/public/incidents/:token/confirm-close", async (req, res) => {
    try {
      const { token } = req.params;

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      if (incident.status !== IncidentStatus.RESUELTO) {
        return res.status(400).json({ error: "Solo se pueden confirmar incidentes resueltos" });
      }

      const [updated] = await db.update(incidents)
        .set({
          status: IncidentStatus.CERRADO,
          customerConfirmedClose: true,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, incident.id))
        .returning();

      await logIncidentActivity(
        incident.id,
        'customer_confirmed_close',
        null,
        IncidentStatus.RESUELTO,
        IncidentStatus.CERRADO,
        'Cliente confirmó el cierre del incidente',
        true
      );

      res.json(updated);
    } catch (error) {
      console.error("Error confirming closure:", error);
      res.status(500).json({ error: "Error al confirmar el cierre" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
