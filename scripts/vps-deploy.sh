#!/bin/bash
# ================================================================
# NEXXO - Script de Despliegue Seguro para VPS
# ================================================================
# USO: bash scripts/vps-deploy.sh
#
# Este script:
#   1. Hace backup de la BD ANTES de cualquier cambio
#   2. Descarga el código nuevo
#   3. Instala dependencias y compila
#   4. Aplica SOLO columnas nuevas (nunca borra datos)
#   5. Reinicia el servidor
# ================================================================

set -e

echo ""
echo "========================================="
echo "  NEXXO - Despliegue Seguro VPS"
echo "========================================="
echo ""

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: La variable DATABASE_URL no está configurada."
  exit 1
fi

# 1. Backup ANTES de todo
echo "[1/6] Creando backup de seguridad..."
bash "$(dirname "$0")/vps-backup.sh"
echo "  Backup completado. Continuando con el despliegue..."
echo ""

# 2. Obtener cambios del repositorio
echo "[2/6] Descargando cambios del repositorio..."
git pull origin main

# 3. Instalar dependencias nuevas (si las hay)
echo "[3/6] Instalando dependencias..."
npm install --production=false

# 4. Compilar el proyecto
echo "[4/6] Compilando..."
npm run build

# 5. Aplicar SOLO columnas nuevas (seguro, no borra datos)
echo "[5/6] Aplicando cambios de schema de forma segura..."
psql "$DATABASE_URL" -f "$(dirname "$0")/vps-schema-changes.sql"
echo "  Schema actualizado correctamente."

# 6. Reiniciar el servidor
echo "[6/6] Reiniciando servidor..."
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
