import PDFDocument from "pdfkit";
import fs from "fs";

const OUT = "nexxo-mejoras-mayo-junio-2026.pdf";

const COLORS = {
  primary: "#1D3A8A",
  primaryLight: "#1D4ED8",
  accent: "#93C5FD",
  accentSoft: "#BFD9FE",
  bandSoft: "#EFF6FF",
  text: "#37404F",
  textSoft: "#5B6473",
  white: "#FFFFFF",
};

const sections = [
  {
    title: "Cotizaciones",
    items: [
      "Cotizaciones totalmente usables en dispositivos móviles, sin contenido que se desborde.",
      "Selección de moneda (pesos / dólares) y tipo de cambio configurable por cotización.",
      "Precios mostrados en moneda nativa y en la moneda de la cotización al agregar productos.",
      "Conversión automática de precios y totales al cambiar la moneda de la cotización.",
      "Cálculo de IVA correcto para clientes extranjeros (exclusión de IVA cuando aplica).",
      "Folios de cotización correctos para clientes extranjeros.",
      "Plazos de pago de 90 y 120 días agregados.",
      "Vencimiento indefinido cuando no se asigna fecha; cálculo de vencimiento corregido entre zonas horarias.",
      "Edición de cotizaciones pendientes con lógica de descuentos corregida.",
      "Usuarios con permisos pueden editar cotizaciones en cualquier estado.",
      "Organización de cotizaciones en pestañas Activas e Inactivas; opción de ocultar las convertidas.",
      "Envío de cotizaciones por correo después de guardarlas.",
      "Mayor precisión en campos de descuento y tasa de impuesto.",
      "Eliminación de cotizaciones por administradores, con protección de cotizaciones convertidas o con pedidos.",
    ],
  },
  {
    title: "PDF de Cotizaciones y Reportes",
    items: [
      "Generación de PDF corregida para mostrar correctamente la moneda y columnas condicionales.",
      "Opción de generar cotizaciones en PDF con o sin descuentos.",
      "Folio de cotización más grande y destacado en el PDF.",
      "Notas del cliente incluidas en cotizaciones, pedidos y reportes.",
      "Nombres de clientes ocultos en reportes y PDF según corresponde.",
      "Corrección de texto traslapado y desbordamientos en los PDF.",
      "Diálogo de descarga de PDF corregido para evitar desbordes de texto.",
    ],
  },
  {
    title: "Liberación de Pedidos (Módulo Nuevo)",
    items: [
      "Nuevo módulo de Liberación de Pedidos para revisión y aprobación administrativa antes de producción.",
      "Ajuste de pedidos pendientes (cantidades, precios y detalles) antes de liberarlos.",
      "Campos de fecha de aprobación y de liberación de crédito en cada pedido.",
      "Notificación automática a los administradores cuando hay un pedido pendiente de liberación.",
      "Detalle completo de la cotización visible dentro de la vista de liberación.",
      "Actualización automática de las vistas relacionadas al liberar un pedido.",
      "Acceso restringido al rol Administrador (menú: Ventas → Liberación de Pedidos).",
    ],
  },
  {
    title: "Pedidos y Producción",
    items: [
      "Filtrado por órdenes de producción activas y solo pedidos aprobados.",
      "Reporte de pedidos muestra la fecha de aprobación del cliente como fecha de cierre.",
      "Títulos de los tableros de ventas y producción actualizados.",
      "Nombres de clientes ocultos en el tablero de producción.",
      "Cancelación de pedidos por administrador, incluso después de liberados, registrando el motivo de la cancelación.",
      "Nuevo estado \u201cCerrado\u201d para identificar f\u00e1cilmente los pedidos cuyo ciclo (embarque o entrega) ya finaliz\u00f3.",
      "Notificación automática por correo a los administradores al cancelar un pedido, incluyendo el motivo.",
    ],
  },
  {
    title: "Embarques",
    items: [
      "Filtros avanzados en la página de seguimiento de embarques.",
      "Captura, edición y eliminación de números de serie por producto, con barra de progreso.",
      "Número y folio de factura incluidos en remisiones y PDF de embarque.",
      "Generación y descarga de salidas (vales de salida) de embarque.",
      "Cantidad de artículos en el PDF ajustada según los números de serie capturados.",
      "Aprobación y rechazo de embarque con un clic desde enlaces en el correo.",
    ],
  },
  {
    title: "Autorización de Crédito",
    items: [
      "Notificaciones por correo para solicitudes y resoluciones de autorización de crédito.",
      "Aprobación de envío reutilizando la lógica de cotizaciones en ajustes de liberación.",
    ],
  },
  {
    title: "Estados de Cuenta",
    items: [
      "Estados de cuenta tomados directamente de los datos en vivo de Microsip.",
      "Cálculo correcto de saldos, cargos, créditos y montos vencidos.",
      "Inclusión de impuestos y todos los tipos de crédito; exclusión de facturas históricas.",
      "Búsqueda y descarga de estados de cuenta para cualquier cliente.",
      "Envío automático y programado de estados de cuenta por correo.",
      "Opción para que los clientes no reciban estados de cuenta automáticos.",
      "Actualización automática con indicador de última actualización.",
      "Solo se muestran los pagos del año en curso; saldos calculados excluyendo pagos cancelados.",
      "Adaptación de la página de estados de cuenta para vista móvil.",
    ],
  },
  {
    title: "Incidentes y Garantías",
    items: [
      "Módulo de incidentes accesible para vendedores.",
      "Subida de imágenes y archivos a los incidentes, con manejo de errores corregido.",
      "Pestaña de garantía con hoja de garantía y campos de firma; generación de PDF.",
      "Descarga de PDF de incidentes y renovación de enlaces de incidentes para clientes.",
      "Descarga de reporte PDF de incidentes vigentes.",
      "Buscador de clientes corregido (resultados exactos, sin coincidencias irrelevantes).",
      "Notificación por correo a los administradores al crear o recibir incidentes y comentarios.",
      "Vista de lista de incidentes optimizada para móvil y alineación de botones corregida.",
    ],
  },
  {
    title: "Check-in / Visitas",
    items: [
      "Comentarios y acuerdos durante los check-ins.",
      "Mayor número de fotos por check-in, con compresión automática de imágenes.",
      "Eliminación de fotos cargadas y corrección de errores al subir fotos.",
      "Manejo de check-ins sin datos de ubicación para evitar fallos.",
      "Eliminación de check-ins por administradores.",
      "Filtros en las páginas de visitas programadas y check-ins.",
      "Correcciones en los modales de check-in / checkout y la visualización de datos del cliente.",
    ],
  },
  {
    title: "Sincronización Microsip",
    items: [
      "Mayor exactitud y fiabilidad en la sincronización de facturas y pagos.",
      "Uso de las fechas de vencimiento reales de Microsip para el estado de las facturas.",
      "Solo se muestran facturas con saldo pendiente; exclusión de datos históricos.",
      "Sincronización de pagos asíncrona y por lotes para mejor rendimiento.",
      "Indicador de progreso de sincronización con actualización automática.",
    ],
  },
  {
    title: "Clientes y Multi-idioma",
    items: [
      "Soporte multi-idioma (español, portugués) con preferencia de idioma por empresa.",
      "Manejo de múltiples correos electrónicos en los registros de clientes.",
      "Eliminación de clientes y sus registros asociados por administradores, de forma resiliente.",
      "Navegación y filtrado mejorados en el panel principal.",
    ],
  },
  {
    title: "Notificaciones, Infraestructura y Estabilidad",
    items: [
      "Notificaciones por correo de aprobación de embarque y opción de reenvío.",
      "Prevención de correos redundantes para pedidos ya procesados.",
      "Manejo de errores para evitar caídas de la aplicación y mejorar la carga de páginas.",
      "Buscadores agregados en las páginas de pagos, facturas, cuentas por cobrar, autorización de crédito, producción y liberación de pedidos.",
      "Gestión de usuarios e inicio de sesión seguro mejorados.",
      "Scripts seguros de despliegue y respaldo para el servidor de producción (VPS).",
      "Presentación animada de ventas y manual de usuario del sistema.",
    ],
  },
];

