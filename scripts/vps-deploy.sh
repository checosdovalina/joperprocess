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
DEPLOY_STATE_DIR="/var/lib/nexxo"
DEPLOY_MARKER="$DEPLOY_STATE_DIR/deployed-commit"
DEPLOY_LOCK="/var/lock/nexxo-deploy.lock"

# Evitar instalaciones y compilaciones simultáneas. Una segunda ejecución
# termina de inmediato en vez de competir por CPU, memoria y el caché de npm.
exec 9>"$DEPLOY_LOCK"
if ! flock -n 9; then
  echo "ERROR: Ya hay otro despliegue de NEXXO ejecutándose."
  echo "Revisa el proceso con: ps -eo pid,stat,etime,cmd | grep '[v]ps-deploy'"
  exit 1
fi

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

# 1. Obtener cambios antes de realizar trabajo costoso.
echo "[1/6] Descargando cambios del repositorio..."
PREVIOUS_DEPLOYED_COMMIT=""
if [ -f "$DEPLOY_MARKER" ]; then
  PREVIOUS_DEPLOYED_COMMIT=$(cat "$DEPLOY_MARKER")
fi

git -C "$PROJECT_DIR" pull origin main
CURRENT_COMMIT=$(git -C "$PROJECT_DIR" rev-parse HEAD)

if [ -n "$PREVIOUS_DEPLOYED_COMMIT" ] && [ "$PREVIOUS_DEPLOYED_COMMIT" = "$CURRENT_COMMIT" ]; then
  echo ""
  echo "La versión $CURRENT_COMMIT ya está desplegada. No hay trabajo pendiente."
  exit 0
fi

# Determinar si cambió el árbol de dependencias desde el último deploy exitoso.
INSTALL_DEPENDENCIES=true
if [ -n "$PREVIOUS_DEPLOYED_COMMIT" ] && git -C "$PROJECT_DIR" cat-file -e "$PREVIOUS_DEPLOYED_COMMIT^{commit}" 2>/dev/null; then
  if ! git -C "$PROJECT_DIR" diff --quiet "$PREVIOUS_DEPLOYED_COMMIT" "$CURRENT_COMMIT" -- package.json package-lock.json; then
    INSTALL_DEPENDENCIES=true
  else
    INSTALL_DEPENDENCIES=false
  fi
fi

# 2. Backup solo cuando existe una versión nueva por desplegar.
echo ""
echo "[2/6] Creando backup de seguridad..."
bash "$SCRIPT_DIR/vps-backup.sh" || echo "  AVISO: Backup falló, continuando con el deploy..."
echo ""

# 3. Instalar dependencias (incluyendo devDependencies: vite, tailwind,
#    postcss, esbuild, etc. son necesarias para compilar). Forzamos
#    NODE_ENV=development + --include=dev para que npm NO omita devDependencies
#    aunque el servidor tenga NODE_ENV=production configurado globalmente.
#
#    IMPORTANTE: el package-lock.json generado dentro de Replit apunta a un
#    proxy interno que no existe fuera de Replit. Preparamos temporalmente una
#    copia compatible con npm público y restauramos el archivo versionado al
#    terminar, incluso si la instalación falla o se interrumpe.
if [ "$INSTALL_DEPENDENCIES" = true ]; then
  echo "[3/6] Instalando dependencias actualizadas..."
  PACKAGE_LOCK="$PROJECT_DIR/package-lock.json"
  PACKAGE_LOCK_BACKUP=""

  restore_package_lock() {
    if [ -n "$PACKAGE_LOCK_BACKUP" ] && [ -f "$PACKAGE_LOCK_BACKUP" ]; then
      cp "$PACKAGE_LOCK_BACKUP" "$PACKAGE_LOCK"
      rm -f "$PACKAGE_LOCK_BACKUP"
    fi
  }

  if [ -f "$PACKAGE_LOCK" ] && grep -Eq 'package-firewall\.replit\.(local|internal)/npm/' "$PACKAGE_LOCK"; then
    PACKAGE_LOCK_BACKUP=$(mktemp)
    cp "$PACKAGE_LOCK" "$PACKAGE_LOCK_BACKUP"
    trap restore_package_lock EXIT INT TERM
    sed -i -E 's#https?://package-firewall\.replit\.(local|internal)/npm/#https://registry.npmjs.org/#g' "$PACKAGE_LOCK"
  fi

  NODE_ENV=development \
    npm_config_registry=https://registry.npmjs.org \
    npm --prefix "$PROJECT_DIR" install --include=dev --prefer-offline --no-audit --no-fund

  restore_package_lock
  trap - EXIT INT TERM
else
  echo "[3/6] Dependencias sin cambios; reutilizando node_modules."
fi

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

mkdir -p "$DEPLOY_STATE_DIR"
printf '%s\n' "$CURRENT_COMMIT" > "$DEPLOY_MARKER"

echo ""
echo "========================================="
echo "  Despliegue completado exitosamente"
echo "========================================="
echo ""
