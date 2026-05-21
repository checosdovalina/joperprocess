#!/bin/bash
# ================================================================
# NEXXO - Script de Backup de Base de Datos
# ================================================================
# USO MANUAL:     bash scripts/vps-backup.sh
# USO EN CRONTAB: 0 2 * * * /ruta/al/proyecto/scripts/vps-backup.sh
#
# Guarda backups en /var/backups/nexxo/ y conserva los últimos 30 días
# ================================================================

set -e

BACKUP_DIR="/var/backups/nexxo"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nexxo_$DATE.sql.gz"
KEEP_DAYS=30

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: La variable DATABASE_URL no está configurada."
  echo "Exporta la variable antes de correr este script:"
  echo "  export DATABASE_URL='postgres://...'"
  exit 1
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Hacer el backup comprimido
echo "[$(date '+%H:%M:%S')] Iniciando backup..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%H:%M:%S')] Backup guardado: $BACKUP_FILE ($SIZE)"

# Eliminar backups más viejos de KEEP_DAYS días
DELETED=$(find "$BACKUP_DIR" -name "nexxo_*.sql.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%H:%M:%S')] Backups eliminados (>$KEEP_DAYS días): $DELETED archivo(s)"
fi

echo "[$(date '+%H:%M:%S')] Backup completado exitosamente."
