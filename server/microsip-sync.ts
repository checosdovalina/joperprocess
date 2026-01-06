import Firebird from 'node-firebird';
import { db } from './db';
import { 
  customers, 
  products, 
  productCategories, 
  invoices, 
  payments, 
  microsipConfigs,
  microsipSyncLogs,
  InvoiceStatus
} from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

interface FirebirdConnection {
  query: (query: string, params: any[], callback: (err: Error | null, result: any[]) => void) => void;
  detach: (callback?: (err: Error | null) => void) => void;
}

interface MicrosipCustomer {
  CLIENTE_ID: number;
  NOMBRE: string;
  ESTATUS: string;
  CONTACTO1?: string;
  LIMITE_CREDITO?: number;
  DIAS_CREDITO?: number; // From CONDICIONES_PAGO.DIAS_PPAG
  // From DIRS_CLIENTES join
  RFC?: string;
  CALLE?: string;
  NUM_EXTERIOR?: string;
  NUM_INTERIOR?: string;
  CODIGO_POSTAL?: string;
  COLONIA?: string;
  POBLACION?: string;
  TELEFONO1?: string;
  EMAIL?: string;
  CONTACTO?: string; // From DIRS_CLIENTES
}

interface MicrosipProduct {
  ARTICULO_ID: number;
  CLAVE?: string;
  NOMBRE: string;
  DESCRIPCION?: string;
  LINEA_ARTICULO_ID: number;
  UNIDAD_VENTA?: string;
  PRECIO_1?: number;
  COSTO_ULTIMA_COMPRA?: number;
  EXISTENCIA?: number;
  ESTATUS: string;
}

interface MicrosipCategory {
  LINEA_ARTICULO_ID: number;
  NOMBRE: string;
  DESCRIPCION?: string;
}

interface MicrosipInvoice {
  DOCTO_VE_ID: number;
  CLAVE: string;
  FOLIO: string;
  CLIENTE_ID: number;
  FECHA: Date;
  FECHA_VENCIMIENTO: Date;
  IMPORTE_NETO: number;
  IMPUESTO: number;
  TOTAL: number;
  SALDO: number;
  ESTATUS: string;
  UUID: string;
  FORMA_COBRO: string;
  CONDICION_PAGO: string;
}

interface MicrosipPayment {
  DOCTO_CO_ID: number;
  CLIENTE_ID: number;
  FECHA: Date;
  IMPORTE: number;
  REFERENCIA: string;
  DESCRIPCION: string;
  DOCTO_VE_ID: number;
}

class MicrosipSyncService {
  private tenantId: string;
  private config: typeof microsipConfigs.$inferSelect | null = null;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  private async loadConfig(requireEnabled: boolean = false): Promise<boolean> {
    const [configRow] = await db
      .select()
      .from(microsipConfigs)
      .where(eq(microsipConfigs.tenantId, this.tenantId));
    
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

  private getFirebirdOptions(): Firebird.Options {
    if (!this.config) throw new Error('Config not loaded');
    
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      lowercase_keys: false,
      role: undefined,
      pageSize: 4096,
    };
  }

