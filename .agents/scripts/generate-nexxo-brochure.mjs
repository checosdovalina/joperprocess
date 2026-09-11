import PDFDocument from "pdfkit";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assets = path.join(root, "attached_assets");
const outDir = path.join(root, "deliverables");
fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, "nexxo-brochure-comercial.pdf");

const files = {
  landing: "0_Captura_de_pantalla_2026-09-11_a_la(s)_4.25.49_p.m._1789165741444.png",
  features: "1_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.00_p.m._1789165741445.png",
  dashboard: "2_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.13_p.m._1789165741445.png",
  checkins: "3_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.20_p.m._1789165741445.png",
  visits: "4_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.28_p.m._1789165741445.png",
  quotations: "5_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.31_p.m._1789165741446.png",
  credit: "6_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.34_p.m._1789165741446.png",
  board: "7_Captura_de_pantalla_2026-09-11_a_la(s)_4.27.03_p.m._1789165741446.png",
  production: "8_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.55_p.m._1789165741447.png",
  order: "9_Captura_de_pantalla_2026-09-11_a_la(s)_4.26.46_p.m._1789165741447.png",
};

const W = 792, H = 612;
const blue = "#2563EB", navy = "#0B1537", cyan = "#36A3FF", ink = "#111827";
const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false, info: {
  Title: "Nexxo — Brochure comercial",
  Author: "Nexxo",
  Subject: "Plataforma integral para la gestión comercial y operativa",
}});
doc.pipe(fs.createWriteStream(output));
doc.registerFont("Body", font).registerFont("Bold", bold);

async function screenshot(key) {
  const input = path.join(assets, files[key]);
  const meta = await sharp(input).metadata();
  const top = Math.min(108, Math.floor((meta.height || 0) * 0.06));
  return sharp(input).extract({ left: 0, top, width: meta.width, height: meta.height - top }).png().toBuffer();
}

const images = {};
for (const key of Object.keys(files)) images[key] = await screenshot(key);
images.inmosa = await sharp(path.join(assets, "image_1789165890956.png"))
  .flatten({ background: "#FFFFFF" })
  .png()
  .toBuffer();

function addPage(bg = "#F5F7FB") {
  doc.addPage({ size: [W, H], margin: 0 });
  doc.rect(0, 0, W, H).fill(bg);
}
function brand(x = 42, y = 28, light = false) {
  doc.roundedRect(x, y, 30, 30, 7).fill(light ? "#FFFFFF" : navy);
  doc.font("Bold").fontSize(13).fillColor(light ? blue : "#FFFFFF").text("N", x + 9, y + 7);
  doc.font("Bold").fontSize(18).fillColor(light ? "#FFFFFF" : navy).text("NEXXO", x + 40, y + 5);
}
function heading(kicker, title, subtitle, light = false) {
  doc.font("Bold").fontSize(10).fillColor(light ? "#7DD3FC" : blue).text(kicker.toUpperCase(), 42, 86, { characterSpacing: 1.4 });
  doc.font("Bold").fontSize(30).fillColor(light ? "#FFFFFF" : navy).text(title, 42, 108, { width: 708, lineGap: 2 });
  if (subtitle) doc.font("Body").fontSize(12).fillColor(light ? "#CBD5E1" : "#5B6475").text(subtitle, 42, 184, { width: 690, lineGap: 4 });
}
function frameImage(buffer, x, y, w, h) {
  doc.roundedRect(x + 5, y + 7, w, h, 9).fillOpacity(0.12).fill("#0F172A").fillOpacity(1);
  doc.roundedRect(x, y, w, h, 9).fill("#FFFFFF");
  doc.image(buffer, x + 7, y + 7, { fit: [w - 14, h - 14], align: "center", valign: "center" });
}
function footer(n, light = false) {
  doc.font("Body").fontSize(8).fillColor(light ? "#94A3B8" : "#8A94A6").text(`NEXXO  •  ${n}`, 42, H - 27);
}
function bullet(text, x, y, width = 290, light = false) {
  doc.circle(x + 4, y + 7, 3).fill(light ? cyan : blue);
  doc.font("Body").fontSize(11).fillColor(light ? "#E2E8F0" : ink).text(text, x + 16, y, { width, lineGap: 3 });
}

