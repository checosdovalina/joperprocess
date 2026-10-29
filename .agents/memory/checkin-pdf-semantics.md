---
name: Check-in PDF semantics
description: Acceso a PDF de visitas sin minuta y conservación de las minutas históricas.
---

Consultar el PDF de un check-in debe ser posible aunque no tenga una minuta guardada y aunque el seguimiento ya esté cerrado. Si existe una minuta histórica, conservarla en lugar de regenerarla con información actual.

**Why:** El acceso al PDF desaparecía en Agroesa y Joper cuando faltaba la referencia a una minuta, tanto en visitas abiertas como cerradas. Registrar un contacto o cerrar el seguimiento no debe ser requisito para consultar los datos existentes.

**How to apply:** Cuando no exista una minuta, ofrecer una vista de los datos actuales de la visita sin registrar contactos, cerrar seguimientos, modificar fechas ni enviar correos. La consulta conserva los permisos y la empresa del check-in. Los administradores de una empresa padre pueden haber registrado visitas en una empresa hija; el vendedor referenciado no necesariamente pertenece al mismo tenant.
