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
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';

interface FirebirdConnection {
  query: (query: string, params: any[], callback: (err: Error | null, result: any[]) => void) => void;
  detach: (callback?: (err: Error | null) => void) => void;
}

// node-firebird corrupts its wire-handshake state when two attach() calls
// overlap, producing spurious "Your user name and password are not defined"
// errors. Serialize all attaches process-wide so handshakes never interleave,
// regardless of which service instance or trigger (manual sync, scheduler,
// account-statement pre-send refresh) opens the connection.
let attachChain: Promise<unknown> = Promise.resolve();

const ATTACH_TIMEOUT_MS = 15000; // caller-facing timeout
const ATTACH_LOCK_CAP_MS = 25000; // hard cap so a hung handshake can't deadlock the lock

function attachSerialized(options: Firebird.Options): Promise<FirebirdConnection> {
  // Wait for any in-flight handshake to finish before starting this one.
  // The inner promise never rejects — it always resolves with {db, err} once
  // the real node-firebird callback fires — so the global lock advances only
  // when the underlying handshake actually completes (not merely when the
  // caller-facing timeout expires), which is what prevents overlap.
  const settledHandshake = attachChain.then(
    () =>
      new Promise<{ db: FirebirdConnection | null; err: Error | null }>((resolveInner) => {
        Firebird.attach(options, (err: Error | null, db: FirebirdConnection) => {
          resolveInner({ db: db ?? null, err: err ?? null });
        });
      }),
  );

  // Advance the lock when the handshake settles, but never wait longer than a
  // hard cap so a pathological never-returning attach cannot deadlock the queue.
  attachChain = Promise.race([
    settledHandshake,
    new Promise((r) => setTimeout(r, ATTACH_LOCK_CAP_MS)),
  ]).then(
    () => undefined,
    () => undefined,
  );

  return new Promise<FirebirdConnection>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `Timeout: No se pudo conectar a ${options.host}:${options.port} en 15 segundos. Verifique que el servidor sea accesible desde Internet.`,
        ),
      );
    }, ATTACH_TIMEOUT_MS);

    settledHandshake.then(({ db, err }) => {
      if (settled) {
        // Caller already gave up (timeout). Don't leak a live handle that
        // arrived late.
        if (db) {
          try {
            db.detach();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (err) {
        console.error('[Microsip] Connection error:', err.message);
        reject(err);
      } else {
        console.log('[Microsip] Connected to Firebird database');
        resolve(db as FirebirdConnection);
      }
    });
  });
}

interface MicrosipCustomer {
  CLIENTE_ID: number;
  NOMBRE: string;
  ESTATUS: string;
  CONTACTO1?: string;
  LIMITE_CREDITO?: number;
  DIAS_CREDITO?: number; // From PLAZOS_COND_PAG.DIAS_PLAZO
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
  CLAVE_ARTICULO?: string;
  NOMBRE: string;
  DESCRIPCION?: string;
  LINEA_ARTICULO_ID: number;
  UNIDAD_VENTA?: string;
  PRECIO_1?: number;
  COSTO_ULTIMA_COMPRA?: number;
  EXISTENCIA?: number;
  ESTATUS: string;
  MONEDA_ID?: number;
}

interface MicrosipCategory {
  LINEA_ARTICULO_ID: number;
  NOMBRE: string;
  DESCRIPCION?: string;
}

interface MicrosipInvoice {
  DOCTO_VE_ID: number;
  FOLIO: string;
  CLIENTE_ID: number;
  FECHA: Date;
  FECHA_VENCE: Date | null;  // explicit due date from Microsip
  IMPORTE_NETO: number;
  IMPUESTO: number;
  IMPORTE_COBRO: number;       // original charge amount in CXC
  SALDO_CXC: number | null;   // CXC balance (null = no CXC record for this invoice)
  DIAS_PPAG: number;
}

interface MicrosipPayment {
  DOCTO_CO_ID: number;
  CLIENTE_ID: number;
  FECHA: Date;
  IMPORTE: number;
  FOLIO_PAGO: string;
  DOCTO_CC_FACTURA_ID: number;
  DOCTO_VE_ID: number | null;
  FOLIO_FACTURA: string | null;
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

