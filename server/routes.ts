import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, createTenantScopedStorage } from "./storage";
import { setupAuth, isAuthenticated, hasRole } from "./auth";
import { db } from "./db";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { localStorageService, LocalStorageService } from "./localStorage";

// Parse a potentially multi-value email field (values separated by ; or ,)
// Returns an array of trimmed, non-empty, valid-looking email addresses.
function parseEmailList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

// Helper to determine if we should use server-side direct upload (instead of GCS presigned URL).
// In development, always use direct upload (GCS presigned URLs are blocked/CORS-restricted).
function useLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" || 
         process.env.NODE_ENV !== "production" ||
         (process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR);
}
import { ObjectPermission, setObjectAclPolicy, getObjectAclPolicy } from "./objectAcl";
import { sendCheckoutEmail } from "./email-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import OpenAI from "openai";
import { tenants, insertTenantSchema } from "@shared/schema";
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
  OrderReleaseStatus,
  ShipmentStatus,
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
import { customers, quotations, quotationItems, checkins, scheduledVisits, users, orders, orderReleases, creditAuthorizations, creditAuthorizationComments, shipments, shipmentProductInstances, invoices, payments, pendingUploads, products, productCategories, incidents, incidentComments, incidentAttachments, incidentActivities, microsipConfigs, microsipSyncLogs, insertMicrosipConfigSchema, updateMicrosipConfigSchema } from "@shared/schema";
import { createMicrosipSyncService } from "./microsip-sync";
import { randomBytes } from "crypto";
import { eq, and, sql, gte, lt, gt, isNull, isNotNull, or, aliasedTable, desc } from "drizzle-orm";
import type { Request } from "express";

// Helper to get effective tenantId for data filtering
// Returns null only if superadmin on main domain (can see all data)
// Returns tenantId for all other users (data isolation)
function getEffectiveTenantId(req: Request): string | null {
  const user = req.user;
  const tenant = req.tenant;
  
  // SuperAdmin on main domain can access all data
  if (user?.isSuperAdmin && (!tenant || !tenant.subdomain)) {
    return null; // No tenant filtering
  }
  
  // If on a specific subdomain, use the tenant from the subdomain
  if (tenant?.id) {
    return tenant.id;
  }
  
  // Return user's tenantId for data isolation
  return user?.tenantId || null;
}