const totalImprovements = sections.reduce((n, s) => n + s.items.length, 0);

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const M = 50;
const CONTENT_W = PAGE_W - M * 2;

// ---------- Cover header band ----------
doc.rect(0, 0, PAGE_W, 110).fill(COLORS.primary);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(26).text("NEXXO", M, 32);
doc.fillColor(COLORS.accent).font("Helvetica").fontSize(12).text("Sistema Comercial de Nueva Generación", M, 64);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text("Relación de Mejoras Significativas", M, 82);
doc.fillColor(COLORS.accentSoft).font("Helvetica").fontSize(9).text("05 Mayo 2026  —  22 Junio 2026     |     nexxo.com.mx", M, 98);

// ---------- Executive summary ----------
let y = 134;
doc.rect(M, y, CONTENT_W, 70).fill(COLORS.bandSoft);
doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(10).text("Resumen Ejecutivo", M + 14, y + 12);
doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(
  "Este documento presenta las mejoras implementadas en Nexxo durante el periodo comprendido entre el 5 de mayo y el 22 de junio de 2026. " +
    `Se registran ${totalImprovements} mejoras agrupadas en ${sections.length} áreas funcionales, desde correcciones de usabilidad hasta módulos completos del flujo comercial.`,
  M + 14,
  y + 30,
  { width: CONTENT_W - 28, lineGap: 2 }
);