  private getFirebirdOptions(useCxc: boolean = false): Firebird.Options {
    if (!this.config) throw new Error('Config not loaded');
    
    const database = (useCxc && this.config.cxcDatabase)
      ? this.config.cxcDatabase
      : this.config.database;

    return {
      host: this.config.host,
      port: this.config.port,
      database,
      user: this.config.username,
      password: this.config.password,
      lowercase_keys: false,
      role: undefined,
      pageSize: 4096,
    };
  }

  private connect(useCxc: boolean = false): Promise<FirebirdConnection> {
    const options = this.getFirebirdOptions(useCxc);
    return attachSerialized(options);
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

  async executeReadOnlyQuery(sql: string): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
    if (!await this.loadConfig(false)) {
      throw new Error('Configuración de Microsip no encontrada');
    }

    // Length validation
    if (sql.length > 2000) {
      throw new Error('La consulta es demasiado larga (máximo 2000 caracteres)');
    }

    // Remove all comments (block and line) before validation
    let cleanSql = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/--.*$/gm, '')           // Remove line comments  
      .trim();

    // Validate SELECT-only query (security)
    const normalizedSql = cleanSql.toUpperCase();
    if (!normalizedSql.startsWith('SELECT')) {
      throw new Error('Solo se permiten consultas SELECT');
    }
    
