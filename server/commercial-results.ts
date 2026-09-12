import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { PassThrough, Readable } from "stream";

export interface CommercialActivityRow {
  id: string;
  checkinAt: Date | string;
  checkoutAt: Date | string | null;
  meetingType: string;
  wasProspect: boolean;
  customer: { id: string; name: string };
  seller: { id: string; name: string };
}

export interface CommercialResults {
  summary: {
    totalContacts: number;
    prospectVisits: number;
    customerVisits: number;
    completed: number;
    active: number;
    uniqueCustomers: number;
  };
  daily: Array<{ date: string; contacts: number; prospects: number; customers: number }>;
  bySeller: Array<{ id: string; name: string; contacts: number; prospects: number; completed: number }>;
  byCustomer: Array<{ id: string; name: string; contacts: number; prospects: number; lastContactAt: string }>;
  byMeetingType: Array<{ type: string; count: number }>;
  items: CommercialActivityRow[];
}

export interface CommercialReportContext {
  companyName: string;
  filtersLabel: string;
  generatedAt?: Date;
}

export function summarizeCommercialActivity(items: CommercialActivityRow[], timezoneOffsetMinutes = 0): CommercialResults {
  const daily = new Map<string, { contacts: number; prospects: number; customers: number }>();
  const sellers = new Map<string, { id: string; name: string; contacts: number; prospects: number; completed: number }>();
  const customerTotals = new Map<string, { id: string; name: string; contacts: number; prospects: number; lastContactAt: string }>();
  const meetingTypes = new Map<string, number>();

  for (const item of items) {
    const date = new Date(new Date(item.checkinAt).getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
    const day = daily.get(date) ?? { contacts: 0, prospects: 0, customers: 0 };
    day.contacts++;
    item.wasProspect ? day.prospects++ : day.customers++;
    daily.set(date, day);

    const seller = sellers.get(item.seller.id) ?? { ...item.seller, contacts: 0, prospects: 0, completed: 0 };
    seller.contacts++;
    if (item.wasProspect) seller.prospects++;
    if (item.checkoutAt) seller.completed++;
    sellers.set(item.seller.id, seller);

    const checkinIso = new Date(item.checkinAt).toISOString();
    const customer = customerTotals.get(item.customer.id) ?? {
      ...item.customer, contacts: 0, prospects: 0, lastContactAt: checkinIso,
    };
    customer.contacts++;
    if (item.wasProspect) customer.prospects++;
    if (checkinIso > customer.lastContactAt) customer.lastContactAt = checkinIso;
    customerTotals.set(item.customer.id, customer);
    meetingTypes.set(item.meetingType, (meetingTypes.get(item.meetingType) ?? 0) + 1);
  }

  return {
    summary: {
      totalContacts: items.length,
      prospectVisits: items.filter(item => item.wasProspect).length,
      customerVisits: items.filter(item => !item.wasProspect).length,
      completed: items.filter(item => item.checkoutAt).length,
      active: items.filter(item => !item.checkoutAt).length,
      uniqueCustomers: customerTotals.size,
    },
    daily: Array.from(daily, ([date, values]) => ({ date, ...values })).sort((a, b) => a.date.localeCompare(b.date)),
    bySeller: Array.from(sellers.values()).sort((a, b) => b.contacts - a.contacts || a.name.localeCompare(b.name)),
    byCustomer: Array.from(customerTotals.values()).sort((a, b) => b.contacts - a.contacts || a.name.localeCompare(b.name)),
    byMeetingType: Array.from(meetingTypes, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    items,
  };
}

export function generateCommercialResultsPdf(results: CommercialResults, context: CommercialReportContext): Readable {
  const output = new PassThrough();
  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 38 });
  doc.pipe(output);
  const blue = "#1d4ed8";
  const navy = "#102048";
  const light = "#eef4ff";
  const generatedAt = context.generatedAt ?? new Date();

  doc.rect(0, 0, 792, 86).fill(navy);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text("Resultados comerciales", 38, 25);
  doc.font("Helvetica").fontSize(9).text(context.companyName, 38, 55);
  doc.text(context.filtersLabel, 400, 28, { width: 354, align: "right" });
  doc.text(`Generado: ${generatedAt.toLocaleString("es-MX")}`, 400, 50, { width: 354, align: "right" });

  const cards = [
    ["Contactos", results.summary.totalContacts],
    ["Contactos con prospectos", results.summary.prospectVisits],
    ["Clientes y prospectos únicos", results.summary.uniqueCustomers],
    ["Contactos terminados", results.summary.completed],
  ] as const;
  cards.forEach(([label, value], index) => {
    const x = 38 + index * 180;
    doc.roundedRect(x, 108, 164, 66, 8).fill(light);
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(22).text(String(value), x + 14, 122);
    doc.fillColor("#526078").font("Helvetica").fontSize(9).text(label, x + 14, 151);
  });

  const drawBars = (
    title: string,
    rows: Array<{ label: string; value: number }>,
    x: number,
    y: number,
    width: number,
    maxRows = 8,
  ) => {
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text(title, x, y);
    const shown = rows.slice(0, maxRows);
    const max = Math.max(1, ...shown.map(row => row.value));
    shown.forEach((row, index) => {
      const rowY = y + 28 + index * 34;
      doc.fillColor("#344054").font("Helvetica").fontSize(8).text(row.label, x, rowY, { width: width - 45 });
      doc.roundedRect(x, rowY + 13, width - 45, 9, 4).fill("#e6eaf0");
      doc.roundedRect(x, rowY + 13, Math.max(3, ((width - 45) * row.value) / max), 9, 4).fill(blue);
      doc.fillColor(navy).font("Helvetica-Bold").text(String(row.value), x + width - 36, rowY + 12, { width: 32, align: "right" });
    });
  };

  drawBars("Actividad por vendedor", results.bySeller.map(row => ({ label: row.name, value: row.contacts })), 38, 205, 335);
  drawBars("Clientes y prospectos con mayor seguimiento", results.byCustomer.map(row => ({ label: row.name, value: row.contacts })), 410, 205, 344);
  doc.end();
  return output;
}