  private connect(): Promise<FirebirdConnection> {
    return new Promise((resolve, reject) => {
      const options = this.getFirebirdOptions();
      
      // Add connection timeout of 15 seconds
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: No se pudo conectar a ${options.host}:${options.port} en 15 segundos. Verifique que el servidor sea accesible desde Internet.`));
      }, 15000);
      
      Firebird.attach(options, (err: Error | null, db: FirebirdConnection) => {
        clearTimeout(timeout);
        if (err) {
          console.error('[Microsip] Connection error:', err.message);
          reject(err);
        } else {
          console.log('[Microsip] Connected to Firebird database');
          resolve(db);
        }
      });
    });
  }

  private query<T>(db: FirebirdConnection, sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err: Error | null, result: T[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(result || []);
        }
      });
    });
  }

  private async logSync(
    syncType: string, 
    status: string, 
    stats: { processed?: number; created?: number; updated?: number; skipped?: number } = {},
    error?: { message?: string; details?: string }
  ): Promise<string> {
    const [log] = await db.insert(microsipSyncLogs).values({
      tenantId: this.tenantId,
      syncType,
      status,
      recordsProcessed: stats.processed || 0,
      recordsCreated: stats.created || 0,
      recordsUpdated: stats.updated || 0,
      recordsSkipped: stats.skipped || 0,
      errorMessage: error?.message,
      errorDetails: error?.details,
      completedAt: status !== 'started' ? new Date() : undefined,
    }).returning();
    
    return log.id;
  }

  private async updateLogCompletion(
    logId: string,
    status: string,
    stats: { processed?: number; created?: number; updated?: number; skipped?: number } = {},
    error?: { message?: string; details?: string }
  ): Promise<void> {
    await db.update(microsipSyncLogs)
      .set({
        status,
        recordsProcessed: stats.processed || 0,
        recordsCreated: stats.created || 0,
        recordsUpdated: stats.updated || 0,
        recordsSkipped: stats.skipped || 0,
        errorMessage: error?.message,
        errorDetails: error?.details,
        completedAt: new Date(),
      })
      .where(eq(microsipSyncLogs.id, logId));
  }

  async syncCustomers(): Promise<{ created: number; updated: number; skipped: number }> {
    if (!await this.loadConfig(false) || !this.config?.syncCustomers) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    const logId = await this.logSync('customers', 'started');
    let fbDb: FirebirdConnection | null = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    try {
      fbDb = await this.connect();
      
      // Query with JOINs to DIRS_CLIENTES and PLAZOS_COND_PAGO
      // Credit days come from PLAZOS_COND_PAGO.DIAS_PLAZO
      const microsipCustomers = await this.query<MicrosipCustomer>(fbDb, `
        SELECT 
          C.CLIENTE_ID, C.NOMBRE, C.ESTATUS, C.CONTACTO1,
          C.LIMITE_CREDITO, PCP.DIAS_PLAZO AS DIAS_CREDITO,
          D.RFC_CURP AS RFC, D.CALLE, D.NUM_EXTERIOR, D.NUM_INTERIOR,
          D.CODIGO_POSTAL, D.COLONIA, UPPER(D.POBLACION) AS POBLACION, 
          D.TELEFONO1, D.EMAIL, D.CONTACTO
        FROM CLIENTES C
        LEFT JOIN DIRS_CLIENTES D ON D.CLIENTE_ID = C.CLIENTE_ID
        LEFT JOIN PLAZOS_COND_PAGO PCP ON PCP.COND_PAGO_ID = C.COND_PAGO_ID
        WHERE C.ESTATUS = 'A'
      `);

      // Group by CLIENTE_ID to avoid duplicates when customer has multiple addresses
      const uniqueCustomers = new Map<number, MicrosipCustomer>();
      for (const customer of microsipCustomers) {
        if (!uniqueCustomers.has(customer.CLIENTE_ID)) {
          uniqueCustomers.set(customer.CLIENTE_ID, customer);
        }
      }
      
      console.log(`[Microsip] Found ${uniqueCustomers.size} unique customers to sync`);

      for (const msCustomer of Array.from(uniqueCustomers.values())) {
        stats.processed++;
        
        try {
          const [existing] = await db
            .select()
            .from(customers)
            .where(and(
              eq(customers.tenantId, this.tenantId),
              eq(customers.microsipId, msCustomer.CLIENTE_ID)
            ));

          // Build address from components
          const addressParts = [
            msCustomer.CALLE?.trim(),
            msCustomer.NUM_EXTERIOR ? `#${msCustomer.NUM_EXTERIOR.trim()}` : null,
            msCustomer.NUM_INTERIOR ? `Int. ${msCustomer.NUM_INTERIOR.trim()}` : null,
            msCustomer.COLONIA?.trim(),
          ].filter(Boolean);
          
          const customerData = {
            name: msCustomer.NOMBRE?.trim() || 'Sin nombre',
            rfc: msCustomer.RFC?.trim() || null,
            phone: msCustomer.TELEFONO1?.trim() || null,
            email: msCustomer.EMAIL?.trim() || null,
            address: addressParts.join(', ') || null,
            city: msCustomer.POBLACION?.trim() || null,
            state: null,
            country: 'México',
            zipCode: msCustomer.CODIGO_POSTAL?.trim() || null,
            creditLimit: String(msCustomer.LIMITE_CREDITO || 0),
            creditDays: msCustomer.DIAS_CREDITO || 30,
            blocked: msCustomer.ESTATUS !== 'A',
            contactName: msCustomer.CONTACTO?.trim() || msCustomer.CONTACTO1?.trim() || null,
            microsipId: msCustomer.CLIENTE_ID,
            microsipCode: String(msCustomer.CLIENTE_ID),
            microsipSyncedAt: new Date(),
          };

          if (existing) {
            await db.update(customers)
              .set(customerData)
              .where(eq(customers.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(customers).values({
              ...customerData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing customer ${msCustomer.CLIENTE_ID}:`, err);
          stats.skipped++;
        }
      }

      await db.update(microsipConfigs)
        .set({ 
          lastCustomerSync: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'success', stats);
      console.log(`[Microsip] Customer sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    } catch (err) {
      const error = err as Error;
      console.error('[Microsip] Customer sync error:', error.message);
      
      await db.update(microsipConfigs)
        .set({ 
          lastSyncStatus: 'error',
          lastSyncError: error.message,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'error', stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }

    return stats;
  }

  async syncCategories(): Promise<{ created: number; updated: number; skipped: number }> {
    if (!await this.loadConfig(false) || !this.config?.syncCategories) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    const logId = await this.logSync('categories', 'started');
    let fbDb: FirebirdConnection | null = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    try {
      fbDb = await this.connect();
      
      const microsipCategories = await this.query<MicrosipCategory>(fbDb, `
        SELECT LINEA_ARTICULO_ID, NOMBRE
        FROM LINEAS_ARTICULOS
      `);

      console.log(`[Microsip] Found ${microsipCategories.length} categories to sync`);

      for (const msCategory of microsipCategories) {
        stats.processed++;
        
        try {
          const [existing] = await db
            .select()
            .from(productCategories)
            .where(and(
              eq(productCategories.tenantId, this.tenantId),
              eq(productCategories.microsipLineaId, msCategory.LINEA_ARTICULO_ID)
            ));

          const categoryData = {
            name: msCategory.NOMBRE?.trim() || 'Sin categoría',
            description: null,
            microsipLineaId: msCategory.LINEA_ARTICULO_ID,
            microsipSyncedAt: new Date(),
          };

          if (existing) {
            await db.update(productCategories)
              .set(categoryData)
              .where(eq(productCategories.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(productCategories).values({
              ...categoryData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing category ${msCategory.LINEA_ARTICULO_ID}:`, err);
          stats.skipped++;
        }
      }

      await db.update(microsipConfigs)
        .set({ 
          lastCategorySync: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'success', stats);
      console.log(`[Microsip] Category sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    } catch (err) {
      const error = err as Error;
      console.error('[Microsip] Category sync error:', error.message);
      
      await db.update(microsipConfigs)
        .set({ 
          lastSyncStatus: 'error',
          lastSyncError: error.message,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'error', stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }

    return stats;
  }

  async syncProducts(): Promise<{ created: number; updated: number; skipped: number }> {
    if (!await this.loadConfig(false) || !this.config?.syncProducts) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    const logId = await this.logSync('products', 'started');
    let fbDb: FirebirdConnection | null = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    try {
      fbDb = await this.connect();
      
      const microsipProducts = await this.query<MicrosipProduct>(fbDb, `
        SELECT 
          ARTICULO_ID, NOMBRE, LINEA_ARTICULO_ID, ESTATUS
        FROM ARTICULOS
        WHERE ESTATUS = 'A'
      `);

      console.log(`[Microsip] Found ${microsipProducts.length} products to sync`);

      const categoryMap = new Map<number, string>();
      const categories = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.tenantId, this.tenantId));
      
      for (const cat of categories) {
        if (cat.microsipLineaId) {
          categoryMap.set(cat.microsipLineaId, cat.id);
        }
      }

      for (const msProduct of microsipProducts) {
        stats.processed++;
        
        try {
          const [existing] = await db
            .select()
            .from(products)
            .where(and(
              eq(products.tenantId, this.tenantId),
              eq(products.microsipArticuloId, msProduct.ARTICULO_ID)
            ));

          const categoryId = msProduct.LINEA_ARTICULO_ID 
            ? categoryMap.get(msProduct.LINEA_ARTICULO_ID) || null
            : null;

          const productData = {
            code: String(msProduct.ARTICULO_ID),
            name: msProduct.NOMBRE?.trim() || 'Sin nombre',
            description: null,
            categoryId,
            unitOfMeasure: 'PZA',
            listPrice: "0",
            cost: null,
            stock: "0",
            active: msProduct.ESTATUS === 'A',
            microsipArticuloId: msProduct.ARTICULO_ID,
            microsipSyncedAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing) {
            await db.update(products)
              .set(productData)
              .where(eq(products.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(products).values({
              ...productData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing product ${msProduct.ARTICULO_ID}:`, err);
          stats.skipped++;
        }
      }

      await db.update(microsipConfigs)
        .set({ 
          lastProductSync: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'success', stats);
      console.log(`[Microsip] Product sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    } catch (err) {
      const error = err as Error;
      console.error('[Microsip] Product sync error:', error.message);
      
      await db.update(microsipConfigs)
        .set({ 
          lastSyncStatus: 'error',
          lastSyncError: error.message,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'error', stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }

    return stats;
  }

  async syncInvoices(): Promise<{ created: number; updated: number; skipped: number }> {
    if (!await this.loadConfig(false) || !this.config?.syncInvoices) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    const logId = await this.logSync('invoices', 'started');
    let fbDb: FirebirdConnection | null = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    try {
      fbDb = await this.connect();
      
      // Query invoices - filter by TIPO_DOCTO = 'F' for invoices only
      // Using IMPORTE_COBRO as total (includes subtotal + taxes)
      const microsipInvoices = await this.query<MicrosipInvoice>(fbDb, `
        SELECT 
          DOCTO_VE_ID, FOLIO, CLIENTE_ID, FECHA,
          IMPORTE_NETO, TOTAL_IMPUESTOS AS IMPUESTO, 
          IMPORTE_COBRO, ESTATUS
        FROM DOCTOS_VE
        WHERE TIPO_DOCTO = 'F'
          AND ESTATUS <> 'C'
          AND FECHA >= DATEADD(-90 DAY TO CURRENT_DATE)
      `);

      console.log(`[Microsip] Found ${microsipInvoices.length} invoices to sync`);

      const customerMap = new Map<number, string>();
      const tenantCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.tenantId, this.tenantId));
      
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

          const [existing] = await db
            .select()
            .from(invoices)
            .where(and(
              eq(invoices.tenantId, this.tenantId),
              eq(invoices.microsipDoctoId, msInvoice.DOCTO_VE_ID)
            ));

          let status: string = InvoiceStatus.PENDING_PAYMENT;
          const subtotal = msInvoice.IMPORTE_NETO || 0;
          const tax = msInvoice.IMPUESTO || 0;
          // Use IMPORTE_COBRO as total if available, otherwise calculate
          const total = (msInvoice as any).IMPORTE_COBRO || (subtotal + tax);
          
          if (msInvoice.ESTATUS === 'C') {
            status = InvoiceStatus.CANCELLED;
          } else if (msInvoice.ESTATUS === 'A') {
            status = InvoiceStatus.PENDING_PAYMENT;
          }

          const invoiceData = {
            customerId,
            cfdiUuid: null,
            serie: 'F',
            folio: msInvoice.FOLIO?.trim() || String(msInvoice.DOCTO_VE_ID),
            subtotal: String(subtotal),
            tax: String(tax),
            total: String(total),
            balanceDue: String(total),
            status,
            paymentMethod: null,
            paymentForm: null,
            issuedAt: msInvoice.FECHA || new Date(),
            dueDate: null,
            paidAt: null,
            microsipDoctoId: msInvoice.DOCTO_VE_ID,
            microsipSyncedAt: new Date(),
          };

          if (existing) {
            await db.update(invoices)
              .set(invoiceData)
              .where(eq(invoices.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(invoices).values({
              ...invoiceData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing invoice ${msInvoice.DOCTO_VE_ID}:`, err);
          stats.skipped++;
        }
      }

      await db.update(microsipConfigs)
        .set({ 
          lastInvoiceSync: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'success', stats);
      console.log(`[Microsip] Invoice sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    } catch (err) {
      const error = err as Error;
      console.error('[Microsip] Invoice sync error:', error.message);
      
      await db.update(microsipConfigs)
        .set({ 
          lastSyncStatus: 'error',
          lastSyncError: error.message,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'error', stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }

    return stats;
  }

  async syncPayments(): Promise<{ created: number; updated: number; skipped: number }> {
    if (!await this.loadConfig(false) || !this.config?.syncPayments) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    const logId = await this.logSync('payments', 'started');
    let fbDb: FirebirdConnection | null = null;
    const stats = { processed: 0, created: 0, updated: 0, skipped: 0 };

    try {
      fbDb = await this.connect();
      
      // Query payments - minimal columns for compatibility
      const microsipPayments = await this.query<MicrosipPayment>(fbDb, `
        SELECT 
          DOCTO_CO_ID, CLIENTE_ID, FECHA, IMPORTE
        FROM DOCTOS_CO
        WHERE FECHA >= DATEADD(-90 DAY TO CURRENT_DATE)
      `);

      console.log(`[Microsip] Found ${microsipPayments.length} payments to sync`);

      const customerMap = new Map<number, string>();
      const tenantCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.tenantId, this.tenantId));
      
      for (const cust of tenantCustomers) {
        if (cust.microsipId) {
          customerMap.set(cust.microsipId, cust.id);
        }
      }

      const invoiceMap = new Map<number, string>();
      const tenantInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.tenantId, this.tenantId));
      
      for (const inv of tenantInvoices) {
        if (inv.microsipDoctoId) {
          invoiceMap.set(Number(inv.microsipDoctoId), inv.id);
        }
      }

      for (const msPayment of microsipPayments) {
        stats.processed++;
        
        try {
          const customerId = customerMap.get(msPayment.CLIENTE_ID);
          if (!customerId) {
            console.log(`[Microsip] Skipping payment ${msPayment.DOCTO_CO_ID}: customer ${msPayment.CLIENTE_ID} not found`);
            stats.skipped++;
            continue;
          }

          const [existing] = await db
            .select()
            .from(payments)
            .where(and(
              eq(payments.tenantId, this.tenantId),
              eq(payments.microsipDoctoCoId, msPayment.DOCTO_CO_ID)
            ));

          // Without DOCTOS_CO_APLIC table, we can't link payments to specific invoices
          const invoiceId = null;

          const paymentData = {
            customerId,
            invoiceId,
            amount: String(msPayment.IMPORTE || 0),
            paymentDate: msPayment.FECHA || new Date(),
            reference: null,
            notes: null,
            microsipDoctoCoId: msPayment.DOCTO_CO_ID,
            microsipSyncedAt: new Date(),
          };

          if (existing) {
            await db.update(payments)
              .set(paymentData)
              .where(eq(payments.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(payments).values({
              ...paymentData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing payment ${msPayment.DOCTO_CO_ID}:`, err);
          stats.skipped++;
        }
      }

      await db.update(microsipConfigs)
        .set({ 
          lastPaymentSync: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'success', stats);
      console.log(`[Microsip] Payment sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    } catch (err) {
      const error = err as Error;
      console.error('[Microsip] Payment sync error:', error.message);
      
      await db.update(microsipConfigs)
        .set({ 
          lastSyncStatus: 'error',
          lastSyncError: error.message,
          updatedAt: new Date()
        })
        .where(eq(microsipConfigs.tenantId, this.tenantId));

      await this.updateLogCompletion(logId, 'error', stats, { message: error.message, details: error.stack });
      throw err;
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }

    return stats;
  }

  async syncAll(): Promise<{
    categories: { created: number; updated: number; skipped: number };
    customers: { created: number; updated: number; skipped: number };
    products: { created: number; updated: number; skipped: number };
    invoices: { created: number; updated: number; skipped: number };
    payments: { created: number; updated: number; skipped: number };
  }> {
    console.log(`[Microsip] Starting full sync for tenant ${this.tenantId}`);
    
    const results = {
      categories: await this.syncCategories(),
      customers: await this.syncCustomers(),
      products: await this.syncProducts(),
      invoices: await this.syncInvoices(),
      payments: await this.syncPayments(),
    };

    console.log(`[Microsip] Full sync complete for tenant ${this.tenantId}`);
    return results;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!await this.loadConfig(false)) {
      return { success: false, message: 'Configuración no encontrada' };
    }

    let fbDb: FirebirdConnection | null = null;
    
    try {
      fbDb = await this.connect();
      
      // First try a simple query to verify connection
      try {
        const result = await this.query<{ COUNT: number }>(fbDb, 'SELECT COUNT(*) AS COUNT FROM CLIENTES');
        const count = result[0]?.COUNT || 0;
        
        return { 
          success: true, 
          message: `Conexión exitosa. Se encontraron ${count} clientes en Microsip.` 
        };
      } catch (queryErr) {
        // Connection works but table doesn't exist - try to list tables
        const queryError = queryErr as Error;
        
        // Try alternative query to confirm connection is working
        try {
          const tables = await this.query<{ RDB$RELATION_NAME: string }>(
            fbDb, 
            `SELECT FIRST 10 RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0`
          );
          const tableNames = tables.map(t => t.RDB$RELATION_NAME?.trim()).filter(Boolean).join(', ');
          
          return { 
            success: true, 
            message: `Conexión exitosa a la base de datos. Tablas encontradas: ${tableNames || 'ninguna'}. Nota: La tabla CLIENTES no existe, verifique la estructura de su base de datos.` 
          };
        } catch {
          return { 
            success: true, 
            message: `Conexión exitosa, pero error al consultar tablas: ${queryError.message}` 
          };
        }
      }
    } catch (err) {
      const error = err as Error;
      return { 
        success: false, 
        message: `Error de conexión: ${error.message}` 
      };
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
  }
}

export async function createMicrosipSyncService(tenantId: string): Promise<MicrosipSyncService> {
  return new MicrosipSyncService(tenantId);
}

export async function runScheduledSync(): Promise<void> {
  console.log('[Microsip] Running scheduled sync for all enabled tenants...');
  
  const enabledConfigs = await db
    .select()
    .from(microsipConfigs)
    .where(eq(microsipConfigs.enabled, true));

  for (const config of enabledConfigs) {
    try {
      const service = await createMicrosipSyncService(config.tenantId);
      
      const now = new Date();
      
      const shouldSyncMaster = !config.lastCustomerSync || 
        (now.getTime() - config.lastCustomerSync.getTime()) >= config.masterDataInterval * 60 * 1000;
      
      const shouldSyncTransactional = !config.lastInvoiceSync ||
        (now.getTime() - config.lastInvoiceSync.getTime()) >= config.transactionalInterval * 60 * 1000;

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
  
  console.log('[Microsip] Scheduled sync complete');
}

export { MicrosipSyncService };
