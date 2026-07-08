import PDFDocument from "pdfkit";
import fs from "fs";

const OUT = "nexxo-opciones-ligero-movil.pdf";

const COLORS = {
  primary: "#1D3A8A",
  primaryLight: "#1D4ED8",
  accent: "#93C5FD",
  accentSoft: "#BFD9FE",
  bandSoft: "#EFF6FF",
  text: "#37404F",
  textSoft: "#5B6473",
  white: "#FFFFFF",
  good: "#15803D",
  bad: "#B91C1C",
  goodSoft: "#ECFDF3",
  recBand: "#DCFCE7",
};

// ---------------- Contenido ----------------

const requerimientos = [
  "Vendedores: cada quien ve solo su empresa (cotizaciones y tableros separados). Móvil no ve Ligero y Ligero no ve Móvil.",
  "Producción: ve las dos empresas, pero en tableros separados.",
  "Autorizaciones (Administrador): ve las dos empresas juntas.",
  "Crédito y Cobranza (Eunice): ve las dos, con saldo consolidado por cliente.",
  "Compras: ve todo.",
  "Folios de cotización con prefijo según el cliente: MEX para México y EXT para extranjero. Ambas empresas comparten el mismo prefijo; lo importante es que los folios nunca se dupliquen entre empresas.",
  "Clientes y productos compartidos: provienen de la misma base de Microsip.",
];

const opciones = [
  {
    label: "OPCIÓN A",
    title: "Dos sistemas separados que comparten una API",
    desc:
      "Cada empresa tiene su propia aplicación y su propia base de datos. Se construye una API para que un sistema pueda consultar datos del otro cuando un rol necesita ver ambas empresas.",
    pros: [
      "Separación total de los vendedores por default: cada sistema solo contiene su propia información.",
      "Folios independientes de forma natural.",
      "Si algún día Ligero y Móvil se vuelven negocios muy distintos, quedarían totalmente independientes.",
    ],
    cons: [
      "Lo compartido se vuelve lo difícil: cada pantalla que debe ver las dos empresas (producción, autorizaciones, crédito, compras) tiene que unir datos de dos sistemas en vivo, y eso es permanente.",
      "Crédito y Cobranza necesita el saldo consolidado del cliente entre las dos empresas; con dos bases eso es un cruce entre sistemas cada vez.",
      "Datos duplicados: al ser dos bases, clientes, productos, facturas y pagos de Microsip se sincronizan dos veces y hay que mantenerlas consistentes.",
      "Identidad compartida: el administrador y Eunice necesitarían una cuenta que funcione en ambos, con las autorizaciones guardándose en el sistema correcto.",
      "Doble operación en el servidor: dos apps, dos bases, dos despliegues, dos migraciones. Más superficie que puede fallar.",
      "La API es un componente nuevo completo que hay que diseñar, asegurar y mantener; suele ser más trabajo que agregar una etiqueta de empresa.",
      "Folios duplicados: como ambas empresas usan el mismo prefijo (MEX/EXT), cada sistema generaría su propia numeración y los folios se repetirían entre empresas.",
    ],
    cuando: "Conviene solo si fueran negocios realmente distintos, con equipos y procesos separados, y lo compartido fuera únicamente reportes ocasionales de lectura.",
  },
  {
    label: "OPCIÓN B",
    title: "Un solo sistema con la empresa como etiqueta interna",
    desc:
      "Se mantiene una sola aplicación y una sola base de datos. Se agrega una etiqueta de 'empresa' (Ligero / Móvil) a cotizaciones, pedidos y usuarios, y la información se filtra según el rol de cada quien.",
    pros: [
      "Separar al vendedor es solo un filtro: ve únicamente su empresa.",
      "Lo compartido ya está junto por default: producción, autorizaciones, crédito y compras ven ambas sin trabajo extra.",
      "Saldo consolidado del cliente inmediato, porque todo vive en la misma base.",
      "Una sola sincronización de Microsip, sin datos duplicados.",
      "Los folios se generan en un solo lugar, así que nunca se duplican aunque ambas empresas compartan el mismo prefijo (MEX/EXT).",
      "Una sola aplicación que mantener y desplegar.",
    ],
    cons: [
      "Requiere una migración cuidadosa para marcar toda la información existente como 'Ligero'.",
      "La visibilidad por rol se maneja por reglas dentro del sistema (no por separación física).",
    ],
    cuando: "Es el enfoque natural cuando ambas empresas comparten base, clientes y productos, y varios roles trabajan a diario en las dos.",
  },
  {
    label: "OPCIÓN C  (RECOMENDADA)",
    title: "Un solo sistema con empresa interna + subdominios con imagen propia",
    desc:
      "Es la Opción B, más una capa de presentación: cada marca tiene su propia dirección con su logo y colores (por ejemplo movil.nexxo.com.mx), pero por debajo usan la misma base de datos. Separado a la vista, unido por dentro.",
    pros: [
      "El vendedor de Móvil entra a su propia dirección con la imagen de su marca y solo ve lo suyo.",
      "El administrador, Eunice, Producción y Compras entran y ven las dos empresas juntas, ya integradas.",
      "Da la sensación de dos sistemas, sin el costo de unir datos entre dos bases.",
      "Aprovecha que el sistema ya soporta subdominios y certificados comodín.",
    ],
    cons: [
      "Trabajo adicional menor para la imagen (logo y colores) por marca.",
    ],
    cuando: "Es la mejor relación entre lo que piden y el esfuerzo: cumple la separación de los vendedores y la vista unificada de los roles compartidos.",
  },
];

