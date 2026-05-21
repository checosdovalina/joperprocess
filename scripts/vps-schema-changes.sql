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
-- Permite omitir el envío de estados de cuenta por email por cliente
-- ----------------------------------------------------------------
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS skip_statement_email boolean NOT NULL DEFAULT false;

-- ================================================================
-- INSTRUCCIONES PARA AGREGAR NUEVAS COLUMNAS EN EL FUTURO:
--
-- 1. Agrega la columna en shared/schema.ts
-- 2. Agrega el ALTER TABLE correspondiente AQUÍ con la fecha
-- 3. Al desplegar en VPS: bash scripts/vps-deploy.sh
--    (NUNCA correr "npm run db:push" en producción)
-- ================================================================
