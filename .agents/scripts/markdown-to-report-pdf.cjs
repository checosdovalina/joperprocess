const fs = require("fs");
const PDFDocument = require("pdfkit");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error("Uso: node markdown-to-report-pdf.cjs <entrada.md> <salida.pdf>");
}

const markdown = fs.readFileSync(inputPath, "utf8");
const regularFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const boldFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const monoFont = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf";

const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: 58, bottom: 58, left: 62, right: 62 },
  info: {
    Title: "Reporte de cambios Joper / Nexxo — 23 de julio al 4 de septiembre de 2026",
    Author: "Replit Agent",
    Subject: "Reporte basado en el historial de Git del proyecto",
  },
});

fs.mkdirSync(require("path").dirname(outputPath), { recursive: true });
doc.pipe(fs.createWriteStream(outputPath));

const colors = {
  navy: "#12345B",
  blue: "#2F80ED",
  slate: "#455468",
  ink: "#1D2939",
  muted: "#667085",
  line: "#D0D5DD",
  soft: "#F2F6FA",
  warning: "#8A5B00",
};

function setFont(kind = "regular", size = 9.6, color = colors.ink) {
  const font = kind === "bold" ? boldFont : kind === "mono" ? monoFont : regularFont;
  doc.font(font).fontSize(size).fillColor(color);
}

function addHeaderFooter() {
  const pageWidth = doc.page.width;
  doc.save();
  doc.strokeColor(colors.line).lineWidth(0.5)
    .moveTo(doc.page.margins.left, 37)
    .lineTo(pageWidth - doc.page.margins.right, 37)
    .stroke();
  setFont("bold", 7.5, colors.navy);
  doc.text("JOPER / NEXXO", doc.page.margins.left, 24, { lineBreak: false });
  setFont("regular", 7.5, colors.muted);
  doc.text("Reporte de cambios · 23 jul — 4 sep 2026", pageWidth - doc.page.margins.right - 180, 24, {
    width: 180,
    align: "right",
    lineBreak: false,
  });
  const footerY = doc.page.height - 33;
  doc.strokeColor(colors.line).lineWidth(0.5)
    .moveTo(doc.page.margins.left, footerY - 7)
    .lineTo(pageWidth - doc.page.margins.right, footerY - 7)
    .stroke();
  setFont("regular", 7.5, colors.muted);
  doc.text(`Página ${doc.page.number}`, doc.page.margins.left, footerY, { lineBreak: false });
  doc.text("Documento generado a partir del historial de Git", pageWidth - doc.page.margins.right - 230, footerY, {
    width: 230,
    align: "right",
    lineBreak: false,
  });
  doc.restore();
}

doc.on("pageAdded", addHeaderFooter);

function ensureSpace(height = 24) {
  const bottom = doc.page.height - doc.page.margins.bottom - 12;
  if (doc.y + height > bottom) doc.addPage();
}

function drawCover() {
  const pageWidth = doc.page.width;
  doc.rect(0, 0, pageWidth, 230).fill(colors.navy);
  doc.rect(0, 230, pageWidth, 8).fill(colors.blue);
  setFont("bold", 11, "#BBD7FF");
  doc.text("JOPER / NEXXO", 62, 64, { characterSpacing: 1.4 });
  setFont("bold", 28, "#FFFFFF");
  doc.text("Reporte de cambios", 62, 103);
  setFont("regular", 16, "#D7E8FF");
  doc.text("23 de julio al 4 de septiembre de 2026", 62, 145);

  doc.y = 286;
  setFont("bold", 13, colors.navy);
  doc.text("Resumen del periodo");
  doc.moveDown(0.6);
  setFont("regular", 10.5, colors.slate);
  doc.text(
    "Reporte funcional y cronológico elaborado a partir del historial de Git del proyecto Joper / Nexxo.",
    { width: 480, lineGap: 4 },
  );

  const cards = [
    ["69", "commits revisados"],
    ["98", "pruebas aprobadas al cierre"],
    ["6", "áreas funcionales principales"],
  ];
  let x = 62;
  const cardY = 370;
  for (const [value, label] of cards) {
    doc.roundedRect(x, cardY, 150, 76, 8).fill(colors.soft);
    setFont("bold", 22, colors.blue);
    doc.text(value, x + 14, cardY + 13);
    setFont("regular", 9, colors.slate);
    doc.text(label, x + 14, cardY + 45, { width: 122 });
    x += 166;
  }

  doc.y = 500;
  setFont("bold", 10, colors.navy);
  doc.text("Incluye");
  doc.moveDown(0.35);
  setFont("regular", 9.5, colors.slate);
  doc.list([
    "Cambios funcionales por módulo y por fecha.",
    "Microsip, Firebird, multi-tenancy y seguridad.",
    "Migraciones, despliegue, pruebas y recomendaciones.",
  ], { bulletRadius: 1.5, textIndent: 14, bulletIndent: 0, lineGap: 3 });

  doc.addPage();
}

