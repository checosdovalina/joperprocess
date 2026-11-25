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

MailerSend genera un correo separado por cada destinatario TO y adjunta TODAS las CC a cada uno: N correos del cliente × CC = N copias por dirección interna.

**Why:** El 2026-11-25 la VPS envió 1 estado por cliente, pero la API de MailerSend mostró cada CC interna repetida 3–6 veces (igual al número de correos del cliente). Eso explicó los "125 correos".

**How to apply:** Nunca mezclar correos del cliente con CC internas en el mismo mensaje; la copia interna va en un mensaje aparte con un solo TO. Para auditar, `GET /v1/messages` y `/v1/messages/{id}` funcionan con la llave actual (límite de ~60 solicitudes/min); `/domains` y analytics no tienen permiso.

En Microsip de Joper, los "vendedores" (CLIENTES.VENDEDOR_ID → VENDEDORES) son zonas (ZONA 2, CENTRO, SURESTE, MOVIL MX, GRUPO…), no personas. El "vendedor que atiende" se obtiene asignando un usuario de Nexxo a cada zona.

**Why:** El usuario eligió tomar el vendedor de Microsip el 2026-11-25; VENDEDORES no tiene correo ni relación con usuarios.

**How to apply:** La sincronización solo actualiza el nombre de la zona; nunca debe sobrescribir el usuario asignado en Nexxo. Destinatarios pedidos por Joper: correos del cliente, rodrigopg@, cobranza@ y el vendedor de la zona; no joper@ ni ventas@.
