import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Invoice, Customer } from "@shared/schema";
import { localStorageService } from "./localStorage";

interface TenantBranding {
  name: string;
  legalName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  rfc?: string | null;
}

interface InvoicePDFData {
  invoice: Invoice;
  customer: Customer;
  tenant?: TenantBranding | null;
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    return null;
  } catch { return null; }
}

function formatCurrency(value: string | number, currency: string = "MXN"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return "$" + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export async function generateInvoicePDFStream(data: InvoicePDFData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { invoice, customer, tenant } = data;

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  try {
    // ═══════════════════════════════════════════════
    // HEADER BAND
    // ═══════════════════════════════════════════════
    const HEADER_H = 90;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

    let logoRightEdge = MARGIN;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 65) / 2, { fit: [140, 65] as [number, number] });
        logoRightEdge = MARGIN + 140 + 12;
      } catch { /* fallback */ }
    }

    const nameX = logoBuffer ? logoRightEdge : MARGIN;
    const nameW = PAGE_W - nameX - MARGIN;
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), nameX, 16, { width: nameW, align: logoBuffer ? "left" : "right" });

    const infoLines: string[] = [];
    if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
    const addrParts = [tenant?.address, [tenant?.city, tenant?.state].filter(Boolean).join(", "), tenant?.zipCode ? `C.P. ${tenant.zipCode}` : ""].filter(Boolean);
    if (addrParts.length) infoLines.push(addrParts.join(" | "));
    const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("  |  "));
    if (tenant?.website) infoLines.push(tenant.website);

    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.88)");
    let infoY = 36;
    for (const line of infoLines) {
      doc.text(line, nameX, infoY, { width: nameW, align: logoBuffer ? "left" : "right" });
      infoY += 10;
    }

    // ═══════════════════════════════════════════════
    // TITLE BAND
    // ═══════════════════════════════════════════════
    const TITLE_Y = HEADER_H;
    const TITLE_H = 32;
    doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("FACTURA", MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.5 });
    doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
    doc.text(`Serie: ${invoice.serie}  |  Folio: ${invoice.folio}`, MARGIN + CONTENT_W * 0.5, TITLE_Y + 11, { width: CONTENT_W * 0.5, align: "right" });

    let currentY = TITLE_Y + TITLE_H + 18;

    // UUID if available
    if (invoice.cfdiUuid) {
      doc.rect(MARGIN, currentY, CONTENT_W, 20).fill(lightColor);
      doc.fontSize(7.5).font("Helvetica").fillColor("#666");
      doc.text("UUID CFDI:", MARGIN + 6, currentY + 6, { continued: true, width: 55 });
      doc.font("Helvetica-Bold").fillColor("#333").text(invoice.cfdiUuid, { width: CONTENT_W - 70 });
      currentY += 26;
    }

    // ═══════════════════════════════════════════════
    // TWO COLUMN INFO BOXES
    // ═══════════════════════════════════════════════
    const COL_W = CONTENT_W / 2 - 8;
    const COL2_X = MARGIN + COL_W + 16;
    const BOX_H = 100;

    doc.rect(MARGIN,  currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(MARGIN,  currentY, COL_W, 16).fill(mediumColor);
    doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);

    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE",  MARGIN + 6,  currentY + 4, { width: COL_W - 10 });
    doc.text("DATOS DE LA FACTURA", COL2_X + 6, currentY + 4, { width: COL_W - 10 });

    let leftY = currentY + 22;
    const customerRows: [string, string][] = [
      ["Razón Social:", customer.name],
      ...(customer.rfc ? [["RFC:", customer.rfc] as [string, string]] : []),
      ...(customer.phone ? [["Teléfono:", customer.phone] as [string, string]] : []),
      ...(customer.email ? [["Email:", customer.email] as [string, string]] : []),
    ];
    if (customer.address) {
      const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
      customerRows.push(["Dirección:", addr]);
    }
    doc.fontSize(8).fillColor("#333");
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555").text(label, MARGIN + 6, leftY, { continued: true, width: 65 });
      doc.font("Helvetica").fillColor("#222").text(value, { width: COL_W - 75 });
      leftY += 12;
    }

    let rightY = currentY + 22;
    const invoiceRows: [string, string][] = [
      ["Fecha Emisión:", formatDate(invoice.issuedAt)],
      ...(invoice.dueDate ? [["Vencimiento:", formatDate(invoice.dueDate)] as [string, string]] : []),
      ["Método Pago:", invoice.paymentMethod || "Por definir"],
      ["Forma Pago:",  invoice.paymentForm  || "Por definir"],
      ["Moneda:", invoice.currency || "MXN"],
    ];
    for (const [label, value] of invoiceRows) {
      doc.font("Helvetica-Bold").fillColor("#555").text(label, COL2_X + 6, rightY, { continued: true, width: 70 });
      doc.font("Helvetica").fillColor("#222").text(value, { width: COL_W - 78 });
      rightY += 12;
    }

    currentY += BOX_H + 20;

    // ═══════════════════════════════════════════════
    // INVOICE SUMMARY
    // ═══════════════════════════════════════════════
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("RESUMEN DE FACTURA", MARGIN + 6, currentY + 4);
    currentY += 16;

    // Totals box (right side)
    const TOTALS_W = 220;
    const TOTALS_X = PAGE_W - MARGIN - TOTALS_W;

    doc.rect(TOTALS_X, currentY, TOTALS_W, 75).fill(lightColor);
    doc.rect(TOTALS_X, currentY, TOTALS_W, 75).stroke(mediumColor);

    let totY = currentY + 10;
    doc.fontSize(8.5).font("Helvetica").fillColor("#444");

    doc.text("Subtotal:", TOTALS_X + 6, totY, { width: 110 });
    doc.text(formatCurrency(invoice.subtotal), TOTALS_X + 116, totY, { width: TOTALS_W - 122, align: "right" });
    totY += 16;

    doc.text("IVA (16%):", TOTALS_X + 6, totY, { width: 110 });
    doc.text(formatCurrency(invoice.tax), TOTALS_X + 116, totY, { width: TOTALS_W - 122, align: "right" });
    totY += 16;

    // Separator
    doc.rect(TOTALS_X, totY, TOTALS_W, 1).fill(mediumColor);
    totY += 6;

    // Total row
    doc.rect(TOTALS_X, totY, TOTALS_W, 22).fill(primaryColor);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("TOTAL:", TOTALS_X + 6, totY + 6, { width: 90 });
    doc.text(formatCurrency(invoice.total), TOTALS_X + 96, totY + 6, { width: TOTALS_W - 102, align: "right" });

    // Note on left
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#888");
    doc.text(`Importe expresado en ${invoice.currency || "MXN"} (Pesos Mexicanos).`, MARGIN, currentY + 10, { width: TOTALS_X - MARGIN - 10 });
    doc.text("Este documento es una representación impresa de un CFDI.", MARGIN, currentY + 22, { width: TOTALS_X - MARGIN - 10 });

    currentY += 85;

    // ═══════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);

    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text("Representación impresa de Comprobante Fiscal Digital por Internet (CFDI).", MARGIN, FOOTER_Y + 6, { width: 280 });
    doc.text(`Generado el ${formatDateTime(new Date())}`, MARGIN, FOOTER_Y + 16, { width: 280 });

    const footerRight: string[] = [];
    if (tenant?.phone) footerRight.push(`Tel: ${tenant.phone}`);
    if (tenant?.email) footerRight.push(tenant.email);
    if (tenant?.website) footerRight.push(tenant.website);
    if (footerRight.length) {
      doc.fontSize(7.5).font("Helvetica").fillColor("#ffffff");
      doc.text(footerRight.join("   |   "), PAGE_W - MARGIN - 270, FOOTER_Y + 10, { width: 270, align: "right" });
    }
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName, PAGE_W - MARGIN - 270, FOOTER_Y + 22, { width: 270, align: "right" });

    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