export async function generateCommercialResultsExcel(results: CommercialResults, context: CommercialReportContext): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nexxo";
  workbook.created = context.generatedAt ?? new Date();
  const titleStyle = { font: { bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF102048" } } } as const;
  const addHeader = (sheet: ExcelJS.Worksheet, columns: string[]) => {
    const row = sheet.addRow(columns);
    row.eachCell(cell => Object.assign(cell, titleStyle));
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  };

  const summary = workbook.addWorksheet("Resumen");
  summary.addRow(["Resultados comerciales", context.companyName]);
  summary.addRow(["Filtros", context.filtersLabel]);
  summary.addRow([]);
  addHeader(summary, ["Indicador", "Resultado"]);
  Object.entries({
    "Contactos totales": results.summary.totalContacts,
    "Contactos con prospectos": results.summary.prospectVisits,
    "Contactos con clientes": results.summary.customerVisits,
    "Contactos terminados": results.summary.completed,
    "Contactos activos": results.summary.active,
    "Clientes y prospectos únicos": results.summary.uniqueCustomers,
  }).forEach(entry => summary.addRow(entry));
  summary.columns = [{ width: 34 }, { width: 18 }];

  const daily = workbook.addWorksheet("Actividad diaria");
  addHeader(daily, ["Fecha", "Contactos", "Prospectos", "Clientes"]);
  results.daily.forEach(row => daily.addRow([row.date, row.contacts, row.prospects, row.customers]));
  daily.columns = [{ width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }];

  const sellers = workbook.addWorksheet("Por vendedor");
  addHeader(sellers, ["Vendedor", "Contactos", "Prospectos", "Terminadas"]);
  results.bySeller.forEach(row => sellers.addRow([row.name, row.contacts, row.prospects, row.completed]));
  sellers.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }];

  const customers = workbook.addWorksheet("Por cliente y prospecto");
  addHeader(customers, ["Cliente o prospecto", "Contactos", "Contactos como prospecto", "Último contacto"]);
  results.byCustomer.forEach(row => customers.addRow([row.name, row.contacts, row.prospects, new Date(row.lastContactAt)]));
  customers.columns = [{ width: 40 }, { width: 14 }, { width: 24 }, { width: 22 }];

  const detail = workbook.addWorksheet("Detalle");
  addHeader(detail, ["Fecha", "Cliente", "Vendedor", "Tipo", "Prospecto", "Estado"]);
  results.items.forEach(row => detail.addRow([
    new Date(row.checkinAt), row.customer.name, row.seller.name, row.meetingType,
    row.wasProspect ? "Sí" : "No", row.checkoutAt ? "Terminada" : "Activa",
  ]));
  detail.columns = [{ width: 22 }, { width: 38 }, { width: 30 }, { width: 18 }, { width: 14 }, { width: 14 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}