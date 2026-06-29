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

// Cada item: { t: descripción, h: horas estimadas de desarrollo }
const sections = [
  {
    title: "Cotizaciones",
    items: [
      { t: "Cotizaciones totalmente usables en dispositivos móviles, sin contenido que se desborde.", h: 4 },
      { t: "Selección de moneda (pesos / dólares) y tipo de cambio configurable por cotización.", h: 6 },
      { t: "Precios mostrados en moneda nativa y en la moneda de la cotización al agregar productos.", h: 5 },
      { t: "Conversión automática de precios y totales al cambiar la moneda de la cotización.", h: 5 },
      { t: "Cálculo de IVA correcto para clientes extranjeros (exclusión de IVA cuando aplica).", h: 4 },
      { t: "Folios de cotización correctos para clientes extranjeros.", h: 2 },
      { t: "Plazos de pago de 90 y 120 días agregados.", h: 1 },
      { t: "Vencimiento indefinido cuando no se asigna fecha; cálculo de vencimiento corregido entre zonas horarias.", h: 3 },
      { t: "Edición de cotizaciones pendientes con lógica de descuentos corregida.", h: 4 },
      { t: "Usuarios con permisos pueden editar cotizaciones en cualquier estado.", h: 3 },
      { t: "Organización de cotizaciones en pestañas Activas e Inactivas; opción de ocultar las convertidas.", h: 3 },
      { t: "Envío de cotizaciones por correo después de guardarlas.", h: 3 },
      { t: "Mayor precisión en campos de descuento y tasa de impuesto.", h: 2 },
      { t: "Eliminación de cotizaciones por administradores, con protección de cotizaciones convertidas o con pedidos.", h: 3 },
    ],
  },
  {
    title: "PDF de Cotizaciones y Reportes",
    items: [
      { t: "Generación de PDF corregida para mostrar correctamente la moneda y columnas condicionales.", h: 5 },
      { t: "Opción de generar cotizaciones en PDF con o sin descuentos.", h: 3 },
      { t: "Folio de cotización más grande y destacado en el PDF.", h: 1 },
      { t: "Notas del cliente incluidas en cotizaciones, pedidos y reportes.", h: 2 },
      { t: "Nombres de clientes ocultos en reportes y PDF según corresponde.", h: 2 },
      { t: "Corrección de texto traslapado y desbordamientos en los PDF.", h: 3 },
      { t: "Diálogo de descarga de PDF corregido para evitar desbordes de texto.", h: 2 },
    ],
  },
  {
    title: "Liberación de Pedidos (Módulo Nuevo)",
    items: [
      { t: "Nuevo módulo de Liberación de Pedidos para revisión y aprobación administrativa antes de producción.", h: 16 },
      { t: "Ajuste de pedidos pendientes (cantidades, precios y detalles) antes de liberarlos.", h: 8 },
      { t: "Campos de fecha de aprobación y de liberación de crédito en cada pedido.", h: 3 },
      { t: "Notificación automática a los administradores cuando hay un pedido pendiente de liberación.", h: 4 },
      { t: "Detalle completo de la cotización visible dentro de la vista de liberación.", h: 4 },
      { t: "Actualización automática de las vistas relacionadas al liberar un pedido.", h: 3 },
      { t: "Cierre administrativo de pedidos pendientes (uno por uno) sin pasar por el proceso completo ni enviar correos.", h: 5 },
      { t: "Acceso restringido al rol Administrador (menú: Ventas → Liberación de Pedidos).", h: 2 },
    ],
  },
  {
    title: "Pedidos y Producción",
    items: [
      { t: "Filtrado por órdenes de producción activas y solo pedidos aprobados.", h: 3 },
      { t: "Reporte de pedidos muestra la fecha de aprobación del cliente como fecha de cierre.", h: 2 },
      { t: "Títulos de los tableros de ventas y producción actualizados.", h: 1 },
      { t: "Nombres de clientes ocultos en el tablero de producción.", h: 2 },
      { t: "Cancelación de pedidos por administrador, incluso después de liberados, registrando el motivo de la cancelación.", h: 5 },
      { t: "Nuevo estado \u201cCerrado\u201d para identificar f\u00e1cilmente los pedidos cuyo ciclo (embarque o entrega) ya finaliz\u00f3.", h: 4 },
      { t: "Notificación automática por correo a los administradores al cancelar un pedido, incluyendo el motivo.", h: 3 },
    ],
  },
  {
    title: "Embarques",
    items: [
      { t: "Filtros avanzados en la página de seguimiento de embarques.", h: 4 },
      { t: "Captura, edición y eliminación de números de serie por producto, con barra de progreso.", h: 8 },
      { t: "Número y folio de factura incluidos en remisiones y PDF de embarque.", h: 3 },
      { t: "Generación y descarga de salidas (vales de salida) de embarque.", h: 5 },
      { t: "Cantidad de artículos en el PDF ajustada según los números de serie capturados.", h: 3 },
      { t: "Aprobación y rechazo de embarque con un clic desde enlaces en el correo.", h: 5 },
    ],
  },
  {
    title: "Autorización de Crédito",
    items: [
      { t: "Notificaciones por correo para solicitudes y resoluciones de autorización de crédito.", h: 4 },
      { t: "Aprobación de envío reutilizando la lógica de cotizaciones en ajustes de liberación.", h: 4 },
    ],
  },
  {
    title: "Estados de Cuenta",
    items: [
      { t: "Estados de cuenta tomados directamente de los datos en vivo de Microsip.", h: 8 },
      { t: "Cálculo correcto de saldos, cargos, créditos y montos vencidos.", h: 6 },
      { t: "Inclusión de impuestos y todos los tipos de crédito; exclusión de facturas históricas.", h: 4 },
      { t: "Búsqueda y descarga de estados de cuenta para cualquier cliente.", h: 4 },
      { t: "Envío automático y programado de estados de cuenta por correo.", h: 5 },
      { t: "Opción para que los clientes no reciban estados de cuenta automáticos.", h: 2 },
      { t: "Actualización automática con indicador de última actualización.", h: 3 },
      { t: "Solo se muestran los pagos del año en curso; saldos calculados excluyendo pagos cancelados.", h: 3 },
      { t: "Adaptación de la página de estados de cuenta para vista móvil.", h: 3 },
    ],
  },
  {
    title: "Incidentes y Garantías",
    items: [
      { t: "Módulo de incidentes accesible para vendedores.", h: 4 },
      { t: "Subida de imágenes y archivos a los incidentes, con manejo de errores corregido.", h: 5 },
      { t: "Pestaña de garantía con hoja de garantía y campos de firma; generación de PDF.", h: 8 },
      { t: "Descarga de PDF de incidentes y renovación de enlaces de incidentes para clientes.", h: 4 },
      { t: "Descarga de reporte PDF de incidentes vigentes.", h: 4 },
      { t: "Buscador de clientes corregido (resultados exactos, sin coincidencias irrelevantes).", h: 3 },
      { t: "Notificación por correo a los administradores al crear o recibir incidentes y comentarios.", h: 4 },
      { t: "Vista de lista de incidentes optimizada para móvil y alineación de botones corregida.", h: 3 },
    ],
  },
  {
    title: "Check-in / Visitas",
    items: [
      { t: "Comentarios y acuerdos durante los check-ins.", h: 3 },
      { t: "Mayor número de fotos por check-in, con compresión automática de imágenes.", h: 5 },
      { t: "Eliminación de fotos cargadas y corrección de errores al subir fotos.", h: 3 },
      { t: "Manejo de check-ins sin datos de ubicación para evitar fallos.", h: 2 },
      { t: "Eliminación de check-ins por administradores.", h: 2 },
      { t: "Filtros en las páginas de visitas programadas y check-ins.", h: 3 },
      { t: "Correcciones en los modales de check-in / checkout y la visualización de datos del cliente.", h: 3 },
    ],
  },
  {
    title: "Sincronización Microsip",
    items: [
      { t: "Mayor exactitud y fiabilidad en la sincronización de facturas y pagos.", h: 6 },
      { t: "Uso de las fechas de vencimiento reales de Microsip para el estado de las facturas.", h: 3 },
      { t: "Solo se muestran facturas con saldo pendiente; exclusión de datos históricos.", h: 3 },
      { t: "Sincronización de pagos asíncrona y por lotes para mejor rendimiento.", h: 5 },
      { t: "Indicador de progreso de sincronización con actualización automática.", h: 3 },
    ],
  },
  {
    title: "Clientes y Multi-idioma",
    items: [
      { t: "Soporte multi-idioma (español, portugués) con preferencia de idioma por empresa.", h: 8 },
      { t: "Manejo de múltiples correos electrónicos en los registros de clientes.", h: 3 },
      { t: "Eliminación de clientes y sus registros asociados por administradores, de forma resiliente.", h: 4 },
      { t: "Navegación y filtrado mejorados en el panel principal.", h: 3 },
    ],
  },
  {
    title: "Notificaciones, Infraestructura y Estabilidad",
    items: [
      { t: "Notificaciones por correo de aprobación de embarque y opción de reenvío.", h: 3 },
      { t: "Prevención de correos redundantes para pedidos ya procesados.", h: 2 },
      { t: "Manejo de errores para evitar caídas de la aplicación y mejorar la carga de páginas.", h: 4 },
      { t: "Buscadores agregados en las páginas de pagos, facturas, cuentas por cobrar, autorización de crédito, producción y liberación de pedidos.", h: 5 },
      { t: "Gestión de usuarios e inicio de sesión seguro mejorados.", h: 5 },
      { t: "Scripts seguros de despliegue y respaldo para el servidor de producción (VPS).", h: 5 },
      { t: "Presentación animada de ventas y manual de usuario del sistema.", h: 6 },
    ],
  },
];

