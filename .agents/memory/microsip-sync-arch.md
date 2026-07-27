---
name: Microsip sync architecture decisions
description: Key architectural choices for the Microsip ERP sync service to avoid data corruption.
---

## Rule 1 — Never auto-close invoices by absence
Do NOT mark invoices as PAID simply because they are absent from a Microsip sync result. Microsip may return fewer records than expected due to connection issues, DB partitioning, or query limits. This caused mass incorrect closures (290+ invoices wrongly marked paid). Invoices should only become PAID when the payment sync sets `balanceDue = 0`.

**Why:** The original auto-closure logic combined with an empty result set caused 290+ invoices to be incorrectly closed. Removing it entirely is the safe choice.

## Rule 2 — Sync endpoint is async fire-and-forget
`POST /api/microsip/sync` responds immediately with `{ success: true, message: "Sincronización iniciada en segundo plano..." }` and runs the actual sync in a background IIFE. This prevents browser timeouts on large syncs (3,711+ payments).

**Why:** Payment sync with 3,711 records takes several minutes, causing `BadRequestError: request aborted` in the browser if synchronous.

**How to apply:** Users check the Historial de Sincronización to see when the sync completes, not the button response.

## Rule 3 — Orphan log cleanup on startup
`cleanupOrphanedSyncLogs()` is called on every server startup and marks any logs still in `status = 'started'` as `status = 'error'` with message "Sincronización interrumpida (servidor reiniciado)". This prevents the "En proceso" forever state when the server is killed mid-sync.

## Credentials
- Host: `200.92.216.146:3050`
- DB: `C:\Microsip Datos\Int Jop 2005.fdb`  
- `cxc_database` is configured as empty string `""` — falls back to main DB (correct behavior)
- Username: SYSDBA (standard Firebird superuser)

## Diagnóstico de timeouts a Firebird
Los errores "Timeout: No se pudo conectar" en pm2 logs no traen fecha por defecto y suelen ser viejos. Antes de asumir firewall, probar `timeout 5 bash -c 'cat < /dev/null > /dev/tcp/HOST/3050'` desde el ambiente que falla y revisar logs con `pm2 logs --timestamp`. Dev y VPS salen con IPs distintas, así que la conectividad puede diferir aunque la config sea idéntica.
