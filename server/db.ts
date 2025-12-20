import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');

let pool: NeonPool | PgPool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isNeonDatabase) {
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool as NeonPool, schema });
} else {
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg({ client: pool as PgPool, schema });
}

export { pool, db };
