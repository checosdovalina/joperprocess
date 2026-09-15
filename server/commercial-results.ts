import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { PassThrough, Readable } from "stream";
import { localStorageService } from "./localStorage";
import { formatPdfDate, formatPdfDateTime, formatPdfNumber, pdfText, resolvePdfLanguage } from "./pdf-locale";

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
  tenantBranding?: {
    name: string;
    legalName?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    rfc?: string | null;
    timezone?: string | null;
    locale?: string | null;
  } | null;
}

async function loadCommercialLogo(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    const localName = logoUrl.startsWith("/api/logos/")
      ? logoUrl.slice("/api/logos/".length)
      : logoUrl.startsWith("logos/")
        ? logoUrl.slice("logos/".length)
        : null;
    if (localName !== null) {
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(localName)) return null;
      return await localStorageService.getFile(`logos/${localName}`);
    }
    if (logoUrl.startsWith("https://")) {
      const url = new URL(logoUrl);
      const allowedHost = url.hostname === "storage.googleapis.com" || url.hostname.endsWith(".googleapis.com");
      if (!allowedHost) return null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch(url, { signal: controller.signal, redirect: "error" });
        const contentType = response.headers.get("content-type") || "";
        const declaredHeader = response.headers.get("content-length");
        const declaredSize = declaredHeader === null ? null : Number(declaredHeader);
        if (
          !response.ok ||
          !contentType.startsWith("image/") ||
          (declaredSize !== null && (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > 5_000_000)) ||
          !response.body
        ) return null;
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > 5_000_000) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
        return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), received);
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch { /* branding assets are optional */ }
  return null;
}

function commercialHexColor(value: string | null | undefined, fallback: string): string {
  return value && /^#([0-9a-f]{6})$/i.test(value) ? value : fallback;
}

function lightenCommercialColor(hex: string, amount: number): string {
  const value = hex.slice(1);
  const rgb = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
  return `#${rgb.map(channel => Math.min(255, channel + Math.round((255 - channel) * amount)).toString(16).padStart(2, "0")).join("")}`;
}

export function resolveCommercialTimezone(timezone?: string | null, locale?: string | null): string {
  const fallback = locale?.toLowerCase().startsWith("en") ? "America/Chicago" : "America/Mexico_City";
  if (!timezone) return fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return fallback;
  }
}