// Fases del alcance (h = horas estimadas de desarrollo, aproximadas)
const fases = [
  { t: "Base de datos y migración: agregar la empresa a las tablas, asignar empresa a cada usuario y marcar todo lo existente como 'Ligero'.", h: 12 },
  { t: "Folios de cotización: conservar el prefijo por tipo de cliente (MEX/EXT) y garantizar numeración única para que nunca se dupliquen entre las dos empresas.", h: 4 },
  { t: "Backend: filtrar la información por empresa según el rol y marcar la empresa al crear cada cotización.", h: 14 },
  { t: "Pantallas y tableros: producción con un tablero por empresa, listas de cotizaciones filtradas, indicador de empresa y vista combinada para los roles globales.", h: 20 },
  { t: "Subdominios con imagen propia por marca (logo y colores).", h: 7 },
  { t: "Pruebas y despliegue en el servidor (VPS) con la migración incluida.", h: 7 },
];

const preguntas = [
  "Para los roles compartidos (Administrador, Eunice, Compras): ¿un solo login que muestre ambas empresas, o subdominios por marca?",
  "La separación por empresa, ¿aplica solo a cotizaciones o también a pedidos, embarques y producción?",
  "¿Un vendedor puede pertenecer a las dos empresas o siempre a una sola?",
  "Sobre el folio: ¿se conserva el esquema actual (prefijo MEX para México / EXT para extranjero con número único), o se desea un consecutivo corrido (0001, 0002, …)?",
];

const fmtH = (h) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
const totalHoras = fases.reduce((n, f) => n + f.h, 0);

// ---------------- Render ----------------

const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PAGE_W = doc.page.width;
const PAGE_H = doc.page.height;
const M = 50;
const CONTENT_W = PAGE_W - M * 2;
const HOURS_COL = 46;
let y = 0;

const today = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

// Cover band
doc.rect(0, 0, PAGE_W, 110).fill(COLORS.primary);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(26).text("NEXXO", M, 30);
doc.fillColor(COLORS.accent).font("Helvetica").fontSize(11).text("Sistema Comercial de Nueva Generación", M, 62);
doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text("Propuesta Técnica — Operación de Dos Empresas (Ligero y Móvil)", M, 80);
doc.fillColor(COLORS.accentSoft).font("Helvetica").fontSize(9).text(`${today}     |     nexxo.com.mx`, M, 98);

// Resumen ejecutivo
y = 134;
doc.rect(M, y, CONTENT_W, 96).fill(COLORS.bandSoft);
doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(10).text("Resumen Ejecutivo", M + 14, y + 12);
doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(
  "Joper opera dos marcas comerciales, Ligero y Móvil, que comparten la misma base de Microsip, los mismos clientes y los mismos productos. " +
    "Se necesita separar la operación de los vendedores por empresa y, al mismo tiempo, mantener una vista unificada para producción, autorizaciones, crédito/cobranza y compras. " +
    "Este documento compara las opciones para lograrlo y presenta una recomendación con su alcance de trabajo.",
  M + 14,
  y + 30,
  { width: CONTENT_W - 28, lineGap: 2 }
);

y += 96 + 20;

// Helpers
function ensureSpace(needed) {
  if (y + needed > PAGE_H - 60) {
    doc.addPage();
    y = M;
  }
}

function sectionHeader(title) {
  ensureSpace(40);
  doc.rect(M, y, CONTENT_W, 24).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11).text(title, M + 12, y + 6, { width: CONTENT_W - 24 });
  y += 24 + 10;
}