// 1 — Cover
addPage(navy);
brand(42, 38, true);
doc.circle(740, 40, 210).fillOpacity(0.12).fill(cyan).fillOpacity(1);
doc.font("Bold").fontSize(32).fillColor("#FFFFFF").text("Todo tu proceso\ncomercial, en un\nsolo lugar.", 42, 145, { width: 345, lineGap: 3 });
doc.font("Body").fontSize(12).fillColor("#CBD5E1").text("Nexxo conecta ventas, clientes, crédito, pedidos y producción en una plataforma diseñada para crecer contigo.", 42, 300, { width: 335, lineGap: 5 });
doc.roundedRect(42, 438, 310, 46, 10).fill(blue);
doc.font("Bold").fontSize(11).fillColor("#FFFFFF").text("GESTIÓN CLARA. DECISIONES RÁPIDAS.", 61, 454, { width: 275 });
frameImage(images.landing, 420, 125, 330, 320);
doc.font("Body").fontSize(9).fillColor("#94A3B8").text("Brochure comercial  •  2026", 42, 555);

// 2 — Value
addPage();
brand(); heading("Una plataforma integral", "Menos sistemas aislados. Más control.", "Centraliza la información que tu equipo necesita para trabajar, dar seguimiento y tomar decisiones.");
frameImage(images.features, 42, 230, 420, 270);
const valueItems = [
  ["Visibilidad", "Indicadores y avances disponibles para cada responsable."],
  ["Continuidad", "Del primer contacto al pedido y la producción, sin perder el contexto."],
  ["Adaptabilidad", "Roles, compañías y procesos configurables para cada operación."],
];
valueItems.forEach(([t, d], i) => {
  const y = 237 + i * 90;
  doc.roundedRect(495, y, 250, 72, 10).fill("#FFFFFF");
  doc.font("Bold").fontSize(13).fillColor(navy).text(t, 512, y + 14);
  doc.font("Body").fontSize(9.5).fillColor("#667085").text(d, 512, y + 35, { width: 210, lineGap: 2 });
});
footer(2);

// 3 — Dashboard
addPage("#EEF4FF");
brand(); heading("Control ejecutivo", "Información útil desde el primer vistazo.", "El panel reúne indicadores comerciales, cartera, pedidos, embarques y actividad para detectar prioridades a tiempo.");
frameImage(images.dashboard, 42, 220, 708, 330);
footer(3);

// 4 — CRM
addPage();
brand(); heading("CRM y trabajo de campo", "Cada visita deja información accionable.", "Planea actividades, registra check-ins, consulta el historial y revisa el desempeño por vendedor.");
frameImage(images.checkins, 42, 225, 338, 240);
frameImage(images.visits, 412, 225, 338, 240);
bullet("Seguimiento de clientes y prospectos.", 52, 492, 210);
bullet("Visitas programadas y check-ins.", 287, 492, 210);
bullet("Filtros y métricas por vendedor.", 522, 492, 210);
footer(4);

// 5 — Sales
addPage("#F8FAFC");
brand(); heading("Ventas y crédito", "Cotiza con rapidez. Autoriza con criterio.", "Mantén trazabilidad de propuestas, montos, estatus y decisiones de crédito en un flujo ordenado.");
frameImage(images.quotations, 42, 222, 338, 250);
frameImage(images.credit, 412, 222, 338, 250);
doc.font("Bold").fontSize(13).fillColor(navy).text("Cotizaciones", 52, 494);
doc.font("Body").fontSize(10).fillColor("#667085").text("Precios, seguimiento, aprobación y conversión a pedido.", 52, 516, { width: 310 });
doc.font("Bold").fontSize(13).fillColor(navy).text("Autorización de crédito", 422, 494);
doc.font("Body").fontSize(10).fillColor("#667085").text("Solicitudes visibles y decisiones respaldadas por información.", 422, 516, { width: 310 });
footer(5);