function cleanInline(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

function drawWrapped(text, options = {}) {
  const width = options.width || doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const indent = options.indent || 0;
  const lineGap = options.lineGap ?? 2;
  const size = options.size || 9.6;
  const kind = options.kind || "regular";
  const color = options.color || colors.ink;
  setFont(kind, size, color);
  doc.text(cleanInline(text), doc.page.margins.left + indent, doc.y, {
    width: width - indent,
    lineGap,
    continued: false,
  });
}

function renderMarkdown(source) {
  const lines = source.split(/\r?\n/);
  let inCode = false;
  let codeLines = [];
  let skipFirstTitle = true;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        const block = codeLines.join("\n");
        ensureSpace(46);
        const height = Math.max(30, doc.heightOfString(block, { width: 470, font: monoFont, fontSize: 7.5, lineGap: 2 }) + 16);
        doc.roundedRect(doc.page.margins.left, doc.y, 488, height, 4).fill("#F6F8FA");
        setFont("mono", 7.5, colors.slate);
        doc.text(block, doc.page.margins.left + 8, doc.y + 8, { width: 472, lineGap: 2 });
        doc.y += height + 9;
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line === "") {
      doc.moveDown(0.38);
      continue;
    }
    if (skipFirstTitle && line.startsWith("# ")) {
      skipFirstTitle = false;
      continue;
    }
    skipFirstTitle = false;

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = cleanInline(heading[2]);
      const size = level === 1 ? 17 : level === 2 ? 13 : 10.8;
      const color = level === 1 ? colors.navy : level === 2 ? colors.blue : colors.slate;
      ensureSpace(level === 1 ? 38 : 30);
      doc.moveDown(level === 1 ? 0.5 : 0.25);
      setFont("bold", size, color);
      doc.text(title, { lineGap: 2 });
      if (level <= 2) {
        doc.moveDown(0.15);
        doc.strokeColor(level === 1 ? colors.blue : "#D9E7F7").lineWidth(level === 1 ? 1 : 0.6)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke();
      }
      doc.moveDown(0.18);
      continue;
    }

    if (/^---+$/.test(line)) {
      ensureSpace(12);
      doc.strokeColor(colors.line).lineWidth(0.6)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.45);
      continue;
    }

    const bullet = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (bullet) {
      ensureSpace(20);
      setFont("regular", 9.4, colors.blue);
      doc.text("•", doc.page.margins.left + 2, doc.y, { lineBreak: false });
      drawWrapped(bullet[2], { indent: 14, size: 9.4, color: colors.ink, lineGap: 2 });
      doc.moveDown(0.12);
      continue;
    }

    const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (numbered) {
      ensureSpace(20);
      setFont("bold", 9.4, colors.blue);
      doc.text(`${numbered[1]}.`, doc.page.margins.left, doc.y, { width: 16, lineBreak: false });
      drawWrapped(numbered[2], { indent: 19, size: 9.4, color: colors.ink, lineGap: 2 });
      doc.moveDown(0.12);
      continue;
    }

    if (line.startsWith(">")) {
      ensureSpace(26);
      doc.rect(doc.page.margins.left, doc.y, 3, 18).fill(colors.blue);
      drawWrapped(line.replace(/^>\s?/, ""), { indent: 14, size: 9.2, color: colors.slate, lineGap: 2 });
      doc.moveDown(0.15);
      continue;
    }

    ensureSpace(18);
    drawWrapped(line, { size: 9.5, color: colors.ink, lineGap: 2 });
    doc.moveDown(0.12);
  }
}

drawCover();
addHeaderFooter();
renderMarkdown(markdown);
doc.end();