// Helper to require tenantId - throws if not available
function requireTenantId(req: Request): string {
  const tenantId = getEffectiveTenantId(req);
  
  // If we have a tenant from subdomain or user, use it
  if (tenantId) {
    return tenantId;
  }
  
  // For SuperAdmin, check if they have a tenantId or are on a subdomain
  if (req.user?.isSuperAdmin) {
    // Check subdomain first
    if (req.tenant?.id) {
      return req.tenant.id;
    }
    // Then user's tenantId
    if (req.user.tenantId) {
      return req.user.tenantId;
    }
    // SuperAdmin on main domain without specific tenant - throw error for tenant-specific operations
    throw new Error("SuperAdmin must access via subdomain for tenant-specific operations");
  }
  
  // Non-superadmin users must have a tenantId
  if (!req.user?.tenantId) {
    throw new Error("User has no tenant assignment");
  }
  
  return req.user.tenantId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // ==================== TENANT ENDPOINTS ====================
  
  // Get current tenant configuration (for branding)
  app.get("/api/tenant-config", async (req, res) => {
    if (!req.tenant) {
      return res.status(404).json({ message: "No tenant context" });
    }
    
    res.json({
      id: req.tenant.id,
      name: req.tenant.name,
      subdomain: req.tenant.subdomain,
      logoUrl: req.tenant.logoUrl,
      primaryColor: req.tenant.primaryColor,
      secondaryColor: req.tenant.secondaryColor,
      timezone: (req.tenant as any).timezone || "America/Mexico_City",
      locale: (req.tenant as any).locale || "es",
    });
  });

  // Get all tenants (superadmin only, main domain only)
  // ==================== PIPELINE / ADMIN BOARD ENDPOINT ====================

  app.get("/api/pipeline", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const tenantFilter = tenantId ? eq(quotations.tenantId, tenantId) : undefined;
      const orderTenantFilter = tenantId ? eq(orders.tenantId, tenantId) : undefined;
      const shipmentTenantFilter = tenantId ? eq(shipments.tenantId, tenantId) : undefined;

      // Quotations with customer and seller
      const quotRows = await db.select({
        q: quotations,
        customerName: customers.name,
        sellerName: users.fullName,
      })
        .from(quotations)
        .leftJoin(customers, eq(quotations.customerId, customers.id))
        .leftJoin(users, eq(quotations.userId, users.id))
        .where(tenantFilter)
        .orderBy(sql`${quotations.createdAt} DESC`)
        .limit(200);

      // Orders with quotation → customer info + seller
      const sellerAlias = aliasedTable(users, "seller");
      const orderRows = await db.select({
        o: orders,
        quotFolio: quotations.folio,
        quotTotal: quotations.total,
        quotCurrency: quotations.currency,
        customerName: customers.name,
        sellerName: sellerAlias.fullName,
        estimatedDelivery: orders.estimatedDelivery,
      })
        .from(orders)
        .leftJoin(quotations, eq(orders.quotationId, quotations.id))
        .leftJoin(customers, eq(quotations.customerId, customers.id))
        .leftJoin(sellerAlias, eq(quotations.userId, sellerAlias.id))
        .where(orderTenantFilter ? and(orderTenantFilter, eq(orders.releaseStatus, "approved")) : eq(orders.releaseStatus, "approved"))
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(200);

      // Shipments with order → quotation → customer info + seller
      const sellerAlias2 = aliasedTable(users, "seller2");
      const shipmentRows = await db.select({
        s: shipments,
        quotFolio: quotations.folio,
        customerName: customers.name,
        sellerName: sellerAlias2.fullName,
        orderId: orders.id,
      })
        .from(shipments)
        .leftJoin(orders, eq(shipments.orderId, orders.id))
        .leftJoin(quotations, eq(orders.quotationId, quotations.id))
        .leftJoin(customers, eq(quotations.customerId, customers.id))
        .leftJoin(sellerAlias2, eq(quotations.userId, sellerAlias2.id))
        .where(shipmentTenantFilter)
        .orderBy(sql`${shipments.createdAt} DESC`)
        .limit(200);

      // Credit authorizations with quotation → customer info + seller
      const sellerAlias3 = aliasedTable(users, "seller3");
      const authRows = await db.select({
        a: creditAuthorizations,
        quotFolio: quotations.folio,
        quotTotal: quotations.total,
        quotCurrency: quotations.currency,
        customerName: customers.name,
        sellerName: sellerAlias3.fullName,
      })
        .from(creditAuthorizations)
        .leftJoin(quotations, eq(creditAuthorizations.quotationId, quotations.id))
        .leftJoin(customers, eq(quotations.customerId, customers.id))
        .leftJoin(sellerAlias3, eq(quotations.userId, sellerAlias3.id))
        .where(tenantFilter ? eq(quotations.tenantId, tenantId!) : undefined)
        .orderBy(sql`${creditAuthorizations.createdAt} DESC`)
        .limit(200);

      res.json({
        quotations: quotRows.map(r => ({ ...r.q, customerName: r.customerName, sellerName: r.sellerName })),
        orders: orderRows.map(r => ({ ...r.o, quotFolio: r.quotFolio, quotTotal: r.quotTotal, quotCurrency: r.quotCurrency, customerName: r.customerName, sellerName: r.sellerName })),
        shipments: shipmentRows.map(r => ({ ...r.s, quotFolio: r.quotFolio, customerName: r.customerName, sellerName: r.sellerName })),
        creditAuths: authRows.map(r => ({ ...r.a, quotFolio: r.quotFolio, quotTotal: r.quotTotal, quotCurrency: r.quotCurrency, customerName: r.customerName, sellerName: r.sellerName })),
      });
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
      res.status(500).json({ error: "Error fetching pipeline data" });
    }
  });

  // Pipeline items detail endpoint
  app.get("/api/pipeline/items", isAuthenticated, async (req, res) => {
    try {
      const { type, id } = req.query as { type: string; id: string };
      if (!type || !id) return res.status(400).json({ error: "Missing type or id" });

      if (type === "quotation") {
        const items = await db.query.quotationItems.findMany({
          where: eq(quotationItems.quotationId, id),
          with: { product: { columns: { name: true, code: true, unit: true } } },
          orderBy: (qi, { asc }) => [asc(qi.position)],
        });
        return res.json(items.map(i => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unit ?? i.product?.unit,
          unitPrice: i.unitPrice,
          discount: i.discount,
          total: i.total,
        })));
      }

      if (type === "order") {
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, id),
          with: {
            quotation: {
              with: {
                items: {
                  with: { product: { columns: { name: true, code: true, unit: true } } },
                  orderBy: (qi, { asc }) => [asc(qi.position)],
                },
              },
            },
          },
        });
        if (!order?.quotation) return res.json([]);
        return res.json(order.quotation.items.map(i => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unit ?? i.product?.unit,
          unitPrice: i.unitPrice,
          discount: i.discount,
          total: i.total,
        })));
      }

      if (type === "creditAuth") {
        const auth = await db.query.creditAuthorizations.findFirst({
          where: eq(creditAuthorizations.id, id),
          with: {
            quotation: {
              with: {
                items: {
                  with: { product: { columns: { name: true, code: true, unit: true } } },
                  orderBy: (qi, { asc }) => [asc(qi.position)],
                },
              },
            },
          },
        });
        if (!auth?.quotation) return res.json([]);
        return res.json(auth.quotation.items.map(i => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? i.description ?? "",
          qty: i.quantity,
          unit: i.unit ?? i.product?.unit,
          unitPrice: i.unitPrice,
          discount: i.discount,
          total: i.total,
        })));
      }

      if (type === "shipment") {
        const instances = await db.query.shipmentProductInstances.findMany({
          where: eq(shipmentProductInstances.shipmentId, id),
          with: { product: { columns: { name: true, code: true, unit: true } } },
        });
        return res.json(instances.map(i => ({
          id: i.id,
          productCode: i.product?.code ?? "",
          description: i.product?.name ?? "",
          qty: i.quantity,
          unit: i.product?.unit ?? "Pza",
          unitPrice: null,
          discount: null,
          total: null,
        })));
      }

      res.status(400).json({ error: "Invalid type" });
    } catch (error) {
      console.error("Error fetching pipeline items:", error);
      res.status(500).json({ error: "Error fetching pipeline items" });
    }
  });

  // ==================== END PIPELINE ====================

  app.get("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can access tenants" });
      }
      
      // Only allow from main domain (no tenant subdomain)
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

  // Create new tenant (superadmin only, main domain only)
  app.post("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can create tenants" });
      }
      
      // Only allow from main domain (no tenant subdomain)
      if (req.tenant && req.tenant.subdomain) {
        return res.status(403).json({ error: "Tenant management only available on main domain" });
      }
      
      const validationResult = insertTenantSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid data",
          details: validationResult.error.errors,
        });
      }
      
      const [newTenant] = await db.insert(tenants).values(validationResult.data).returning();
      res.status(201).json(newTenant);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Subdomain already exists" });
      }
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Error creating tenant" });
    }
  });

  // Update tenant (superadmin only, main domain only)
  app.patch("/api/tenants/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.isSuperAdmin) {
        return res.status(403).json({ error: "Only super admins can update tenants" });
      }
      
      // Only allow from main domain (no tenant subdomain)
      if (req.tenant && req.tenant.subdomain) {
        return res.status(403).json({ error: "Tenant management only available on main domain" });
      }
      
      const { id } = req.params;
      const updateSchema = insertTenantSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid data",
          details: validationResult.error.errors,
        });
      }
      
      const [updatedTenant] = await db
        .update(tenants)
        .set({ ...validationResult.data, updatedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning();
      
      if (!updatedTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      res.json(updatedTenant);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Subdomain already exists" });
      }
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Error updating tenant" });
    }
  });

  // ==================== END TENANT ENDPOINTS ====================

  // ==================== COMPANY SETTINGS ENDPOINTS ====================
  
  // Get current tenant company settings (for tenant admins)
  app.get("/api/company-settings", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
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
  
  // Update current tenant company settings (for tenant admins)
  app.patch("/api/company-settings", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      
      const allowedFields = [
        'name', 'legalName', 'rfc', 'website', 'email', 'phone', 
        'address', 'city', 'state', 'zipCode', 'country',
        'primaryColor', 'secondaryColor', 'timezone'
      ];
      
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      updateData.updatedAt = new Date();
      
      const [updatedTenant] = await db
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, tenantId))
        .returning();
      
      if (!updatedTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ error: "Error updating company settings" });
    }
  });
  
  // Upload company logo (for tenant admins)
  app.post("/api/company-settings/logo", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant context" });
      }
      
      const contentType = req.headers['content-type'] || 'image/png';
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({ error: "Solo se permiten imágenes" });
      }
      
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          if (buffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: "La imagen no puede superar 5MB" });
          }
          
          const ext = contentType.split('/')[1] || 'png';
          const storagePath = await localStorageService.uploadLogo(buffer, tenantId, ext);
          // Convert storage path (logos/filename) to API URL (/api/logos/filename)
          const filename = storagePath.replace('logos/', '');
          const logoUrl = `/api/logos/${filename}`;
          
          const [updatedTenant] = await db
            .update(tenants)
            .set({ logoUrl: logoUrl, updatedAt: new Date() })
            .where(eq(tenants.id, tenantId))
            .returning();
          
          console.log(`✅ Logo uploaded for tenant ${tenantId}: ${logoUrl}`);
          res.json({ logoUrl: logoUrl, tenant: updatedTenant });
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
  
  // Serve logo files
  app.get("/api/logos/:filename", async (req, res) => {
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
  
  // ─── DANGER ZONE: Reset tenant data ──────────────────────────────────────────
  app.post("/api/admin/reset-tenant-data", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { confirmPhrase } = req.body;

      if (confirmPhrase !== "CONFIRMAR RESET") {
        return res.status(400).json({ error: "Frase de confirmación incorrecta" });
      }

      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ error: "Operación no permitida sin contexto de empresa" });
      }

      // Execute deletes in FK-safe order using individual statements (Neon doesn't support
      // parameterized queries inside PL/pgSQL DO blocks)

      // Incident sub-tables (no tenant_id, join via incidents)
      await db.execute(sql`DELETE FROM incident_activities WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM incident_attachments WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM incident_comments WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM incidents WHERE tenant_id = ${tenantId}`);

      // Shipment sub-tables (no tenant_id, join via shipments)
      await db.execute(sql`DELETE FROM shipment_product_instances WHERE shipment_id IN (SELECT id FROM shipments WHERE tenant_id = ${tenantId})`);

      // Order releases (no tenant_id, join via orders)
      await db.execute(sql`DELETE FROM order_releases WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = ${tenantId})`);

      // Payments, invoices, shipments, orders
      await db.execute(sql`DELETE FROM payments WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM invoices WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM shipments WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM orders WHERE tenant_id = ${tenantId}`);

      // Credit auth — no tienen tenant_id, se accede via quotation_id → quotations
      await db.execute(sql`DELETE FROM credit_authorization_comments WHERE credit_authorization_id IN (SELECT ca.id FROM credit_authorizations ca JOIN quotations q ON q.id = ca.quotation_id WHERE q.tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM credit_authorizations WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`);

      // Quotation items (no tenant_id, join via quotations)
      await db.execute(sql`DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM quotations WHERE tenant_id = ${tenantId}`);

      // Scheduled visits primero (FK a checkins)
      await db.execute(sql`DELETE FROM scheduled_visits WHERE tenant_id = ${tenantId}`);

      // Pending uploads (no tenant_id, references checkins — delete before checkins)
      await db.execute(sql`DELETE FROM pending_uploads WHERE checkin_id IN (SELECT id FROM checkins WHERE tenant_id = ${tenantId})`);

      // Check-ins
      await db.execute(sql`DELETE FROM checkins WHERE tenant_id = ${tenantId}`);

      // Customer sub-tables (no tenant_id, join via customers)
      await db.execute(sql`DELETE FROM customer_product_prices WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM customer_locations WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = ${tenantId})`);
      await db.execute(sql`DELETE FROM customers WHERE tenant_id = ${tenantId}`);

      // Products and categories
      await db.execute(sql`DELETE FROM products WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM product_categories WHERE tenant_id = ${tenantId}`);

      // Microsip (sync_logs sí tienen tenant_id directo)
      await db.execute(sql`DELETE FROM microsip_sync_logs WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM microsip_configs WHERE tenant_id = ${tenantId}`);

      console.log(`[ADMIN] Tenant data reset by user ${req.user?.id} for tenant ${tenantId}`);
      res.json({ success: true, message: "Datos eliminados correctamente. Solo quedan los usuarios." });
    } catch (error) {
      console.error("Error resetting tenant data:", error);
      res.status(500).json({ error: "Error al eliminar los datos" });
    }
  });

  // ==================== END COMPANY SETTINGS ENDPOINTS ====================

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      
      // Build queries with tenant filtering
      const pendingQuotations = tenantId 
        ? await db.select({ count: sql<number>`count(*)` }).from(quotations).where(and(eq(quotations.tenantId, tenantId), sql`status IN ('draft', 'sent')`))
        : await db.select({ count: sql<number>`count(*)` }).from(quotations).where(sql`status IN ('draft', 'sent')`);
      
      const activeOrders = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(orders).where(and(eq(orders.tenantId, tenantId), sql`status IN ('pending', 'in_production')`))
        : await db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`status IN ('pending', 'in_production')`);
      
      const overdueInvoices = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(invoices).where(and(eq(invoices.tenantId, tenantId), sql`due_date < NOW() AND status != 'paid'`))
        : await db.select({ count: sql<number>`count(*)` }).from(invoices).where(sql`due_date < NOW() AND status != 'paid'`);
      
      const monthlyRevenue = tenantId
        ? await db.select({ sum: sql<number>`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(and(eq(invoices.tenantId, tenantId), sql`EXTRACT(MONTH FROM issued_at) = EXTRACT(MONTH FROM NOW())`))
        : await db.select({ sum: sql<number>`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(sql`EXTRACT(MONTH FROM issued_at) = EXTRACT(MONTH FROM NOW())`);
      
      const todayCheckins = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(checkins).where(and(eq(checkins.tenantId, tenantId), sql`DATE(checkin_at) = CURRENT_DATE`))
        : await db.select({ count: sql<number>`count(*)` }).from(checkins).where(sql`DATE(checkin_at) = CURRENT_DATE`);
      
      const pendingShipments = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(shipments).where(and(eq(shipments.tenantId, tenantId), eq(shipments.status, 'pending')))
        : await db.select({ count: sql<number>`count(*)` }).from(shipments).where(eq(shipments.status, 'pending'));
      
      const pendingCreditAuth = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(creditAuthorizations).where(and(
            sql`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${tenantId})`,
            eq(creditAuthorizations.status, 'pending')
          ))
        : await db.select({ count: sql<number>`count(*)` }).from(creditAuthorizations).where(eq(creditAuthorizations.status, 'pending'));
      
      const ordersReady = tenantId
        ? await db.select({ count: sql<number>`count(*)` }).from(orders).where(and(eq(orders.tenantId, tenantId), sql`status IN ('ready', 'partially_released')`))
        : await db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`status IN ('ready', 'partially_released')`);
      
      const annualSales = tenantId
        ? await db.select({ sum: sql<number>`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(and(eq(invoices.tenantId, tenantId), sql`EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM NOW())`))
        : await db.select({ sum: sql<number>`COALESCE(SUM(total::numeric), 0)` }).from(invoices).where(sql`EXTRACT(YEAR FROM issued_at) = EXTRACT(YEAR FROM NOW())`);

      res.json({
        pendingQuotations: pendingQuotations[0]?.count || 0,
        activeOrders: activeOrders[0]?.count || 0,
        overdueInvoices: overdueInvoices[0]?.count || 0,
        totalRevenue: monthlyRevenue[0]?.sum || 0,
        todayCheckins: todayCheckins[0]?.count || 0,
        pendingShipments: pendingShipments[0]?.count || 0,
        pendingCreditAuth: pendingCreditAuth[0]?.count || 0,
        ordersReadyToDeliver: ordersReady[0]?.count || 0,
        annualSales: annualSales[0]?.sum || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Error fetching dashboard statistics" });
    }
  });
  
  // Sales by category for dashboard
  app.get("/api/dashboard/sales-by-category", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.json([]);
      }
      
      // Get sales grouped by product category for the current year
      const result = await db.execute(sql`
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
  
  // Recent customer contacts for salesperson dashboard
  app.get("/api/dashboard/recent-contacts", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = getEffectiveTenantId(req);
      
      if (!tenantId) {
        return res.json([]);
      }
      
      // Get recent check-ins with customer info
      const recentCheckins = await db
        .select({
          id: checkins.id,
          customerId: checkins.customerId,
          customerName: customers.name,
          contactName: customers.contactName,
          contactPhone: customers.phone,
          contactEmail: customers.email,
          checkinAt: checkins.checkinAt,
          notes: checkins.notes,
        })
        .from(checkins)
        .innerJoin(customers, eq(checkins.customerId, customers.id))
        .where(
          and(
            eq(checkins.tenantId, tenantId),
            eq(checkins.salesPersonId, user.id),
            sql`${checkins.checkinAt} >= NOW() - INTERVAL '30 days'`
          )
        )
        .orderBy(sql`${checkins.checkinAt} DESC`)
        .limit(10);
      
      res.json(recentCheckins);
    } catch (error) {
      console.error("Error fetching recent contacts:", error);
      res.status(500).json({ error: "Error fetching recent contacts" });
    }
  });

  // Seller-specific dashboard stats (own data only)
  app.get("/api/dashboard/seller-stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const tenantId = getEffectiveTenantId(req);
      const userId = user.id;

      // My pending quotations (draft or sent)
      const myPendingQ = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotations)
        .where(
          and(
            tenantId ? eq(quotations.tenantId, tenantId) : sql`1=1`,
            eq(quotations.userId, userId),
            sql`${quotations.status} IN ('draft', 'sent')`
          )
        );

      // My check-ins today
      const myCheckins = await db
        .select({ count: sql<number>`count(*)` })
        .from(checkins)
        .where(
          and(
            tenantId ? eq(checkins.tenantId, tenantId) : sql`1=1`,
            eq(checkins.salesPersonId, userId),
            sql`DATE(${checkins.checkinAt}) = CURRENT_DATE`
          )
        );

      // My orders ready to deliver (via quotation link)
      const myOrdersReady = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM ${orders} o
        JOIN ${quotations} q ON q.id = o.quotation_id
        WHERE o.status IN ('ready', 'partially_released')
          ${tenantId ? sql`AND o.tenant_id = ${tenantId}` : sql``}
          AND q.user_id = ${userId}
      `);

      // My monthly sales: sum of quotation totals approved/converted this month
      const myMonthlySales = await db.execute(sql`
        SELECT COALESCE(SUM(total::numeric), 0) as sum
        FROM ${quotations}
        WHERE user_id = ${userId}
          ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
          AND status IN ('approved', 'converted')
          AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      `);

      // My recent quotations (last 5)
      const myRecentQuotations = await db
        .select({
          id: quotations.id,
          folio: quotations.folio,
          status: quotations.status,
          total: quotations.total,
          createdAt: quotations.createdAt,
          customerName: customers.name,
        })
        .from(quotations)
        .leftJoin(customers, eq(quotations.customerId, customers.id))
        .where(
          and(
            tenantId ? eq(quotations.tenantId, tenantId) : sql`1=1`,
            eq(quotations.userId, userId)
          )
        )
        .orderBy(sql`${quotations.createdAt} DESC`)
        .limit(5);

      res.json({
        myPendingQuotations: Number(myPendingQ[0]?.count || 0),
        myTodayCheckins: Number(myCheckins[0]?.count || 0),
        myOrdersReady: Number((myOrdersReady.rows[0] as any)?.count || 0),
        myMonthlySales: Number((myMonthlySales.rows[0] as any)?.sum || 0),
        myRecentQuotations,
      });
    } catch (error) {
      console.error("Error fetching seller stats:", error);
      res.status(500).json({ error: "Error fetching seller statistics" });
    }
  });

  // Users endpoints (Admin only)
  app.get("/api/users", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      let allUsers;
      
      if (tenantId) {
        // Filter by tenant
        allUsers = await db.select().from(users)
          .where(eq(users.tenantId, tenantId))
          .orderBy(users.createdAt);
      } else {
        // SuperAdmin on main domain - see all
        allUsers = await storage.getAllUsers();
      }
      
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
        password: z.string().min(6).optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      
      // Hash new password if provided
      let updateData: Omit<typeof validated, 'password'> & { password?: string } = { ...validated };
      if (validated.password) {
        const { hashPassword } = await import("./auth");
        updateData = { ...validated, password: await hashPassword(validated.password) };
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

  // Customers endpoints
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allCustomers = await scopedStorage.getAllCustomers();
      res.json(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Error fetching customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const user = req.user!;
      
      // tenantId priority: user's tenant > selected tenant header (superadmin only) > subdomain context
      let tenantId = user.tenantId;
      if (!tenantId && user.isSuperAdmin) {
        // SuperAdmin - check selected tenant header or subdomain context
        const selectedTenantId = req.headers['x-selected-tenant-id'] as string | undefined;
        if (selectedTenantId) {
          // Validate that the selected tenant exists
          const tenant = await db.query.tenants.findFirst({
            where: eq(tenants.id, selectedTenantId),
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
      
      // Validate with tenantId added server-side
      const bodyWithTenant = { ...req.body, tenantId };
      const validated = insertCustomerSchema.parse(bodyWithTenant);
      const customer = await scopedStorage.createCustomer(validated);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ error: "Error creating customer" });
    }
  });

  app.put("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
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

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  // Delete a customer (admin only)
  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Solo administradores pueden eliminar clientes" });
      }

      const scopedStorage = createTenantScopedStorage(req);
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      // Helper: run SQL and ignore errors from missing tables (production DB may lag schema)
      const tryExec = async (query: any) => {
        try { await db.execute(query); } catch { /* table may not exist in prod */ }
      };

      // Delete dependent records first (no tenant_id, joined via customer_id)
      await tryExec(sql`DELETE FROM pending_uploads WHERE checkin_id IN (SELECT id FROM checkins WHERE customer_id = ${id})`);
      await tryExec(sql`DELETE FROM checkins WHERE customer_id = ${id}`);
      await tryExec(sql`DELETE FROM customer_locations WHERE customer_id = ${id}`);
      await tryExec(sql`DELETE FROM customer_product_prices WHERE customer_id = ${id}`);
      // Nullify FK references in other tables instead of cascading delete
      await tryExec(sql`UPDATE quotations SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql`UPDATE orders SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql`UPDATE invoices SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql`UPDATE payments SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql`UPDATE incidents SET customer_id = NULL WHERE customer_id = ${id}`);
      await tryExec(sql`UPDATE scheduled_visits SET customer_id = NULL WHERE customer_id = ${id}`);

      await db.execute(sql`DELETE FROM customers WHERE id = ${id}`);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Error al eliminar el cliente" });
    }
  });

  // Customer summary for check-in (facturas vencidas, pedidos pendientes, historial)
  app.get("/api/customers/:id/summary", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      
      // Verify customer exists
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Get pending/overdue invoices (accounts receivable)
      const pendingInvoices = await scopedStorage.getPendingInvoicesByCustomer(id);
      
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
      const locations = await scopedStorage.getCustomerLocationsByCustomerId(id);

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
      const tenant = req.tenant;
      const user = req.user!;
      // Determine tenant filter: subdomain tenant > superadmin selected tenant > user tenant
      const selectedTenantId = req.headers['x-selected-tenant-id'] as string | undefined;
      const tenantId = tenant?.id || selectedTenantId || (user.isSuperAdmin ? null : user.tenantId);

      const allCheckins = await db.query.checkins.findMany({
        where: tenantId ? eq(checkins.tenantId, tenantId) : undefined,
        orderBy: [desc(checkins.checkinAt)],
        with: {
          customer: true,
        },
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
      const scopedStorage = createTenantScopedStorage(req);

      // Sanitize: empty strings for decimal columns must become undefined, not ""
      const body = {
        ...req.body,
        userId: req.user!.id,
        latitude:  req.body.latitude  === "" ? undefined : req.body.latitude,
        longitude: req.body.longitude === "" ? undefined : req.body.longitude,
      };

      const validated = insertCheckinSchema.parse(body);

      // Validate that customerLocationId belongs to the specified customerId
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

  // Update check-in (only allowed for in-progress check-ins, by owner or admin)
  app.patch("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Validate request body with Zod schema
      const updateCheckinSchema = z.object({
        meetingType: z.enum([MeetingType.LLAMADA, MeetingType.VISITA, MeetingType.VIDEOLLAMADA]).optional(),
        checkoutNotes: z.string().optional(),
        internalNotes: z.string().optional(),
      }).refine(d => d.meetingType !== undefined || d.checkoutNotes !== undefined || d.internalNotes !== undefined, {
        message: "Se requiere al menos un campo para actualizar",
      });

      const validationResult = updateCheckinSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validationResult.error.flatten() });
      }

      const { meetingType, checkoutNotes, internalNotes } = validationResult.data;

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

      // Build update payload (only fields present in request)
      const updatePayload: Record<string, unknown> = {};
      if (meetingType !== undefined) updatePayload.meetingType = meetingType;
      if (checkoutNotes !== undefined) updatePayload.checkoutNotes = checkoutNotes;
      if (internalNotes !== undefined) updatePayload.internalNotes = internalNotes;

      // Update the check-in
      const [updated] = await db
        .update(checkins)
        .set(updatePayload)
        .where(eq(checkins.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating check-in:", error);
      res.status(500).json({ error: "Error al actualizar el check-in" });
    }
  });

  // Delete a check-in (admin only)
  app.delete("/api/checkins/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      if (user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Solo administradores pueden eliminar check-ins" });
      }

      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(id);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in no encontrado" });
      }

      // Delete associated pending_uploads and photos records first
      await db.execute(sql`DELETE FROM pending_uploads WHERE checkin_id = ${id}`);
      await db.delete(checkins).where(eq(checkins.id, id));

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting check-in:", error);
      res.status(500).json({ error: "Error al eliminar el check-in" });
    }
  });

  // Scheduled visits endpoints
  app.get("/api/scheduled-visits", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allVisits = await scopedStorage.getAllScheduledVisits();
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
      const scopedStorage = createTenantScopedStorage(req);
      const tenantId = scopedStorage.getTenantId();
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }
      
      // Validate without tenantId (it's omitted from schema)
      const validated = insertScheduledVisitSchema.parse({
        ...req.body,
        userId: req.user!.id, // Set userId from authenticated user
      });

      // customerLocationId is optional - only validate if provided
      if (validated.customerLocationId) {
        const location = await scopedStorage.getCustomerLocation(validated.customerLocationId);
        if (!location) {
          return res.status(400).json({ error: "Customer location not found" });
        }
        if (location.customerId !== validated.customerId) {
          return res.status(400).json({ error: "Customer location does not belong to the specified customer" });
        }
      }

      // Insert with tenantId added separately
      const [visit] = await db.insert(scheduledVisits).values({
        ...validated,
        tenantId,
      }).returning();
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

      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.createCheckin(checkinData);

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
      const tenantId = getEffectiveTenantId(req);
      let categories;
      
      if (tenantId) {
        categories = await db.select().from(productCategories)
          .where(eq(productCategories.tenantId, tenantId))
          .orderBy(productCategories.name);
      } else {
        categories = await storage.getAllProductCategories();
      }
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ error: "Error fetching product categories" });
    }
  });

  app.post("/api/product-categories", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
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

  app.patch("/api/product-categories/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
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

  // Products endpoints
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { q } = req.query;
      
      // Show only active products (from list 42)
      // Order by: products with price first, then products without price
      let productsData = await db.query.products.findMany({
        where: and(
          eq(products.tenantId, tenantId),
          eq(products.active, true)
        ),
        with: {
          category: true,
        },
        orderBy: (products, { desc, asc }) => [desc(products.listPrice), asc(products.name)],
      });
      
      // Filter out products whose category is inactive.
      // A product is shown if: it has no category, OR its category is explicitly active (true).
      // If category is null/undefined (deleted), hide to be safe.
      productsData = productsData.filter(p => {
        if (!p.categoryId) return true;           // no category → show
        if (!p.category) return false;            // category deleted → hide
        return p.category.active === true;        // only show if category is explicitly active
      });

      // Filter by search query if provided
      if (q && typeof q === 'string') {
        const searchLower = q.toLowerCase();
        productsData = productsData.filter(p => 
          p.code.toLowerCase().includes(searchLower) ||
          p.name.toLowerCase().includes(searchLower) ||
          (p.brand?.toLowerCase().includes(searchLower))
        );
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
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertProductSchema.parse(req.body);
      
      // Check if code already exists
      const existing = await scopedStorage.getProductByCode(validated.code);
      if (existing) {
        return res.status(400).json({ error: "El código del producto ya existe" });
      }

      // Validate category exists if provided
      if (validated.categoryId) {
        const category = await scopedStorage.getProductCategory(validated.categoryId);
        if (!category) {
          return res.status(400).json({ error: "La categoría seleccionada no existe. Por favor, crea la categoría primero." });
        }
      }
      
      const product = await scopedStorage.createProduct(validated);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Datos inválidos: " + error.errors?.map((e: any) => e.message).join(', ') });
      }
      res.status(400).json({ error: error.message || "Error al crear producto" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const validated = updateProductSchema.parse(req.body);
      
      // Check if code already exists for another product
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

  // Bulk-apply max discount to products (global or by category)
  app.post("/api/products/bulk-discount", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { discount, categoryId } = z.object({
        discount: z.number().min(0).max(100),
        categoryId: z.string().optional(),
      }).parse(req.body);

      const discountStr = discount.toFixed(2);

      // Build where clause
      const conditions = [eq(products.tenantId, tenantId)];
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }

      // Update products
      const updatedProducts = await db
        .update(products)
        .set({ maxDiscount: discountStr })
        .where(and(...conditions))
        .returning({ id: products.id });

      // If scoped to a category, also update that category's maxDiscount
      if (categoryId) {
        await db
          .update(productCategories)
          .set({ maxDiscount: discountStr })
          .where(and(eq(productCategories.id, categoryId), eq(productCategories.tenantId, tenantId)));
      }

      res.json({ updated: updatedProducts.length, discount: discountStr });
    } catch (error) {
      console.error("Error applying bulk discount:", error);
      res.status(500).json({ error: "Error applying bulk discount" });
    }
  });

  // Set max discount at category level only (without touching products)
  app.post("/api/product-categories/bulk-discount", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const rows = z.array(z.object({
        categoryId: z.string(),
        discount: z.number().min(0).max(100),
      })).parse(req.body);

      for (const row of rows) {
        await db
          .update(productCategories)
          .set({ maxDiscount: row.discount.toFixed(2) })
          .where(and(eq(productCategories.id, row.categoryId), eq(productCategories.tenantId, tenantId)));
      }

      res.json({ updated: rows.length });
    } catch (error) {
      console.error("Error applying category discounts:", error);
      res.status(500).json({ error: "Error applying category discounts" });
    }
  });

  // Customer Product Prices endpoints
  app.get("/api/customers/:customerId/product-prices", isAuthenticated, async (req, res) => {
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

  app.post("/api/customer-product-prices", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
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

  // Quotations endpoints
  app.get("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allQuotations = await scopedStorage.getAllQuotations();
      res.json(allQuotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ error: "Error fetching quotations" });
    }
  });

  app.post("/api/quotations", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { items, ...quotationData } = req.body;
      
      // Convert validUntil from string to Date if present
      if (quotationData.validUntil && typeof quotationData.validUntil === 'string') {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      
      // Quotations always start as DRAFT - they go through the approval workflow:
      // 1. If shippingHandledByJoper: Admin approves shipping first
      // 2. Then sent to customer for approval
      // 3. When customer approves, credit authorization is created
      const validated = insertQuotationSchema.parse({
        ...quotationData,
        userId: req.user!.id,
        status: QuotationStatus.DRAFT,
      });

      const quotation = await scopedStorage.createQuotation(validated);

      // Create quotation items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const validatedItem = insertQuotationItemSchema.parse({
            ...item,
            quotationId: quotation.id,
          });
          await scopedStorage.createQuotationItem(validatedItem);
        }
      }

      // Notify admin users if shipping is handled by Joper (fire-and-forget)
      if (validated.shippingHandledByJoper && quotation.tenantId) {
        (async () => {
          try {
            console.log(`[ShippingEmail] Quotation ${quotation.folio} requires shipping approval — looking for admins in tenant ${quotation.tenantId}`);

            // Find all admin users for this tenant
            const adminUsers = await db.query.users.findMany({
              where: and(
                eq(users.tenantId, quotation.tenantId),
                eq(users.role, UserRole.ADMIN)
              ),
            });
            console.log(`[ShippingEmail] Found ${adminUsers.length} admin user(s):`, adminUsers.map(u => u.email));

            const adminEmails = adminUsers
              .filter((u) => u.email && u.email.includes("@"))
              .map((u) => ({ email: u.email!, name: u.fullName || u.username }));

            if (adminEmails.length === 0) {
              console.error(`[ShippingEmail] No admin users with email found for tenant ${quotation.tenantId} — skipping notification`);
              return;
            }

            const tenant = await db.query.tenants.findFirst({
              where: eq(tenants.id, quotation.tenantId),
            });
            const customer = await db.query.customers.findFirst({
              where: eq(customers.id, quotation.customerId),
            });

            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const quotationUrl = `${protocol}://${host}/quotations`;

            // Generate a shipping approval token for one-click email approve/reject
            const crypto = await import("crypto");
            const shippingToken = crypto.randomBytes(32).toString("hex");
            await db.update(quotations)
              .set({ shippingApprovalToken: shippingToken })
              .where(eq(quotations.id, quotation.id));
            const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;

            const { sendShippingApprovalRequestEmail } = await import("./quotation-email-service");
            await sendShippingApprovalRequestEmail({
              adminEmails,
              quotationData: {
                folio: quotation.folio,
                customerName: customer?.name || quotation.customerId,
                vendedorName: req.user!.fullName || req.user!.username,
                total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: quotation.currency || "MXN",
                itemsCount: items?.length || 0,
                shippingMethod: (validated as any).shippingMethod || "truck",
              },
              quotationUrl,
              tenantName: tenant?.name || "Nexxo",
              approveUrl,
              rejectUrl,
            });
            console.log(`[ShippingEmail] Notification sent to: ${adminEmails.map(a => a.email).join(", ")}`);
          } catch (emailErr: any) {
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

      // Allow editing DRAFT, SENT, and PENDING_APPROVAL quotations.
      // ADMIN and VENTAS_LOGISTICA can also edit quotations in any status (e.g. order-release adjustments).
      const EDITABLE_STATUSES = [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.PENDING_APPROVAL];
      const isPrivilegedRole = [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA].includes(userRole as any);
      if (!EDITABLE_STATUSES.includes(existingQuotation.status as any) && !isPrivilegedRole) {
        return res.status(400).json({ error: "Solo se pueden editar cotizaciones en estado Borrador, Enviada o Pendiente de Aprobación" });
      }

      const { items, ...quotationData } = req.body;

      // Capture the vendor's intended status BEFORE any internal overrides.
      // This is the signal that distinguishes "Enviar a Autorización" from "Guardar Borrador".
      const requestedStatus: string = quotationData.status || QuotationStatus.DRAFT;

      // If editing a non-DRAFT quotation, reset it to DRAFT and clear the approval token
      // so the customer link is invalidated and a new one must be sent.
      // Exception: privileged roles (ADMIN/VENTAS_LOGISTICA) doing order-release adjustments
      // send the original status back — preserve it so the quotation stays in its current workflow state.
      const isStatusPreserved = isPrivilegedRole && requestedStatus === existingQuotation.status;
      if (existingQuotation.status !== QuotationStatus.DRAFT && !isStatusPreserved) {
        quotationData.status = QuotationStatus.DRAFT;
        quotationData.approvalToken = null;
        quotationData.approvedAt = null;
      }

      // Convert date strings to Date objects for Drizzle
      if (quotationData.validUntil && typeof quotationData.validUntil === 'string') {
        quotationData.validUntil = new Date(quotationData.validUntil);
      }
      if (quotationData.shippingApprovedAt && typeof quotationData.shippingApprovedAt === 'string') {
        quotationData.shippingApprovedAt = new Date(quotationData.shippingApprovedAt);
      }

      // Update quotation data
      const scopedStorage = createTenantScopedStorage(req);
      const updatedQuotation = await scopedStorage.updateQuotation(id, quotationData);

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
          await scopedStorage.createQuotationItem(validatedItem);
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

      // Send shipping approval email when the vendor explicitly clicked "Enviar a Autorización"
      // (requestedStatus === PENDING_APPROVAL) and the quotation has shipping handled by Joper.
      // We use requestedStatus (captured before any internal reset) rather than quotationData.status
      // because our reset code always forces the DB status back to DRAFT on edit.
      const needsShippingEmail =
        requestedStatus === QuotationStatus.PENDING_APPROVAL &&
        finalQuotation?.shippingHandledByJoper &&
        finalQuotation?.tenantId;

      if (needsShippingEmail) {
        (async () => {
          try {
            console.log(`[ShippingEmail] PATCH: quotation ${finalQuotation!.folio} requires shipping approval — notifying admins`);
            const adminUsers = await db.query.users.findMany({
              where: and(
                eq(users.tenantId, finalQuotation!.tenantId!),
                eq(users.role, UserRole.ADMIN)
              ),
            });
            console.log(`[ShippingEmail] Found ${adminUsers.length} admin(s):`, adminUsers.map(u => u.email));
            const adminEmails = adminUsers
              .filter((u) => u.email && u.email.includes("@"))
              .map((u) => ({ email: u.email!, name: u.fullName || u.username }));

            if (adminEmails.length === 0) {
              console.error(`[ShippingEmail] No admin emails found — skipping`);
              return;
            }
            const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, finalQuotation!.tenantId!) });
            const customer = await db.query.customers.findFirst({ where: eq(customers.id, finalQuotation!.customerId) });

            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const quotationUrl = `${protocol}://${host}/quotations`;

            // Generate / regenerate shipping approval token for one-click approve/reject
            const crypto = await import("crypto");
            const shippingToken = crypto.randomBytes(32).toString("hex");
            await db.update(quotations)
              .set({ shippingApprovalToken: shippingToken })
              .where(eq(quotations.id, finalQuotation!.id));
            const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
            const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;

            const { sendShippingApprovalRequestEmail } = await import("./quotation-email-service");
            await sendShippingApprovalRequestEmail({
              adminEmails,
              quotationData: {
                folio: finalQuotation!.folio,
                customerName: customer?.name || finalQuotation!.customerId,
                vendedorName: req.user!.fullName || req.user!.username,
                total: parseFloat(finalQuotation!.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: finalQuotation!.currency || "MXN",
                itemsCount: finalItems.length,
                shippingMethod: (quotationData as any).shippingMethod || "truck",
              },
              quotationUrl,
              tenantName: tenant?.name || "Nexxo",
              approveUrl,
              rejectUrl,
            });
            console.log(`[ShippingEmail] PATCH notification sent to: ${adminEmails.map(a => a.email).join(", ")}`);
          } catch (emailErr: any) {
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

  // Delete quotation (admin only)
  app.delete("/api/quotations/:id", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;

      const existing = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
      });

      if (!existing) {
        return res.status(404).json({ error: "Cotización no encontrada" });
      }

      // Full cascade delete — handle linked order if it exists
      const linkedOrder = await db.query.orders.findFirst({
        where: eq(orders.quotationId, id),
      });

      if (linkedOrder) {
        const orderId = linkedOrder.id;
        // 1. shipmentProductInstances (references both shipments and orders)
        await db.delete(shipmentProductInstances).where(eq(shipmentProductInstances.orderId, orderId));
        // 2. shipments (references orders)
        await db.delete(shipments).where(eq(shipments.orderId, orderId));
        // 3. orderReleases (references orders)
        await db.delete(orderReleases).where(eq(orderReleases.orderId, orderId));
        // 4. Nullify nullable FKs in invoices and incidents
        await db.update(invoices).set({ orderId: null }).where(eq(invoices.orderId, orderId));
        await db.update(incidents).set({ orderId: null }).where(eq(incidents.orderId, orderId));
        // 5. Delete the order itself
        await db.delete(orders).where(eq(orders.id, orderId));
      }

      // Delete credit authorization comments and credit authorizations
      // (quotation_items are deleted automatically via onDelete: cascade on the FK)
      const linkedAuths = await db.query.creditAuthorizations.findMany({
        where: eq(creditAuthorizations.quotationId, id),
      });
      for (const auth of linkedAuths) {
        await db.delete(creditAuthorizationComments).where(eq(creditAuthorizationComments.creditAuthorizationId, auth.id));
      }
      await db.delete(creditAuthorizations).where(eq(creditAuthorizations.quotationId, id));
      await db.delete(quotations).where(eq(quotations.id, id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ error: "Error al eliminar la cotización" });
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

      // Get tenant branding for PDF
      const tenant = quotation.tenantId 
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
        : null;

      const hideDiscount = req.query.hideDiscount === "1";
      const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
      const pdfStream = await generateQuotationPDFStream({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
        tenant,
        hideDiscount,
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
      const { additionalEmails = [], emails = [] } = req.body;
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

      // Block email if shipping is handled by Joper and still pending admin approval
      if (
        (quotation as any).shippingHandledByJoper &&
        (quotation as any).shippingApprovalStatus === "pending"
      ) {
        return res.status(403).json({
          error: "Esta cotización tiene un envío a cargo de la empresa pendiente de aprobación. Espera a que el administrador apruebe o rechace el envío antes de enviar la cotización al cliente.",
          code: "SHIPPING_APPROVAL_PENDING",
        });
      }

      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
      });

      // Preserve existing approval token so previously sent links remain valid.
      // Only generate a new token if the quotation doesn't have one yet.
      const crypto = await import("crypto");
      const approvalToken = quotation.approvalToken || crypto.randomBytes(32).toString("hex");

      // Get tenant branding for PDF
      const tenant = quotation.tenantId 
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
        : null;

      // Generate PDF and upload to storage
      const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
      const pdfStream = await generateQuotationPDFStream({
        quotation,
        items,
        customer: quotation.customer,
        user: quotation.user,
        tenant,
      });

      let pdfPath: string;
      
      if (useLocalStorage()) {
        // Save PDF locally using the local storage service
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

      // Update quotation with PDF path and approval token
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, { pdfPath, approvalToken });

      // Collect recipients from the emails array sent by the frontend
      const recipients: string[] = [];

      if (emails && emails.length > 0) {
        // Use the emails explicitly selected by the user
        for (const email of emails) {
          if (email && typeof email === "string" && email.includes("@") && !recipients.includes(email)) {
            recipients.push(email.trim().toLowerCase());
          }
        }
      } else {
        // Fallback: use customer email if frontend sent nothing
        if (quotation.customer.email) {
          recipients.push(quotation.customer.email);
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ error: "Debes agregar al menos un correo destinatario" });
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
      await scopedStorage.updateQuotation(id, { 
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

  // ─── Public shipping approval/rejection via email token ─────────────────────

  // GET /api/public/shipping-approval/:token — returns quotation info for the public page
  app.get("/api/public/shipping-approval/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true },
      });
      if (!quotation) return res.status(404).json({ error: "Token de autorización no válido o ya expiró" });

      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, quotation.id),
      });
      const tenant = quotation.tenantId
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
        : null;

      const alreadyProcessed = quotation.shippingApprovalStatus !== "pending";
      const decision = quotation.shippingApprovalStatus === "approved"
        ? "approved"
        : quotation.shippingApprovalStatus === "rejected"
          ? "rejected"
          : undefined;

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
        customer: quotation.customer ? { name: quotation.customer.name } : undefined,
        user: quotation.user ? { fullName: quotation.user.fullName || quotation.user.username } : undefined,
        itemsCount: items.length,
        tenantName: tenant?.name || "Nexxo Sistema Comercial",
      });
    } catch (error) {
      console.error("Error fetching public shipping approval:", error);
      res.status(500).json({ error: "Error al cargar la solicitud" });
    }
  });

  // POST /api/public/shipping-approve/:token — approve via email link (no auth required)
  app.post("/api/public/shipping-approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true },
      });
      if (!quotation) return res.status(404).json({ error: "Token no válido" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotización no tiene envío por Joper" });
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta solicitud ya fue procesada" });
      }

      // Run the same approval logic as the authenticated endpoint
      await db.update(quotations)
        .set({
          shippingApprovalStatus: "approved",
          shippingApprovedAt: new Date(),
          status: QuotationStatus.SENT,
        })
        .where(eq(quotations.id, quotation.id));

      // Generate PDF and send to customer (fire-and-forget)
      (async () => {
        try {
          const crypto = await import("crypto");
          const approvalToken = quotation.approvalToken || crypto.randomBytes(32).toString("hex");
          const tenant = quotation.tenantId
            ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
            : null;
          const items = await db.query.quotationItems.findMany({
            where: eq(quotationItems.quotationId, quotation.id),
          });
          const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
          const pdfStream = await generateQuotationPDFStream({
            quotation: { ...quotation, shippingApprovalStatus: "approved" },
            items,
            customer: quotation.customer,
            user: quotation.user,
            tenant,
          });
          let pdfPath: string;
          if (useLocalStorage()) {
            pdfPath = await localStorageService.uploadQuotationPdfToStorage(pdfStream, quotation.folio, "token-approval");
          } else {
            const objectStorageService = new ObjectStorageService();
            pdfPath = await objectStorageService.uploadQuotationPdfToStorage(pdfStream, quotation.folio, "token-approval");
          }
          await db.update(quotations)
            .set({ pdfPath, approvalToken })
            .where(eq(quotations.id, quotation.id));

          const recipients: string[] = [];
          if (quotation.customer?.email) recipients.push(quotation.customer.email);
          if (quotation.user?.email) recipients.push(quotation.user.email);
          if (recipients.length > 0) {
            const host = req.get("host") || "localhost:5000";
            const protocol = req.protocol || "https";
            const approvalUrl = `${protocol}://${host}/aprobar-cotizacion/${approvalToken}`;
            const { sendQuotationEmail } = await import("./quotation-email-service");
            await sendQuotationEmail({
              to: recipients,
              quotationData: {
                folio: quotation.folio,
                customerName: quotation.customer.name,
                vendedorName: quotation.user.fullName,
                total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
                currency: quotation.currency || "MXN",
                itemsCount: items.length,
              },
              pdfPath,
              approvalUrl,
            });
          }
        } catch (err: any) {
          console.warn("[PublicShippingApprove] PDF/email failed:", err.message || err);
        }
      })();

      console.log(`[PublicShippingApprove] Quotation ${quotation.folio} approved via email token`);
      res.json({ success: true, message: "Envío aprobado. La cotización será enviada al cliente." });
    } catch (error) {
      console.error("Error in public shipping approve:", error);
      res.status(500).json({ error: "Error al aprobar el envío" });
    }
  });

  // POST /api/public/shipping-reject/:token — reject via email link (no auth required)
  app.post("/api/public/shipping-reject/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { reason } = req.body;
      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.shippingApprovalToken, token),
        with: { customer: true, user: true },
      });
      if (!quotation) return res.status(404).json({ error: "Token no válido" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotización no tiene envío por Joper" });
      if (quotation.shippingApprovalStatus !== "pending") {
        return res.status(400).json({ error: "Esta solicitud ya fue procesada" });
      }

      await db.update(quotations)
        .set({
          shippingApprovalStatus: "rejected",
          shippingRejectedAt: new Date(),
          shippingRejectionReason: reason || "No se proporcionó motivo",
          status: QuotationStatus.DRAFT,
        })
        .where(eq(quotations.id, quotation.id));

      // Notify the seller (fire-and-forget)
      (async () => {
        try {
          if (quotation.user?.email) {
            const tenant = quotation.tenantId
              ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
              : null;
            const { sendShippingRejectionEmail } = await import("./quotation-email-service");
            await sendShippingRejectionEmail({
              sellerEmail: quotation.user.email,
              sellerName: quotation.user.fullName || quotation.user.username,
              quotationFolio: quotation.folio,
              customerName: quotation.customer?.name || "Cliente",
              rejectionReason: reason || "No se proporcionó motivo",
              tenantName: tenant?.name || "Nexxo Sistema Comercial",
            });
          }
        } catch (err: any) {
          console.warn("[PublicShippingReject] Seller notification failed:", err.message || err);
        }
      })();

      console.log(`[PublicShippingReject] Quotation ${quotation.folio} rejected via email token`);
      res.json({ success: true, message: "Envío rechazado. El vendedor será notificado." });
    } catch (error) {
      console.error("Error in public shipping reject:", error);
      res.status(500).json({ error: "Error al rechazar el envío" });
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
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, {
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

        // Get tenant branding for PDF
        const tenant = quotation.tenantId 
          ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
          : null;
        
        const { generateQuotationPDFStream } = await import("./quotation-pdf-generator");
        const pdfStream = await generateQuotationPDFStream({
          quotation: { ...quotation, shippingApprovalStatus: "approved" },
          items,
          customer: quotation.customer,
          user: quotation.user,
          tenant,
        });

        let pdfPath: string;
        
        if (useLocalStorage()) {
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

        // Update PDF path and approval token
        await scopedStorage.updateQuotation(id, { pdfPath, approvalToken });

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
      const scopedStorage = createTenantScopedStorage(req);
      await scopedStorage.updateQuotation(id, {
        shippingApprovalStatus: "rejected",
        shippingRejectedBy: adminId,
        shippingRejectedAt: new Date(),
        shippingRejectionReason: reason || "No se proporcionó motivo",
        status: QuotationStatus.DRAFT, // Return to draft for vendor to modify
      });

      // Send notification email to seller via MailerSend
      try {
        if (quotation.user?.email) {
          // Get tenant name for the email
          const tenantRecord = quotation.tenantId
            ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotation.tenantId) })
            : null;
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";

          const { sendShippingRejectionEmail } = await import("./quotation-email-service");
          await sendShippingRejectionEmail({
            sellerEmail: quotation.user.email,
            sellerName: quotation.user.fullName || quotation.user.username,
            quotationFolio: quotation.folio,
            customerName: quotation.customer?.name || "Cliente",
            rejectionReason: reason || "No se proporcionó motivo",
            tenantName,
          });
        } else {
          console.warn(`Seller has no email — skipping rejection notification for quotation ${quotation.folio}`);
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
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertCreditAuthorizationSchema.parse({
        ...req.body,
        userId: req.user!.id,
        status: CreditAuthStatus.PENDING,
      });
      const auth = await scopedStorage.createCreditAuthorization(validated);
      res.status(201).json(auth);

      // Fire-and-forget: notify CREDITO_COBRANZA users of new credit auth request
      (async () => {
        try {
          const tenantId = (req.user as any)?.tenantId;
          if (!tenantId) return;

          const quotForAuth = auth.quotationId
            ? await db.query.quotations.findFirst({
                where: eq(quotations.id, auth.quotationId),
                with: { customer: true, user: true },
              })
            : null;

          const tenantRecord = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";

          const creditoUsers = await db
            .select({ email: users.email, fullName: users.fullName })
            .from(users)
            .where(
              and(
                eq(users.tenantId, tenantId),
                eq(users.role, UserRole.CREDITO_COBRANZA),
                eq(users.active, true)
              )
            );

          if (creditoUsers.length === 0 || !quotForAuth) return;

          const rawCurrency = quotForAuth.currency;
          const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
          const totalDisplay = new Intl.NumberFormat("es-MX", { style: "currency", currency: safeCurrency })
            .format(parseFloat(quotForAuth.total || "0"));

          const fmt = (val: string | null | undefined) =>
            val ? `$${parseFloat(val).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "$0.00";

          const { sendCreditAuthNewRequestEmail } = await import("./quotation-email-service");
          await sendCreditAuthNewRequestEmail({
            quotationFolio: quotForAuth.folio,
            customerName: quotForAuth.customer?.name || "—",
            quotationTotal: totalDisplay,
            vendedorName: (quotForAuth.user as any)?.fullName || "—",
            creditAvailable: fmt(auth.creditAvailable),
            creditUsed: fmt(auth.creditUsed),
            overdueBalance: fmt(auth.overdueBalance),
            tenantName,
            tenantSubdomain: tenantRecord?.subdomain || undefined,
            recipients: creditoUsers.filter(u => u.email).map(u => ({ email: u.email!, name: u.fullName })),
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

      const scopedStorage = createTenantScopedStorage(req);
      const updatedAuth = await scopedStorage.updateCreditAuthorization(id, updateData);
      if (!updatedAuth) {
        return res.status(404).json({ error: "Credit authorization not found" });
      }

      let order: any = undefined;

      // If approved, create order and update quotation status to converted
      if (updatedAuth.status === CreditAuthStatus.APPROVED) {
        // Create order from quotation
        order = await scopedStorage.createOrder({
          quotationId: updatedAuth.quotationId,
          status: OrderStatus.PENDING,
        });

        // Update quotation status to converted and link to order
        await scopedStorage.updateQuotation(updatedAuth.quotationId, {
          status: QuotationStatus.CONVERTED,
          authorizedBy: req.user!.id,
          authorizedAt: new Date(),
          convertedToOrderId: order.id,
        });

        // Notify admins that a new order is pending release (fire and forget)
        (async () => {
          try {
            const { sendOrderReleasePendingEmail } = await import("./quotation-email-service");
            const quotForRelease = await db.query.quotations.findFirst({
              where: eq(quotations.id, updatedAuth.quotationId),
              with: { customer: true, user: true },
            });
            if (!quotForRelease) return;

            const tenantRecord = quotForRelease.tenantId
              ? await db.query.tenants.findFirst({ where: eq(tenants.id, quotForRelease.tenantId) })
              : null;
            const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";

            const adminUsers = quotForRelease.tenantId
              ? await db.select({ email: users.email, fullName: users.fullName })
                  .from(users)
                  .where(and(
                    eq(users.tenantId, quotForRelease.tenantId),
                    sql`${users.role} IN (${UserRole.ADMIN}, ${UserRole.VENTAS_LOGISTICA})`,
                    eq(users.active, true)
                  ))
              : [];

            const rawCurrency = quotForRelease.currency;
            const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
            const totalDisplay = new Intl.NumberFormat("es-MX", { style: "currency", currency: safeCurrency })
              .format(parseFloat(quotForRelease.total || "0"));

            await sendOrderReleasePendingEmail({
              orderFolio: quotForRelease.folio,
              customerName: quotForRelease.customer?.name || "—",
              quotationTotal: totalDisplay,
              vendedorName: (quotForRelease.user as any)?.fullName || "—",
              tenantName,
              tenantSubdomain: tenantRecord?.subdomain || undefined,
              adminRecipients: adminUsers.filter(u => u.email).map(u => ({ email: u.email!, name: u.fullName })),
            });
          } catch (err) {
            console.warn("[OrderRelease] Pending notification email failed:", err);
          }
        })();
      }

      // Send email notifications to seller, customer, and admins
      try {
        const authWithDetails = await db.query.creditAuthorizations.findFirst({
          where: eq(creditAuthorizations.id, id),
          with: {
            quotation: {
              with: {
                customer: true,
                user: true,
              },
            },
          },
        });

        if (authWithDetails?.quotation) {
          const q = authWithDetails.quotation;
          const tenantId = q.tenantId;

          // Fetch tenant name
          const tenantRecord = tenantId
            ? await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
            : null;
          const tenantName = tenantRecord?.name || "Nexxo Sistema Comercial";

          // Fetch admin users for this tenant with email
          const adminUsers = tenantId
            ? await db
                .select({ email: users.email, fullName: users.fullName })
                .from(users)
                .where(
                  and(
                    eq(users.tenantId, tenantId),
                    eq(users.role, UserRole.ADMIN),
                    eq(users.active, true)
                  )
                )
            : [];

          // Fetch CREDITO_COBRANZA users for this tenant
          const creditoUsers = tenantId
            ? await db
                .select({ email: users.email, fullName: users.fullName })
                .from(users)
                .where(
                  and(
                    eq(users.tenantId, tenantId),
                    eq(users.role, UserRole.CREDITO_COBRANZA),
                    eq(users.active, true)
                  )
                )
            : [];

          // Build recipient list (deduplicated by email)
          const emailMap = new Map<string, string>();

          // Seller
          if (q.user?.email) emailMap.set(q.user.email, q.user.fullName || q.user.username);

          // Customer
          if (q.customer?.email) emailMap.set(q.customer.email, q.customer.name);

          // Admins
          for (const admin of adminUsers) {
            if (admin.email) emailMap.set(admin.email, admin.fullName);
          }

          // Crédito y Cobranza
          for (const cu of creditoUsers) {
            if (cu.email) emailMap.set(cu.email, cu.fullName);
          }

          // Format total
          const totalVal = parseFloat(q.total || "0");
          const totalDisplay = `$${totalVal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

          const recipientList = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));

          const { sendCreditAuthStatusEmail } = await import("./quotation-email-service");
          await sendCreditAuthStatusEmail({
            status: updatedAuth.status === CreditAuthStatus.APPROVED ? "approved" : "rejected",
            quotationFolio: q.folio,
            customerName: q.customer?.name || "Cliente",
            quotationTotal: totalDisplay,
            rejectionNotes: rejectionNotes,
            tenantName,
            recipients: recipientList,
          });
        }
      } catch (emailError: any) {
        console.warn("Email notification failed for credit auth:", emailError.message || emailError);
      }

      if (order) return res.json({ ...updatedAuth, order });
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

      // Get tenant branding for PDF
      const tenantForPdf = auth.quotation.tenantId
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, auth.quotation.tenantId) })
        : null;

      const { generateCreditAuthPDFStream } = await import("./credit-auth-pdf-generator");
      
      const pdfStream = await generateCreditAuthPDFStream({
        authorization: auth,
        quotation: auth.quotation,
        customer: auth.quotation.customer,
        requestedBy: auth.user,
        approvedBy,
        tenant: tenantForPdf,
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
      const scopedStorage = createTenantScopedStorage(req);
      const allOrders = await scopedStorage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertOrderSchema.parse({
        ...req.body,
        status: OrderStatus.PENDING,
      });
      const order = await scopedStorage.createOrder(validated);

      // Update quotation status to converted
      await scopedStorage.updateQuotation(validated.quotationId, {
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
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Convert estimatedDelivery string to Date object if present
      if (updateData.estimatedDelivery) {
        updateData.estimatedDelivery = new Date(updateData.estimatedDelivery);
      }
      
      const updatedOrder = await scopedStorage.updateOrder(id, {
        ...updateData,
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
      const scopedStorage = createTenantScopedStorage(req);
      const releases = await scopedStorage.getOrderReleases(id);

      res.json({ ...order, releases });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Error fetching order details" });
    }
  });

  // Get order releases
  app.get("/api/orders/:id/releases", isAuthenticated, async (req, res) => {
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
      const scopedStorage = createTenantScopedStorage(req);
      let invoiceId: string | undefined;
      let shipmentId: string | undefined;

      // Create invoice if requested
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
          currency: "MXN",
        });
        invoiceId = invoice.id;
      }

      // Create shipment if requested
      if (createShipment && shipmentData) {
        const shipment = await scopedStorage.createShipment({
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
      const release = await scopedStorage.createOrderRelease({
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

      const allReleases = await scopedStorage.getOrderReleases(id);

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
        await scopedStorage.updateOrder(id, { status: OrderStatus.SHIPPED });
      } else if (someReleased) {
        await scopedStorage.updateOrder(id, { status: OrderStatus.PARTIALLY_RELEASED });
      }

      res.status(201).json({ release, invoiceId, shipmentId });
    } catch (error: any) {
      console.error("Error creating order release:", error);
      res.status(400).json({ error: error.message || "Error creating order release" });
    }
  });

  // ─── ORDER RELEASE ──────────────────────────────────────────────────────────

  app.get("/api/order-release", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { status } = req.query as { status?: string };
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;

      const orderRows = await db.query.orders.findMany({
        where: resolvedTenantId ? eq(orders.tenantId, resolvedTenantId) : undefined,
        with: {
          quotation: {
            with: {
              customer: true,
              items: true,
              user: true,
            },
          },
        },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
      });

      // Get shipments for shipping dates
      const allShipments = await db.query.shipments.findMany({
        where: resolvedTenantId ? eq(shipments.tenantId, resolvedTenantId) : undefined,
      });
      const shipmentByOrder = new Map(allShipments.map(s => [s.orderId, s]));

      // Get credit authorizations for release dates
      const allCreditAuths = await db.query.creditAuthorizations.findMany({
        where: resolvedTenantId
          ? sql`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${resolvedTenantId})`
          : undefined,
      });
      const creditAuthByQuotation = new Map(allCreditAuths.map(c => [c.quotationId, c]));

      // Get releasedBy user names
      const releasedByIds = [...new Set(orderRows.map(o => o.releasedById).filter(Boolean))] as string[];
      const releasedByUsers = releasedByIds.length > 0
        ? await db.query.users.findMany({ where: sql`${users.id} = ANY(${sql.raw(`ARRAY['${releasedByIds.join("','")}']::varchar[]`)})` })
        : [];
      const releasedByMap = new Map(releasedByUsers.map(u => [u.id, u]));

      let filtered = orderRows;
      if (status === "pending") {
        filtered = orderRows.filter(o => o.releaseStatus === "pending");
      } else if (status === "history") {
        filtered = orderRows.filter(o => o.releaseStatus === "approved" || o.releaseStatus === "rejected");
      }

      const result = filtered.map(o => {
        const shipment = shipmentByOrder.get(o.id);
        const creditAuth = creditAuthByQuotation.get(o.quotationId);
        const releasedBy = o.releasedById ? releasedByMap.get(o.releasedById) : null;
        const quotation = o.quotation as any;
        const vendedor = quotation?.user;
        const rawCurrency = quotation?.currency;
        const safeCurrency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "MXN";
        return {
          id: o.id,
          folio: quotation?.folio || o.id.substring(0, 8),
          customerName: quotation?.customer?.name || "—",
          customerRfc: quotation?.customer?.rfc || null,
          vendedorName: vendedor?.fullName || "—",
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
          items: (quotation?.items || []).map((item: any) => ({
            id: item.id,
            productCode: item.productCode || null,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice || "0",
            discountPercent: item.discountPercent || "0",
            subtotal: item.subtotal || "0",
            currency: item.currency || safeCurrency,
          })),
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching order release list:", error);
      res.status(500).json({ error: "Error fetching orders" });
    }
  });

  app.post("/api/order-release/:id/approve", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;

      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, id), resolvedTenantId ? eq(orders.tenantId, resolvedTenantId) : undefined),
        with: {
          quotation: {
            with: { customer: true, user: true },
          },
        },
      });

      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Order is not pending release" });

      const { releaseNotes: approveNotes } = req.body;
      await db.update(orders).set({
        releaseStatus: OrderReleaseStatus.APPROVED,
        releasedById: req.user!.id,
        releasedAt: new Date(),
        updatedAt: new Date(),
        ...(approveNotes?.trim() && { releaseNotes: approveNotes.trim() }),
      }).where(eq(orders.id, id));

      // Send email notifications (fire and forget)
      (async () => {
        try {
          const { sendOrderReleaseEmail } = await import("./quotation-email-service");
          const quotation = order.quotation as any;
          const tenantName = req.tenant?.name || "Sistema Comercial";
          const releasedByName = req.user!.fullName;

          // Collect recipients: vendedor + C&C + admins (not the customer)
          const allUsers = await db.query.users.findMany({
            where: resolvedTenantId ? eq(users.tenantId, resolvedTenantId) : undefined,
          });
          const recipients = allUsers
            .filter(u => [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA].includes(u.role as any) || u.id === quotation?.userId)
            .filter(u => u.email)
            .map(u => ({ email: u.email!, name: u.fullName }));

          // Add vendedor if not already included
          const vendedorEmail = quotation?.user?.email;
          const vendedorName = quotation?.user?.fullName;
          if (vendedorEmail && !recipients.find(r => r.email === vendedorEmail)) {
            recipients.push({ email: vendedorEmail, name: vendedorName || "Vendedor" });
          }

          const uniqueRecipients = [...new Map(recipients.map(r => [r.email, r])).values()];

          const total = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: quotation?.currency || "MXN",
          }).format(parseFloat(quotation?.total || "0"));

          await sendOrderReleaseEmail({
            status: "approved",
            orderFolio: quotation?.folio || id,
            customerName: quotation?.customer?.name || "—",
            quotationTotal: total,
            tenantName,
            releasedByName,
            recipients: uniqueRecipients,
          });
        } catch (emailErr) {
          console.warn("[OrderRelease] Approve email failed:", emailErr);
        }
      })();

      res.json({ success: true });
    } catch (error) {
      console.error("Error approving order release:", error);
      res.status(500).json({ error: "Error approving order release" });
    }
  });

  app.post("/api/order-release/:id/reject", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { releaseNotes } = req.body;
      if (!releaseNotes?.trim()) return res.status(400).json({ error: "Motivo de rechazo requerido" });

      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;

      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, id), resolvedTenantId ? eq(orders.tenantId, resolvedTenantId) : undefined),
        with: {
          quotation: {
            with: { customer: true, user: true },
          },
        },
      });

      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Order is not pending release" });

      await db.update(orders).set({
        releaseStatus: OrderReleaseStatus.REJECTED,
        releaseNotes: releaseNotes.trim(),
        releasedById: req.user!.id,
        releasedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(orders.id, id));

      // Send email notifications (fire and forget)
      (async () => {
        try {
          const { sendOrderReleaseEmail } = await import("./quotation-email-service");
          const quotation = order.quotation as any;
          const tenantName = req.tenant?.name || "Sistema Comercial";
          const releasedByName = req.user!.fullName;

          const allUsers = await db.query.users.findMany({
            where: resolvedTenantId ? eq(users.tenantId, resolvedTenantId) : undefined,
          });
          const recipients = allUsers
            .filter(u => [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA].includes(u.role as any) || u.id === quotation?.userId)
            .filter(u => u.email)
            .map(u => ({ email: u.email!, name: u.fullName }));

          const vendedorEmail = quotation?.user?.email;
          const vendedorName = quotation?.user?.fullName;
          if (vendedorEmail && !recipients.find(r => r.email === vendedorEmail)) {
            recipients.push({ email: vendedorEmail, name: vendedorName || "Vendedor" });
          }

          const uniqueRecipients = [...new Map(recipients.map(r => [r.email, r])).values()];

          const total = new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: quotation?.currency || "MXN",
          }).format(parseFloat(quotation?.total || "0"));

          await sendOrderReleaseEmail({
            status: "rejected",
            orderFolio: quotation?.folio || id,
            customerName: quotation?.customer?.name || "—",
            quotationTotal: total,
            releaseNotes: releaseNotes.trim(),
            tenantName,
            releasedByName,
            recipients: uniqueRecipients,
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

  app.patch("/api/order-release/:id/adjust", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const { items, notes, conditions } = req.body as {
        items?: { id: string; quantity: number; unitPrice: number; discountPercent: number }[];
        notes?: string;
        conditions?: string;
      };

      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;

      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, id), resolvedTenantId ? eq(orders.tenantId, resolvedTenantId) : undefined),
        with: { quotation: { with: { items: true } } },
      });

      if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
      if (order.releaseStatus !== "pending") return res.status(400).json({ error: "Solo se pueden ajustar pedidos pendientes de liberación" });

      const quotation = order.quotation as any;
      if (!quotation) return res.status(400).json({ error: "Cotización no encontrada" });

      // Update each item
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
            total: String(total),
          }).where(eq(quotationItems.id, adj.id));
        }
      }

      // Recalculate quotation totals from all current items
      const updatedItems = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, quotation.id),
      });
      const newSubtotal = updatedItems.reduce((sum, i) => sum + parseFloat(i.subtotal || "0"), 0);
      const globalDiscountPct = parseFloat(quotation.globalDiscount || "0");
      const discountAmt = newSubtotal * (globalDiscountPct / 100);
      const shippingCost = parseFloat(quotation.shippingCost || "0");
      const taxableBase = newSubtotal - discountAmt;
      const newTax = taxableBase * 0.16;
      const newTotal = taxableBase + newTax + shippingCost;

      const quotationUpdate: Record<string, any> = {
        subtotal: String(newSubtotal),
        tax: String(newTax),
        total: String(newTotal),
        updatedAt: new Date(),
      };
      if (notes !== undefined) quotationUpdate.notes = notes;
      if (conditions !== undefined) quotationUpdate.conditions = conditions;

      await db.update(quotations).set(quotationUpdate).where(eq(quotations.id, quotation.id));

      res.json({ success: true, newTotal: String(newTotal) });
    } catch (error) {
      console.error("Error adjusting order:", error);
      res.status(500).json({ error: "Error al ajustar el pedido" });
    }
  });

  // ─── REPORTS ────────────────────────────────────────────────────────────────

  app.get("/api/reports/orders", isAuthenticated, async (req, res) => {
    try {
      // Resolve tenantId using same priority as TenantScopedStorage:
      // 1. Subdomain tenant, 2. User's tenantId, 3. SuperAdmin global (no filter)
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const isSuperAdminGlobal = req.user?.isSuperAdmin && !resolvedTenantId;
      const { dateFrom, dateTo, customerId, status, activeOnly } = req.query as Record<string, string>;

      const tenantWhere = (!isSuperAdminGlobal && resolvedTenantId)
        ? eq(orders.tenantId, resolvedTenantId)
        : undefined;

      const orderRows = await db.query.orders.findMany({
        where: tenantWhere,
        with: {
          quotation: {
            with: {
              customer: true,
              items: true,
            },
          },
        },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
      });

      // Get shipments
      const shipmentWhere = (!isSuperAdminGlobal && resolvedTenantId)
        ? eq(shipments.tenantId, resolvedTenantId)
        : undefined;
      const allShipments = await db.query.shipments.findMany({
        where: shipmentWhere,
      });
      const shipmentByOrder = new Map(allShipments.map(s => [s.orderId, s]));

      // Get credit authorizations to show release date
      const allCreditAuths = await db.query.creditAuthorizations.findMany({
        where: (!isSuperAdminGlobal && resolvedTenantId)
          ? sql`${creditAuthorizations.quotationId} IN (SELECT id FROM quotations WHERE tenant_id = ${resolvedTenantId})`
          : undefined,
      });
      const creditAuthByQuotation = new Map(allCreditAuths.map(c => [c.quotationId, c]));

      let filtered = orderRows;

      // By default only show active (non-shipped, non-delivered) orders
      // Pass activeOnly=false to see all
      const showActiveOnly = activeOnly !== "false";
      if (showActiveOnly && (!status || status === "all")) {
        filtered = filtered.filter(o => o.status !== "shipped" && o.status !== "delivered");
      }

      // Filter by status
      if (status && status !== "all") {
        filtered = filtered.filter(o => o.status === status);
      }

      // Filter by customerId
      if (customerId) {
        filtered = filtered.filter(o => o.quotation?.customerId === customerId);
      }

      // Filter by date range (using createdAt)
      if (dateFrom) {
        const from = new Date(dateFrom);
        filtered = filtered.filter(o => {
          const d = o.createdAt;
          return d && new Date(d) >= from;
        });
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => {
          const d = o.createdAt;
          return d && new Date(d) <= to;
        });
      }

      const result = filtered.map(o => {
        const shipment = shipmentByOrder.get(o.id);
        const creditAuth = creditAuthByQuotation.get(o.quotationId);
        return {
          id: o.id,
          folio: o.quotation?.folio || o.id.substring(0, 8),
          customerName: o.quotation?.customer?.name || "—",
          customerRfc: o.quotation?.customer?.rfc || null,
          purchaseOrder: o.quotation?.purchaseOrder || null,
          closeDate: o.quotation?.customerApprovedAt || null,
          shippingDate: shipment?.shippedAt || null,
          creditReleaseDate: creditAuth?.authorizedAt || null,
          comments: o.factoryNotes || null,
          notes: o.quotation?.notes || null,
          status: o.status,
          createdAt: o.createdAt,
          items: (o.quotation?.items || []).map(item => ({
            productCode: item.productCode || null,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice ?? null,
          })),
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching orders report:", error);
      res.status(500).json({ error: "Error generating report" });
    }
  });

  app.post("/api/reports/orders/pdf", isAuthenticated, async (req, res) => {
    try {
      const { filters = {}, orders: orderData } = req.body;
      const tenant = req.tenant;

      const tenantBranding = tenant ? {
        name: tenant.name,
        legalName: (tenant as any).legalName || null,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        rfc: (tenant as any).rfc || null,
        address: (tenant as any).address || null,
        city: (tenant as any).city || null,
        state: (tenant as any).state || null,
        zipCode: (tenant as any).zipCode || null,
        phone: (tenant as any).phone || null,
        email: (tenant as any).email || null,
        website: (tenant as any).website || null,
      } : null;

      const { generateOrdersReportPDF } = await import("./reports-pdf-generator");
      const pdfStream = await generateOrdersReportPDF({
        orders: orderData,
        tenant: tenantBranding,
        filters,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="reporte-pedidos-${Date.now()}.pdf"`);
      pdfStream.pipe(res);
    } catch (error) {
      console.error("Error generating orders PDF:", error);
      res.status(500).json({ error: "Error generating PDF" });
    }
  });

  // ─── PRODUCTION BOARD ────────────────────────────────────────────────────────

  app.get("/api/board/orders", isAuthenticated, async (req, res) => {
    try {
      const resolvedTenantId = req.tenant?.id || req.user?.tenantId || null;
      const isSuperAdminGlobal = req.user?.isSuperAdmin && !resolvedTenantId;
      const boardTenantWhere = (!isSuperAdminGlobal && resolvedTenantId)
        ? eq(orders.tenantId, resolvedTenantId)
        : undefined;

      const orderRows = await db.query.orders.findMany({
        where: boardTenantWhere,
        with: {
          quotation: {
            with: {
              customer: true,
              items: { with: { product: true } },
            },
          },
        },
        orderBy: (o, { asc, desc }) => [asc(o.estimatedDelivery), desc(o.createdAt)],
      });

      // Filter: active orders (not delivered) + delivered in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const filtered = orderRows.filter(o => {
        if (o.status === "delivered") {
          const deliveredAt = o.actualDelivery ? new Date(o.actualDelivery) : new Date(o.updatedAt);
          return deliveredAt >= sevenDaysAgo;
        }
        if (o.status === "shipped") {
          return true;
        }
        return true; // all active statuses
      });

      const result = filtered.map(o => {
        const q = o.quotation as any;
        const now = new Date();
        const estimatedDelivery = o.estimatedDelivery ? new Date(o.estimatedDelivery) : null;
        const daysRemaining = estimatedDelivery
          ? Math.ceil((estimatedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: o.id,
          folio: q?.folio || "—",
          status: o.status,
          productionProgress: o.productionProgress,
          estimatedDelivery: o.estimatedDelivery,
          actualDelivery: o.actualDelivery,
          factoryNotes: o.factoryNotes,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          daysRemaining,
          customerName: q?.customer?.name || "—",
          customerCity: q?.customer?.city || null,
          purchaseOrder: q?.purchaseOrder || null,
          deliveryTime: q?.deliveryTime || null,
          shippingNotes: q?.shippingNotes || null,
          itemCount: q?.items?.length || 0,
          items: (q?.items || []).map((item: any) => ({
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
          })),
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching board orders:", error);
      res.status(500).json({ error: "Error fetching board orders" });
    }
  });

  // Shipments endpoints
  app.get("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allShipments = await scopedStorage.getAllShipments();
      res.json(allShipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ error: "Error fetching shipments" });
    }
  });

  app.post("/api/shipments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertShipmentSchema.parse(req.body);

      // Prevent duplicate shipments for the same order
      if (validated.orderId) {
        const existing = await db.query.shipments.findFirst({
          where: eq(shipments.orderId, validated.orderId),
        });
        if (existing) {
          return res.status(409).json({ error: "Ya existe un embarque para este pedido" });
        }
      }

      const shipment = await scopedStorage.createShipment(validated);

      // Mark order as SHIPPED so the button disappears from production
      if (validated.orderId) {
        await scopedStorage.updateOrder(validated.orderId, { status: OrderStatus.SHIPPED });
      }

      res.status(201).json(shipment);
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(400).json({ error: "Error creating shipment" });
    }
  });

  app.patch("/api/shipments/:id", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;

      // Guard: validate status transitions
      if (req.body.status) {
        const current = await scopedStorage.getShipment(id);
        if (!current) return res.status(404).json({ error: "Shipment not found" });
        const order = [ShipmentStatus.PENDING, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED];
        const currentIdx = order.indexOf(current.status as any);
        const newIdx = order.indexOf(req.body.status);
        if (newIdx <= currentIdx) {
          return res.status(409).json({ error: "El embarque ya tiene ese estado o uno posterior" });
        }
      }

      const data = { ...req.body };
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

  // Shipment Remisión de Salida PDF
  app.get("/api/shipments/:id/remision", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = getEffectiveTenantId(req);

      // Load shipment with full relations
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, id),
        with: {
          productInstances: { with: { product: true } },
        },
      });
      if (!shipment) return res.status(404).json({ error: "Embarque no encontrado" });

      // Load order → quotation → items → customer
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, shipment.orderId),
        with: {
          quotation: {
            with: {
              customer: true,
              items: { with: { product: true } },
            },
          },
        },
      });
      if (!order) return res.status(404).json({ error: "Pedido no encontrado" });

      const customer = order.quotation.customer;

      // Load tenant branding
      let tenantBranding = null;
      if (tenantId) {
        tenantBranding = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      }

      // Build products list grouped by productId, attaching serial numbers from productInstances
      const instancesByProduct: Record<string, string[]> = {};
      for (const inst of shipment.productInstances ?? []) {
        if (!instancesByProduct[inst.productId]) instancesByProduct[inst.productId] = [];
        instancesByProduct[inst.productId].push(inst.serialNumber);
      }

      const remisionProducts = order.quotation.items.map(item => ({
        name: item.product?.name ?? item.description ?? "Producto",
        quantity: parseFloat(item.quantity ?? "1"),
        unitOfMeasure: item.product?.unitOfMeasure ?? "Unidades",
        desde: tenantBranding?.city ? `${tenantBranding.city}/Salida` : "Almacén/Salida",
        serialNumbers: instancesByProduct[item.productId ?? ""] ?? [],
      }));

      const { generateShipmentRemisionPDF } = await import("./shipment-remision-pdf-generator.js");

      const stream = await generateShipmentRemisionPDF({
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
        invoiceNumber: (shipment as any).invoiceNumber || null,
        products: remisionProducts,
        tenant: tenantBranding,
      });

      const safeCustomer = customer.name.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 30);
      const safeOrder = order.quotation.folio.replace(/[^a-zA-Z0-9_\-]/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="remision-${safeOrder}-${safeCustomer}.pdf"`);
      stream.pipe(res);
    } catch (error) {
      console.error("Error generating shipment remision PDF:", error);
      res.status(500).json({ error: "Error al generar la remisión" });
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
      const { status, notes, deliveredAt, serialNumber } = req.body;
      if (serialNumber !== undefined) {
        const existing = await db.query.shipmentProductInstances.findFirst({
          where: and(
            eq(shipmentProductInstances.serialNumber, serialNumber),
            sql`${shipmentProductInstances.id} != ${id}`
          ),
        });
        if (existing) {
          return res.status(400).json({ error: "El número de serie ya existe en otro producto" });
        }
      }
      const [updated] = await db
        .update(shipmentProductInstances)
        .set({ ...(status !== undefined && { status }), ...(notes !== undefined && { notes }), ...(deliveredAt !== undefined && { deliveredAt }), ...(serialNumber !== undefined && { serialNumber }) })
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

  app.delete("/api/product-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db
        .delete(shipmentProductInstances)
        .where(eq(shipmentProductInstances.id, id))
        .returning();
      if (!deleted) {
        return res.status(404).json({ error: "Product instance not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product instance:", error);
      res.status(500).json({ error: "Error deleting product instance" });
    }
  });

  // Invoices endpoints
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const allInvoices = await scopedStorage.getAllInvoices();
      res.json(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Error fetching invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
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

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
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

      const tenantForPdf = invoice.tenantId
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, invoice.tenantId) })
        : null;

      const { generateInvoicePDFStream } = await import("./invoice-pdf-generator");
      const pdfStream = await generateInvoicePDFStream({ invoice, customer: invoice.customer, tenant: tenantForPdf });

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

  // ─── ACCOUNT STATEMENTS ────────────────────────────────────────────────────

  // GET /api/account-statements — returns all customers with their outstanding balance summary
  app.get("/api/account-statements", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant no encontrado" });

      // --- Live Microsip CXC path ---
      // If the tenant has Microsip configured, query DOCTOS_CC directly from Firebird.
      // This uses the CXC (accounts receivable) module which correctly reflects credits
      // and payments applied in Microsip. Old pre-lookback debt is included in the
      // total balance but is NOT individually flagged as overdue (it becomes saldo anterior).
      const microsipCfg = await db.select().from(microsipConfigs).where(eq(microsipConfigs.tenantId, tenantId)).limit(1);
      if (microsipCfg.length > 0) {
        try {
          const service = await createMicrosipSyncService(tenantId);
          const cxcBalances = await service.queryLiveAccountStatements(3);

          // Build a map from Microsip CLIENTE_ID → Nexxo customer
          const tenantCustomers = await db.select().from(customers).where(
            and(eq(customers.tenantId, tenantId), isNotNull(customers.microsipId))
          );
          const customerByMicrosipId = new Map<number, typeof tenantCustomers[0]>();
          for (const c of tenantCustomers) {
            if (c.microsipId) customerByMicrosipId.set(parseInt(c.microsipId), c);
          }

          const result = cxcBalances
            .flatMap(bal => {
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
                  phone: customer.phone,
                },
                totalBalance,
                overdueBalance: Math.max(0, Number(bal.SALDO_VENCIDO) || 0),
                invoiceCount: Number(bal.INVOICE_COUNT) || 0,
                oldestDueDate: bal.OLDEST_DUE ? (bal.OLDEST_DUE instanceof Date ? bal.OLDEST_DUE.toISOString() : String(bal.OLDEST_DUE)) : null,
              }];
            })
            .sort((a, b) => b.overdueBalance - a.overdueBalance || b.totalBalance - a.totalBalance);

          return res.json(result);
        } catch (msErr) {
          console.error("[account-statements] Microsip live query failed, falling back to local DB:", msErr);
          // Fall through to local DB path
        }
      }

      // --- Fallback: local PostgreSQL DB ---
      const allInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.tenantId, tenantId),
          or(
            eq(invoices.status, "pending_payment"),
            eq(invoices.status, "partially_paid")
          )
        ),
        with: { customer: true },
        orderBy: (invoices, { desc }) => [desc(invoices.issuedAt)],
      });

      const byCustomer = new Map<string, {
        customer: any;
        totalBalance: number;
        overdueBalance: number;
        invoiceCount: number;
        oldestDueDate: Date | null;
      }>();

      const now = new Date();
      for (const inv of allInvoices) {
        const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0");
        if (!Number.isFinite(bal) || bal <= 0) continue;
        const existing = byCustomer.get(inv.customerId) ?? {
          customer: inv.customer,
          totalBalance: 0,
          overdueBalance: 0,
          invoiceCount: 0,
          oldestDueDate: null,
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
      res.json(result);
    } catch (error) {
      console.error("Error fetching account statements:", error);
      res.status(500).json({ error: "Error al obtener estados de cuenta" });
    }
  });

  // POST /api/customers/:id/send-account-statement — send statement to a single customer
  app.post("/api/customers/:id/send-account-statement", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const { additionalEmails = [] } = req.body;

      const customer = await scopedStorage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

      const recipientEmails: string[] = [];
      if (customer.email) {
        for (const e of customer.email.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)) {
          if (e.includes("@")) recipientEmails.push(e.toLowerCase());
        }
      }
      for (const e of additionalEmails) {
        if (e && typeof e === "string" && e.includes("@") && !recipientEmails.includes(e.toLowerCase())) {
          recipientEmails.push(e.toLowerCase());
        }
      }

      if (recipientEmails.length === 0) {
        return res.status(400).json({ error: "El cliente no tiene correo electrónico configurado" });
      }

      const [custInvoices, custPayments] = await Promise.all([
        scopedStorage.getInvoicesByCustomer(id),
        scopedStorage.getPaymentsByCustomer(id),
      ]);

      // Fetch tenant name for branding
      const tenantId = getEffectiveTenantId(req);
      let tenantName = "Nexxo";
      if (tenantId) {
        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
        if (tenant?.name) tenantName = tenant.name;
      }

      const { sendAccountStatementEmail } = await import("./account-statement-email-service");
      await sendAccountStatementEmail({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        recipientEmails,
        tenantName,
      });

      res.json({ success: true, message: `Estado de cuenta enviado a ${recipientEmails.join(", ")}` });
    } catch (error: any) {
      console.error("Error sending account statement:", error);
      res.status(500).json({ error: error.message ?? "Error al enviar estado de cuenta" });
    }
  });

  // POST /api/account-statements/send-bulk — send statement to multiple customers
  app.post("/api/account-statements/send-bulk", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { customerIds = [] } = req.body as { customerIds: string[] };
      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ error: "Se requiere al menos un cliente" });
      }

      const tenantId = getEffectiveTenantId(req);
      let tenantName = "Nexxo";
      if (tenantId) {
        const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
        if (tenant?.name) tenantName = tenant.name;
      }

      const { sendAccountStatementEmail } = await import("./account-statement-email-service");
      const results: { customerId: string; name: string; success: boolean; error?: string }[] = [];

      for (const custId of customerIds) {
        try {
          const customer = await scopedStorage.getCustomer(custId);
          if (!customer) { results.push({ customerId: custId, name: "?", success: false, error: "No encontrado" }); continue; }

          const recipientEmails: string[] = (customer.email ?? "")
            .split(/[;,]/).map((s: string) => s.trim()).filter((e: string) => e.includes("@"))
            .map((e: string) => e.toLowerCase());

          if (recipientEmails.length === 0) {
            results.push({ customerId: custId, name: customer.name, success: false, error: "Sin correo" });
            continue;
          }

          const [custInvoices, custPayments] = await Promise.all([
            scopedStorage.getInvoicesByCustomer(custId),
            scopedStorage.getPaymentsByCustomer(custId),
          ]);

          await sendAccountStatementEmail({ customer, invoices: custInvoices, payments: custPayments, recipientEmails, tenantName });
          results.push({ customerId: custId, name: customer.name, success: true });
        } catch (e: any) {
          const c = await scopedStorage.getCustomer(custId).catch(() => null);
          results.push({ customerId: custId, name: c?.name ?? custId, success: false, error: e.message });
        }
      }

      const sent = results.filter((r) => r.success).length;
      res.json({ sent, failed: results.length - sent, results });
    } catch (error: any) {
      console.error("Error bulk sending account statements:", error);
      res.status(500).json({ error: error.message ?? "Error al enviar estados de cuenta" });
    }
  });

  // GET /api/account-statement-schedule — get schedule config for current tenant
  app.get("/api/account-statement-schedule", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant requerido" });
      const { accountStatementSchedules } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const row = await db.query.accountStatementSchedules.findFirst({
        where: eq(accountStatementSchedules.tenantId, tenantId),
      });
      res.json(row ?? null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/account-statement-schedule — create or update schedule config
  app.put("/api/account-statement-schedule", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: "Tenant requerido" });

      const { enabled, scheduleDays, sendHour, onlyOverdue } = req.body as {
        enabled: boolean;
        scheduleDays: number[];
        sendHour: number;
        onlyOverdue: boolean;
      };

      if (!Array.isArray(scheduleDays) || scheduleDays.length === 0) {
        return res.status(400).json({ error: "scheduleDays debe ser un arreglo con al menos un día" });
      }
      if (typeof sendHour !== "number" || sendHour < 0 || sendHour > 23) {
        return res.status(400).json({ error: "sendHour debe ser entre 0 y 23" });
      }

      const { accountStatementSchedules } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const existing = await db.query.accountStatementSchedules.findFirst({
        where: eq(accountStatementSchedules.tenantId, tenantId),
      });

      const now = new Date();
      if (existing) {
        const [updated] = await db
          .update(accountStatementSchedules)
          .set({ enabled, scheduleDays, sendHour, onlyOverdue, updatedAt: now })
          .where(eq(accountStatementSchedules.id, existing.id))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db
          .insert(accountStatementSchedules)
          .values({ tenantId, enabled, scheduleDays, sendHour, onlyOverdue })
          .returning();
        res.json(created);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/customers/:id/account-statement-pdf — download PDF
  app.get("/api/customers/:id/account-statement-pdf", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const { id } = req.params;
      const customer = await scopedStorage.getCustomer(id);
      if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

      const tenantId = getEffectiveTenantId(req);
      let tenant = null;
      if (tenantId) tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

      // Try to use CXC live data from Microsip (matches Microsip's own figures)
      let cxcData: { invoices: any[]; payments: any[] } | undefined;
      if (tenantId && customer.microsipId) {
        const microsipCfg = await db.select().from(microsipConfigs).where(eq(microsipConfigs.tenantId, tenantId)).limit(1);
        if (microsipCfg.length > 0) {
          try {
            const service = await createMicrosipSyncService(tenantId);
            const raw = await service.queryLiveCxcStatementForCustomer(parseInt(customer.microsipId));
            const now = new Date();
            cxcData = {
              invoices: raw.invoices.map(inv => ({
                folio: String(inv.FOLIO),
                issueDate: inv.FECHA,
                dueDate: inv.FECHA_VEN ?? null,
                total: Number(inv.IMPORTE_TOTAL) || 0,
                balance: Number(inv.SALDO) || 0,
              })),
              payments: raw.payments.map(pay => ({
                reference: String(pay.REFERENCIA),
                date: pay.FECHA,
                amount: Number(pay.IMPORTE) || 0,
                invoiceFolio: pay.FACTURA_FOLIO ? String(pay.FACTURA_FOLIO) : null,
              })),
            };
          } catch (cxcErr) {
            console.warn("[PDF] CXC live query failed, falling back to local DB:", (cxcErr as Error).message);
          }
        }
      }

      // Fallback: load local data (used when Microsip not configured or CXC fails)
      const [custInvoices, custPayments] = cxcData
        ? [[], []]
        : await Promise.all([
            scopedStorage.getInvoicesByCustomer(id),
            scopedStorage.getPaymentsByCustomer(id),
          ]);

      const { generateAccountStatementPDF } = await import("./account-statement-pdf-generator");
      const pdfStream = await generateAccountStatementPDF({
        customer,
        invoices: custInvoices,
        payments: custPayments,
        tenant,
        cxcData,
      });

      const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="estado-cuenta-${safeName}.pdf"`);
      pdfStream.pipe(res);
    } catch (error: any) {
      console.error("Error generating account statement PDF:", error);
      res.status(500).json({ error: error.message ?? "Error al generar PDF" });
    }
  });

  // GET /api/customers/:id/account-statement-link — generate shareable signed link (7 days)
  app.get("/api/customers/:id/account-statement-link", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION), async (req, res) => {
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
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      })).toString("base64url");
      const sig = createHmac("sha256", secret).update(payload).digest("hex");
      const token = `${payload}.${sig}`;

      res.json({ token, customerName: customer.name });
    } catch (error: any) {
      console.error("Error generating account statement link:", error);
      res.status(500).json({ error: error.message ?? "Error al generar enlace" });
    }
  });

  // GET /api/public/account-statement/:token — public endpoint, no auth required
  app.get("/api/public/account-statement/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const parts = token.split(".");
      if (parts.length < 2) return res.status(400).json({ error: "Token inválido" });

      const sig = parts.pop()!;
      const payload = parts.join(".");
      const { createHmac } = await import("crypto");
      const secret = process.env.SESSION_SECRET || "nexxo-secret";
      const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
      if (sig !== expectedSig) return res.status(403).json({ error: "Token inválido o expirado" });

      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (data.exp < Date.now()) return res.status(403).json({ error: "El enlace ha expirado" });

      const { customerId, tenantId } = data;
      const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
      if (!customer || customer.tenantId !== tenantId) return res.status(404).json({ error: "No encontrado" });

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

      const [custInvoices, custPayments] = await Promise.all([
        db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(desc(invoices.issuedAt)),
        db.select().from(payments).where(eq(payments.customerId, customerId)).orderBy(desc(payments.paymentDate)),
      ]);

      res.json({ customer, invoices: custInvoices, payments: custPayments, tenant: tenant ?? null });
    } catch (error: any) {
      console.error("Error fetching public account statement:", error);
      res.status(500).json({ error: "Error al obtener estado de cuenta" });
    }
  });

  // ─── END ACCOUNT STATEMENTS ─────────────────────────────────────────────────

  // Accounts Receivable endpoints (facturas por cobrar)
  app.get("/api/accounts-receivable", isAuthenticated, async (req, res) => {
    try {
      const { customerId, status } = req.query;
      const tenantId = getEffectiveTenantId(req);
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant not found" });
      }
      
      let receivables;
      if (customerId) {
        // Fetch with customer data joined
        receivables = await db.query.invoices.findMany({
          where: and(
            eq(invoices.tenantId, tenantId),
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
          where: and(
            eq(invoices.tenantId, tenantId),
            status ? eq(invoices.status, status as string) : undefined
          ),
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
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertInvoiceSchema.parse(req.body);
      
      // Set default values for new receivable
      const invoiceData = {
        ...validated,
        status: validated.status || "pending_payment",
        balanceDue: validated.balanceDue || validated.total, // Initialize balance to total
      };
      
      const invoice = await scopedStorage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating account receivable:", error);
      res.status(400).json({ error: "Error creating account receivable" });
    }
  });

  app.patch("/api/accounts-receivable/:id", isAuthenticated, hasRole(UserRole.ADMIN, UserRole.FACTURACION, UserRole.CREDITO_COBRANZA), async (req, res) => {
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

  // Payments endpoints
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant not found" });
      }
      
      // Fetch payments with customer and invoice relations
      // Only show payments with amount > 0
      const allPayments = await db.query.payments.findMany({
        where: and(
          eq(payments.tenantId, tenantId),
          gt(payments.amount, "0")
        ),
        with: {
          customer: true,
          invoice: true,
        },
        orderBy: (payments, { desc }) => [desc(payments.paymentDate)],
      });
      
      res.json(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Error fetching payments" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const validated = insertPaymentSchema.parse({
        ...req.body,
        registeredBy: req.user!.id,
        paymentDate: new Date(req.body.paymentDate),
      });

      // Get the invoice to update balance
      const invoice = await scopedStorage.getInvoice(validated.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      // Create the payment
      const payment = await scopedStorage.createPayment(validated);

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
      await scopedStorage.updateInvoice(invoice.id, {
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
    
    // For local storage, serve files directly from filesystem
    if (useLocalStorage()) {
      try {
        // Local files are stored with pattern: photos/local-xxx.ext
        // The objectPath could be the entityId like "local-1234-abc.png"
        let filePath = objectPath;
        
        // If it doesn't include a directory prefix, assume it's a photo
        if (!filePath.includes('/')) {
          filePath = `photos/${objectPath}`;
        }
        
        // Try with common extensions if no extension provided
        const extensions = ['', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
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
    
    // For GCS storage
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
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }
      if (checkin.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // For local storage, return a special response indicating direct upload
      if (useLocalStorage()) {
        const entityId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Create pending upload entry
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const validatedUpload = insertPendingUploadSchema.parse({
          entityId,
          userId,
          checkinId,
          used: false,
          expiresAt,
        });
        await db.insert(pendingUploads).values(validatedUpload);
        
        // Return uploadURL pointing to our direct upload endpoint
        return res.json({ 
          uploadURL: `/api/objects/upload-direct/${entityId}`,
          entityId,
          useDirectUpload: true
        });
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
  
  // Direct upload endpoint for local storage
  app.put("/api/objects/upload-direct/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityId } = req.params;
      const userId = req.user!.id;
      
      // Verify pending upload exists
      const pendingUpload = await db.query.pendingUploads.findFirst({
        where: and(
          eq(pendingUploads.entityId, entityId),
          eq(pendingUploads.userId, userId),
          eq(pendingUploads.used, false)
        ),
      });
      
      if (!pendingUpload) {
        return res.status(404).json({ error: "Upload not found or expired" });
      }
      
      // Get the raw body as buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      if (buffer.length === 0) {
        return res.status(400).json({ error: "No file data received" });
      }
      
      // Determine content type
      const contentType = req.headers['content-type'] || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
      const filename = `${entityId}.${ext}`;
      
      // Save to local storage
      const storagePath = await localStorageService.uploadPhotoToStorage(buffer, filename, contentType);
      
      console.log(`✅ Photo uploaded to local storage: ${storagePath}`);
      res.status(200).json({ success: true, path: storagePath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Error uploading file" });
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

          if (currentPhotos.length >= 20) {
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
          return res.status(409).json({ error: "Maximum 20 photos per check-in" });
        }
        throw txError;
      }

      // Set ACL (after issuance marked, before photos update)
      // Skip ACL for local storage - files are already saved with proper permissions
      if (!useLocalStorage()) {
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

  // Delete a photo from a check-in
  app.delete("/api/checkin-photos", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        checkinId: z.string().uuid(),
        entityId: z.string().refine(
          (val) => !val.includes("..") && !val.includes("\\"),
          { message: "Invalid entityId" }
        ),
      });
      const { checkinId, entityId } = schema.parse(req.body);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.isSuperAdmin;

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

      // Remove from DB first
      const updatedPhotos = currentPhotos.filter((p) => p !== entityId);
      await db.update(checkins).set({ photos: updatedPhotos }).where(eq(checkins.id, checkinId));

      // Delete from storage (best-effort — don't fail the request if storage delete fails)
      try {
        if (useLocalStorage()) {
          const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ""];
          for (const ext of extensions) {
            try {
              await localStorageService.deleteFile(`photos/${entityId}${ext}`);
            } catch {
              // ignore individual extension misses
            }
          }
        } else {
          const objectStorageService = new ObjectStorageService();
          try {
            const objectFile = await objectStorageService.getObjectEntityFile(entityId);
            await objectFile.delete();
          } catch {
            // Object may not exist in GCS — ignore
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

  // Get planned email recipients for a check-in checkout (preview before sending)
  app.get("/api/checkins/:id/email-recipients", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    try {
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) return res.status(404).json({ error: "Check-in not found" });

      const customer = await scopedStorage.getCustomer(checkin.customerId);
      const user = await storage.getUser(checkin.userId);

      const recipients: { email: string; label: string }[] = [];

      if (user?.email) recipients.push({ email: user.email, label: `Vendedor — ${user.fullName}` });
      for (const email of parseEmailList(customer?.email)) {
        recipients.push({ email, label: `Cliente — ${customer!.name}` });
      }

      const admins = await db.query.users.findMany({ where: eq(users.role, UserRole.ADMIN) });
      for (const admin of admins) {
        if (admin.email && !recipients.find(r => r.email === admin.email)) {
          recipients.push({ email: admin.email, label: `Admin — ${admin.fullName}` });
        }
      }

      res.json({ recipients });
    } catch (error) {
      console.error("Error fetching email recipients:", error);
      res.status(500).json({ error: "Error fetching recipients" });
    }
  });

  app.post("/api/checkins/:id/checkout", isAuthenticated, async (req, res) => {
    const { id: checkinId } = req.params;
    const userId = req.user!.id;

    try {
      // Parse optional checkoutNotes, internalNotes, and recipients from body
      // `recipients` is the full list of emails to send to (overrides auto-detection when provided)
      const schema = z.object({
        checkoutNotes: z.string().optional(),
        internalNotes: z.string().optional(),
        recipients: z.array(z.string()).optional(),
      });
      const parsed = schema.parse(req.body);
      const { checkoutNotes, internalNotes } = parsed;
      // Sanitize recipients: split any multi-email strings and keep only valid ones
      const overrideRecipients = parsed.recipients
        ? parsed.recipients.flatMap((r) => parseEmailList(r)).filter((e, i, arr) => arr.indexOf(e) === i)
        : undefined;

      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
      if (!checkin) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      // Verify authorization: user must own the check-in, or be ADMIN / VENTAS_LOGISTICA
      const canCheckout =
        checkin.userId === userId ||
        req.user!.role === UserRole.ADMIN ||
        req.user!.role === UserRole.VENTAS_LOGISTICA;
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
      // If no customer, create a minimal placeholder for PDF generation
      const effectiveCustomer = customer ?? {
        id: "", name: "Sin cliente", rfc: null, contactName: null, phone: null,
        address: null, city: null, state: null, email: null, tenantId: checkin.tenantId,
        microsipCode: null, microsipId: null, creditLimit: null, creditBalance: null,
        paymentTerms: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
        secondaryPhone: null, website: null, notes: null, country: null, zipCode: null,
        salesRepId: null,
      } as any;

      const user = await storage.getUser(checkin.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get tenant branding for PDF
      const tenant = checkin.tenantId 
        ? await db.query.tenants.findFirst({ where: eq(tenants.id, checkin.tenantId) })
        : null;

      console.log(`Generating and uploading PDF for check-in ${checkinId}...`);
      const { generateMinutePDFStream } = await import("./pdf-generator");
      const pdfStream = await generateMinutePDFStream({ 
        checkin, 
        customer: effectiveCustomer, 
        user, 
        checkoutNotes,
        tenant,
      });

      let pdfPath: string;
      if (useLocalStorage()) {
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
        checkoutAt: new Date(),
        checkoutNotes,
        internalNotes,
        minutePdfPath: pdfPath,
      });

      // Send email notifications with PDF attachment
      try {
        console.log(`Sending email notifications...`);
        let recipients: string[];

        if (overrideRecipients && overrideRecipients.length > 0) {
          // Use the list provided by the user (full override — they confirmed who gets it)
          recipients = overrideRecipients;
        } else {
          // Auto-build the recipient list: salesperson + customer + admins
          recipients = [];
          if (user.email) recipients.push(user.email);
          for (const email of parseEmailList(effectiveCustomer.email)) {
            if (!recipients.includes(email)) recipients.push(email);
          }
          const adminWhere = checkin.tenantId
            ? and(eq(users.role, UserRole.ADMIN), eq(users.tenantId, checkin.tenantId))
            : eq(users.role, UserRole.ADMIN);
          const admins = await db.query.users.findMany({ where: adminWhere });
          admins.forEach(admin => {
            if (admin.email && !recipients.includes(admin.email)) recipients.push(admin.email);
          });
        }
        
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
      const scopedStorage = createTenantScopedStorage(req);
      const checkin = await scopedStorage.getCheckin(checkinId);
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

      // Stream PDF from storage
      if (useLocalStorage()) {
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
          filename: `minuta-${checkinId}.pdf`,
        });
      }
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

      // Check if expired — use end of validUntil day in UTC to avoid server-timezone issues
      if (quotation.validUntil) {
        const expiry = new Date(quotation.validUntil);
        expiry.setUTCHours(23, 59, 59, 999);
        if (expiry < new Date()) {
          return res.json({
            ...quotation,
            alreadyProcessed: true,
            decision: "expired",
          });
        }
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

      // Check if expired — use end of validUntil day in UTC to avoid server-timezone issues
      if (quotation.validUntil) {
        const expiry = new Date(quotation.validUntil);
        expiry.setUTCHours(23, 59, 59, 999);
        if (expiry < new Date()) {
          return res.status(400).json({ error: "Esta cotización ha expirado" });
        }
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

      if (useLocalStorage()) {
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
          filename: `cotizacion-${quotation.folio}.pdf`,
        });
      }
    } catch (error) {
      console.error("Error downloading quotation PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al descargar el PDF" });
      }
    }
  });

  // ========== INCIDENTS MODULE ==========

  // Helper function to generate ticket number (scoped by tenant)
  async function generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    // Generate ticket numbers scoped by tenant and year for proper isolation
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM ${incidents} 
      WHERE tenant_id = ${tenantId} 
      AND EXTRACT(YEAR FROM created_at) = ${year}
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
      
      const scopedStorage = createTenantScopedStorage(req);
      let allIncidents = await scopedStorage.getAllIncidents();

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
      const tenantId = req.user!.tenantId;

      const incident = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
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
      const userTenantId = user.tenantId;
      const customerId = req.body.customerId;
      
      if (!customerId) {
        return res.status(400).json({ error: "Se requiere un cliente para crear el incidente" });
      }
      
      // Verify customer exists and belongs to user's tenant (or get tenant from customer for superadmin)
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });
      
      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      
      // Validate tenant isolation
      let tenantId: string;
      if (userTenantId) {
        // Regular tenant user - customer must belong to their tenant
        if (customer.tenantId !== userTenantId) {
          return res.status(403).json({ error: "No tiene permiso para crear incidentes para este cliente" });
        }
        tenantId = userTenantId;
      } else if (user.isSuperAdmin) {
        // SuperAdmin - use customer's tenant
        tenantId = customer.tenantId;
      } else {
        return res.status(400).json({ error: "No se pudo determinar el tenant para el incidente" });
      }
      
      const ticketNumber = await generateTicketNumber(tenantId);
      const accessToken = randomBytes(32).toString('hex');
      const accessTokenExpires = null; // no expiry

      const validated = insertIncidentSchema.parse({
        ...req.body,
        createdBy: user.id,
      });

      const [newIncident] = await db.insert(incidents).values({
        ...validated,
        tenantId,
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
      const tenantId = user.tenantId;
      const updates = req.body;

      const existing = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
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

  // Resend shipping approval notification to admins
  app.post("/api/quotations/:id/resend-shipping-notification", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { id } = req.params;
      const quotation = await db.query.quotations.findFirst({
        where: eq(quotations.id, id),
        with: { customer: true, user: true },
      });
      if (!quotation) return res.status(404).json({ error: "Cotización no encontrada" });
      if (!quotation.shippingHandledByJoper) return res.status(400).json({ error: "Esta cotización no tiene envío por Joper" });

      const apiKey = process.env.MAILERSEND_API_KEY;
      if (!apiKey) return res.status(503).json({ error: "MAILERSEND_API_KEY no configurado en el servidor" });

      const tenantId = quotation.tenantId;
      const adminUsers = await db.query.users.findMany({
        where: and(eq(users.tenantId, tenantId), eq(users.role, UserRole.ADMIN)),
      });
      console.log(`[ResendShippingEmail] Admins found (${adminUsers.length}):`, adminUsers.map(u => `${u.fullName} <${u.email}>`));

      const adminEmails = adminUsers
        .filter((u) => u.email && u.email.includes("@"))
        .map((u) => ({ email: u.email!, name: u.fullName || u.username }));

      if (adminEmails.length === 0) {
        return res.status(400).json({ error: "No se encontraron usuarios administradores con correo en este tenant" });
      }

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "https";
      const quotationUrl = `${protocol}://${host}/quotations`;

      const items = await db.query.quotationItems.findMany({
        where: eq(quotationItems.quotationId, id),
      });

      // Generate / regenerate shipping approval token for one-click approve/reject
      const crypto = await import("crypto");
      const shippingToken = crypto.randomBytes(32).toString("hex");
      await db.update(quotations)
        .set({ shippingApprovalToken: shippingToken })
        .where(eq(quotations.id, id));
      const approveUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;
      const rejectUrl = `${protocol}://${host}/autorizar-envio/${shippingToken}`;

      const { sendShippingApprovalRequestEmail } = await import("./quotation-email-service");
      await sendShippingApprovalRequestEmail({
        adminEmails,
        quotationData: {
          folio: quotation.folio,
          customerName: quotation.customer?.name || quotation.customerId,
          vendedorName: quotation.user?.fullName || quotation.userId,
          total: parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 }),
          currency: quotation.currency || "MXN",
          itemsCount: items.length,
          shippingMethod: (quotation as any).shippingMethod || "truck",
        },
        quotationUrl,
        tenantName: tenant?.name || "Nexxo",
        approveUrl,
        rejectUrl,
      });

      console.log(`[ResendShippingEmail] Sent to: ${adminEmails.map(a => a.email).join(", ")}`);
      res.json({ success: true, sentTo: adminEmails.map(a => a.email) });
    } catch (error: any) {
      console.error("[ResendShippingEmail] Error:", error.message || error);
      res.status(500).json({ error: error.message || "Error al reenviar la notificación" });
    }
  });

  // Renew access token for incident (resets expiry)
  app.post("/api/incidents/:id/renew-token", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const tenantId = user.tenantId;

      const existing = await db.query.incidents.findFirst({
        where: tenantId
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
      });

      if (!existing) return res.status(404).json({ error: "Incidente no encontrado" });

      const newToken = randomBytes(32).toString('hex');
      const [updated] = await db.update(incidents)
        .set({ accessToken: newToken, accessTokenExpires: null })
        .where(eq(incidents.id, id))
        .returning();

      res.json({ accessToken: updated.accessToken });
    } catch (error) {
      console.error("Error renewing incident token:", error);
      res.status(500).json({ error: "Error al renovar el enlace" });
    }
  });

  // Add comment to incident
  app.post("/api/incidents/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const tenantId = user.tenantId;

      const incident = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
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
      const tenantId = req.user!.tenantId;

      // First verify incident belongs to tenant
      const incident = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

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
      const tenantId = req.user!.tenantId;

      // First verify incident belongs to tenant
      const incident = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, id), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, id),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

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

  // Download incident attachment (admin - authenticated)
  app.get("/api/incidents/:incidentId/attachments/:attachmentId/download", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, attachmentId } = req.params;
      const tenantId = req.user!.tenantId;

      const incident = await db.query.incidents.findFirst({
        where: tenantId 
          ? and(eq(incidents.id, incidentId), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, incidentId),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      const attachment = await db.query.incidentAttachments.findFirst({
        where: and(
          eq(incidentAttachments.id, attachmentId),
          eq(incidentAttachments.incidentId, incidentId)
        ),
      });

      if (!attachment) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }

      const encodedFilename = encodeURIComponent(attachment.originalName);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
      res.setHeader('Content-Type', attachment.mimeType);

      if (useLocalStorage()) {
        const tryPaths = [
          `incidents/${attachment.storagePath}`,
          attachment.storagePath,
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

  // ─── Authenticated incident attachment upload ─────────────────────────────

  // Step 1: get upload URL (authenticated)
  app.post("/api/incidents/:incidentId/attachments/upload-url", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { filename, mimeType } = req.body;
      const tenantId = req.user!.tenantId;

      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
      }

      const incident = await db.query.incidents.findFirst({
        where: tenantId
          ? and(eq(incidents.id, incidentId), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, incidentId),
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });

      if (useLocalStorage()) {
        const ext = filename.split('.').pop() || 'bin';
        const entityId = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadURL = `${baseUrl}/api/incidents/upload-direct-auth`;
        return res.json({ uploadURL, entityId, incidentId, useDirectUpload: true });
      }

      const objectStorage = new ObjectStorageService();
      const { uploadURL, entityId } = await objectStorage.getObjectEntityUploadURL();
      res.json({ uploadURL, entityId, incidentId });
    } catch (error) {
      console.error("Error getting authenticated upload URL:", error);
      res.status(500).json({ error: "Error al obtener URL de subida" });
    }
  });

  // Step 1b: direct upload for local storage (authenticated)
  app.post("/api/incidents/upload-direct-auth", isAuthenticated, async (req, res) => {
    try {
      const entityId = req.headers['x-entity-id'] as string;
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      if (!entityId) return res.status(400).json({ error: "Se requiere X-Entity-Id header" });

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
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

  // Step 2: confirm upload and save to DB (authenticated)
  app.post("/api/incidents/:incidentId/attachments/confirm", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { entityId, filename, originalName, mimeType, size } = req.body;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      if (!entityId || !filename || !originalName || !mimeType || !size) {
        return res.status(400).json({ error: "Faltan datos del archivo" });
      }

      const incident = await db.query.incidents.findFirst({
        where: tenantId
          ? and(eq(incidents.id, incidentId), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, incidentId),
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });

      if (useLocalStorage()) {
        const fileBuffer = await localStorageService.getFile(`incidents/${entityId}`);
        if (!fileBuffer) return res.status(400).json({ error: "El archivo no se encontró en el almacenamiento" });
      } else {
        const objectStorage = new ObjectStorageService();
        try { await objectStorage.getObjectEntityFile(entityId); } catch {
          return res.status(400).json({ error: "El archivo no se encontró en el almacenamiento" });
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
        isFromCustomer: false,
      }).returning();

      await logIncidentActivity(
        incident.id, 'attachment_added', userId, undefined, undefined,
        `Archivo adjuntado: ${originalName}`, false
      );

      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error confirming attachment:", error);
      res.status(500).json({ error: "Error al guardar el archivo" });
    }
  });

  // Delete incident attachment (authenticated)
  app.delete("/api/incidents/:incidentId/attachments/:attachmentId", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, attachmentId } = req.params;
      const tenantId = req.user!.tenantId;

      const incident = await db.query.incidents.findFirst({
        where: tenantId
          ? and(eq(incidents.id, incidentId), eq(incidents.tenantId, tenantId))
          : eq(incidents.id, incidentId),
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });

      const attachment = await db.query.incidentAttachments.findFirst({
        where: and(eq(incidentAttachments.id, attachmentId), eq(incidentAttachments.incidentId, incidentId)),
      });
      if (!attachment) return res.status(404).json({ error: "Archivo no encontrado" });

      await db.delete(incidentAttachments).where(eq(incidentAttachments.id, attachmentId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "Error al eliminar el archivo" });
    }
  });

  // ========== PUBLIC INCIDENTS (Customer Portal) ==========

  // Search customers for public portal (minimal info for security)
  app.get("/api/public/customers/search", async (req, res) => {
    try {
      const { q, tenant } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 3) {
        return res.status(400).json({ error: "La búsqueda debe tener al menos 3 caracteres" });
      }

      const normalize = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const searchTerm = normalize(q.trim());

      // Resolve tenant context for this public endpoint
      const tenantId = req.tenant?.id;

      const allCustomers = await db.query.customers.findMany({
        columns: {
          id: true,
          name: true,
          rfc: true,
          microsipCode: true,
          city: true,
        },
        where: tenantId ? eq(customers.tenantId, tenantId) : undefined,
      });

      // Search by name, RFC, and microsip code (use for matching, return only safe fields)
      const filtered = allCustomers.filter(c =>
        normalize(c.name || "").includes(searchTerm) ||
        normalize(c.rfc || "").includes(searchTerm) ||
        normalize(c.microsipCode || "").includes(searchTerm)
      ).slice(0, 15).map(c => ({
        id: c.id,
        name: c.name,
        rfc: c.rfc,
        city: c.city,
      }));

      res.json(filtered);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ error: "Error al buscar clientes" });
    }
  });

  // Create incident from public portal (no auth required)
  app.post("/api/public/incidents", async (req, res) => {
    try {
      const { customerId, type, urgency, subject, description, contactName, contactEmail, contactPhone, warrantySerialNumber, attachments } = req.body;

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

      // Verify customer exists (public route - use direct query)
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });
      if (!customer) {
        return res.status(404).json({ error: "Empresa no encontrada" });
      }

      // Get tenantId from customer for proper isolation
      const tenantId = customer.tenantId;

      // Generate ticket number and access token
      const ticketNumber = await generateTicketNumber(tenantId);
      const accessToken = randomBytes(32).toString('hex');
      const accessTokenExpires = null; // no expiry

      // Create the incident
      const [newIncident] = await db.insert(incidents).values({
        customerId,
        tenantId,
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

      // Save attachments if any were uploaded
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const allowedMimeTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/quicktime',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const maxFileSize = 50 * 1024 * 1024; // 50MB

        for (const att of attachments) {
          if (att.entityId && att.filename && att.originalName && att.mimeType && att.size) {
            // Validate MIME type
            if (!allowedMimeTypes.includes(att.mimeType)) {
              console.warn("Invalid MIME type skipped:", att.mimeType);
              continue;
            }
            // Validate file size
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
                isFromCustomer: true,
              });
            } catch (error) {
              console.error("Error saving attachment:", att.entityId, error);
            }
          }
        }
      }

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

  // Helper: build warranty PDF data from incident + optional overrides
  async function buildWarrantyData(incidentId: string, tenantId: string | null, overrides: Record<string, any> = {}) {
    const incident = await db.query.incidents.findFirst({
      where: tenantId
        ? and(eq(incidents.id, incidentId), eq(incidents.tenantId, tenantId))
        : eq(incidents.id, incidentId),
      with: { customer: true, assignee: true, product: true, order: true, invoice: true },
    });
    if (!incident) return null;
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, incident.tenantId) });
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
        customerName: incident.customer?.name || "—",
        customerAddress: incident.customer?.address,
        customerCity: [incident.customer?.city, incident.customer?.state].filter(Boolean).join(", ") || null,
        contactName: overrides.contactName ?? incident.contactName,
        contactEmail: overrides.contactEmail ?? incident.contactEmail,
        contactPhone: overrides.contactPhone ?? incident.contactPhone,
        productName: overrides.productName ?? incident.product?.name ?? null,
        productSku: overrides.productSku ?? incident.product?.sku ?? null,
        warrantySerialNumber: overrides.warrantySerialNumber ?? incident.warrantySerialNumber,
        referenceNumber: overrides.referenceNumber ?? incident.referenceNumber,
        orderFolio: incident.order?.folio ?? null,
        invoiceFolio: (incident.invoice as any)?.folio ?? null,
        assigneeName: incident.assignee?.fullName ?? null,
        assignedArea: incident.assignedArea,
        resolution: overrides.resolution ?? incident.resolution,
        observations: overrides.observations ?? null,
        tenant: tenant ?? null,
      },
    };
  }

  // Download incident Warranty Sheet PDF (authenticated, POST with overrides)
  app.post("/api/incidents/:id/warranty-pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = (req.user as any)?.tenantId ?? null;
      const result = await buildWarrantyData(id, tenantId, req.body || {});
      if (!result) return res.status(404).json({ error: "Incidente no encontrado" });

      const { generateIncidentWarrantyPDF } = await import("./incident-warranty-pdf-generator");
      const stream = await generateIncidentWarrantyPDF(result.pdfData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Garantia-${result.incident.ticketNumber}.pdf"`);
      stream.pipe(res);
    } catch (error: any) {
      console.error("Error generating warranty PDF:", error);
      res.status(500).json({ error: error.message || "Error al generar la hoja de garantía" });
    }
  });

  // Send incident Warranty Sheet by email (authenticated)
  app.post("/api/incidents/:id/send-warranty-email", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = (req.user as any)?.tenantId ?? null;
      const { toEmail, toName, ccAdmins = true, overrides = {} } = req.body || {};

      if (!toEmail) return res.status(400).json({ error: "Se requiere correo del destinatario" });

      const result = await buildWarrantyData(id, tenantId, overrides);
      if (!result) return res.status(404).json({ error: "Incidente no encontrado" });

      // Generate PDF as buffer
      const { generateIncidentWarrantyPDF } = await import("./incident-warranty-pdf-generator");
      const stream = await generateIncidentWarrantyPDF(result.pdfData);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", resolve);
        stream.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);

      // Find admin CC emails
      let ccEmails: { email: string; name: string }[] = [];
      if (ccAdmins && tenantId) {
        const admins = await db.query.users.findMany({
          where: and(eq(users.tenantId, tenantId), eq(users.role, UserRole.ADMIN)),
        });
        ccEmails = admins
          .filter(u => u.email && u.email.includes("@") && u.email !== toEmail)
          .map(u => ({ email: u.email!, name: u.fullName || u.username }));
      }

      const { sendWarrantySheetEmail } = await import("./quotation-email-service");
      await sendWarrantySheetEmail({
        toEmail,
        toName: toName || result.incident.customer?.name || "Cliente",
        ccEmails,
        ticketNumber: result.incident.ticketNumber,
        customerName: result.incident.customer?.name || "—",
        subject: overrides.subject || result.incident.subject,
        tenantName: result.tenant?.name || "Nexxo",
        pdfBuffer,
      });

      res.json({ success: true, sentTo: toEmail, cc: ccEmails.map(c => c.email) });
    } catch (error: any) {
      console.error("Error sending warranty email:", error);
      res.status(500).json({ error: error.message || "Error al enviar el correo de garantía" });
    }
  });

  // Download incident as PDF (public)
  app.get("/api/public/incidents/:token/pdf", async (req, res) => {
    try {
      const { token } = req.params;
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
        with: {
          customer: true,
          assignee: true,
          comments: {
            where: eq(incidentComments.visibility, CommentVisibility.CUSTOMER),
            with: { user: true },
            orderBy: (c, { asc }) => [asc(c.createdAt)],
          },
        },
      });
      if (!incident) return res.status(404).json({ error: "Incidente no encontrado" });
      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, incident.tenantId) });

      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Incidente-${incident.ticketNumber}.pdf"`);
      doc.pipe(res);

      const primaryColor = tenant?.primaryColor || "#1a365d";
      const lighten = (hex: string, amt: number) => {
        const c = hex.replace("#", "");
        const r = Math.min(255, parseInt(c.substring(0,2),16) + Math.round((255-parseInt(c.substring(0,2),16))*amt));
        const g = Math.min(255, parseInt(c.substring(2,4),16) + Math.round((255-parseInt(c.substring(2,4),16))*amt));
        const b = Math.min(255, parseInt(c.substring(4,6),16) + Math.round((255-parseInt(c.substring(4,6),16))*amt));
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
      };
      const lightColor = lighten(primaryColor, 0.92);
      const mediumColor = lighten(primaryColor, 0.75);
      const PAGE_W = 612; const MARGIN = 40; const CONTENT_W = PAGE_W - MARGIN * 2;

      // Header
      doc.rect(0, 0, PAGE_W, 90).fill(primaryColor);
      doc.fontSize(18).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(tenant?.legalName || tenant?.name || "Empresa", MARGIN, 18, { width: CONTENT_W });
      doc.fontSize(10).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
      doc.text("REPORTE DE INCIDENTE / TICKET DE SERVICIO", MARGIN, 44, { width: CONTENT_W });
      if (tenant?.rfc) doc.text(`RFC: ${tenant.rfc}`, MARGIN, 58, { width: CONTENT_W });

      // Title band
      doc.rect(0, 90, PAGE_W, 28).fill(mediumColor);
      doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text(incident.ticketNumber, MARGIN, 97, { width: CONTENT_W * 0.5 });
      doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
      const statusMap: Record<string, string> = { nuevo:"Nuevo", asignado:"Asignado", en_proceso:"En Proceso", esperando_cliente:"Esperando Cliente", esperando_interno:"En Revisión", resuelto:"Resuelto", cerrado:"Cerrado", cancelado:"Cancelado" };
      doc.text(`Estado: ${statusMap[incident.status] || incident.status}`, MARGIN + CONTENT_W * 0.5, 100, { width: CONTENT_W * 0.5, align: "right" });

      let Y = 130;

      // Info grid
      const infoItems: [string, string][] = [
        ["Cliente", incident.customer?.name || "—"],
        ["Tipo", { garantia:"Garantía", retrabajo:"Retrabajo", queja:"Queja", consulta:"Consulta", administrativo:"Administrativo" }[incident.type] || incident.type],
        ["Urgencia", { baja:"Baja", media:"Media", alta:"Alta", critica:"Crítica" }[incident.urgency] || incident.urgency],
        ["Asignado a", incident.assignee?.fullName || "Sin asignar"],
        ["Fecha creación", new Date(incident.createdAt).toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric" })],
        ["Asunto", incident.subject],
      ];
      const COL_W = CONTENT_W / 2 - 6;
      infoItems.forEach((pair, i) => {
        const col = i % 2; const row = Math.floor(i / 2);
        const bx = MARGIN + col * (COL_W + 12); const by = Y + row * 38;
        doc.rect(bx, by, COL_W, 34).fill(lightColor);
        doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
        doc.text(pair[0].toUpperCase(), bx + 6, by + 5, { width: COL_W - 12 });
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827");
        doc.text(pair[1], bx + 6, by + 16, { width: COL_W - 12, lineBreak: false, ellipsis: true });
      });
      Y += Math.ceil(infoItems.length / 2) * 38 + 16;

      // Description
      doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("DESCRIPCIÓN", MARGIN + 6, Y + 3);
      Y += 14;
      const descH = Math.max(40, doc.heightOfString(incident.description, { width: CONTENT_W - 12 }) + 16);
      doc.rect(MARGIN, Y, CONTENT_W, descH).fill(lightColor);
      doc.fontSize(9).font("Helvetica").fillColor("#374151");
      doc.text(incident.description, MARGIN + 6, Y + 8, { width: CONTENT_W - 12 });
      Y += descH + 14;

      // Resolution if present
      if (incident.resolution) {
        doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("RESOLUCIÓN", MARGIN + 6, Y + 3);
        Y += 14;
        const resH = Math.max(40, doc.heightOfString(incident.resolution, { width: CONTENT_W - 12 }) + 16);
        doc.rect(MARGIN, Y, CONTENT_W, resH).fill(lightColor);
        doc.fontSize(9).font("Helvetica").fillColor("#374151");
        doc.text(incident.resolution, MARGIN + 6, Y + 8, { width: CONTENT_W - 12 });
        Y += resH + 14;
      }

      // Comments
      if (incident.comments && incident.comments.length > 0) {
        doc.rect(MARGIN, Y, CONTENT_W, 14).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("CONVERSACIÓN", MARGIN + 6, Y + 3);
        Y += 14;
        for (const comment of incident.comments) {
          const who = comment.isFromCustomer ? "Cliente" : (comment.user?.fullName || "Soporte");
          const when = new Date(comment.createdAt).toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
          const cH = Math.max(32, doc.heightOfString(comment.content, { width: CONTENT_W - 24 }) + 20);
          if (Y + cH > 720) { doc.addPage({ size:"LETTER", margin:0 }); Y = 40; }
          doc.rect(MARGIN, Y, CONTENT_W, cH).fill(comment.isFromCustomer ? lighten(primaryColor, 0.85) : lightColor);
          doc.fontSize(7).font("Helvetica-Bold").fillColor("#374151");
          doc.text(`${who}  ·  ${when}`, MARGIN + 8, Y + 6, { width: CONTENT_W - 16 });
          doc.fontSize(8.5).font("Helvetica").fillColor("#111827");
          doc.text(comment.content, MARGIN + 8, Y + 17, { width: CONTENT_W - 16 });
          Y += cH + 4;
        }
        Y += 10;
      }

      // Footer
      if (Y > 720) { doc.addPage({ size:"LETTER", margin:0 }); Y = 40; }
      doc.rect(0, 755, PAGE_W, 37).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
      const footerParts = [tenant?.rfc ? `RFC: ${tenant.rfc}` : null, tenant?.email, tenant?.phone].filter(Boolean) as string[];
      doc.text(footerParts.join("   |   "), MARGIN, 763, { width: CONTENT_W, align: "center" });
      doc.text(`Generado el ${new Date().toLocaleDateString("es-MX", { day:"2-digit", month:"long", year:"numeric" })}`, MARGIN, 775, { width: CONTENT_W, align: "center" });

      doc.end();
    } catch (error) {
      console.error("Error generating incident PDF:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error al generar el PDF" });
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
      const { content, attachments } = req.body;

      // Allow empty content if there are attachments
      const hasContent = content && typeof content === 'string' && content.trim().length > 0;
      const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;

      if (!hasContent && !hasAttachments) {
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
        content: hasContent ? content.trim() : "[Evidencia adjunta]",
        visibility: CommentVisibility.CUSTOMER,
        isFromCustomer: true,
      }).returning();

      // Save attachments if provided
      if (hasAttachments) {
        const allowedMimeTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/quicktime',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const maxFileSize = 50 * 1024 * 1024; // 50MB
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
                isFromCustomer: true,
              });
            } catch (error) {
              console.error("Error saving comment attachment:", att.entityId, error);
            }
          }
        }
      }

      await logIncidentActivity(
        incident.id,
        'customer_comment',
        null,
        undefined,
        undefined,
        hasAttachments ? 'Comentario con evidencia agregado por el cliente' : 'Comentario agregado por el cliente',
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

  // Get upload URL for incident attachment (public - with token)
  app.post("/api/public/incidents/:token/attachments/upload-url", async (req, res) => {
    try {
      const { token } = req.params;
      const { filename, mimeType } = req.body;

      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
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

      // Use local storage for production
      if (useLocalStorage()) {
        const ext = filename.split('.').pop() || 'bin';
        const entityId = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadURL = `${baseUrl}/api/public/incidents/upload-direct`;
        
        res.json({ uploadURL, entityId, incidentId: incident.id, useDirectUpload: true });
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

  // Confirm attachment upload (public - with token)
  app.post("/api/public/incidents/:token/attachments", async (req, res) => {
    try {
      const { token } = req.params;
      const { entityId, filename, originalName, mimeType, size } = req.body;

      if (!entityId || !filename || !originalName || !mimeType || !size) {
        return res.status(400).json({ error: "Faltan datos del archivo" });
      }

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      // Verify file exists in storage
      if (useLocalStorage()) {
        const fileBuffer = await localStorageService.getFile(`incidents/${entityId}`);
        if (!fileBuffer) {
          return res.status(400).json({ error: "El archivo no se encontró en el almacenamiento" });
        }
      } else {
        const objectStorage = new ObjectStorageService();
        try {
          await objectStorage.getObjectEntityFile(entityId);
        } catch (error) {
          return res.status(400).json({ error: "El archivo no se encontró en el almacenamiento" });
        }
      }

      const [attachment] = await db.insert(incidentAttachments).values({
        incidentId: incident.id,
        filename,
        originalName,
        mimeType,
        size,
        storagePath: entityId,
        isFromCustomer: true,
      }).returning();

      await logIncidentActivity(
        incident.id,
        'attachment_added',
        null,
        undefined,
        undefined,
        `Cliente adjuntó archivo: ${originalName}`,
        true
      );

      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error saving attachment:", error);
      res.status(500).json({ error: "Error al guardar el archivo" });
    }
  });

  // Get upload URL for new incident (public - no token yet)
  app.post("/api/public/incidents/upload-url", async (req, res) => {
    try {
      const { filename, mimeType } = req.body;

      if (!filename || !mimeType) {
        return res.status(400).json({ error: "Se requiere nombre de archivo y tipo MIME" });
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Tipo de archivo no permitido" });
      }

      // Use local storage for production
      if (useLocalStorage()) {
        const ext = filename.split('.').pop() || 'bin';
        const entityId = `incident-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadURL = `${baseUrl}/api/public/incidents/upload-direct`;
        
        res.json({ uploadURL, entityId, useDirectUpload: true });
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

  // Direct upload endpoint for incident attachments (local storage)
  app.post("/api/public/incidents/upload-direct", async (req, res) => {
    try {
      const entityId = req.headers['x-entity-id'] as string;
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      
      if (!entityId) {
        return res.status(400).json({ error: "Se requiere X-Entity-Id header" });
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const storagePath = await localStorageService.uploadIncidentAttachment(buffer, entityId, contentType);
          console.log(`✅ Incident attachment uploaded to local storage: ${storagePath}`);
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

  // Download incident attachment (public - with token)
  app.get("/api/public/incidents/:token/attachments/:attachmentId", async (req, res) => {
    try {
      const { token, attachmentId } = req.params;

      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.accessToken, token),
      });

      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }

      if (incident.accessTokenExpires && new Date(incident.accessTokenExpires) < new Date()) {
        return res.status(403).json({ error: "El enlace ha expirado" });
      }

      const attachment = await db.query.incidentAttachments.findFirst({
        where: and(
          eq(incidentAttachments.id, attachmentId),
          eq(incidentAttachments.incidentId, incident.id)
        ),
      });

      if (!attachment) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }

      const encodedFilename = encodeURIComponent(attachment.originalName);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
      res.setHeader('Content-Type', attachment.mimeType);

      if (useLocalStorage()) {
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

  // ==================== MICROSIP INTEGRATION ENDPOINTS ====================

  // Get Microsip configuration for current tenant
  app.get("/api/microsip/config", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      
      const [config] = await db
        .select()
        .from(microsipConfigs)
        .where(eq(microsipConfigs.tenantId, tenantId));

      if (!config) {
        return res.json({ configured: false });
      }

      // Don't expose password in response
      const { password, ...safeConfig } = config;
      res.json({ configured: true, ...safeConfig, password: password ? "********" : null });
    } catch (error) {
      console.error("Error getting Microsip config:", error);
      res.status(500).json({ error: "Error al obtener configuración de Microsip" });
    }
  });

  // Create or update Microsip configuration
  app.post("/api/microsip/config", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      
      const validated = insertMicrosipConfigSchema.parse({
        ...req.body,
        tenantId,
      });

      // Check if config already exists
      const [existing] = await db
        .select()
        .from(microsipConfigs)
        .where(eq(microsipConfigs.tenantId, tenantId));

      if (existing) {
        // Update existing config
        const updateData: any = { ...validated, updatedAt: new Date() };
        // If password is masked, don't update it
        if (validated.password === "********") {
          delete updateData.password;
        }
        
        const [updated] = await db
          .update(microsipConfigs)
          .set(updateData)
          .where(eq(microsipConfigs.id, existing.id))
          .returning();

        const { password, ...safeConfig } = updated;
        res.json({ ...safeConfig, password: "********" });
      } else {
        // Create new config
        const [created] = await db
          .insert(microsipConfigs)
          .values(validated)
          .returning();

        const { password, ...safeConfig } = created;
        res.json({ ...safeConfig, password: "********" });
      }
    } catch (error) {
      console.error("Error saving Microsip config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al guardar configuración de Microsip" });
    }
  });

  // Test Microsip connection
  app.post("/api/microsip/test-connection", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.testConnection();
      
      res.json(result);
    } catch (error) {
      console.error("Error testing Microsip connection:", error);
      res.status(500).json({ success: false, message: `Error: ${(error as Error).message}` });
    }
  });

  // Execute read-only SQL query on Microsip (for debugging)
  const microsipQuerySchema = z.object({
    sql: z.string().min(1).max(2000).trim(),
  });
  
  app.post("/api/microsip/query", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      
      const validated = microsipQuerySchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ error: 'Consulta SQL inválida', details: validated.error.errors });
      }
      
      const { sql } = validated.data;
      
      console.log(`[Microsip Query] Tenant: ${tenantId}, Query: ${sql.substring(0, 100)}...`);
      
      const service = await createMicrosipSyncService(tenantId);
      const result = await service.executeReadOnlyQuery(sql);
      
      res.json(result);
    } catch (error) {
      console.error("Error executing Microsip query:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Trigger manual sync
  app.post("/api/microsip/sync", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { type } = req.body; // 'all', 'customers', 'products', 'categories', 'invoices', 'payments'

      const service = await createMicrosipSyncService(tenantId);

      // Respond immediately so the browser doesn't time out on large syncs
      // (e.g. 3000+ payments). The actual work runs in the background.
      res.json({ success: true, message: "Sincronización iniciada en segundo plano. Revisa el historial para ver el resultado." });

      // Fire-and-forget — errors are logged but not sent to client
      (async () => {
        try {
          switch (type) {
            case 'customers':   await service.syncCustomers();   break;
            case 'products':    await service.syncProducts();    break;
            case 'categories':  await service.syncCategories();  break;
            case 'invoices':    await service.syncInvoices();    break;
            case 'payments':    await service.syncPayments();    break;
            case 'all':
            default:            await service.syncAll();         break;
          }
        } catch (bgErr) {
          console.error("[Microsip] Background sync error:", (bgErr as Error).message);
        }
      })();
    } catch (error) {
      console.error("Error during Microsip sync:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get sync logs
  app.get("/api/microsip/logs", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      const logs = await db
        .select()
        .from(microsipSyncLogs)
        .where(eq(microsipSyncLogs.tenantId, tenantId))
        .orderBy(sql`${microsipSyncLogs.startedAt} DESC`)
        .limit(limit);
      
      res.json(logs);
    } catch (error) {
      console.error("Error getting Microsip logs:", error);
      res.status(500).json({ error: "Error al obtener logs de sincronización" });
    }
  });

  // Enable/disable sync
  app.patch("/api/microsip/toggle", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const { enabled } = req.body;
      
      const [updated] = await db
        .update(microsipConfigs)
        .set({ enabled: !!enabled, updatedAt: new Date() })
        .where(eq(microsipConfigs.tenantId, tenantId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Configuración no encontrada" });
      }

      const { password, ...safeConfig } = updated;
      res.json({ ...safeConfig, password: "********" });
    } catch (error) {
      console.error("Error toggling Microsip sync:", error);
      res.status(500).json({ error: "Error al cambiar estado de sincronización" });
    }
  });

  // Temporary diagnostic endpoint – inspect raw Firebird CXC rows for a customer
  app.get("/api/microsip/debug-cxc/:clienteId", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const clienteId = parseInt(req.params.clienteId);
      if (isNaN(clienteId)) return res.status(400).json({ error: "clienteId must be numeric" });

      const service = await createMicrosipSyncService(tenantId);
      const result = await service.debugCxcCustomer(clienteId);
      res.json(result);
    } catch (err) {
      console.error("[debug-cxc] error:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/microsip/debug-balance/:clienteId — detailed credit/debit breakdown per invoice
  // to compare against Microsip's "Auxiliar de clientes" and identify balance discrepancies.
  app.get("/api/microsip/debug-balance/:clienteId", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const tenantId = requireTenantId(req);
      const clienteId = parseInt(req.params.clienteId);
      if (isNaN(clienteId)) return res.status(400).json({ error: "clienteId must be numeric" });

      const service = await createMicrosipSyncService(tenantId);
      const result = await service.debugBalanceBreakdown(clienteId);
      res.json(result);
    } catch (err) {
      console.error("[debug-balance] error:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==================== END MICROSIP INTEGRATION ====================

  const httpServer = createServer(app);

  return httpServer;
}
