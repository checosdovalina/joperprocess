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

# Cargar DATABASE_URL: prioridad env variable > ecosystem.config.js
if [ -z "$DATABASE_URL" ] && [ -f "$ECOSYSTEM" ]; then
  # Extraer URL entre comillas simples de la línea DATABASE_URL
  DATABASE_URL=$(grep 'DATABASE_URL' "$ECOSYSTEM" | \
    awk '{for(i=1;i<=NF;i++) if($i~/postgresql|postgres/) {gsub(/['"'"',]/,"",$i); print $i}}' | \
    head -1)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: No se encontró DATABASE_URL."
  echo "Corre esto antes de ejecutar el script:"
  echo "  export DATABASE_URL='postgresql://usuario:password@host:5432/db'"
  exit 1
fi

export DATABASE_URL
echo "  Base de datos: OK (${DATABASE_URL%%@*}@...)"
echo ""

# Nombre del proceso PM2 (hardcodeado para evitar errores de extracción)
PM2_APP=$(grep "name:" "$ECOSYSTEM" 2>/dev/null | head -1 | \
  awk -F"'" '{print $2}' || echo "joper-app")
[ -z "$PM2_APP" ] && PM2_APP="joper-app"

# 1. Backup ANTES de todo (no falla el deploy si el backup falla)
echo "[1/6] Creando backup de seguridad..."
bash "$SCRIPT_DIR/vps-backup.sh" || echo "  AVISO: Backup falló, continuando con el deploy..."
echo ""

# 2. Obtener cambios del repositorio
echo "[2/6] Descargando cambios del repositorio..."
git -C "$PROJECT_DIR" pull origin main

# 3. Instalar dependencias
echo "[3/6] Instalando dependencias..."
npm --prefix "$PROJECT_DIR" install --production=false --silent

# 4. Compilar
echo "[4/6] Compilando..."
npm --prefix "$PROJECT_DIR" run build

# 5. Aplicar columnas nuevas de forma segura
echo "[5/6] Aplicando cambios de schema..."
psql "$DATABASE_URL" -f "$SCRIPT_DIR/vps-schema-changes.sql"
echo "  Schema actualizado correctamente."

# 6. Reiniciar con PM2
echo "[6/6] Reiniciando servidor ($PM2_APP)..."
if command -v pm2 &> /dev/null; then
  pm2 restart "$PM2_APP"
else
  echo "  AVISO: PM2 no encontrado. Reinicia el servidor manualmente."
fi

echo ""
echo "========================================="
echo "  Despliegue completado exitosamente"
echo "========================================="
echo ""