// 6 — Board
addPage(navy);
brand(42, 28, true); heading("Ejecución operativa", "Del pedido al piso de producción.", "Un tablero visual permite reconocer cargas, atrasos, prioridades y avances por etapa.", true);
frameImage(images.board, 42, 228, 708, 310);
footer(6, true);

// 7 — Production
addPage();
brand(); heading("Producción y detalle", "Cada orden conserva su contexto.", "Consulta el panorama general y profundiza en materiales, partidas, cantidades y avances cuando lo necesites.");
frameImage(images.production, 42, 220, 338, 270);
frameImage(images.order, 412, 220, 338, 270);
bullet("Indicadores de producción y pedidos pendientes.", 52, 515, 300);
bullet("Detalle operativo para una mejor coordinación.", 422, 515, 300);
footer(7);

// 8 — Benefits
addPage("#EEF4FF");
brand(); heading("Diseñado para operar con confianza", "Una sola fuente de verdad para todo el equipo.", "Nexxo organiza responsabilidades, protege la información por empresa y facilita la adopción desde escritorio o móvil.");
const benefits = [
  ["01", "Información centralizada", "Clientes, visitas, cotizaciones, pedidos, crédito y producción conectados."],
  ["02", "Seguimiento por responsable", "Cada usuario consulta lo que le corresponde, con visibilidad administrativa."],
  ["03", "Aislamiento por compañía", "Datos y vendedores independientes para cada empresa o tenant."],
  ["04", "Evidencia y comunicación", "Minutas en PDF, fotografías, notas y notificaciones por correo."],
  ["05", "Preparado para crecer", "Módulos configurables y una base lista para nuevas automatizaciones."],
  ["06", "Acceso desde cualquier lugar", "Interfaz adaptable para oficina, campo y operación."],
];
benefits.forEach(([n, t, d], i) => {
  const col = i % 2, row = Math.floor(i / 2), x = 42 + col * 365, y = 232 + row * 102;
  doc.roundedRect(x, y, 340, 82, 10).fill("#FFFFFF");
  doc.font("Bold").fontSize(20).fillColor("#B9D2FF").text(n, x + 16, y + 14);
  doc.font("Bold").fontSize(12).fillColor(navy).text(t, x + 60, y + 13);
  doc.font("Body").fontSize(9).fillColor("#667085").text(d, x + 60, y + 35, { width: 255, lineGap: 2 });
});
footer(8);

// 9 — CTA
addPage(navy);
doc.circle(690, 80, 190).fillOpacity(0.15).fill(cyan).fillOpacity(1);
doc.circle(730, 540, 260).fillOpacity(0.10).fill(blue).fillOpacity(1);
brand(42, 38, true);
doc.font("Bold").fontSize(38).fillColor("#FFFFFF").text("Conoce cómo Nexxo\npuede ordenar y acelerar\ntu operación.", 42, 150, { width: 610, lineGap: 5 });
doc.font("Body").fontSize(14).fillColor("#CBD5E1").text("Solicita una presentación o demostración personalizada.", 42, 340, { width: 520 });
doc.roundedRect(42, 392, 680, 118, 12).fill("#FFFFFF");
doc.font("Body").fontSize(9).fillColor("#667085").text("CONTACTO", 62, 407, { characterSpacing: 1.2 });
doc.font("Bold").fontSize(16).fillColor(navy).text("María Teresa Elizalde", 62, 426);
doc.font("Bold").fontSize(13).fillColor(blue).text("tere@inmosa.com.mx  •  www.inmosa.com.mx", 62, 451);
doc.font("Body").fontSize(10).fillColor("#475467").text("T. 871 717 2031 · 871 717 2034    C. 871 156 8442", 62, 477);
doc.image(images.inmosa, 535, 414, { fit: [155, 55], align: "center", valign: "center" });
doc.font("Body").fontSize(10).fillColor("#94A3B8").text("NEXXO  •  Sistema Comercial", 42, 555);

doc.end();
await new Promise(resolve => doc.on("end", resolve));
console.log(output);