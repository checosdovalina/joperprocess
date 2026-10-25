---
name: Protección de envíos automáticos de estados de cuenta
description: Envíos como máximo una vez y tratamiento de resultados inciertos del proveedor.
---

Los correos automáticos requieren una reserva persistente por empresa, fecha de envío y cliente, además del marcador general de la programación.

**Why:** Marcar sólo el final de un lote no evita duplicados cuando coinciden procesos, se reinicia el servidor o falla el registro posterior al envío. El usuario reportó numerosas copias del mismo estado de cuenta en Joper.

**How to apply:** Conservar las reservas entre procesos y reinicios. Usar la identidad de Microsip cuando exista para reconocer registros locales duplicados; no deduplicar por nombre o correo, porque pueden corresponder a clientes distintos.

Un intento cuyo resultado no se confirmó no se debe reenviar automáticamente ese día.

**Why:** Un timeout puede ocurrir después de que el proveedor haya aceptado el mensaje. Se eligió priorizar evitar copias repetidas frente a reintentar automáticamente un resultado incierto.

**How to apply:** Registrar el resultado incierto para revisión, conservar la reserva y permitir un reenvío manual deliberado. No borrar la reserva por errores del proveedor ni por fallos al registrar un envío confirmado.