    // Block dangerous keywords in the cleaned SQL
    const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SET', 'COMMIT', 'ROLLBACK', 'SAVEPOINT'];
    for (const keyword of dangerousKeywords) {
      // Use word boundary check to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(cleanSql)) {
        throw new Error(`Palabra clave no permitida: ${keyword}`);
      }
    }

    // Block semicolons to prevent multi-statement attacks
    if (cleanSql.includes(';')) {
      throw new Error('No se permiten múltiples sentencias');
    }

    // Block any remaining comment syntax in original SQL
    if (sql.includes('/*') || sql.includes('*/') || sql.includes('--')) {
      throw new Error('No se permiten comentarios SQL');
    }

    // Add FIRST 5000 if not present to limit results
    let safeSql = cleanSql;
    if (!normalizedSql.includes('FIRST') && !normalizedSql.includes('ROWS')) {
      safeSql = safeSql.replace(/^SELECT/i, 'SELECT FIRST 5000');
    }

    let fbDb: FirebirdConnection | null = null;
    try {
      fbDb = await this.connect();
      const results = await this.query<any>(fbDb, safeSql);
      
      const columns = results.length > 0 ? Object.keys(results[0]) : [];
      
      // Debug: log first row
      if (results.length > 0) {
        console.log(`[Microsip Query] Columns: ${JSON.stringify(columns)}`);
        console.log(`[Microsip Query] First row: ${JSON.stringify(results[0])}`);
      }
      
      return {
        columns,
        rows: results,
        rowCount: results.length,
      };
    } finally {
      if (fbDb) {
        fbDb.detach();
      }
    }
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
      
      // Query with JOINs to DIRS_CLIENTES and PLAZOS_COND_PAG for credit days
      const microsipCustomers = await this.query<MicrosipCustomer>(fbDb, `
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

      // Group by CLIENTE_ID to avoid duplicates when customer has multiple addresses
      const uniqueCustomers = new Map<number, MicrosipCustomer>();
      for (const customer of microsipCustomers) {
        if (!uniqueCustomers.has(customer.CLIENTE_ID)) {
          uniqueCustomers.set(customer.CLIENTE_ID, customer);
        }
      }
      
      console.log(`[Microsip] Found ${uniqueCustomers.size} unique customers to sync`);
      
      // Log credit days sample for debugging
      const sampleCustomers = Array.from(uniqueCustomers.values()).slice(0, 5);
      console.log(`[Microsip] Sample credit days:`, sampleCustomers.map(c => ({ 
        id: c.CLIENTE_ID, 
        name: c.NOMBRE?.substring(0, 20), 
        creditDays: c.DIAS_CREDITO 
      })));

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
            creditDays: msCustomer.DIAS_CREDITO || 0,
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
      
      // Note: LINEAS_ARTICULOS may not have ESTATUS column in all Microsip versions
      // We fetch without it and treat all categories as active
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

          if (existing) {
            // For existing categories: update name only, preserve the user's active/inactive setting
            await db.update(productCategories)
              .set({
                name: msCategory.NOMBRE?.trim() || 'Sin categoría',
                microsipSyncedAt: new Date(),
              })
              .where(eq(productCategories.id, existing.id));
            stats.updated++;
          } else {
            // For new categories: default to active=true
            await db.insert(productCategories).values({
              name: msCategory.NOMBRE?.trim() || 'Sin categoría',
              description: null,
              active: true,
              microsipLineaId: msCategory.LINEA_ARTICULO_ID,
              microsipSyncedAt: new Date(),
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
      
      // Sync ALL active products; price from list 42 if available, otherwise 0
      // CLAVE_ARTICULO comes from CLAVES_ARTICULOS (the human-readable product code)
      // MONEDA_ID lives in PRECIOS_ARTICULOS (per price list), not in ARTICULOS
      const microsipProducts = await this.query<MicrosipProduct>(fbDb, `
        SELECT 
          A.ARTICULO_ID, A.NOMBRE, A.LINEA_ARTICULO_ID, A.ESTATUS,
          P.PRECIO AS PRECIO_1, P.MONEDA_ID,
          (SELECT FIRST 1 CA.CLAVE_ARTICULO FROM CLAVES_ARTICULOS CA WHERE CA.ARTICULO_ID = A.ARTICULO_ID) AS CLAVE_ARTICULO
        FROM ARTICULOS A
        LEFT JOIN PRECIOS_ARTICULOS P ON A.ARTICULO_ID = P.ARTICULO_ID AND P.PRECIO_EMPRESA_ID = 42
        WHERE A.ESTATUS = 'A'
      `);

      console.log(`[Microsip] Found ${microsipProducts.length} products to sync`);
      
      // Debug: log products with prices - check both possible column names
      const productsWithPrices = microsipProducts.filter(p => {
        const price = (p as any).PRECIO ?? p.PRECIO_1;
        return price !== null && price !== undefined && price > 0;
      });
      console.log(`[Microsip] Products with prices (PRECIO or PRECIO_1): ${productsWithPrices.length}`);
      if (productsWithPrices.length > 0) {
        const sample = productsWithPrices[0];
        console.log(`[Microsip] Sample with price - PRECIO: ${(sample as any).PRECIO}, PRECIO_1: ${sample.PRECIO_1}`);
        console.log(`[Microsip] Sample data:`, JSON.stringify(sample));
      }
      if (microsipProducts.length > 0) {
        console.log(`[Microsip] First product columns:`, Object.keys(microsipProducts[0]));
        console.log(`[Microsip] First product all data:`, JSON.stringify(microsipProducts[0]));
      }

      const categoryMap = new Map<number, { id: string; active: boolean }>();
      const categories = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.tenantId, this.tenantId));
      
      for (const cat of categories) {
        if (cat.microsipLineaId) {
          categoryMap.set(cat.microsipLineaId, { id: cat.id, active: cat.active });
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

          const categoryEntry = msProduct.LINEA_ARTICULO_ID 
            ? categoryMap.get(msProduct.LINEA_ARTICULO_ID) || null
            : null;
          const categoryId = categoryEntry ? categoryEntry.id : null;
          const categoryActive = categoryEntry ? categoryEntry.active : true;

          // Firebird driver ignores aliases - use actual column name PRECIO
          const rawPrice = (msProduct as any).PRECIO ?? msProduct.PRECIO_1;
          const listPrice = rawPrice 
            ? String(Number(rawPrice).toFixed(2)) 
            : "0";

          // Product is active only if it's active in Microsip AND its category is active
          const productActive = msProduct.ESTATUS === 'A' && categoryActive;

          // Map MONEDA_ID to currency: 1 = MXN (Peso), anything else (e.g. 2089) = USD
          const currency = msProduct.MONEDA_ID === 1 ? "MXN" : msProduct.MONEDA_ID ? "USD" : "MXN";

          const productData = {
            code: msProduct.CLAVE_ARTICULO?.toString().trim() || (msProduct as any).CLAVE?.toString().trim() || String(msProduct.ARTICULO_ID),
            name: msProduct.NOMBRE?.trim() || 'Sin nombre',
            description: null,
            categoryId,
            unitOfMeasure: 'PZA',
            listPrice,
            cost: null,
            stock: "0",
            active: productActive,
            currency,
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

      // Deactivate products that are NOT in the list 42 (keep for historical FK references)
      const syncedMicrosipIds = microsipProducts.map(p => p.ARTICULO_ID);
      if (syncedMicrosipIds.length > 0) {
        // Get all products for this tenant that have a microsipArticuloId
        const allTenantProducts = await db
          .select({ id: products.id, microsipArticuloId: products.microsipArticuloId })
          .from(products)
          .where(eq(products.tenantId, this.tenantId));
        
        // Deactivate products not in the synced list
        for (const product of allTenantProducts) {
          if (product.microsipArticuloId && !syncedMicrosipIds.includes(product.microsipArticuloId)) {
            await db.update(products)
              .set({ active: false, updatedAt: new Date() })
              .where(eq(products.id, product.id));
          }
        }
        console.log(`[Microsip] Deactivated products no longer active in Microsip`);
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
      // Use CXC database if configured (some Microsip installations have DOCTOS_VE in a separate DB)
      fbDb = await this.connect(true);

      // Query invoices from DOCTOS_VE and compute the real outstanding balance from
      // DOCTOS_CC (CXC module) via DOCTOS_ENTRE_SIS.  IMPORTE_COBRO on DOCTOS_VE is
      // NOT updated when payments are applied directly in the CXC module, so using it
      // as the balance produces stale figures.  The CXC balance is the authoritative source.
      const microsipInvoices = await this.query<MicrosipInvoice>(fbDb, `
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

          // Primary lookup: by microsipDoctoId (stable Microsip PK)
          let [existing] = await db
            .select()
            .from(invoices)
            .where(and(
              eq(invoices.tenantId, this.tenantId),
              eq(invoices.microsipDoctoId, msInvoice.DOCTO_VE_ID)
            ));

          // Fallback: if no microsipDoctoId match, look for a manually-created invoice
          // with the same folio+customerId so we link it rather than create a duplicate.
          if (!existing) {
            const folio = msInvoice.FOLIO?.trim() || String(msInvoice.DOCTO_VE_ID);
            const [byFolio] = await db
              .select()
              .from(invoices)
              .where(and(
                eq(invoices.tenantId, this.tenantId),
                eq(invoices.customerId, customerId),
                eq(invoices.folio, folio)
              ));
            if (byFolio && !byFolio.microsipDoctoId) {
              console.log(`[Microsip] Linking manual invoice ${folio} (id=${byFolio.id}) to microsipDoctoId=${msInvoice.DOCTO_VE_ID}`);
              existing = byFolio;
            } else if (byFolio && byFolio.microsipDoctoId && byFolio.microsipDoctoId !== msInvoice.DOCTO_VE_ID) {
              // Different microsipDoctoId means truly different document — don't link
              console.warn(`[Microsip] Duplicate folio ${folio} detected: existing microsipDoctoId=${byFolio.microsipDoctoId} vs incoming=${msInvoice.DOCTO_VE_ID}. Skipping to avoid duplicate.`);
              stats.skipped++;
              continue;
            }
          }

          const subtotal = msInvoice.IMPORTE_NETO || 0;
          const tax = msInvoice.IMPUESTO || 0;
          const total = msInvoice.IMPORTE_COBRO || (subtotal + tax);

          // SALDO_CXC is null when the invoice has no DOCTOS_CC record (not yet transferred
          // to CXC, or very old). In that case fall back to IMPORTE_COBRO.
          // When SALDO_CXC = 0 the invoice was fully paid in CXC even if IMPORTE_COBRO > 0.
          const hasCxcRecord = msInvoice.SALDO_CXC !== null && msInvoice.SALDO_CXC !== undefined;
          const balanceDue = hasCxcRecord ? Number(msInvoice.SALDO_CXC) : (msInvoice.IMPORTE_COBRO || total);

          // Status: PAID when CXC confirms fully settled; PARTIALLY_PAID for partial; PENDING otherwise
          const status: string =
            balanceDue <= 0.005
              ? InvoiceStatus.PAID
              : balanceDue >= total - 0.005
                ? InvoiceStatus.PENDING_PAYMENT
                : InvoiceStatus.PARTIALLY_PAID;

          const invoiceDate = msInvoice.FECHA || new Date();
          // Use FECHA_VENCE directly when available (explicit due date from Microsip).
          // Only fall back to FECHA + DIAS_PPAG calculation when FECHA_VENCE is absent.
          let dueDate: Date;
          if (msInvoice.FECHA_VENCE) {
            dueDate = new Date(msInvoice.FECHA_VENCE);
          } else {
            const creditDays = msInvoice.DIAS_PPAG || 0;
            dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + creditDays);
          }

          // Base invoice data — balanceDue = SALDO_CXC (true outstanding per CXC module)
          const invoiceBaseData = {
            customerId,
            cfdiUuid: null,
            serie: 'F',
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
            microsipSyncedAt: new Date(),
          };

          if (existing) {
            await db.update(invoices)
              .set(invoiceBaseData)
              .where(eq(invoices.id, existing.id));
            stats.updated++;
          } else {
            await db.insert(invoices).values({
              ...invoiceBaseData,
              tenantId: this.tenantId,
            });
            stats.created++;
          }
        } catch (err) {
          console.error(`[Microsip] Error syncing invoice ${msInvoice.DOCTO_VE_ID}:`, err);
          stats.skipped++;
        }
      }

      // NOTE: Automatic closure of invoices not in the sync result has been intentionally
      // removed. It was too prone to false positives (e.g. when Microsip returns fewer
      // records than expected due to DB partitioning or connection issues).
      // Invoices get marked PAID naturally when the payment sync sets balanceDue = 0.

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
    const affectedInvoiceIds = new Set<string>();

    try {
      // Use CXC database if configured (some Microsip installations have DOCTOS_CC in a separate DB)
      fbDb = await this.connect(true);
      
      // Query payments with invoice relationship
      // P = Recibo (pago), I = IMPORTES_DOCTOS_CC (liga pago con cargo CXC)
      // C = Cargo en CXC (DOCTOS_CC), DES = DOCTOS_ENTRE_SIS (liga CXC con ventas)
      // DV = Factura de ventas (DOCTOS_VE) con el folio real
      const microsipPayments = await this.query<MicrosipPayment>(fbDb, `
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

      // --- Pre-load all lookup data in bulk (3 queries total, not 3711) ---
      const customerMap = new Map<number, string>();
      for (const cust of await db.select({ id: customers.id, microsipId: customers.microsipId })
          .from(customers).where(eq(customers.tenantId, this.tenantId))) {
        if (cust.microsipId) customerMap.set(cust.microsipId, cust.id);
      }

      const invoiceMap = new Map<number, string>();
      for (const inv of await db.select({ id: invoices.id, microsipDoctoId: invoices.microsipDoctoId })
          .from(invoices).where(eq(invoices.tenantId, this.tenantId))) {
        if (inv.microsipDoctoId) invoiceMap.set(Number(inv.microsipDoctoId), inv.id);
      }

      // Pre-load all existing payments keyed by microsipDoctoCoId
      const existingPaymentMap = new Map<number, string>(); // microsipDoctoCoId → payment.id
      for (const p of await db.select({ id: payments.id, microsipDoctoCoId: payments.microsipDoctoCoId })
          .from(payments).where(eq(payments.tenantId, this.tenantId))) {
        if (p.microsipDoctoCoId != null) existingPaymentMap.set(p.microsipDoctoCoId, p.id);
      }

      // --- Build insert/update batches ---
      const toInsert: (typeof payments.$inferInsert)[] = [];
      const toUpdate: { id: string; data: Partial<typeof payments.$inferInsert> }[] = [];

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
          paymentDate: msPayment.FECHA || new Date(),
          reference: msPayment.FOLIO_PAGO || null,
          notes: msPayment.FOLIO_FACTURA ? `Factura: ${msPayment.FOLIO_FACTURA.trim()}` : null,
          microsipDoctoCoId: msPayment.DOCTO_CO_ID,
          microsipSyncedAt: new Date(),
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

      // --- Execute in batches of 500 ---
      const BATCH = 500;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await db.insert(payments).values(toInsert.slice(i, i + BATCH));
      }
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        await Promise.all(batch.map(({ id, data }) =>
          db.update(payments).set(data).where(eq(payments.id, id))
        ));
      }

      // NOTE: Invoice balances (balanceDue / status) are intentionally NOT updated here.
      // The invoice sync sets balanceDue = IMPORTE_COBRO directly from Microsip, which already
      // reflects the outstanding balance after all payments. Recalculating here would double-count
      // payments (subtracting them again from an already-reduced balance) and incorrectly mark
      // invoices as PAID. Run the invoice sync to refresh balances.
      console.log(`[Microsip] Payment records synced. Run invoice sync to refresh balances.`);

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
    categories: { created: number; updated: number; skipped: number; error?: string };
    customers: { created: number; updated: number; skipped: number; error?: string };
    products: { created: number; updated: number; skipped: number; error?: string };
    invoices: { created: number; updated: number; skipped: number; error?: string };
    payments: { created: number; updated: number; skipped: number; error?: string };
  }> {
    console.log(`[Microsip] Starting full sync for tenant ${this.tenantId}`);
    const empty = { created: 0, updated: 0, skipped: 0 };

    const safe = async (fn: () => Promise<{ created: number; updated: number; skipped: number }>) => {
      try { return await fn(); }
      catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Microsip] syncAll partial error:', msg);
        return { ...empty, error: msg };
      }
    };

    const results = {
      categories: await safe(() => this.syncCategories()),
      customers:  await safe(() => this.syncCustomers()),
      products:   await safe(() => this.syncProducts()),
      invoices:   await safe(() => this.syncInvoices()),
      payments:   await safe(() => this.syncPayments()),
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
  async queryLiveAccountStatements(lookbackYears: number = 3): Promise<{
    CLIENTE_ID: number;
    SALDO_TOTAL: number;
    SALDO_VENCIDO: number;
    OLDEST_DUE: Date | null;
    INVOICE_COUNT: number;
    IS_USD: number;
  }[]> {
    if (!await this.loadConfig(false)) {
      throw new Error('Configuración de Microsip no encontrada');
    }

    let fbDb: FirebirdConnection | null = null;
    try {
      fbDb = await this.connect(true); // use CXC DB if separately configured

      // Correct approach: credits/payments are stored in IMPORTES_DOCTOS_CC rows
      // on the PAYMENT document, not on the charge document itself.
      // IMPORTES.DOCTO_CC_ACR_ID = the charge being credited.
      // We must join credits back to charges via that foreign key.
      //
      // CTE 1 – CARGOS: gross amount per invoice (only TIPO_IMPTE='C' on charge docs)
      // CTE 2 – CREDITOS: total credits applied per invoice (TIPO_IMPTE='R'/'A' anywhere,
      //         linked via DOCTO_CC_ACR_ID)
      // Final SELECT: net = CARGO_BRUTO - CREDITO_APLICADO; sum per customer
      const rows = await this.query<{
        CLIENTE_ID: number;
        SALDO_TOTAL: number;
        SALDO_VENCIDO: number;
        OLDEST_DUE: Date | null;
        INVOICE_COUNT: number;
        IS_USD: number;
      }>(fbDb, `
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
  async queryLiveCxcStatementForCustomer(microsipClienteId: number): Promise<{
    invoices: Array<{
      FOLIO: string;
      FECHA: Date;
      FECHA_VEN: Date | null;
      IMPORTE_TOTAL: number;
      SALDO: number;
      TIPO_CAMBIO: number;
    }>;
    payments: Array<{
      REFERENCIA: string;
      FECHA: Date;
      IMPORTE: number;
      FACTURA_FOLIO: string | null;
    }>;
  }> {
    if (!await this.loadConfig(false)) {
      throw new Error('Configuración de Microsip no encontrada');
    }

    let fbDb: FirebirdConnection | null = null;
    try {
      fbDb = await this.connect(true);

      // Credits applied to each invoice live on PAYMENT documents' IMPORTES_DOCTOS_CC
      // rows (TIPO_IMPTE='R'/'A', DOCTO_CC_ACR_ID = charge DOCTO_CC_ID).
      // Join them via a derived table to get the correct per-invoice net balance.
      const invoices = await this.query<{
        FOLIO: string;
        FECHA: Date;
        FECHA_VEN: Date | null;
        IMPORTE_TOTAL: number;
        SALDO: number;
        TIPO_CAMBIO: number;
      }>(fbDb, `
        SELECT
          D.FOLIO,
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
        GROUP BY D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.TIPO_CAMBIO, PCP.DIAS_PLAZO, CR.CREDITO_APLICADO
        HAVING SUM(I.IMPORTE + I.IMPUESTO - COALESCE(I.IVA_RETENIDO,0) - COALESCE(I.ISR_RETENIDO,0))
               - COALESCE(CR.CREDITO_APLICADO, 0) > 0.005
        ORDER BY D.FECHA
      `);

      const payments = await this.query<{
        REFERENCIA: string;
        FECHA: Date;
        IMPORTE: number;
        FACTURA_FOLIO: string | null;
      }>(fbDb, `
        SELECT FIRST 20
          P.FOLIO AS REFERENCIA,
          P.FECHA,
          SUM(I.IMPORTE) AS IMPORTE,
          MIN(C.FOLIO) AS FACTURA_FOLIO
        FROM DOCTOS_CC P
        JOIN IMPORTES_DOCTOS_CC I ON P.DOCTO_CC_ID = I.DOCTO_CC_ID
        LEFT JOIN DOCTOS_CC C ON I.DOCTO_CC_ACR_ID = C.DOCTO_CC_ID
        WHERE P.CANCELADO <> 'S'
          AND P.NATURALEZA_CONCEPTO = 'R'
          AND P.CLIENTE_ID = ${microsipClienteId}
          AND P.FECHA >= DATEADD(-30 DAY TO CURRENT_DATE)
        GROUP BY P.DOCTO_CC_ID, P.FOLIO, P.FECHA
        ORDER BY P.FECHA DESC
      `);

      return { invoices, payments };
    } finally {
      if (fbDb) fbDb.detach();
    }
  }

  /**
   * Diagnostic: inspect raw Firebird CXC rows for a single customer to
   * understand what TIPO_IMPTE values and DOCTO_CC_ACR_ID links exist.
   */
  async debugCxcCustomer(clienteId: number): Promise<object> {
    if (!await this.loadConfig(false)) {
      throw new Error('Configuración de Microsip no encontrada');
    }
    let fbDb: FirebirdConnection | null = null;
    try {
      fbDb = await this.connect(true);

      // 1. All charge docs for this customer
      const chargeDocs = await this.query<any>(fbDb, `
        SELECT FIRST 20
          D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.NATURALEZA_CONCEPTO, D.CANCELADO
        FROM DOCTOS_CC D
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'C'
          AND D.CANCELADO <> 'S'
        ORDER BY D.FECHA DESC
      `);

      // 2. IMPORTES for the first charge doc (to see which TIPO_IMPTE values exist on charge docs)
      let chargeImportes: any[] = [];
      if (chargeDocs.length > 0) {
        const docId = chargeDocs[0].DOCTO_CC_ID;
        chargeImportes = await this.query<any>(fbDb, `
          SELECT I.DOCTO_CC_ID, I.TIPO_IMPTE, I.IMPORTE, I.IMPUESTO,
                 I.DOCTO_CC_ACR_ID, I.DSCTO_PPAG
          FROM IMPORTES_DOCTOS_CC I
          WHERE I.DOCTO_CC_ID = ${docId}
        `);
      }

      // 3. Payment docs for this customer (last 2 years)
      const paymentDocs = await this.query<any>(fbDb, `
        SELECT FIRST 20
          D.DOCTO_CC_ID, D.FOLIO, D.FECHA, D.NATURALEZA_CONCEPTO
        FROM DOCTOS_CC D
        WHERE D.CLIENTE_ID = ${clienteId}
          AND D.NATURALEZA_CONCEPTO = 'R'
          AND D.CANCELADO <> 'S'
          AND D.FECHA >= DATEADD(-730 DAY TO CURRENT_DATE)
        ORDER BY D.FECHA DESC
      `);

      // 4. IMPORTES for the first payment doc
      let paymentImportes: any[] = [];
      if (paymentDocs.length > 0) {
        const docId = paymentDocs[0].DOCTO_CC_ID;
        paymentImportes = await this.query<any>(fbDb, `
          SELECT I.DOCTO_CC_ID, I.TIPO_IMPTE, I.IMPORTE, I.IMPUESTO,
                 I.DOCTO_CC_ACR_ID, I.DSCTO_PPAG
          FROM IMPORTES_DOCTOS_CC I
          WHERE I.DOCTO_CC_ID = ${docId}
        `);
      }

      // 5. Total distinct TIPO_IMPTE values across ALL importes for this customer's docs
      const tipoImpteStats = await this.query<any>(fbDb, `
        SELECT I.TIPO_IMPTE, COUNT(*) AS CNT, SUM(I.IMPORTE) AS TOTAL,
               COUNT(I.DOCTO_CC_ACR_ID) AS ACR_ID_COUNT
        FROM IMPORTES_DOCTOS_CC I
        JOIN DOCTOS_CC D ON D.DOCTO_CC_ID = I.DOCTO_CC_ID
        WHERE D.CLIENTE_ID = ${clienteId} AND D.CANCELADO <> 'S'
        GROUP BY I.TIPO_IMPTE
      `);

      // 6. Credits linked to this customer's charge docs (via DOCTO_CC_ACR_ID)
      const linkedCredits = await this.query<any>(fbDb, `
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

      // 7. Simple balance check: old approach vs net approach
      const balanceCheck = await this.query<any>(fbDb, `
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
        balanceCheck: balanceCheck[0] ?? {},
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
  async debugBalanceBreakdown(clienteId: number): Promise<object> {
    if (!await this.loadConfig(false)) {
      throw new Error('Configuración de Microsip no encontrada');
    }
    let fbDb: FirebirdConnection | null = null;
    try {
      fbDb = await this.connect(true);

      // 1. All charge docs (NATURALEZA_CONCEPTO='C') for this customer, with their gross amount.
      const chargeDocs = await this.query<any>(fbDb, `
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

      // 2. All credits linked to any of this customer's charge docs (via DOCTO_CC_ACR_ID).
      //    This is exactly what the balance query uses.
      const linkedCredits = await this.query<any>(fbDb, `
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

      // 3. All payment docs (NATURALEZA_CONCEPTO='R') for this customer — to detect
      //    payments NOT linked to any invoice (unapplied / floating).
      const allPaymentDocs = await this.query<any>(fbDb, `
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

      // 4. Summary: group credits by DOCTO_CC_ACR_ID to see per-invoice credit totals.
      const creditsByInvoice: Record<number, {
        cargo_folio: string;
        cargo_bruto: number;
        credito_aplicado: number;
        saldo_nexxo: number;
        creditos: any[];
      }> = {};

      for (const charge of chargeDocs) {
        creditsByInvoice[charge.DOCTO_CC_ID] = {
          cargo_folio: charge.FOLIO,
          cargo_bruto: Number(charge.CARGO_BRUTO),
          credito_aplicado: 0,
          saldo_nexxo: 0,
          creditos: [],
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
            pago_naturaleza: credit.PAGO_NAT,
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
          saldo_nexxo: totalSaldoNexxo,
        },
        invoices: Object.values(creditsByInvoice).filter(e => e.saldo_nexxo > 0.005 || e.creditos.length > 0),
        allPaymentDocs: allPaymentDocs.map(p => ({
          folio: p.FOLIO,
          fecha: p.FECHA,
          total_importe: Number(p.TOTAL_IMPORTE),
          applied_rows: Number(p.APPLIED_ROWS),
          unapplied: Number(p.APPLIED_ROWS) === 0,
        })),
      };
    } finally {
      if (fbDb) fbDb.detach();
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; errorCode?: string }> {
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
      const msg = error.message || '';

      // Wire encryption mismatch: node-firebird always requests WireCrypt=Disabled
      // but this Firebird server has WireCrypt=Required in firebird.conf
      if (msg.toLowerCase().includes('wire encryption') || msg.toLowerCase().includes('incompatible wire')) {
        return {
          success: false,
          errorCode: 'WIRE_CRYPT',
          message: `Error de cifrado de red: el servidor Firebird tiene WireCrypt=Required pero el cliente no soporta cifrado.\n\nSolución: en el servidor donde está instalado Microsip, abre el archivo firebird.conf (generalmente en C:\\Program Files\\Firebird\\Firebird_X_X\\) y cambia la línea:\n  WireCrypt = Required\npor:\n  WireCrypt = Enabled\n\nLuego reinicia el servicio de Firebird.`,
        };
      }

      return { 
        success: false, 
        message: `Error de conexión: ${msg}` 
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

/**
 * On startup, mark any sync log entries still in "started" state as "error".
 * These are orphaned entries from a previous server run that was killed mid-sync.
 */
export async function cleanupOrphanedSyncLogs(): Promise<void> {
  try {
    const updated = await db
      .update(microsipSyncLogs)
      .set({
        status: 'error',
        errorMessage: 'Sincronización interrumpida (servidor reiniciado)',
        completedAt: new Date(),
      })
      .where(eq(microsipSyncLogs.status, 'started'))
      .returning({ id: microsipSyncLogs.id });

    if (updated.length > 0) {
      console.log(`[Microsip] Cleaned up ${updated.length} orphaned sync log(s) from previous run`);
    }
  } catch (err) {
    console.error('[Microsip] Error cleaning up orphaned sync logs:', err);
  }
}