function commercialDateKey(value: Date | string, timezoneOffsetMinutes: number, timezone?: string): string {
  const date = new Date(value);
  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return new Date(date.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function summarizeCommercialActivity(items: CommercialActivityRow[], timezoneOffsetMinutes = 0, timezone?: string | null): CommercialResults {
  const daily = new Map<string, { contacts: number; prospects: number; customers: number }>();
  const sellers = new Map<string, { id: string; name: string; contacts: number; prospects: number; completed: number }>();
  const customerTotals = new Map<string, { id: string; name: string; contacts: number; prospects: number; lastContactAt: string }>();
  const meetingTypes = new Map<string, number>();

  const reportTimezone = timezone ? resolveCommercialTimezone(timezone) : undefined;
  for (const item of items) {
    const date = commercialDateKey(item.checkinAt, timezoneOffsetMinutes, reportTimezone);
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

export async function generateCommercialResultsPdf(results: CommercialResults, context: CommercialReportContext): Promise<Readable> {
  const output = new PassThrough();
  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 0, bufferPages: true });
  doc.pipe(output);
  const tenant = context.tenantBranding;
  const language = resolvePdfLanguage(tenant);
  const t = (es: string, en: string) => pdfText(language, { es, en });
  const timezone = resolveCommercialTimezone(tenant?.timezone, tenant?.locale);
  const logoBuffer = await loadCommercialLogo(tenant?.logoUrl);
  const primary = commercialHexColor(tenant?.primaryColor, "#102048");
  const secondary = commercialHexColor(tenant?.secondaryColor, "#2463d4");
  const navy = primary;
  const ink = "#17233d";
  const slate = "#5f6b80";
  const blue = secondary;
  const teal = secondary;
  const paleBlue = lightenCommercialColor(primary, 0.91);
  const paleTeal = lightenCommercialColor(secondary, 0.91);
  const line = "#d9e0eb";
  const pageWidth = 792;
  const pageHeight = 612;
  const left = 42;
  const right = 750;
  const contentWidth = right - left;
  const generatedAt = context.generatedAt ?? new Date();

  const safe = (value: unknown, fallback = "—") => {
    const text = String(value ?? "").trim();
    return text || fallback;
  };
  const num = (value: number) => formatPdfNumber(value, language);
  const pct = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
  const dateLabel = (value: string) => {
    return formatPdfDate(value, language, timezone, { day: "2-digit", month: "short" });
  };
  const dateTime = (value: Date | string) => {
    return formatPdfDateTime(value, language, timezone);
  };
  const meetingTypeLabel = (value: string) => value === "visita"
    ? t("Visita", "Visit")
    : value === "llamada"
      ? t("Llamada", "Call")
      : value === "videollamada"
        ? t("Videollamada", "Video call")
        : value;
  const header = () => {
    doc.rect(0, 0, pageWidth, 76).fill(navy);
    if (logoBuffer) {
      try { doc.image(logoBuffer, left, 12, { fit: [78, 52] as [number, number] }); } catch { /* invalid image */ }
    }
    const identityX = logoBuffer ? left + 92 : left;
    const companyIdentity = tenant?.legalName || tenant?.name || context.companyName || "NEXXO";
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text(t("Resultados comerciales", "Commercial results"), identityX, 19, { width: 300 });
    doc.font("Helvetica").fontSize(9).fillColor("#d9e4f7").text(safe(companyIdentity), identityX, 43, { width: 310 });
    const headerLocation = [tenant?.address, [tenant?.city, tenant?.state, tenant?.zipCode].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ");
    if (headerLocation) doc.fontSize(6.5).text(headerLocation, identityX, 57, { width: 310, ellipsis: true, lineBreak: false });
    doc.fillColor("#ffffff").fontSize(8.5).text(safe(context.filtersLabel), 420, 22, { width: 330, align: "right" });
    doc.fillColor("#d9e4f7").text(`${t("Generado", "Generated")}: ${dateTime(generatedAt)}`, 420, 46, { width: 330, align: "right" });
    doc.fillColor(blue).rect(left, 73, 120, 3).fill();
  };
  const footer = (page: number, pages: number) => {
    doc.strokeColor(line).lineWidth(0.6).moveTo(left, pageHeight - 33).lineTo(right, pageHeight - 33).stroke();
    doc.fillColor(slate).font("Helvetica").fontSize(7.5)
      .text(`${safe(tenant?.legalName || tenant?.name, "NEXXO")}  /  ${t("Reporte de ejecución comercial", "Commercial execution report")}`, left, pageHeight - 24, { width: 360 })
      .text(`${t("Página", "Page")} ${page} ${t("de", "of")} ${pages}`, 560, pageHeight - 24, { width: 190, align: "right" });
    const contact = [tenant?.address, [tenant?.city, tenant?.state, tenant?.zipCode].filter(Boolean).join(", "), tenant?.phone, tenant?.email, tenant?.website, tenant?.rfc ? `RFC: ${tenant.rfc}` : null].filter(Boolean).join("  ·  ");
    if (contact) doc.fontSize(6.5).text(contact, left, pageHeight - 38, { width: 500 });
  };
  const sectionTitle = (title: string, subtitle?: string) => {
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text(title, left, doc.y);
    if (subtitle) doc.fillColor(slate).font("Helvetica").fontSize(8).text(subtitle, left, doc.y + 18);
    doc.y += subtitle ? 32 : 23;
  };
  const drawTable = (
    columns: Array<{ label: string; width: number; align?: "left" | "right" }>,
    rows: string[][],
    options: { rowHeight?: number; headerColor?: string } = {},
  ) => {
    const rowHeight = options.rowHeight ?? 25;
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    let offset = 0;
    while (offset < rows.length || (rows.length === 0 && offset === 0)) {
      const available = pageHeight - 55 - doc.y;
      const capacity = Math.max(1, Math.floor((available - 25) / rowHeight));
      const chunk = rows.slice(offset, offset + capacity);
      const x = left;
      const y = doc.y;
      doc.rect(x, y, total, 25).fill(options.headerColor ?? navy);
      let cursor = x;
      columns.forEach(column => {
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text(column.label, cursor + 7, y + 8, {
          width: column.width - 14, align: column.align ?? "left",
        });
        cursor += column.width;
      });
      chunk.forEach((row, rowIndex) => {
        const rowY = y + 25 + rowIndex * rowHeight;
        if (rowIndex % 2 === 0) doc.rect(x, rowY, total, rowHeight).fill("#f5f8fc");
        doc.strokeColor(line).lineWidth(0.35).moveTo(x, rowY + rowHeight).lineTo(x + total, rowY + rowHeight).stroke();
        cursor = x;
        columns.forEach((column, columnIndex) => {
          doc.fillColor(ink).font("Helvetica").fontSize(8).text(safe(row[columnIndex]), cursor + 7, rowY + 8, {
            width: column.width - 14, height: rowHeight - 8, ellipsis: true, lineBreak: false,
            align: column.align ?? "left",
          });
          cursor += column.width;
        });
      });
      offset += chunk.length;
      doc.y = y + 25 + chunk.length * rowHeight + 15;
      if (offset < rows.length) {
        doc.addPage();
        doc.y = 103;
      } else if (rows.length === 0) {
        offset = 1;
      }
    }
  };
  const drawBars = (title: string, rows: Array<{ label: string; value: number; detail?: string }>, width: number, maxRows = 8) => {
    const barX = doc.x;
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(13).text(title, barX, doc.y, { width });
    doc.y += 10;
    const shown = rows.slice(0, maxRows);
    if (shown.length === 0) {
      doc.fillColor(slate).font("Helvetica-Oblique").fontSize(9).text(t("Sin datos para este periodo.", "No data for this period."), barX, doc.y, { width });
      doc.y += 18;
      return;
    }
    const max = Math.max(1, ...shown.map(row => row.value));
    shown.forEach((row) => {
      const rowY = doc.y;
      doc.fillColor(ink).font("Helvetica").fontSize(8).text(safe(row.label), barX, rowY, { width: width - 60, ellipsis: true });
      doc.fillColor(slate).fontSize(7.5).text(safe(row.detail, `${row.value}`), barX + width - 56, rowY, { width: 56, align: "right" });
      doc.roundedRect(barX, rowY + 14, width, 7, 3).fill("#e4eaf2");
      doc.roundedRect(barX, rowY + 14, Math.max(row.value ? 4 : 0, width * row.value / max), 7, 3).fill(blue);
      doc.y = rowY + 34;
    });
    doc.y += 3;
  };
  doc.info = {
    Title: t("Resultados comerciales", "Commercial results"),
    Author: safe(tenant?.legalName || tenant?.name || context.companyName, "NEXXO"),
    Subject: safe(context.companyName),
    CreationDate: generatedAt,
  };
  doc.on("pageAdded", header);
  header();
  doc.y = 103;
  const summary = results.summary;
  const cards = [
    [t("Contactos", "Contacts"), summary.totalContacts, t("actividad registrada", "recorded activity"), blue],
    [t("Prospectos", "Prospects"), summary.prospectVisits, `${pct(summary.prospectVisits, summary.totalContacts)} ${t("del total", "of total")}`, teal],
    [t("Clientes / prospectos", "Customers / prospects"), summary.uniqueCustomers, t("entidades con seguimiento", "entities followed up"), blue],
    [t("Terminados", "Completed"), summary.completed, `${pct(summary.completed, summary.totalContacts)} ${t("completados", "completed")}`, teal],
    [t("Activos", "Active"), summary.active, `${pct(summary.active, summary.totalContacts)} ${t("pendientes", "pending")}`, "#d17b22"],
  ] as const;
  const cardWidth = 128;
  const cardsY = doc.y;
  cards.forEach(([label, value, detail, color], index) => {
    const x = left + index * (cardWidth + 8);
    doc.roundedRect(x, cardsY, cardWidth, 68, 7).fill(index % 2 ? paleTeal : paleBlue);
    doc.rect(x, cardsY, 4, 68).fill(color);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(20).text(num(value), x + 13, cardsY + 13);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(8).text(label, x + 13, cardsY + 40, { width: cardWidth - 20 });
    doc.fillColor(slate).font("Helvetica").fontSize(7).text(detail, x + 13, cardsY + 53, { width: cardWidth - 19, ellipsis: true });
  });
  doc.y = cardsY + 92;
  sectionTitle(t("Lectura ejecutiva", "Executive readout"), t("Indicadores derivados para una revisión rápida de la ejecución.", "Derived indicators for a fast execution review."));
  const completion = pct(summary.completed, summary.totalContacts);
  const prospectShare = pct(summary.prospectVisits, summary.totalContacts);
  doc.roundedRect(left, doc.y, contentWidth, 48, 6).fill("#f5f8fc");
  doc.fillColor(ink).font("Helvetica").fontSize(9)
    .text(t(`Se registraron ${num(summary.totalContacts)} contactos: ${num(summary.customerVisits)} con clientes y ${num(summary.prospectVisits)} con prospectos (${prospectShare}). La tasa de cierre de contacto es ${completion}, con ${num(summary.active)} actividades aún activas.`,
      `${num(summary.totalContacts)} contacts recorded: ${num(summary.customerVisits)} customers and ${num(summary.prospectVisits)} prospects (${prospectShare}). Contact completion is ${completion}, with ${num(summary.active)} active activities.`), left + 14, doc.y + 12, { width: contentWidth - 28, lineGap: 2 });
  doc.y += 70;
  const colGap = 24;
  const colWidth = (contentWidth - colGap) / 2;
  const startY = doc.y;
  doc.x = left;
  drawBars(t("Actividad por vendedor", "Activity by seller"), results.bySeller.map(row => ({
    label: row.name, value: row.contacts, detail: `${num(row.contacts)}  ·  ${pct(row.completed, row.contacts)} ${t("fin.", "done")}`,
  })), colWidth, 5);
  const leftEnd = doc.y;
  doc.x = left + colWidth + colGap;
  doc.y = startY;
  drawBars(t("Entidades con mayor seguimiento", "Entities with most follow-up"), results.byCustomer.map(row => ({
    label: row.name, value: row.contacts, detail: `${num(row.contacts)}  ·  ${num(row.prospects)} ${t("prosp.", "pros.")}`,
  })), colWidth, 5);

  doc.addPage();
  doc.y = 103;
  sectionTitle(t("Distribución de contactos", "Contact distribution"), t("Prospectos frente a clientes y tipos de reunión registrados.", "Prospects versus customers and recorded meeting types."));
  if (results.byMeetingType.length) {
    drawTable([
      { label: t("Tipo de reunión", "Meeting type"), width: 360 }, { label: t("Contactos", "Contacts"), width: 120, align: "right" }, { label: "% del total", width: 120, align: "right" },
    ], results.byMeetingType.slice(0, 6).map(row => [meetingTypeLabel(row.type), num(row.count), pct(row.count, summary.totalContacts)]), { rowHeight: 23 });
  } else {
    doc.fillColor(slate).font("Helvetica-Oblique").fontSize(9).text(t("No hay tipos de reunión registrados.", "No meeting types recorded."));
  }
  doc.y += 12;
  sectionTitle(t("Detalle por vendedor", "Seller detail"), t("Volumen, prospección y avance de terminación.", "Volume, prospecting and completion progress."));
  drawTable([
    { label: t("Vendedor", "Seller"), width: 260 }, { label: t("Contactos", "Contacts"), width: 110, align: "right" },
    { label: t("Prospectos", "Prospects"), width: 110, align: "right" }, { label: t("Terminadas", "Completed"), width: 110, align: "right" }, { label: t("% finalizado", "% completed"), width: 118, align: "right" },
  ], results.bySeller.map(row => [safe(row.name), num(row.contacts), num(row.prospects), num(row.completed), pct(row.completed, row.contacts)]), { rowHeight: 25 });

  // Operational pages are deliberately tabular: they are useful in a meeting and remain readable when printed.
  doc.addPage();
  doc.y = 103;
  sectionTitle(t("Ritmo de actividad", "Activity cadence"), t("Contactos por día; el desglose permite detectar concentración y cobertura.", "Contacts per day; the breakdown highlights concentration and coverage."));
  const dailyRows = results.daily.map(row => [dateLabel(row.date), num(row.contacts), num(row.prospects), num(row.customers), pct(row.contacts, summary.totalContacts)]);
  drawTable([
    { label: t("Fecha", "Date"), width: 170 }, { label: t("Contactos", "Contacts"), width: 130, align: "right" }, { label: t("Prospectos", "Prospects"), width: 130, align: "right" },
    { label: t("Clientes", "Customers"), width: 130, align: "right" }, { label: "% del total", width: 130, align: "right" },
  ], dailyRows, { rowHeight: 24 });
  if (!dailyRows.length) {
    doc.fillColor(slate).font("Helvetica-Oblique").fontSize(9).text(t("Sin actividad diaria para los filtros seleccionados.", "No daily activity for the selected filters."));
  }

  doc.addPage();
  doc.y = 103;
  sectionTitle(t("Cobertura de clientes y prospectos", "Customer and prospect coverage"), t("Último contacto y proporción de interacciones como prospecto.", "Last contact and share of interactions as a prospect."));
  const customerRows = results.byCustomer.map(row => [
    safe(row.name), num(row.contacts), num(row.prospects), pct(row.prospects, row.contacts),
    dateTime(row.lastContactAt),
  ]);
  drawTable([
    { label: t("Cliente o prospecto", "Customer or prospect"), width: 270 }, { label: t("Contactos", "Contacts"), width: 85, align: "right" },
    { label: t("Como prospecto", "As prospect"), width: 105, align: "right" }, { label: "% prospecto", width: 95, align: "right" }, { label: t("Último contacto", "Last contact"), width: 153, align: "right" },
  ], customerRows, { rowHeight: 25 });
  if (!customerRows.length) {
    doc.fillColor(slate).font("Helvetica-Oblique").fontSize(9).text(t("Sin clientes o prospectos para los filtros seleccionados.", "No customers or prospects for the selected filters."));
  }
  if (doc.y > pageHeight - 175) {
    doc.addPage();
    doc.y = 103;
  } else {
    doc.y += 5;
  }
  sectionTitle(t("Registro de actividad", "Activity register"), t("Detalle de contactos incluidos en este reporte.", "Detail of contacts included in this report."));
  const detailRows = results.items.map(row => [
    dateTime(row.checkinAt), safe(row.customer.name), safe(row.seller.name), meetingTypeLabel(row.meetingType),
    row.wasProspect ? t("Prospecto", "Prospect") : t("Cliente", "Customer"), row.checkoutAt ? t("Terminada", "Completed") : t("Activa", "Active"),
  ]);
  drawTable([
    { label: t("Fecha y hora", "Date and time"), width: 105 }, { label: t("Cliente / prospecto", "Customer / prospect"), width: 197 }, { label: t("Vendedor", "Seller"), width: 145 },
    { label: t("Tipo", "Type"), width: 95 }, { label: t("Segmento", "Segment"), width: 83 }, { label: t("Estado", "Status"), width: 83 },
  ], detailRows, { rowHeight: 22 });
  if (!detailRows.length) {
    doc.fillColor(slate).font("Helvetica-Oblique").fontSize(9).text(t("No hay contactos para mostrar.", "No contacts to display."));
  }
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    footer(page + 1, range.count);
  }
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