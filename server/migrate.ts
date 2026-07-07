import { pool } from "./db";
import { log } from "./vite";

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_add_timezone_to_tenants",
    sql: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Mexico_City'`,
  },
  {
    id: "002_add_microsip_cxc_database",
    sql: `ALTER TABLE microsip_configs ADD COLUMN IF NOT EXISTS cxc_database text`,
  },
  {
    id: "003b_add_locale_to_tenants",
    sql: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS locale text DEFAULT 'es'`,
  },
  {
    id: "004_add_shipping_approval_token",
    sql: `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_approval_token text UNIQUE`,
  },
  {
    id: "005_add_order_release_fields",
    sql: `
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_notes text;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_by_id varchar;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS released_at timestamptz;
    `,
  },
  {
    id: "003_create_account_statement_schedules",
    sql: `CREATE TABLE IF NOT EXISTS account_statement_schedules (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id text NOT NULL REFERENCES tenants(id),
      enabled boolean NOT NULL DEFAULT false,
      schedule_days integer[] NOT NULL DEFAULT '{1,15}',
      send_hour integer NOT NULL DEFAULT 9,
      only_overdue boolean NOT NULL DEFAULT false,
      last_run_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    id: "006_create_system_logs",
    sql: `
      CREATE TABLE IF NOT EXISTS system_logs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL REFERENCES tenants(id),
        category text NOT NULL,
        level text NOT NULL DEFAULT 'info',
        action text,
        message text NOT NULL,
        details jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_created ON system_logs (tenant_id, created_at DESC);
    `,
  },
  {
    id: "007_create_documents",
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL REFERENCES tenants(id),
        title text NOT NULL,
        description text,
        type text NOT NULL DEFAULT 'operativo',
        category text,
        product_id varchar REFERENCES products(id),
        file_url text NOT NULL,
        file_name text NOT NULL,
        file_size integer,
        uploaded_by varchar REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents (tenant_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of MIGRATIONS) {
      const { rows } = await client.query(
        `SELECT id FROM _schema_migrations WHERE id = $1`,
        [migration.id]
      );

      if (rows.length === 0) {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO _schema_migrations (id) VALUES ($1)`,
          [migration.id]
        );
        log(`Migration applied: ${migration.id}`);
      }
    }
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}
