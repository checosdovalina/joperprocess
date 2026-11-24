import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export type ProspectExportPayload = {
  title: string;
  period: string;
  filters: string[];
  summary: { label: string; value: string }[];
  headers: string[];
  rows: string[][];
};

export async function generateProspectOpportunitiesExcel(payload: ProspectExportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nexxo";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen");
  summary.addRow([payload.title]);
  summary.addRow([payload.period]);
  if (payload.filters.length) summary.addRow([payload.filters.join(" · ")]);
  summary.addRow([]);
  summary.addRow(["Indicador", "Resultado"]);
  for (const metric of payload.summary) summary.addRow([metric.label, metric.value]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FF17365D" } };
  summary.getRow(payload.filters.length ? 5 : 4).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(payload.filters.length ? 5 : 4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17365D" } };
  summary.columns = [{ width: 34 }, { width: 48 }];

  const details = workbook.addWorksheet("Detalle");
  details.addRow(payload.headers);
  for (const row of payload.rows) details.addRow(row);
  details.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  details.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17365D" } };
  details.views = [{ state: "frozen", ySplit: 1 }];
  details.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: payload.headers.length } };
  details.columns = payload.headers.map((header, index) => ({
    header,
    key: `col${index}`,
    width: Math.min(48, Math.max(16, header.length + 3)),
  }));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function generateProspectOpportunitiesPdf(payload: ProspectExportPayload) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const drawHeader = () => {
      document.font("Helvetica-Bold").fontSize(18).fillColor("#17365d").text(payload.title);
      document.moveDown(0.3);
      document.font("Helvetica").fontSize(9).fillColor("#444").text(payload.period);
      if (payload.filters.length) document.text(payload.filters.join(" · "));
      document.moveDown(0.8);
      const metricWidth = pageWidth / Math.max(1, payload.summary.length);
      const top = document.y;
      payload.summary.forEach((metric, index) => {
        const x = document.page.margins.left + index * metricWidth;
        document.roundedRect(x, top, metricWidth - 8, 42, 4).fill("#f1f5f9");
        document.fillColor("#64748b").font("Helvetica").fontSize(8).text(metric.label, x + 8, top + 7, { width: metricWidth - 24, height: 11, ellipsis: true });
        document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text(metric.value, x + 8, top + 21, { width: metricWidth - 24, height: 15, ellipsis: true });
      });
      document.y = top + 54;
    };
    const columnWidth = pageWidth / Math.max(1, payload.headers.length);
    const drawTableHeader = () => {
      const top = document.y;
      document.rect(document.page.margins.left, top, pageWidth, 24).fill("#17365d");
      payload.headers.forEach((header, index) => {
        document.fillColor("#fff").font("Helvetica-Bold").fontSize(8).text(header, document.page.margins.left + index * columnWidth + 4, top + 7, { width: columnWidth - 8, height: 12, ellipsis: true });
      });
      document.y = top + 24;
    };
    drawHeader();
    drawTableHeader();
    payload.rows.forEach((row, rowIndex) => {
      const height = 30;
      if (document.y + height > document.page.height - document.page.margins.bottom) {
        document.addPage();
        drawTableHeader();
      }
      const top = document.y;
      if (rowIndex % 2 === 0) document.rect(document.page.margins.left, top, pageWidth, height).fill("#f8fafc");
      row.forEach((value, index) => {
        document.fillColor("#1e293b").font("Helvetica").fontSize(7.5).text(value || "—", document.page.margins.left + index * columnWidth + 4, top + 5, { width: columnWidth - 8, height: height - 8, ellipsis: true });
      });
      document.y = top + height;
    });
    if (!payload.rows.length) {
      document.moveDown(0.5);
      document.font("Helvetica").fontSize(10).fillColor("#64748b").text("No hay registros para mostrar.");
    }
    const range = document.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page++) {
      document.switchToPage(page);
      document.font("Helvetica").fontSize(8).fillColor("#64748b")
        .text(`Nexxo · Página ${page + 1} de ${range.count}`, document.page.margins.left, document.page.height - 24, { width: pageWidth, align: "right" });
    }
    document.end();
  });
}