function paragraph(text, opts = {}) {
  const color = opts.color || COLORS.text;
  const size = opts.size || 9;
  const indent = opts.indent || 0;
  doc.font("Helvetica").fontSize(size);
  const w = CONTENT_W - indent;
  const h = doc.heightOfString(text, { width: w, lineGap: 2 });
  ensureSpace(h + 6);
  doc.fillColor(color).font("Helvetica").fontSize(size).text(text, M + indent, y, { width: w, lineGap: 2 });
  y += h + 6;
}

function optionTitle(label, title) {
  ensureSpace(30);
  doc.rect(M, y, CONTENT_W, 22).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.accentSoft).font("Helvetica-Bold").fontSize(8).text(label, M + 12, y + 4);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(10.5).text(title, M + 12, y + 4, {
    width: CONTENT_W - 24,
    align: "right",
  });
  y += 22 + 8;
}

function miniLabel(text, color) {
  ensureSpace(16);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(9).text(text, M + 4, y);
  y += 14;
}

function bullets(items, dotColor) {
  items.forEach((it) => {
    doc.font("Helvetica").fontSize(9);
    const textW = CONTENT_W - 24;
    const h = doc.heightOfString(it, { width: textW, lineGap: 1.5 });
    ensureSpace(h + 7);
    doc.circle(M + 8, y + 5, 2).fill(dotColor);
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(it, M + 18, y, { width: textW, lineGap: 1.5 });
    y += h + 6;
  });
}

function bulletHours(item) {
  doc.font("Helvetica").fontSize(9);
  const textW = CONTENT_W - 24 - HOURS_COL;
  const h = doc.heightOfString(item.t, { width: textW, lineGap: 1.5 });
  ensureSpace(h + 7);
  doc.circle(M + 8, y + 5, 2).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(item.t, M + 18, y, { width: textW, lineGap: 1.5 });
  doc.fillColor(COLORS.primaryLight).font("Helvetica-Bold").fontSize(9).text(`${fmtH(item.h)} h`, M + 18 + textW, y, {
    width: HOURS_COL,
    align: "right",
  });
  y += h + 6;
}

// Requerimientos
sectionHeader("Lo que se necesita");
bullets(requerimientos, COLORS.primaryLight);
y += 6;

// Opciones
sectionHeader("Opciones de implementación");
opciones.forEach((op) => {
  optionTitle(op.label, op.title);
  paragraph(op.desc);
  miniLabel("Ventajas", COLORS.good);
  bullets(op.pros, COLORS.good);
  miniLabel("Desventajas", COLORS.bad);
  bullets(op.cons, COLORS.bad);
  paragraph("Cuándo conviene: " + op.cuando, { color: COLORS.textSoft });
  y += 8;
});

// Recomendación
sectionHeader("Recomendación");
ensureSpace(70);
const recTextH = 54;
doc.rect(M, y, CONTENT_W, recTextH).fill(COLORS.recBand);
doc.fillColor(COLORS.good).font("Helvetica-Bold").fontSize(10).text("Opción C — Un solo sistema con empresa interna + subdominios con imagen propia", M + 14, y + 10, { width: CONTENT_W - 28 });
doc.fillColor(COLORS.text).font("Helvetica").fontSize(9).text(
  "Cumple la separación de los vendedores y la vista unificada de producción, autorizaciones, crédito y compras, aprovechando la base y los clientes/productos ya compartidos, con el menor esfuerzo y la menor superficie de mantenimiento.",
  M + 14,
  y + 26,
  { width: CONTENT_W - 28, lineGap: 2 }
);
y += recTextH + 16;

// Alcance
sectionHeader("Alcance del trabajo (por fases)");
paragraph("Estimación aproximada de horas de desarrollo. El trabajo puede entregarse por partes.", { color: COLORS.textSoft });
fases.forEach((f) => bulletHours(f));
ensureSpace(20);
doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(9.5).text(`Total estimado: ${fmtH(totalHoras)} horas de desarrollo (aproximado)`, M + 4, y);
y += 20;

// Preguntas
sectionHeader("Puntos por definir");
bullets(preguntas, COLORS.primaryLight);

// Footer en cada página
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc.page.margins.bottom = 0;
  const fy = PAGE_H - 38;
  doc.rect(0, fy, PAGE_W, 38).fill(COLORS.bandSoft);
  doc.fillColor(COLORS.textSoft).font("Helvetica").fontSize(7.5).text(
    "NEXXO — Sistema Comercial   ·   Propuesta técnica   ·   Confidencial",
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
console.log(`PDF generado: ${OUT} (${opciones.length} opciones · ${fmtH(totalHoras)} h estimadas)`);