// ---------- Stat cards ----------
y += 86;
const cards = [
  { big: String(sections.length), small: "áreas\nfuncionales" },
  { big: "+" + totalImprovements, small: "mejoras\nimplementadas" },
  { big: "49", small: "días de\ndesarrollo" },
  { big: "100%", small: "operación\nproductiva" },
];
const gap = 12;
const cardW = (CONTENT_W - gap * (cards.length - 1)) / cards.length;
const cardH = 58;
cards.forEach((c, i) => {
  const cx = M + i * (cardW + gap);
  doc.rect(cx, y, cardW, cardH).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(20).text(c.big, cx, y + 9, { width: cardW, align: "center" });
  doc.fillColor(COLORS.accentSoft).font("Helvetica").fontSize(7.5).text(c.small, cx, y + 33, { width: cardW, align: "center" });
});

y += cardH + 22;

// ---------- Helpers ----------
function ensureSpace(needed) {
  if (y + needed > PAGE_H - 60) {
    doc.addPage();
    y = M;
  }
}

function sectionHeader(title, count) {
  ensureSpace(34);
  doc.rect(M, y, CONTENT_W, 24).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text(title, M + 12, y + 6);
  doc.fillColor(COLORS.accent).font("Helvetica").fontSize(9).text(`${count} mejoras`, M, y + 7, {
    width: CONTENT_W - 12,
    align: "right",
  });
  y += 24 + 8;
}

function bullet(text) {
  doc.font("Helvetica").fontSize(9);
  const textW = CONTENT_W - 24;
  const h = doc.heightOfString(text, { width: textW, lineGap: 1.5 });
  ensureSpace(h + 7);
  doc.circle(M + 6, y + 5, 2).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.text).text(text, M + 18, y, { width: textW, lineGap: 1.5 });
  y += h + 6;
}

// ---------- Sections ----------
sections.forEach((s) => {
  sectionHeader(s.title, s.items.length);
  s.items.forEach((it) => bullet(it));
  y += 8;
});

// ---------- Footer on every page ----------
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  const fy = PAGE_H - 38;
  doc.rect(0, fy, PAGE_W, 38).fill(COLORS.bandSoft);
  doc.fillColor(COLORS.textSoft).font("Helvetica").fontSize(7.5).text(
    "NEXXO — Sistema Comercial   ·   Documento generado automáticamente   ·   Confidencial",
    M,
    fy + 14,
    { width: CONTENT_W, align: "left" }
  );
  doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(7.5).text(
    `Página ${i + 1} de ${range.count}`,
    M,
    fy + 14,
    { width: CONTENT_W, align: "right" }
  );
}

doc.end();
console.log(`PDF generado: ${OUT} (${totalImprovements} mejoras en ${sections.length} áreas)`);
