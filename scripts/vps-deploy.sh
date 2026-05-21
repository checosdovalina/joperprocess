#!/bin/bash
# ================================================================
# NEXXO - Script de Despliegue Seguro para VPS
# ================================================================
# USO: bash scripts/vps-deploy.sh
#
# Este script despliega la aplicación SIN borrar datos.
# NUNCA usa "drizzle-kit push" en producción.
# ================================================================

set -e

echo ""
echo "========================================="
echo "  NEXXO - Despliegue Seguro VPS"
echo "========================================="
echo ""

# 1. Obtener cambios del repositorio
echo "[1/5] Descargando cambios del repositorio..."
git pull origin main

# 2. Instalar dependencias nuevas (si las hay)
echo "[2/5] Instalando dependencias..."
npm install --production=false

# 3. Compilar el proyecto
echo "[3/5] Compilando..."
npm run build

# 4. Aplicar SOLO columnas nuevas (seguro, no borra datos)
echo "[4/5] Aplicando cambios de schema de forma segura..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: La variable DATABASE_URL no está configurada."
  exit 1
fi
psql "$DATABASE_URL" -f scripts/vps-schema-changes.sql
echo "  Schema actualizado correctamente."

# 5. Reiniciar el servidor (ajusta según tu proceso manager)
echo "[5/5] Reiniciando servidor..."
if command -v pm2 &> /dev/null; then
  pm2 restart nexxo
elif command -v systemctl &> /dev/null; then
  systemctl restart nexxo
else
  echo "  AVISO: Reinicia el servidor manualmente."
fi

echo ""
echo "========================================="
echo "  Despliegue completado exitosamente"
echo "========================================="
echo ""
