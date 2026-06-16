-- ================================================================
-- NEXXO - Cambios de Schema para VPS (SEGURO - no borra datos)
-- ================================================================
-- Ejecutar con: psql "$DATABASE_URL" -f scripts/vps-schema-changes.sql
--
-- REGLAS:
--   - Solo ADD COLUMN IF NOT EXISTS (nunca DROP TABLE o DROP COLUMN)
--   - Agregar aquí cada nueva columna al momento de crearla en schema.ts
--   - Este archivo es acumulativo — incluye TODOS los cambios históricos
-- ================================================================

-- ----------------------------------------------------------------
-- [2026-05-20] Columna: customers.skip_statement_email
-- ----------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS skip_statement_email boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------
-- [2026-05-XX] Columna: tenants.timezone
-- ----------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Mexico_City';

-- ----------------------------------------------------------------
-- [2026-05-XX] Columna: microsip_configs.cxc_database
-- ----------------------------------------------------------------
ALTER TABLE microsip_configs
  ADD COLUMN IF NOT EXISTS cxc_database text;

-- ----------------------------------------------------------------
-- [2026-05-XX] Columna: tenants.locale
-- ----------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'es';

-- ----------------------------------------------------------------
-- [2026-05-XX] Columna: quotations.shipping_approval_token
-- ----------------------------------------------------------------
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS shipping_approval_token text UNIQUE;

-- ----------------------------------------------------------------
-- [2026-06-16] Tabla: account_statement_schedules
-- Programación automática de envío de estados de cuenta por tenant
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_statement_schedules (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id text NOT NULL REFERENCES tenants(id),
  enabled boolean NOT NULL DEFAULT false,
  schedule_days integer[] NOT NULL DEFAULT '{1,15}',
  send_hour integer NOT NULL DEFAULT 9,
  only_overdue boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- [2026-06-16] Columnas: orders — Liberación de Pedidos
-- Flujo de aprobación de pedidos antes de pasar a producción
-- ----------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS release_status text NOT NULL DEFAULT 'pending';
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS release_notes text;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS released_by_id varchar;
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- ================================================================
-- INSTRUCCIONES PARA AGREGAR NUEVAS COLUMNAS EN EL FUTURO:
--
-- 1. Agrega la columna en shared/schema.ts
-- 2. Agrega el ALTER TABLE correspondiente AQUÍ con la fecha
-- 3. Al desplegar en VPS: bash scripts/vps-deploy.sh
--    (NUNCA correr "npm run db:push" en producción)
-- ================================================================
