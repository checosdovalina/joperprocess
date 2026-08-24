import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { localStorageService } from "./localStorage";
import { formatPdfDate, formatPdfDateTime, formatPdfNumber, pdfText, resolvePdfLanguage } from "./pdf-locale";

export interface ReportIncident {
  ticketNumber: string;
  customerName: string;
  type: string;
  urgency: string;
  status: string;
  subject: string;
  description: string;
  assignedArea?: string | null;
  assignedUserName?: string | null;
  contactName?: string | null;
  resolution?: string | null;
  createdAt: Date | string;
}

interface IncidentReportData {
  incidents: ReportIncident[];
  tenant?: TenantBranding | null;
  cutoffDate: Date | string;
}

interface TenantBranding {
  name: string;
  legalName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  rfc?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export interface ReportOrderItem {
  productCode: string | null;
  productName: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice?: string | null;
}

export interface ReportOrder {
  folio: string;
  customerName: string;
  customerRfc?: string | null;
  purchaseOrder?: string | null;
  closeDate?: Date | string | null;
  shippingDate?: Date | string | null;
  creditReleaseDate?: Date | string | null;
  comments?: string | null;
  notes?: string | null;
  status: string;
  items: ReportOrderItem[];
}

interface ReportData {
  orders: ReportOrder[];
  tenant?: TenantBranding | null;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    customerName?: string;
  };
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
    }
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

const STATUS_LABELS: Record<string, { es: string; en: string }> = {
  pending: { es: "Pendiente", en: "Pending" },
  in_production: { es: "En Producción", en: "In Production" },
  ready: { es: "Listo", en: "Ready" },
  partially_released: { es: "Parcialmente Surtido", en: "Partially Released" },
  released: { es: "Surtido", en: "Released" },
  shipped: { es: "Embarcado", en: "Shipped" },
  delivered: { es: "Entregado", en: "Delivered" },
};