const sectionHours = (s) => s.items.reduce((n, it) => n + it.h, 0);
const totalImprovements = sections.reduce((n, s) => n + s.items.length, 0);
const totalHours = sections.reduce((n, s) => n + sectionHours(s), 0);

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const M = 50;
const CONTENT_W = PAGE_W - M * 2;
const HOURS_COL = 46;

// ---------- Cover header band ----------
doc.rect(0, 0, PAGE_W, 110).fill(COLORS.primary);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(26).text("NEXXO", M, 32);
doc.fillColor(COLORS.accent).font("Helvetica").fontSize(12).text("Sistema Comercial de Nueva Generación", M, 64);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text("Relación de Mejoras Significativas", M, 82);
doc.fillColor(COLORS.accentSoft).font("Helvetica").fontSize(9).text("05 Mayo 2026  —  22 Junio 2026     |     nexxo.com.mx", M, 98);

// ---------- Executive summary ----------
let y = 134;
doc.rect(M, y, CONTENT_W, 100).fill(COLORS.bandSoft);
doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(10).text("Resumen Ejecutivo", M + 14, y + 12);
doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(
  "Este documento presenta las mejoras implementadas en Nexxo durante el periodo comprendido entre el 5 de mayo y el 22 de junio de 2026. " +
    `Se registran ${totalImprovements} mejoras agrupadas en ${sections.length} áreas funcionales, desde correcciones de usabilidad hasta módulos completos del flujo comercial. ` +
    `El tiempo de desarrollo estimado fue de aproximadamente ${totalHours} horas (≈7 semanas / 49 días naturales). ` +
    "Cada mejora indica a la derecha su tiempo estimado de desarrollo en horas.",
  M + 14,
  y + 30,
  { width: CONTENT_W - 28, lineGap: 2 }
);

