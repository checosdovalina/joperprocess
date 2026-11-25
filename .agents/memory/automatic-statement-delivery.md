---
name: Protección de envíos automáticos de estados de cuenta
description: Protección de duplicados, resultados inciertos, límites del proveedor y horario de medianoche.
---

Los correos automáticos requieren una reserva persistente por empresa, fecha de envío y cliente, además del marcador general de la programación.

**Why:** Marcar sólo el final de un lote no evita duplicados cuando coinciden procesos, se reinicia el servidor o falla el registro posterior al envío. El usuario reportó numerosas copias del mismo estado de cuenta en Joper.

**How to apply:** Conservar las reservas entre procesos y reinicios. Usar la identidad de Microsip cuando exista para reconocer registros locales duplicados; no deduplicar por nombre o correo, porque pueden corresponder a clientes distintos.

Un intento cuyo resultado no se confirmó no se debe reenviar automáticamente ese día.

**Why:** Un timeout puede ocurrir después de que el proveedor haya aceptado el mensaje. Se eligió priorizar evitar copias repetidas frente a reintentar automáticamente un resultado incierto.

**How to apply:** Registrar el resultado incierto para revisión, conservar la reserva y permitir un reenvío manual deliberado. No borrar la reserva por errores del proveedor ni por fallos al registrar un envío confirmado.

Los rechazos explícitos por límite del proveedor (HTTP 429 / Cloudflare 1015) son distintos de un resultado incierto: se puede reintentar una solicitud rechazada después del plazo indicado, sin repetir los envíos confirmados.

**Why:** Los registros de la VPS confirmaron bloqueos por exceso de solicitudes. Continuar el lote o reintentar inmediatamente prolonga el problema y no resuelve la entrega.

**How to apply:** Pausar el lote, persistir el plazo de espera y retomarlo en una revisión posterior. No marcar el lote como completado mientras quede pausado. Sólo esos rechazos conocidos pueden volver a reservarse automáticamente.

Normalizar la hora de medianoche a cero antes de compararla con la hora programada.

**Why:** El formato de hora `en-US` con `hour12: false` devolvió 24 a medianoche en la VPS, haciendo que la comparación considerase vencidas horas posteriores del mismo día.

**How to apply:** Usar un ciclo de 0 a 23 y probar tanto el envío configurado para medianoche como la espera de una hora posterior.

Investigación 2026-11-25 (reporte de "125 correos"): la VPS envió exactamente 1 estado por clave Microsip (61). Las "copias" vienen de (a) varias cuentas Microsip distintas para el mismo cliente real (p. ej. JOPER con 7 CLIENTE_ID, EDUARDO RODRIGUEZ SANTANA 65025 y 65028 "(D01794)"), cada una con su correo, y (b) la copia interna a todos los admin/cobranza con notificaciones activas.

**Why:** El asunto truncado en el buzón hace que cuentas distintas parezcan el mismo correo.

**How to apply:** Ante quejas de duplicados, primero contar envíos por customer_key en account_statement_deliveries de la VPS (contraseña vía `pm2 env 0`) antes de tocar la protección de duplicados.
