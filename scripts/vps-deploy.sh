#!/bin/bash
# ================================================================
# NEXXO - Script de Despliegue Seguro para VPS
# ================================================================
# USO: bash scripts/vps-deploy.sh
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ECOSYSTEM="$PROJECT_DIR/ecosystem.config.js"

echo ""
echo "========================================="
echo "  NEXXO - Despliegue Seguro VPS"
echo "========================================="
echo ""

# Cargar DATABASE_URL desde ecosystem.config.js si no está en el entorno
if [ -z "$DATABASE_URL" ]; then
  if [ -f "$ECOSYSTEM" ]; then
    DATABASE_URL=$(awk -F"'" '/DATABASE_URL/{print $2}' "$ECOSYSTEM")
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: No se encontró DATABASE_URL."
  echo "Exporta la variable antes de correr este script:"
  echo "  export DATABASE_URL='postgresql://...'"
  exit 1
fi

export DATABASE_URL

# 1. Backup ANTES de todo
echo "[1/6] Creando backup de seguridad..."
bash "$SCRIPT_DIR/vps-backup.sh"
echo ""

# 2. Obtener cambios del repositorio
echo "[2/6] Descargando cambios del repositorio..."
git -C "$PROJECT_DIR" pull origin main

# 3. Instalar dependencias
echo "[3/6] Instalando dependencias..."
npm --prefix "$PROJECT_DIR" install --production=false

# 4. Compilar
echo "[4/6] Compilando..."
npm --prefix "$PROJECT_DIR" run build

# 5. Aplicar columnas nuevas de forma segura
echo "[5/6] Aplicando cambios de schema..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/vps-schema-changes.sql"
echo "  Schema actualizado correctamente."

# 6. Reiniciar con PM2
echo "[6/6] Reiniciando servidor..."
PM2_APP=$(grep "name:" "$ECOSYSTEM" 2>/dev/null | head -1 | sed "s/.*name[^'\"]*['\"]//;s/['\"].*//") 
if [ -n "$PM2_APP" ] && command -v pm2 &> /dev/null; then
  pm2 restart "$PM2_APP"
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