// ---------- Stat cards ----------
y += 116;
const cards = [
  { big: String(sections.length), small: "áreas\nfuncionales" },
  { big: "+" + totalImprovements, small: "mejoras\nimplementadas" },
  { big: "~" + totalHours, small: "horas de\ndesarrollo" },
  { big: "49", small: "días\nnaturales" },
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

function sectionHeader(title, count, hours) {
  ensureSpace(34);
  doc.rect(M, y, CONTENT_W, 24).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text(title, M + 12, y + 6, { width: CONTENT_W - 130 });
  doc.fillColor(COLORS.accent).font("Helvetica").fontSize(9).text(`${count} mejoras  ·  ${hours} h`, M, y + 7, {
    width: CONTENT_W - 12,
    align: "right",
  });
  y += 24 + 8;
}

function bullet(item) {
  doc.font("Helvetica").fontSize(9);
  const textW = CONTENT_W - 24 - HOURS_COL;
  const h = doc.heightOfString(item.t, { width: textW, lineGap: 1.5 });
  ensureSpace(h + 7);
  doc.circle(M + 6, y + 5, 2).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(item.t, M + 18, y, { width: textW, lineGap: 1.5 });
  doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(9).text(`${item.h} h`, M + 18 + textW, y, {
    width: HOURS_COL,
    align: "right",
  });
  y += h + 6;
}

// ---------- Sections ----------
sections.forEach((s) => {
  sectionHeader(s.title, s.items.length, sectionHours(s));
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
console.log(`PDF generado: ${OUT} (${totalImprovements} mejoras · ${totalHours} h en ${sections.length} áreas)`);