export async function generateOrdersReportPDF(data: ReportData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { orders, tenant, filters } = data;
  const language = resolvePdfLanguage(tenant);
  const text = <T>(values: { es: T; en: T }) => pdfText(language, values);
  const formatDate = (value: Date | string | null | undefined) => formatPdfDate(value, language, tenant?.timezone);
  const statusLabel = (status: string) => STATUS_LABELS[status] ? text(STATUS_LABELS[status]) : status;

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || text({ es: "Empresa", en: "Company" });
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.93);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  (async () => {
    try {
      let isFirstPage = true;

      function drawHeader() {
        const HEADER_H = 100;
        doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

        if (logoBuffer) {
          try {
            doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] as [number, number] });
          } catch { }
        }

        const TEXT_X = PAGE_W / 2;
        const TEXT_W = PAGE_W - TEXT_X - MARGIN;

        doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });

        const infoLines: string[] = [];
        if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
        if (tenant?.address) {
          tenant.address.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean).forEach((part: string) => infoLines.push(part));
        }
        const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `${text({ es: "C.P.", en: "ZIP" })} ${tenant.zipCode}` : null].filter(Boolean);
        if (cityParts.length) infoLines.push(cityParts.join(", "));
        const contact = [tenant?.phone ? `${text({ es: "Tel", en: "Phone" })}: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
        if (contact.length) infoLines.push(contact.join("  |  "));
        if (tenant?.website) infoLines.push(tenant.website);

        doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
        infoLines.forEach((line, i) => {
          doc.text(line, TEXT_X, 33 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false });
        });

        // Title band
        const TITLE_Y = HEADER_H;
        doc.rect(0, TITLE_Y, PAGE_W, 28).fill(mediumColor);
        doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(text({ es: "REPORTE DE PEDIDOS", en: "ORDERS REPORT" }), MARGIN, TITLE_Y + 7, { width: CONTENT_W / 2, lineBreak: false });

        // Filter summary on the right
        const filterParts: string[] = [];
        if (filters.dateFrom || filters.dateTo) {
          filterParts.push(`${filters.dateFrom ? formatDate(filters.dateFrom) : "—"} ${text({ es: "al", en: "to" })} ${filters.dateTo ? formatDate(filters.dateTo) : "—"}`);
        }
        if (filters.customerName) filterParts.push(filters.customerName);
        if (filters.status && filters.status !== "all") filterParts.push(statusLabel(filters.status));

        if (filterParts.length) {
          doc.fontSize(7.5).font("Helvetica").fillColor(primaryColor);
          doc.text(filterParts.join("  •  "), MARGIN + CONTENT_W / 2, TITLE_Y + 10, {
            width: CONTENT_W / 2, align: "right", lineBreak: false,
          });
        }
      }

      drawHeader();
      let currentY = 100 + 28 + 14;

      // Total count line
      doc.fontSize(8).font("Helvetica").fillColor("#555555");
      doc.text(`${text({ es: "Total de pedidos", en: "Total orders" })}: ${formatPdfNumber(orders.length, language)}`, MARGIN, currentY, { lineBreak: false });
      currentY += 16;

      // Draw each order
      for (let oi = 0; oi < orders.length; oi++) {
        const order = orders[oi];

        // Pre-calculate layout constants (same as used during rendering)
        const cardPadEst = 10;
        const innerWEst = CONTENT_W - cardPadEst * 2 - 3;
        const productColW = innerWEst - 80; // same as innerW - 80 used during rendering

        // Estimate height — measure each product label exactly as it will be rendered
        const buildLabel = (item: typeof order.items[number]) =>
          (item.productCode ? `${item.productCode} — ${item.productName}` : item.productName)
            .replace(/\s+/g, " ")
            .trim();
        const itemsH = order.items.length === 0
          ? 16 + 20
          : order.items.reduce((sum, item) => {
              const h = doc.fontSize(8.5).font("Helvetica").heightOfString(buildLabel(item), { width: productColW });
              return sum + h + 6; // +6 gap between rows
            }, 20); // 20 = header row (14) + divider (6)
        const notesTextW = innerWEst - 38; // innerW - label width
        const notesH = order.notes
          ? doc.fontSize(8.5).font("Helvetica").heightOfString(order.notes, { width: notesTextW }) + 4
          : 0;
        const orderH = 44 + itemsH + 14 + notesH;

        // Page break
        if (currentY + orderH > PAGE_H - 50) {
          doc.addPage();
          isFirstPage = false;
          drawHeader();
          currentY = 100 + 28 + 14;
        }

        // Order card background
        doc.rect(MARGIN, currentY, CONTENT_W, orderH).fill(lightColor);
        doc.rect(MARGIN, currentY, 3, orderH).fill(primaryColor);

        const cardPad = 10;
        const innerX = MARGIN + cardPad + 3;
        const innerW = CONTENT_W - cardPad * 2 - 3;
        const halfW = innerW / 2 - 6;
        const col2X = innerX + halfW + 12;

        let cardY = currentY + cardPad;

        // Row 1: Folio | Close Date
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        const folioLabel = text({ es: "Folio:", en: "Order No.:" });
        const folioLabelW = language === "en" ? 48 : 35;
        doc.text(folioLabel, innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(order.folio, innerX + folioLabelW, cardY, { width: halfW - folioLabelW, lineBreak: false });

        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Fecha de Cierre:", en: "Close Date:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate(order.closeDate), col2X + 85, cardY, { lineBreak: false });
        cardY += 14;

        // Row 2: Credit and collections release (only right column)
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Lib. C y Cobranza:", en: "Credit & Collections:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate(order.creditReleaseDate), col2X + 95, cardY, { lineBreak: false });
        cardY += 14;

        // Row 3: Purchase Order | Status
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Orden de Compra:", en: "Purchase Order:" }), innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(order.purchaseOrder || "—", innerX + 90, cardY, { width: halfW - 90, lineBreak: false });

        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Estatus:", en: "Status:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(statusLabel(order.status), col2X + 45, cardY, { lineBreak: false });
        cardY += 14;

        // Row 4: Notas (from quotation) — allow wrapping for long notes
        if (order.notes) {
          doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
          doc.text(text({ es: "Notas:", en: "Notes:" }), innerX, cardY, { lineBreak: false });
          doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
          doc.text(order.notes, innerX + 38, cardY, { width: innerW - 38 });
          const renderedNotesH = doc.fontSize(8.5).font("Helvetica").heightOfString(order.notes, { width: innerW - 38 });
          cardY += renderedNotesH + 4;
        }

        // Items divider
        cardY += 4;
        doc.moveTo(innerX, cardY).lineTo(MARGIN + CONTENT_W - cardPad, cardY).strokeColor(mediumColor).lineWidth(0.5).stroke();
        cardY += 6;

        // Items header
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(text({ es: "Cantidad", en: "Quantity" }), innerX + 4, cardY, { lineBreak: false });
        doc.text(text({ es: "Clave / Producto", en: "Code / Product" }), innerX + 80, cardY, { lineBreak: false });
        cardY += 14;

        // Items rows
        if (order.items.length === 0) {
          doc.fontSize(8).font("Helvetica").fillColor("#999999");
          doc.text(text({ es: "Sin artículos", en: "No items" }), innerX + 4, cardY, { lineBreak: false });
          cardY += 14;
        } else {
          for (const item of order.items) {
            doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
            const qty = formatPdfNumber(parseFloat(item.quantity), language, { maximumFractionDigits: 2 });
            const productLabel = buildLabel(item);
            const labelH = doc.fontSize(8.5).font("Helvetica").heightOfString(productLabel, { width: innerW - 80 });
            doc.text(`${qty} ${item.unitOfMeasure}`, innerX + 4, cardY, { width: 70, lineBreak: false });
            doc.text(productLabel, innerX + 80, cardY, { width: innerW - 80 });
            cardY += labelH + 6;
          }
        }

        currentY += orderH + 10;
      }

      // Footer on last page
      const footerY = PAGE_H - 36;
      doc.rect(0, footerY, PAGE_W, 36).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.75)");
      const generated = formatPdfDateTime(new Date(), language, tenant?.timezone);
      doc.text(`${text({ es: "Generado el", en: "Generated on" })} ${generated}  —  ${companyName}`, MARGIN, footerY + 14, { width: CONTENT_W, align: "center", lineBreak: false });

      doc.end();
    } catch (err) {
      console.error("Error generating report PDF:", err);
      doc.end();
    }
  })();

  return doc as unknown as Readable;
}

// ── INCIDENTS REPORT PDF ─────────────────────────────────────────────────────

const INCIDENT_TYPE_LABELS: Record<string, { es: string; en: string }> = {
  garantia: { es: "Garantía", en: "Warranty" },
  retrabajo: { es: "Retrabajo", en: "Rework" },
  queja: { es: "Queja", en: "Complaint" },
  consulta: { es: "Consulta", en: "Inquiry" },
  administrativo: { es: "Administrativo", en: "Administrative" },
};

const INCIDENT_STATUS_LABELS: Record<string, { es: string; en: string }> = {
  nuevo: { es: "Nuevo", en: "New" }, asignado: { es: "Asignado", en: "Assigned" },
  en_proceso: { es: "En Proceso", en: "In Progress" }, esperando_cliente: { es: "Esperando Cliente", en: "Waiting for Customer" },
  esperando_interno: { es: "Esperando Interno", en: "Waiting Internally" }, resuelto: { es: "Resuelto", en: "Resolved" },
  cerrado: { es: "Cerrado", en: "Closed" }, cancelado: { es: "Cancelado", en: "Cancelled" },
};

const INCIDENT_URGENCY_LABELS: Record<string, { es: string; en: string }> = {
  baja: { es: "Baja", en: "Low" }, media: { es: "Media", en: "Medium" },
  alta: { es: "Alta", en: "High" }, critica: { es: "Crítica", en: "Critical" },
};

export async function generateIncidentsReportPDF(data: IncidentReportData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { incidents, tenant, cutoffDate } = data;
  const language = resolvePdfLanguage(tenant);
  const text = <T>(values: { es: T; en: T }) => pdfText(language, values);
  const formatDate = (value: Date | string | null | undefined) => formatPdfDate(value, language, tenant?.timezone);
  const incidentLabel = (labels: Record<string, { es: string; en: string }>, value: string) => labels[value] ? text(labels[value]) : value;

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || text({ es: "Empresa", en: "Company" });
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.93);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  (async () => {
    try {
      function drawHeader() {
        const HEADER_H = 100;
        doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);
        if (logoBuffer) {
          try { doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] as [number, number] }); } catch { }
        }
        const TEXT_X = PAGE_W / 2;
        const TEXT_W = PAGE_W - TEXT_X - MARGIN;
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });
        const infoLines: string[] = [];
        if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
        if (tenant?.address) {
          tenant.address.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean).forEach((p: string) => infoLines.push(p));
        }
        const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `${text({ es: "C.P.", en: "ZIP" })} ${tenant.zipCode}` : null].filter(Boolean);
        if (cityParts.length) infoLines.push(cityParts.join(", "));
        const contact = [tenant?.phone ? `${text({ es: "Tel", en: "Phone" })}: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
        if (contact.length) infoLines.push(contact.join("  |  "));
        if (tenant?.website) infoLines.push(tenant.website);
        doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
        infoLines.forEach((line, i) => {
          doc.text(line, TEXT_X, 33 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false });
        });

        // Title band
        const TITLE_Y = HEADER_H;
        doc.rect(0, TITLE_Y, PAGE_W, 28).fill(mediumColor);
        doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(text({ es: "REPORTE DE INCIDENTES VIGENTES", en: "ACTIVE INCIDENTS REPORT" }), MARGIN, TITLE_Y + 7, { width: CONTENT_W / 2, lineBreak: false });
        doc.fontSize(8).font("Helvetica").fillColor(primaryColor);
        doc.text(`${text({ es: "Corte", en: "As of" })}: ${formatDate(cutoffDate)}`, PAGE_W - MARGIN - 130, TITLE_Y + 10, { width: 130, align: "right", lineBreak: false });
      }

      drawHeader();
      let currentY = 100 + 28 + 14;

      // Total count line
      doc.fontSize(8).font("Helvetica").fillColor("#555555");
      doc.text(`${text({ es: "Total de incidentes vigentes", en: "Total active incidents" })}: ${formatPdfNumber(incidents.length, language)}`, MARGIN, currentY, { lineBreak: false });
      currentY += 16;

      for (let ii = 0; ii < incidents.length; ii++) {
        const inc = incidents[ii];
        const descW = CONTENT_W - (10 + 3) * 2;

        const descH = doc.fontSize(8).font("Helvetica").heightOfString(inc.description || "", { width: descW }) + 2;
        const resH = inc.resolution
          ? doc.fontSize(8).font("Helvetica").heightOfString(inc.resolution, { width: descW }) + 14
          : 0;
        // cardPad(10) + 3 rows×14 + label"Descripción:"(11) + descH + resH + cardPad(10) = 73 + descH + resH
        const cardH = 73 + descH + resH;

        // Page break
        if (currentY + cardH > PAGE_H - 50) {
          doc.addPage();
          drawHeader();
          currentY = 100 + 28 + 14;
        }

        // Card background
        doc.rect(MARGIN, currentY, CONTENT_W, cardH).fill(lightColor);
        doc.rect(MARGIN, currentY, 3, cardH).fill(primaryColor);

        const cardPad = 10;
        const innerX = MARGIN + cardPad + 3;
        const innerW = CONTENT_W - cardPad * 2 - 3;
        const halfW = innerW / 2 - 6;
        const col2X = innerX + halfW + 12;
        let cardY = currentY + cardPad;

        // Row 1: Ticket | Fecha
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text("Ticket:", innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(inc.ticketNumber, innerX + 40, cardY, { width: halfW - 40, lineBreak: false });

        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Fecha:", en: "Date:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(formatDate(inc.createdAt), col2X + 38, cardY, { lineBreak: false });
        cardY += 14;

        // Row 2: Tipo (only right column)
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Tipo:", en: "Type:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(incidentLabel(INCIDENT_TYPE_LABELS, inc.type), col2X + 30, cardY, { lineBreak: false });
        cardY += 14;

        // Row 3: Urgencia | Estatus
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Urgencia:", en: "Urgency:" }), innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(incidentLabel(INCIDENT_URGENCY_LABELS, inc.urgency), innerX + 52, cardY, { lineBreak: false });

        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Estatus:", en: "Status:" }), col2X, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(incidentLabel(INCIDENT_STATUS_LABELS, inc.status), col2X + 45, cardY, { lineBreak: false });
        cardY += 14;

        // Row 4: Asunto
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333333");
        doc.text(text({ es: "Asunto:", en: "Subject:" }), innerX, cardY, { lineBreak: false });
        doc.fontSize(8.5).font("Helvetica").fillColor("#111111");
        doc.text(inc.subject, innerX + 42, cardY, { width: innerW - 42, lineBreak: false });
        cardY += 14;

        // Row 5: Descripción (wrappable)
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555");
        doc.text(text({ es: "Descripción:", en: "Description:" }), innerX, cardY, { lineBreak: false });
        cardY += 11;
        doc.fontSize(8).font("Helvetica").fillColor("#333333");
        doc.text(inc.description || "—", innerX + 4, cardY, { width: innerW - 4 });
        cardY += descH;

        // Row 6: Resolución (if any)
        if (inc.resolution) {
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#555555");
          doc.text(text({ es: "Resolución:", en: "Resolution:" }), innerX, cardY, { lineBreak: false });
          cardY += 11;
          doc.fontSize(8).font("Helvetica").fillColor("#333333");
          doc.text(inc.resolution, innerX + 4, cardY, { width: innerW - 4 });
        }

        currentY += cardH + 8;
      }

      // Footer
      const footerY = PAGE_H - 36;
      doc.rect(0, footerY, PAGE_W, 36).fill(primaryColor);
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.75)");
      const generated = formatPdfDateTime(new Date(), language, tenant?.timezone);
      doc.text(`${text({ es: "Generado el", en: "Generated on" })} ${generated}  —  ${companyName}`, MARGIN, footerY + 14, { width: CONTENT_W, align: "center", lineBreak: false });

      doc.end();
    } catch (err) {
      console.error("Error generating incidents PDF:", err);
      doc.end();
    }
  })();

  return doc as unknown as Readable;
}
