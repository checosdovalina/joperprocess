# Manual de Usuario — Nexxo Sistema Comercial
> Versión Mayo 2026 · nexxo.com.mx

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Manual por Módulo](#4-manual-por-módulo)
   - 4.1 [Dashboard](#41-dashboard)
   - 4.2 [Clientes](#42-clientes)
   - 4.3 [Check-ins (Visitas de Campo)](#43-check-ins-visitas-de-campo)
   - 4.4 [Visitas Programadas](#44-visitas-programadas)
   - 4.5 [Cotizaciones](#45-cotizaciones)
   - 4.6 [Autorización de Crédito](#46-autorización-de-crédito)
   - 4.7 [Pedidos](#47-pedidos)
   - 4.8 [Producción](#48-producción)
   - 4.9 [Tablero de Operaciones (Pipeline)](#49-tablero-de-operaciones-pipeline)
   - 4.10 [Embarques](#410-embarques)
   - 4.11 [Facturación (Cuentas por Cobrar)](#411-facturación-cuentas-por-cobrar)
   - 4.12 [Cobranza (Pagos)](#412-cobranza-pagos)
   - 4.13 [Incidencias](#413-incidencias)
   - 4.14 [Productos](#414-productos)
   - 4.15 [Usuarios](#415-usuarios)
   - 4.16 [Configuración de Empresa](#416-configuración-de-empresa)
   - 4.17 [Integración Microsip](#417-integración-microsip)
   - 4.18 [Gestión de Empresas (SuperAdmin)](#418-gestión-de-empresas-superadmin)
5. [Manual por Rol](#5-manual-por-rol)
   - 5.1 [Administrador](#51-administrador)
   - 5.2 [Vendedor](#52-vendedor)
   - 5.3 [Ventas y Logística](#53-ventas-y-logística)
   - 5.4 [Crédito y Cobranza](#54-crédito-y-cobranza)
   - 5.5 [Fábrica / Producción](#55-fábrica--producción)
   - 5.6 [Embarques](#56-embarques)
   - 5.7 [Facturación](#57-facturación)
   - 5.8 [Servicio al Cliente](#58-servicio-al-cliente)
   - 5.9 [Servicio Técnico](#59-servicio-técnico)
   - 5.10 [SuperAdmin](#510-superadmin)
6. [Flujo Comercial Completo](#6-flujo-comercial-completo)
7. [Portal Público para Clientes](#7-portal-público-para-clientes)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)

---

## 1. Introducción

**Nexxo Sistema Comercial** es una plataforma empresarial diseñada para gestionar el ciclo comercial completo: desde la prospección y visita al cliente hasta la facturación y cobro. Está optimizada tanto para uso en campo (móvil) como en oficina (escritorio).

### Características Principales

- **Multi-empresa**: Cada empresa opera en su propio subdominio (`empresa.nexxo.com.mx`) con datos completamente aislados.
- **Control por roles**: Nueve roles distintos que limitan el acceso a cada módulo según la función del usuario.
- **Integración con Microsip ERP**: Sincronización automática de clientes, productos, facturas y pagos desde Firebird.
- **Generación de PDFs corporativos**: Cotizaciones, minutas de visita, autorizaciones de crédito e invoices con diseño profesional.
- **Notificaciones por correo**: MailerSend envía automáticamente documentos y alertas a clientes, vendedores y administradores.
- **Soporte multi-moneda**: Cotizaciones en MXN o USD con tipo de cambio configurable.

### Requisitos de Acceso

- Navegador web moderno (Chrome, Safari, Firefox, Edge).
- Conexión a internet.
- Credenciales proporcionadas por el administrador de la empresa.

---

## 2. Acceso al Sistema

### 2.1 Ingresar al Sistema

1. Abre tu navegador y ve a la URL de tu empresa: `https://tuempresa.nexxo.com.mx`
2. Ingresa tu **nombre de usuario** y **contraseña**.
3. Haz clic en **Iniciar Sesión**.

> El sistema recordará tu sesión. Si cierras el navegador y regresas, es posible que ya estés autenticado.

### 2.2 Primer Inicio de Sesión (Configuración Inicial)

Al ingresar por primera vez:
- El sistema pedirá crear el primer usuario **Administrador** mediante el formulario de registro público.
- Una vez creado ese primer admin, el registro público se cierra automáticamente.
- Todos los demás usuarios deberán ser creados por un administrador desde el módulo **Usuarios**.

### 2.3 Recuperación de Contraseña

Contacta a tu administrador del sistema para que restablezca tu contraseña desde el módulo Usuarios.

### 2.4 Navegación General

- **Barra lateral (sidebar)**: Muestra únicamente los módulos a los que tu rol tiene acceso.
- **Botón de menú (☰)**: En móvil, colapsa y expande el sidebar.
- **Tu nombre de usuario**: Visible en la parte inferior del sidebar. Haz clic para cerrar sesión.

---

## 3. Roles y Permisos

### Tabla de Acceso por Módulo

| Módulo | Admin | Vendedor | Ventas/Log. | Crédito/Cob. | Fábrica | Embarques | Facturación | Svc. Cliente | Svc. Técnico |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tablero Operaciones | ✅ | — | ✅ | — | — | — | — | — | — |
| Clientes | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| Check-ins | ✅ | ✅ | — | — | — | — | — | — | — |
| Visitas Programadas | ✅ | ✅ | — | — | — | — | — | — | — |
| Cotizaciones | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Autorización Crédito | ✅ | — | — | ✅ | — | — | — | — | — |
| Pedidos | ✅ | — | ✅ | — | — | — | — | — | — |
| Producción | ✅ | — | — | — | ✅ | — | — | — | — |
| Tablero Producción | ✅ | — | ✅ | — | ✅ | ✅ | — | — | — |
| Embarques | ✅ | — | ✅ | — | — | ✅ | — | — | — |
| Facturación | ✅ | — | — | — | — | — | ✅ | — | — |
| Cobranza | ✅ | — | — | ✅ | — | — | — | — | — |
| Incidencias | ✅ | — | — | — | — | — | — | ✅ | ✅ |
| Productos | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Usuarios | ✅ | — | — | — | — | — | — | — | — |
| Configuración | ✅ | — | — | — | — | — | — | — | — |
| Microsip | ✅ | — | — | — | — | — | — | — | — |
| Gestión Empresas | SuperAdmin | — | — | — | — | — | — | — | — |

---

## 4. Manual por Módulo

---

### 4.1 Dashboard

**Ruta**: `/dashboard`  
**Roles**: Todos

El dashboard es la pantalla principal al iniciar sesión. Su contenido varía según el rol:

#### Dashboard General (todos los roles excepto Vendedor)

Muestra un resumen en tiempo real del estado del negocio:

- **Cotizaciones Pendientes**: Número de cotizaciones en estado Borrador o Enviada.
- **Pedidos Activos**: Pedidos en producción o pendientes de embarque.
- **Facturas Vencidas**: Importe total de facturas con fecha de vencimiento pasada.
- **Clientes Activos**: Total de clientes registrados en el tenant.
- **Ventas por Categoría**: Gráfica de barras con las categorías de productos más vendidas.
- **Contactos Recientes**: Últimas visitas y check-ins registrados.

#### Dashboard del Vendedor

Muestra métricas personales del vendedor en sesión:

- **Mis Ventas del Mes**: Total en MXN/USD de cotizaciones convertidas a pedido en el mes actual.
- **Mis Cotizaciones Activas**: Cotizaciones propias en borrador o enviadas al cliente.
- **Mis Visitas**: Check-ins realizados en los últimos 30 días.
- **Clientes sin Visitar**: Clientes asignados que no han tenido visita reciente.

---

### 4.2 Clientes

**Ruta**: `/customers`  
**Roles**: Administrador, Vendedor, Crédito/Cobranza

Este módulo centraliza toda la información de los clientes de la empresa.

#### 4.2.1 Ver Lista de Clientes

La pantalla principal muestra una tabla con todos los clientes del tenant, ordenados por nombre. Columnas visibles:
- **Nombre / Razón Social**
- **RFC**
- **Ciudad**
- **Teléfono**
- **Contacto principal**
- **Acciones**

Puedes usar el **buscador** para filtrar por nombre, RFC, ciudad o teléfono. La búsqueda normaliza acentos (ej. buscar "garcia" encontrará "García").

#### 4.2.2 Crear Cliente

1. Haz clic en el botón **Nuevo Cliente**.
2. Llena el formulario:
   - **Nombre / Razón Social** *(requerido)*
   - **RFC** *(requerido)*
   - **Nombre del contacto**
   - **Teléfono**
   - **Email**
   - **Dirección** (calle, colonia, ciudad, estado, CP)
   - **Coordenadas GPS** (latitud/longitud para validar visitas en campo — se puede ingresar manualmente o capturar en el mapa)
   - **Límite de crédito** (en MXN)
   - **Días de crédito** (plazo de pago habitual)
   - **Notas internas**
3. Haz clic en **Guardar**.

#### 4.2.3 Editar Cliente

1. En la tabla, haz clic en el botón de **editar (lápiz)** junto al cliente.
2. Modifica los campos necesarios.
3. Haz clic en **Guardar**.

#### 4.2.4 Ver Resumen del Cliente

Al hacer clic en el nombre del cliente o en el botón de **ver detalles (ojo)**, se abre un panel lateral con:

- **Información general**: RFC, contacto, teléfono, email, dirección.
- **Estado de crédito**: Límite asignado, saldo utilizado, disponible, y alertas de vencimiento.
- **Facturas pendientes**: Lista de facturas con días vencidos e importe.
- **Pedidos activos**: Pedidos en producción o embarque para ese cliente.
- **Historial de visitas**: Últimos check-ins con fecha, vendedor y notas.
- **Cotizaciones recientes**: Últimas cotizaciones con estado y monto.

> Este resumen es especialmente útil para el vendedor antes de iniciar una visita, ya que concentra toda la información relevante del cliente en una sola pantalla.

---

### 4.3 Check-ins (Visitas de Campo)

**Ruta**: `/checkins`  
**Roles**: Administrador, Vendedor

Los check-ins registran las visitas presenciales a los clientes. Generan un documento PDF (minuta de visita) y lo envían automáticamente por correo.

#### 4.3.1 Iniciar un Check-in

1. Haz clic en **Nueva Visita**.
2. Selecciona el **cliente** en el buscador (busca por nombre o RFC).
3. El sistema muestra un resumen rápido del cliente: facturas vencidas, saldo de crédito, último check-in.
4. Haz clic en **Iniciar Visita**.

> El sistema registra la hora de inicio y, si el cliente tiene coordenadas configuradas, valida que estés dentro del rango de ubicación.

#### 4.3.2 Durante la Visita

Una vez iniciado el check-in, tienes acceso a:

- **Notas de la visita**: Campo de texto libre para registrar lo discutido.
- **Carga de fotos**: Sube una o varias fotografías (máximo recomendado: 5 imágenes). Se guardan en almacenamiento en la nube.
- **Facturas pendientes del cliente**: Visibles en pantalla para gestionar cobros in situ.

#### 4.3.3 Finalizar el Check-in (Checkout)

1. Cuando termines la visita, haz clic en **Finalizar Visita**.
2. Agrega:
   - **Comentarios finales** (acuerdos, compromisos, próximos pasos).
   - **Notas internas** (no visibles para el cliente).
3. Confirma el checkout.

Al confirmar, el sistema automáticamente:
- Genera una **minuta en PDF** con diseño corporativo (logo, RFC, datos del cliente, notas, fotos, hora de inicio y fin).
- Envía el PDF por correo a: el cliente, el vendedor y el administrador.
- Registra las coordenadas GPS del checkout.

#### 4.3.4 Ver Historial de Check-ins

La tabla principal muestra todos los check-ins del tenant con:
- Fecha y hora
- Cliente visitado
- Vendedor
- Duración de la visita
- Estado (En Progreso / Finalizado)
- Botón para ver detalles y descargar PDF

#### 4.3.5 Ver Detalles de un Check-in

Haz clic en el botón de ver (ojo) para abrir el detalle completo:
- Información del cliente en el momento de la visita.
- Notas y comentarios.
- Fotos cargadas (miniaturas con vista ampliada).
- Botón para **descargar el PDF** de la minuta.

---

### 4.4 Visitas Programadas

**Ruta**: `/scheduled-visits`  
**Roles**: Administrador, Vendedor

Permite planificar visitas futuras a clientes para mantener una agenda organizada.

#### 4.4.1 Programar una Visita

1. Haz clic en **Nueva Visita Programada**.
2. Selecciona:
   - **Cliente**
   - **Fecha y hora** de la visita programada
   - **Notas de preparación** (opcional)
3. Guarda.

#### 4.4.2 Ver Agenda

La pantalla muestra las visitas programadas ordenadas por fecha, con indicador de si están próximas, vencidas o completadas. Al realizar el check-in de una visita programada, el sistema la marca como completada automáticamente.

---

### 4.5 Cotizaciones

**Ruta**: `/quotations`  
**Roles**: Administrador, Vendedor, Ventas/Logística, Crédito/Cobranza

El módulo de cotizaciones cubre desde la creación del documento hasta la aprobación del cliente y la conversión a pedido.

#### 4.5.1 Lista de Cotizaciones

La tabla principal muestra todas las cotizaciones del tenant con:
- **Folio** (ej. `MEX-758057`)
- **Cliente**
- **Fecha de creación**
- **Total** (en la moneda de la cotización: MXN o USD)
- **Estado**
- **Número de productos**
- **Acciones**

##### Estados de una Cotización

| Estado | Descripción |
|---|---|
| **Borrador** | Recién creada, aún no enviada al cliente. Se puede editar. |
| **Enviada** | Enviada al cliente para aprobación. En espera de respuesta. |
| **Aprobada por Cliente** | El cliente aceptó la cotización desde el enlace público. |
| **Rechazada por Cliente** | El cliente rechazó la cotización desde el enlace público. |
| **Convertida** | Se convirtió en pedido. Ya no se puede modificar. |
| **Expirada** | Superó la fecha de vigencia sin aprobación. |

#### 4.5.2 Crear una Cotización

1. Haz clic en **Nueva Cotización**.
2. Completa el formulario:

**Sección: Información General**
- **Cliente** *(requerido)*: Buscador por nombre o RFC.
- **Moneda**: MXN o USD.
- **Tipo de cambio**: Si la moneda es USD, ingresa el tipo de cambio MXN/USD a aplicar.
- **Fecha de vigencia**: Fecha hasta la que es válida la cotización.
- **Condiciones de pago**: Ej. "15 días", "30 días", "Contado".
- **Tiempo de entrega**: Ej. "1 semana", "15 días hábiles".
- **Notas**: Observaciones visibles en el PDF.
- **Condiciones**: Texto de condiciones generales visible en el PDF.
- **Notas internas**: Solo visibles dentro del sistema, no en el PDF.
- **¿Envío a cargo de la empresa?**: Al activar esta opción, el admin debe aprobar el envío gratuito antes de que el vendedor pueda enviar la cotización al cliente.
- **Descuento global (%)**: Porcentaje de descuento aplicado al subtotal total.

**Sección: Productos**

3. Haz clic en **Agregar Producto** para abrir el selector.
4. En el selector:
   - Usa el buscador para encontrar el producto por nombre o código.
   - Se muestra el precio de lista, moneda y categoría.
   - Haz clic en el producto para agregarlo.
5. Por cada producto en la cotización:
   - **Cantidad**: Número de unidades.
   - **Precio unitario**: Se llena automáticamente desde el catálogo pero puede editarse.
   - **Descuento (%)**: Por producto. El sistema valida que no supere el descuento máximo configurado para ese producto o categoría.
6. El sistema calcula automáticamente:
   - Subtotal por producto.
   - Subtotal general.
   - Descuento global si aplica.
   - IVA (16%).
   - **Total en la moneda de la cotización** (convirtiendo productos MXN a USD o viceversa usando el tipo de cambio configurado).

7. Para guardar como borrador: clic en **Guardar Borrador**.
8. Para guardar y enviar al cliente de inmediato: clic en **Guardar y Enviar**.

> **Nota sobre monedas mixtas**: Si la cotización es en USD pero los productos son de precio MXN, el sistema convierte automáticamente usando el tipo de cambio ingresado. Los totales en el PDF siempre se muestran en la moneda de la cotización.

#### 4.5.3 Editar una Cotización

Solo las cotizaciones en estado **Borrador** pueden editarse. Haz clic en el botón de editar (lápiz) en la tabla.

Si la cotización ya fue enviada y necesita cambios, el administrador puede rechazar el envío de flete (si aplicaba) para regresar al estado borrador, o el admin puede eliminarla y crear una nueva.

#### 4.5.4 Enviar Cotización al Cliente

Desde el menú `⋯` de la cotización:

**Opción 1 — Enviar por Correo**
1. Clic en **Enviar por correo**.
2. Se abre el diálogo de envío con el email del cliente preconfigurado.
3. Puedes agregar destinatarios adicionales (CC): escribe el email y presiona Enter o el botón +.
4. Clic en **Enviar**.
5. El cliente recibe un correo con:
   - Resumen de la cotización.
   - Enlace para ver y **aprobar o rechazar** la cotización desde su navegador (sin necesidad de login).
   - El PDF adjunto.

**Opción 2 — Copiar enlace de aprobación**
1. Clic en **Copiar enlace de aprobación**.
2. Se copia al portapapeles la URL pública de la cotización.
3. Compártela por WhatsApp, mensaje o cualquier medio.

> Si la cotización tiene envío a cargo de la empresa pendiente de aprobación por el admin, ambas opciones estarán bloqueadas con un candado hasta que el admin resuelva.

#### 4.5.5 Descargar PDF

Desde el menú `⋯`, clic en **Descargar PDF**. El sistema genera y descarga el PDF corporativo con:
- Encabezado con logo y datos de la empresa.
- Datos del cliente y de la cotización (folio, fecha, moneda, vendedor, vigencia, condiciones de pago).
- Tabla de productos con: código, descripción, cantidad, precio unitario, descuento y subtotal — todos en la moneda de la cotización.
- Cuadro de totales con subtotal, descuento global, IVA y total.
- Si hay conversión de moneda: nota del tipo de cambio aplicado.
- Sección de notas y condiciones.
- Pie de página corporativo.

#### 4.5.6 Aprobar Envío de Flete (Admin)

Cuando una cotización tiene **envío a cargo de la empresa** pendiente:
1. El admin ve el indicador naranja "Envío pendiente" en la tabla.
2. Desde el menú `⋯`, puede:
   - **Aprobar Envío Gratis**: Libera la cotización para ser enviada al cliente.
   - **Rechazar Envío Gratis**: Regresa la cotización a Borrador y notifica al vendedor por correo con el motivo del rechazo.

#### 4.5.7 Eliminar Cotización (Admin)

Solo administradores pueden eliminar cotizaciones. Desde el menú `⋯`:
1. Clic en **Eliminar cotización** (aparece en rojo al final del menú).
2. Confirmar en el diálogo de confirmación.

> Esta acción es irreversible y elimina también los ítems y autorizaciones de crédito asociadas.

---

### 4.6 Autorización de Crédito

**Ruta**: `/credit-auth`  
**Roles**: Administrador, Crédito/Cobranza

Este módulo gestiona las solicitudes de crédito que se generan cuando una cotización es aprobada por el cliente.

#### 4.6.1 ¿Cuándo se crea una autorización de crédito?

Automáticamente cuando:
- El cliente aprueba una cotización desde el enlace público, O
- El vendedor marca la cotización como aprobada internamente.

#### 4.6.2 Lista de Autorizaciones

La tabla muestra:
- Folio de la cotización relacionada.
- Cliente.
- Monto solicitado.
- Vendedor.
- Estado de la autorización.
- Fecha de solicitud.

##### Estados de Autorización

| Estado | Descripción |
|---|---|
| **Pendiente** | Esperando revisión del área de crédito. |
| **Aprobada** | Crédito autorizado. Se puede convertir en pedido. |
| **Rechazada** | Crédito denegado. El vendedor es notificado. |
| **En Análisis** | El área de crédito la está revisando actualmente. |

#### 4.6.3 Revisar y Resolver una Autorización

1. Haz clic en la autorización para ver el detalle.
2. El panel lateral muestra:
   - Datos de la cotización (folio, cliente, monto, productos).
   - **Estado de crédito del cliente**: saldo utilizado vs. límite, facturas vencidas, días de mora.
   - Historial de pagos del cliente.
   - Comentarios previos.
3. Agrega un **comentario** con tu análisis.
4. Cambia el estado:
   - **Aprobar**: Genera la autorización y permite crear el pedido.
   - **Rechazar**: Envía correo al vendedor con el motivo.
   - **Marcar en Análisis**: Indica que se está revisando.

---

### 4.7 Pedidos

**Ruta**: `/orders`  
**Roles**: Administrador, Ventas/Logística

Los pedidos se crean a partir de cotizaciones con autorización de crédito aprobada.

#### 4.7.1 Lista de Pedidos

Tabla con:
- **Folio del pedido** y folio de cotización de origen.
- **Cliente**.
- **Fecha** de creación.
- **Total**.
- **Estado de producción**.
- **Progreso** (barra de avance de producción, en porcentaje).

##### Estados de un Pedido

| Estado | Descripción |
|---|---|
| **Pendiente** | Recién creado, sin asignar a producción. |
| **En Producción** | Asignado al área de fábrica. |
| **Listo para Embarque** | Producción terminada, listo para ser enviado. |
| **Embarcado** | Ya fue entregado al área de embarques. |

#### 4.7.2 Ver Detalle de un Pedido

Al hacer clic en un pedido:
- Productos solicitados con cantidades.
- Notas de producción.
- Fecha prometida de entrega.
- Historial de cambios de estado.
- Liberaciones parciales (si el pedido se surte en partes).

---

### 4.8 Producción

**Ruta**: `/production`  
**Roles**: Administrador, Fábrica

El módulo de producción permite al área de fábrica gestionar los pedidos asignados.

#### 4.8.1 Lista de Producción

Muestra los pedidos asignados a fábrica con:
- Folio del pedido.
- Cliente (nombre oculto en el tablero por privacidad comercial, visible en detalle).
- Productos a fabricar.
- Fecha de entrega prometida.
- Porcentaje de avance.

#### 4.8.2 Actualizar Avance

1. Haz clic en el pedido para ver el detalle.
2. Actualiza el **porcentaje de avance** (0% – 100%).
3. Agrega **notas de producción** sobre el estado actual.
4. Guarda los cambios.

El avance se refleja en tiempo real en el tablero de operaciones del administrador y en la vista de pedidos.

#### 4.8.3 Tablero de Producción

**Ruta**: `/production/board`  
Vista kanban/lista compacta de todos los pedidos activos, ordenados por urgencia. Accesible también para Ventas/Logística y Embarques (en modo lectura).

#### 4.8.4 Enviar a Embarque

Cuando la producción está completa (100% o decisión del operador):
1. En el detalle del pedido, clic en **Enviar a Embarque**.
2. Confirmar.
3. El pedido cambia de estado a "Listo para Embarque" y se crea automáticamente un registro en el módulo de Embarques.

---

### 4.9 Tablero de Operaciones (Pipeline)

**Ruta**: `/pipeline`  
**Roles**: Administrador, Ventas/Logística

Vista ejecutiva en tiempo real del estado de todo el proceso comercial.

#### 4.9.1 KPIs Principales

4 tarjetas de resumen en la parte superior:
- **Cotizaciones activas**: Número de cotizaciones en borrador o enviadas.
- **Autorizaciones pendientes**: Número de autorizaciones esperando resolución.
- **Pedidos en producción**: Total de pedidos activos.
- **Embarques pendientes**: Total de envíos no entregados.

#### 4.9.2 Los 4 Carriles

El tablero muestra 4 carriles verticales desplazables:

1. **Cotizaciones**: Muestra folio, cliente, vendedor, monto y estado. Color de badge según estado.
2. **Autorizaciones de Crédito**: Muestra estado de análisis, monto y días en espera.
3. **Pedidos**: Muestra folio, barra de progreso de producción y estado.
4. **Embarques**: Muestra estado de entrega y datos del envío.

Al hacer clic en cualquier tarjeta, navega al módulo correspondiente.

#### 4.9.3 Filtros

- **Activos**: Oculta cotizaciones expiradas/rechazadas, pedidos entregados, etc.
- **Todos**: Muestra el histórico completo.

#### 4.9.4 Modo Pantalla Completa

Botón en la parte superior derecha para expandir el tablero a pantalla completa. Ideal para monitores de control en oficina.

---

### 4.10 Embarques

**Ruta**: `/shipments`  
**Roles**: Administrador, Embarques, Ventas/Logística

Gestión de la entrega física de los pedidos al cliente.

#### 4.10.1 Lista de Embarques

Tabla con:
- Folio del embarque y pedido de origen.
- Destino (cliente).
- Transportista.
- Fecha estimada de entrega.
- Estado.

##### Estados de Embarque

| Estado | Descripción |
|---|---|
| **Pendiente** | Recién creado desde producción. |
| **En Tránsito** | Ya salió a entrega. |
| **Entregado** | Confirmado el arribo al cliente. |
| **Cancelado** | Se canceló el envío. |

#### 4.10.2 Ver y Editar Embarque

Al hacer clic en un embarque:
- Datos de la orden de envío.
- Productos incluidos.
- Transportista y número de guía.
- Fecha estimada y real de entrega.
- Notas de embarque.

---

### 4.11 Facturación (Cuentas por Cobrar)

**Ruta**: `/accounts-receivable`  
**Roles**: Administrador, Facturación

Gestión de facturas emitidas a los clientes.

#### 4.11.1 Lista de Facturas

Tabla filtrable con:
- Folio de factura.
- Cliente.
- Fecha de emisión.
- Fecha de vencimiento.
- Importe.
- Saldo pendiente.
- Estado (Vigente / Vencida / Pagada / Parcial).

**Filtros disponibles**:
- Por cliente.
- Por estado (vencida, vigente, pagada).
- Por rango de fechas.

#### 4.11.2 Crear Factura

1. Clic en **Nueva Factura**.
2. Llena:
   - **Cliente**
   - **Folio de factura**
   - **Fecha de emisión** y **fecha de vencimiento**
   - **Importe total**
   - **Pedido relacionado** (opcional)
3. Guarda.

> Las facturas también se sincronizan automáticamente desde Microsip si la integración está activa.

---

### 4.12 Cobranza (Pagos)

**Ruta**: `/payments`  
**Roles**: Administrador, Crédito/Cobranza

Registro y seguimiento de pagos recibidos de los clientes.

#### 4.12.1 Lista de Pagos

Tabla filtrable con:
- Fecha del pago.
- Cliente.
- Factura relacionada.
- Importe pagado.
- Forma de pago.

**Filtros disponibles**:
- Por cliente.
- Por rango de fechas.
- Por factura.

#### 4.12.2 Registrar Pago

1. Clic en **Nuevo Pago**.
2. Selecciona:
   - **Cliente**
   - **Factura** a la que aplica (reduce el saldo pendiente automáticamente)
   - **Importe del pago**
   - **Fecha de recepción**
   - **Forma de pago** (transferencia, cheque, efectivo, etc.)
3. Guarda.

> Los pagos también se sincronizan desde Microsip si la integración está activa.

---

### 4.13 Incidencias

**Ruta**: `/incidents`  
**Roles**: Administrador, Servicio al Cliente, Servicio Técnico

Sistema de tickets para gestionar quejas, garantías y soporte postventa.

#### 4.13.1 Lista de Incidencias

Tabla con:
- Número de ticket.
- Cliente reportante.
- Descripción breve del problema.
- Prioridad (Baja / Media / Alta / Urgente).
- Estado.
- Asignado a.
- Fecha de apertura.

#### 4.13.2 Crear Incidencia (interno)

1. Clic en **Nueva Incidencia**.
2. Llena:
   - **Cliente**
   - **Tipo de incidencia** (queja, garantía, consulta técnica, etc.)
   - **Descripción detallada**
   - **Prioridad**
   - **Asignado a** (técnico o agente)
3. Guarda.

#### 4.13.3 Portal Público de Incidencias

Los clientes pueden reportar incidencias sin necesitar login en:  
`https://tuempresa.nexxo.com.mx/support`

El cliente busca su empresa por nombre o RFC, llena el formulario y recibe un número de ticket para seguimiento.

#### 4.13.4 Gestionar Incidencia

Al hacer clic en una incidencia:
- Historial de actividad y comentarios.
- Adjuntos (fotos, documentos).
- Campo para agregar comentarios internos o públicos.
- Cambio de estado y asignación.

---

### 4.14 Productos

**Ruta**: `/products`  
**Roles**: Administrador, Vendedor, Ventas/Logística

Catálogo de productos disponibles para incluir en cotizaciones.

#### 4.14.1 Lista de Productos

Tabla con:
- **Código** (SKU)
- **Nombre**
- **Categoría**
- **Precio de lista** y **moneda** (MXN o USD)
- **Descuento máximo permitido (%)**
- **Estado** (Activo/Inactivo)

**Filtros disponibles**:
- Por categoría.
- Por moneda.
- Solo productos activos.

#### 4.14.2 Crear Producto (Admin)

1. Clic en **Nuevo Producto**.
2. Ingresa:
   - **Código**
   - **Nombre**
   - **Categoría**
   - **Precio de lista**
   - **Moneda** (MXN o USD)
   - **Descuento máximo** que puede aplicar el vendedor sin autorización especial.
   - **Descripción** (opcional)
3. Guarda.

#### 4.14.3 Categorías de Productos (Admin)

Las categorías agrupan los productos. Se pueden activar o desactivar. Los productos de categorías inactivas no aparecen en el selector de cotizaciones.

> Los productos también se sincronizan desde Microsip. El admin puede complementar la información (ej. descuento máximo) que no proviene del ERP.

---

### 4.15 Usuarios

**Ruta**: `/users`  
**Roles**: Solo Administrador

Gestión de todos los usuarios del tenant.

#### 4.15.1 Lista de Usuarios

Tabla con:
- Nombre completo.
- Usuario (login).
- Rol asignado.
- Email.
- Estado (Activo/Inactivo).

#### 4.15.2 Crear Usuario

1. Clic en **Nuevo Usuario**.
2. Completa:
   - **Nombre completo**
   - **Nombre de usuario** (para el login)
   - **Contraseña inicial** (el usuario puede cambiarla)
   - **Email**
   - **Rol** (ver tabla de roles en sección 3)
3. Guarda.

> El nuevo usuario puede iniciar sesión de inmediato con las credenciales creadas.

#### 4.15.3 Editar / Desactivar Usuario

- Haz clic en el usuario para editar su información o cambiar su rol.
- Para desactivar un usuario (sin eliminarlo), cambia su estado a Inactivo. El usuario no podrá iniciar sesión pero su historial se conserva.

---

### 4.16 Configuración de Empresa

**Ruta**: `/settings`  
**Roles**: Solo Administrador

Personalización de la identidad visual y datos fiscales de la empresa dentro del sistema.

#### Campos Configurables

- **Nombre de la empresa**
- **RFC**
- **Dirección fiscal** (calle, colonia, ciudad, estado, CP)
- **Teléfono de contacto**
- **Email de contacto**
- **Sitio web**
- **Logo** (URL de la imagen — se recomienda formato PNG con fondo transparente)
- **Color primario** (código hexadecimal — aparece en encabezados de PDF y en la interfaz)
- **Color secundario**
- **Zona horaria** (importante para correcta visualización de fechas en PDFs y reportes)

> Todos estos datos aparecen automáticamente en los PDFs generados (cotizaciones, minutas de visita, autorizaciones de crédito).

---

### 4.17 Integración Microsip

**Ruta**: `/microsip`  
**Roles**: Solo Administrador

Configuración de la conexión con el ERP Microsip (base de datos Firebird local).

#### 4.17.1 Configurar la Conexión

1. Ve a **Microsip** en el sidebar.
2. Llena los parámetros de conexión:
   - **Host**: IP o nombre del servidor donde está instalado Microsip.
   - **Puerto**: Puerto Firebird (por defecto: 3050).
   - **Ruta de la base de datos**: Ruta completa al archivo `.fdb` en el servidor.
   - **Usuario de Firebird**: Generalmente `SYSDBA`.
   - **Contraseña de Firebird**.
   - **Ruta de base de datos de facturas** (si es una base separada).
3. Clic en **Probar Conexión** para verificar que los datos son correctos.
4. Si la prueba es exitosa, guarda la configuración.

#### 4.17.2 Configurar Sincronización Automática

- **Datos maestros** (clientes, productos, categorías): Intervalo configurable en minutos (predeterminado: 120 min).
- **Datos transaccionales** (facturas, pagos): Intervalo configurable (predeterminado: 60 min).
- Puedes activar o desactivar la sincronización automática por entidad.

#### 4.17.3 Sincronización Manual

Para cada entidad (Clientes, Productos, Categorías, Facturas, Pagos) hay un botón de **Sincronizar Ahora** que ejecuta la sincronización inmediatamente, independientemente del estado del auto-sync.

#### 4.17.4 Historial de Sincronizaciones

Tabla con el registro de todas las sincronizaciones ejecutadas:
- Fecha y hora.
- Entidad sincronizada.
- Resultado (Exitoso / Error).
- Registros procesados, insertados, actualizados.
- Tiempo de ejecución.
- Mensaje de error (si lo hubo).

---

### 4.18 Gestión de Empresas (SuperAdmin)

**Ruta**: `/tenants` (solo desde el dominio principal)  
**Roles**: Solo SuperAdmin

Panel exclusivo para administrar las empresas (tenants) registradas en la plataforma.

#### 4.18.1 Lista de Empresas

Tabla con todas las empresas activas:
- Nombre de la empresa.
- Subdominio asignado.
- Plan contratado.
- Número máximo de usuarios.
- Fecha de creación.

#### 4.18.2 Crear Nueva Empresa

1. Clic en **Nueva Empresa**.
2. Configura:
   - **Nombre** de la empresa.
   - **Subdominio** (ej. `joper` → accesible en `joper.nexxo.com.mx`).
   - **Plan** y **máximo de usuarios**.
   - **Color primario** y **secundario** iniciales.
3. Guarda. La empresa queda activa de inmediato.

#### 4.18.3 Editar Empresa

Modifica nombre, subdominio, colores, logo o límites de usuario.

---

## 5. Manual por Rol

---

### 5.1 Administrador

El administrador tiene acceso completo a todos los módulos del tenant. Es el único que puede:
- Crear, editar y desactivar usuarios.
- Configurar la empresa (logo, colores, datos fiscales, zona horaria).
- Configurar y ejecutar la integración con Microsip.
- Crear y administrar categorías y productos.
- Aprobar o rechazar solicitudes de envío gratuito en cotizaciones.
- Eliminar cotizaciones.
- Aprobar o rechazar autorizaciones de crédito (junto con Crédito/Cobranza).

#### Flujo de Trabajo Típico del Administrador

**Mañana — Revisión ejecutiva:**
1. Abrir el **Dashboard** para ver el resumen del negocio: cotizaciones pendientes, pedidos activos, facturas vencidas.
2. Revisar el **Tablero de Operaciones (Pipeline)** para ver el estado global del proceso comercial.
3. Resolver **solicitudes de envío gratuito** pendientes desde el módulo de Cotizaciones.
4. Revisar y resolver **Autorizaciones de Crédito** pendientes.

**Durante el día — Gestión:**
5. Apoyar al equipo de ventas con clientes y cotizaciones según se requiera.
6. Monitorear el avance de **Producción** y **Embarques**.
7. Revisar el módulo de **Cobranza** para identificar facturas vencidas críticas.

**Configuración y mantenimiento:**
8. Mantener el catálogo de **Productos** actualizado (si no se usa Microsip).
9. Revisar el **Historial de Sincronización de Microsip** para detectar errores.
10. Gestionar altas y bajas de **Usuarios** según cambios de personal.

---

### 5.2 Vendedor

El vendedor es el rol de campo. Interactúa principalmente con clientes, visitas y cotizaciones.

#### Módulos Accesibles
- Dashboard (vista personal)
- Clientes
- Check-ins
- Visitas Programadas
- Cotizaciones
- Productos

#### Flujo de Trabajo Típico del Vendedor

**Antes de visitar un cliente:**
1. Abrir el módulo **Clientes** y buscar al cliente.
2. Revisar el **resumen del cliente**: facturas vencidas, saldo de crédito, historial de visitas, cotizaciones activas.
3. Si hay una **Visita Programada**, verificarla en la agenda.

**Durante la visita:**
4. Iniciar un **Check-in** desde el móvil.
5. Tomar **fotos** del lugar, productos instalados o evidencia requerida.
6. Registrar **notas** de la conversación.
7. Si el cliente tiene facturas vencidas, gestionar el cobro y registrar compromisos en las notas.

**Al finalizar la visita:**
8. Hacer el **Checkout** con comentarios finales.
9. El sistema envía automáticamente la minuta al cliente y al administrador.

**Crear cotización:**
10. Desde **Cotizaciones**, crear nueva cotización para el cliente.
11. Agregar productos, definir descuentos, moneda y vigencia.
12. Guardar como borrador o enviar directamente al cliente.
13. Hacer seguimiento del estado de aprobación.

**Seguimiento:**
14. Revisar el **Dashboard** personal para ver sus métricas del mes.
15. Contactar a clientes con cotizaciones expiradas o sin respuesta.

---

### 5.3 Ventas y Logística

Rol de coordinación entre ventas, producción y embarques. Tiene una visión amplia del proceso operativo.

#### Módulos Accesibles
- Dashboard
- Tablero de Operaciones (Pipeline)
- Cotizaciones
- Pedidos
- Tablero de Producción (lectura)
- Embarques
- Productos

#### Flujo de Trabajo Típico

**Mañana — Revisión operativa:**
1. Abrir el **Tablero de Operaciones** para ver el estado de todo el pipeline.
2. Identificar pedidos atrasados en producción.
3. Verificar embarques pendientes de salida.

**Durante el día:**
4. Gestionar **Pedidos**: crear pedidos desde autorizaciones aprobadas, asignar fechas de entrega.
5. Coordinar con fábrica el avance de producción (visible en el tablero).
6. Dar seguimiento a **Embarques**: actualizar estado, registrar números de guía.
7. Apoyar al área de ventas en la gestión de **Cotizaciones** complejas.

**Reportes:**
8. Generar reportes de ventas y operaciones desde el módulo de Reportes.

---

### 5.4 Crédito y Cobranza

Rol enfocado en la gestión financiera: evaluación de crédito y seguimiento de cobros.

#### Módulos Accesibles
- Dashboard
- Clientes
- Cotizaciones (lectura y seguimiento)
- Autorización de Crédito
- Cobranza (Pagos)

#### Flujo de Trabajo Típico

**Autorizaciones de Crédito:**
1. Revisar las **Autorizaciones de Crédito** pendientes.
2. Para cada una:
   - Ver el historial de pagos del cliente.
   - Revisar facturas vencidas y saldo de crédito.
   - Agregar comentarios del análisis.
   - Aprobar, rechazar o marcar en análisis.
3. Al rechazar, el sistema notifica automáticamente al vendedor por correo.

**Cobranza:**
4. Revisar el módulo de **Cobranza** para identificar facturas próximas a vencer.
5. Coordinar llamadas o visitas de cobro con los vendedores.
6. Registrar **pagos** recibidos y aplicarlos a las facturas correspondientes.
7. Monitorear el **perfil crediticio** de los clientes desde la vista de detalle.

---

### 5.5 Fábrica / Producción

Rol enfocado exclusivamente en el área de manufactura.

#### Módulos Accesibles
- Dashboard
- Producción
- Tablero de Producción

#### Flujo de Trabajo Típico

1. Al iniciar el turno, abrir el **Tablero de Producción** para ver todos los pedidos activos.
2. Los pedidos están ordenados por urgencia y fecha de entrega.
3. Seleccionar un pedido y revisar:
   - Productos a fabricar y cantidades.
   - Notas de ventas/logística.
   - Fecha de entrega prometida.
4. Actualizar el **porcentaje de avance** conforme avanza la producción.
5. Agregar **notas** sobre materiales faltantes, incidencias o avances parciales.
6. Cuando el pedido está listo al 100%: clic en **Enviar a Embarque**.
7. El pedido pasa automáticamente al módulo de Embarques.

> El área de Ventas/Logística y el Administrador ven en tiempo real el avance registrado.

---

### 5.6 Embarques

Rol dedicado a la coordinación y entrega física de los pedidos.

#### Módulos Accesibles
- Dashboard
- Tablero de Producción (lectura)
- Embarques

#### Flujo de Trabajo Típico

1. Al iniciar el día, revisar los **Embarques pendientes** en la lista.
2. Los embarques creados desde Producción aparecen en estado "Pendiente".
3. Para cada embarque:
   - Verificar los productos incluidos y cantidades.
   - Asignar **transportista** y número de guía.
   - Registrar **fecha estimada de entrega**.
   - Cambiar estado a **"En Tránsito"** al salir el pedido.
4. Al confirmar la entrega al cliente: cambiar estado a **"Entregado"**.
5. Agregar notas de entrega (firma de recibido, observaciones).
6. El ciclo del pedido queda completo.

---

### 5.7 Facturación

Rol dedicado a la emisión y gestión de facturas.

#### Módulos Accesibles
- Dashboard
- Facturación (Cuentas por Cobrar)

#### Flujo de Trabajo Típico

1. Revisar pedidos en estado "Embarcado" o "Entregado" que aún no tienen factura.
2. Crear la **factura** correspondiente desde el módulo de Facturación.
3. Registrar el folio de la factura fiscal (CFDI emitida en el sistema de facturación externo).
4. Vincular la factura al pedido correspondiente.
5. Monitorear el estatus de pago de cada factura.
6. Actualizar la factura cuando se registre un pago parcial o total.

> Si la integración con Microsip está activa, las facturas se sincronizan automáticamente y solo se necesita revisión/corrección manual cuando hay discrepancias.

---

### 5.8 Servicio al Cliente

Rol dedicado a la atención postventa y gestión de incidencias.

#### Módulos Accesibles
- Dashboard
- Incidencias

#### Flujo de Trabajo Típico

1. Revisar las **Incidencias** nuevas o abiertas asignadas a su área.
2. Contactar al cliente para recopilar más información si es necesario.
3. Clasificar la incidencia: queja, garantía, consulta, soporte.
4. Asignar al técnico correspondiente si requiere intervención técnica.
5. Agregar **comentarios** con el avance de la atención.
6. Al resolver: cambiar estado a **Cerrada** con comentario final.
7. El cliente puede ver el estado de su ticket en el **portal público**.

---

### 5.9 Servicio Técnico

Rol para técnicos que atienden garantías e instalaciones en campo.

#### Módulos Accesibles
- Dashboard
- Incidencias

#### Flujo de Trabajo Típico

1. Revisar las **Incidencias** asignadas a su nombre.
2. Planificar la visita técnica con el cliente.
3. Al regresar, registrar en la incidencia:
   - Diagnóstico técnico.
   - Acciones realizadas.
   - Refacciones utilizadas.
   - Fotos de evidencia.
4. Si se resuelve en campo: cerrar la incidencia.
5. Si se requiere más trabajo: actualizar el estado y dejar comentario.

---

### 5.10 SuperAdmin

El SuperAdmin tiene acceso a la plataforma completa en el dominio principal (`nexxo.com.mx`), sin estar restringido a un tenant específico.

#### Capacidades Exclusivas
- **Gestión de empresas (Tenants)**: Crear, editar y administrar todas las empresas registradas en la plataforma.
- **Cambio de empresa**: Puede seleccionar cualquier empresa para operar dentro de su contexto.
- **Acceso a datos de todos los tenants** para soporte técnico.

#### Flujo de Trabajo Típico del SuperAdmin

1. Ingresar desde el dominio principal `nexxo.com.mx`.
2. El sistema muestra el selector de empresa en la interfaz.
3. Para dar de alta una nueva empresa: módulo **Gestionar Empresas** → **Nueva Empresa**.
4. Configurar subdominio, colores y límites.
5. La empresa queda disponible de inmediato en `nuevaempresa.nexxo.com.mx`.
6. Notificar al administrador de la nueva empresa para que cree su primer usuario.

---

## 6. Flujo Comercial Completo

Este diagrama describe el recorrido de un negocio desde el primer contacto hasta el cobro:

```
VENDEDOR visita cliente
        ↓
[CHECK-IN] → Minuta PDF enviada por correo
        ↓
[COTIZACIÓN] creada por Vendedor
        ↓ (si aplica envío gratuito)
[ADMIN aprueba o rechaza envío]
        ↓
Cotización enviada al cliente por correo/enlace
        ↓
CLIENTE aprueba o rechaza desde enlace público
        ↓ (si aprueba)
[AUTORIZACIÓN DE CRÉDITO] generada automáticamente
        ↓
CRÉDITO/COBRANZA analiza y aprueba/rechaza
        ↓ (si aprueba)
[PEDIDO] creado por Ventas/Logística
        ↓
[PRODUCCIÓN] asignada a Fábrica → avance actualizado
        ↓ (al terminar)
[EMBARQUE] creado automáticamente → gestionado por Embarques
        ↓ (al entregar)
[FACTURA] creada por Facturación
        ↓
[PAGO] registrado por Cobranza → factura saldada
```

---

## 7. Portal Público para Clientes

El sistema ofrece dos interfaces públicas para clientes sin necesidad de login:

### 7.1 Portal de Aprobación de Cotizaciones

**URL**: Enviada automáticamente por correo al cliente.

El cliente puede:
- Ver el detalle completo de la cotización (productos, precios, condiciones).
- Descargar el PDF.
- **Aprobar** la cotización (genera autorización de crédito automáticamente).
- **Rechazar** la cotización con un motivo.

> El enlace expira en la fecha de vigencia configurada en la cotización.

### 7.2 Portal de Incidencias

**URL**: `https://tuempresa.nexxo.com.mx/support`

El cliente puede:
- Buscar su empresa por nombre o RFC.
- Reportar una nueva incidencia (queja, garantía, soporte).
- Consultar el estado de tickets abiertos con su número de ticket.

---

## 8. Preguntas Frecuentes

**¿Puedo editar una cotización que ya fue enviada al cliente?**  
No directamente. Solo las cotizaciones en estado "Borrador" pueden editarse. Si necesitas modificarla después de enviada, el administrador puede eliminarla y crear una nueva, o rechazar el envío de flete para regresar a borrador cuando aplique.

**¿Qué pasa si el cliente no responde la cotización antes de su fecha de vigencia?**  
La cotización cambia automáticamente a estado "Expirada". El vendedor puede crear una nueva cotización o actualizar la vigencia previa coordinación con el admin.

**¿Los productos de Microsip se actualizan automáticamente?**  
Sí, si la sincronización automática está activada para "Productos". Los cambios en precios de lista en Microsip se reflejan en Nexxo según el intervalo configurado (predeterminado: cada 2 horas).

**¿Se puede hacer una cotización en dólares si los productos son en pesos?**  
Sí. Al seleccionar USD como moneda de la cotización e ingresar el tipo de cambio, el sistema convierte automáticamente los precios MXN a USD. El PDF mostrará todos los precios y el total en USD, con una nota indicando el tipo de cambio aplicado.

**¿Qué pasa si falta internet durante un check-in?**  
El check-in iniciado se guarda localmente en el navegador. Al recuperar la conexión, el checkout se sincroniza normalmente. Se recomienda hacer el checkout tan pronto como sea posible.

**¿Cómo cambio mi contraseña?**  
Actualmente, el administrador debe cambiar la contraseña desde el módulo Usuarios. Si eres administrador, puedes editar tu propio usuario.

**¿Puedo ver las cotizaciones de otros vendedores?**  
Depende del rol. El Administrador y Ventas/Logística ven todas las cotizaciones del tenant. El Vendedor y Crédito/Cobranza también ven todas las cotizaciones (para dar seguimiento), pero solo el creador o roles autorizados pueden editarlas.

**¿Qué correos se envían automáticamente?**  
- **Check-in finalizado**: Minuta PDF al cliente, vendedor y admin.
- **Cotización enviada**: PDF + enlace de aprobación al cliente.
- **Envío gratuito rechazado**: Correo al vendedor con el motivo.
- **Autorización de crédito resuelta**: Correo al vendedor con el resultado.

**¿Cómo se calcula el IVA?**  
El sistema aplica IVA del 16% sobre el subtotal después de descuentos. El IVA está incluido en el total mostrado.

**¿El sistema funciona en celular?**  
Sí. La interfaz está optimizada para uso móvil. El módulo de check-ins y el formulario de cotizaciones son completamente funcionales en pantallas pequeñas.

---

*Manual generado automáticamente · Nexxo Sistema Comercial · nexxo.com.mx*  
*Para soporte técnico contacta a tu administrador de sistema.*
