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

-- ----------------------------------------------------------------
-- [2026-07-07] Tabla: system_logs — Registro de Actividad
-- Guarda envíos de estados de cuenta, sincronizaciones y errores
-- ----------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_created
  ON system_logs (tenant_id, created_at DESC);

-- ----------------------------------------------------------------
-- [2026-07-07] Tabla: documents — Documentos y Manuales
-- Guarda PDFs operativos y de despiece por tenant
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- [2026-07-08] Tabla: empresas — Marcas comerciales dentro de un tenant
-- Una "empresa" (p.ej. "Joper Ligero" / "Joper Móvil") es un nivel comercial
-- POR DEBAJO del tenant. Comparten la misma BD, clientes, productos y Microsip.
-- Sólo cambia la marca y sirve para segmentar cotizaciones/pedidos/embarques y
-- a qué empresa pertenece cada vendedor. NO es un tenant nuevo.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  clave text,
  logo_url text,
  primary_color text DEFAULT '#4DA3FF',
  secondary_color text DEFAULT '#1F3C88',
  subdomain text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empresas_tenant ON empresas (tenant_id);

-- Columna empresa_id (nullable) en usuarios y documentos comerciales
ALTER TABLE users ADD COLUMN IF NOT EXISTS empresa_id varchar REFERENCES empresas(id);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS empresa_id varchar REFERENCES empresas(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS empresa_id varchar REFERENCES empresas(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS empresa_id varchar REFERENCES empresas(id);

-- [2026-07-08] Jerarquía de compañías (Opción B): compañías hijas
-- Una compañía puede tener una compañía "padre" (auto-referencia en tenants).
-- Las compañías hijas tienen sus PROPIOS datos aislados; el admin de la compañía
-- padre puede entrar y administrar cualquier compañía descendiente.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_id varchar REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants (parent_id);

-- ----------------------------------------------------------------
-- [2026-08-25] Columna: quotations.tax_rate
-- La tasa de impuesto se usa en cotizaciones USA y en relaciones de
-- cotización cargadas desde pedidos.
-- ----------------------------------------------------------------
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS tax_rate numeric(8,2) DEFAULT 16;

-- ================================================================
-- INSTRUCCIONES PARA AGREGAR NUEVAS COLUMNAS EN EL FUTURO:
--
-- 1. Agrega la columna en shared/schema.ts
-- 2. Agrega el ALTER TABLE correspondiente AQUÍ con la fecha
-- 3. Al desplegar en VPS: bash scripts/vps-deploy.sh
--    (NUNCA correr "npm run db:push" en producción)
-- ================================================================
