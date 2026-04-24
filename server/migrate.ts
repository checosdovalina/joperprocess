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
