import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quotation, QuotationItem, Customer, User } from "@shared/schema";
import { localStorageService } from "./localStorage";

interface TenantBranding {
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
}

interface QuotationPDFData {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Customer;
  user: User;
  tenant?: TenantBranding | null;
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

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  contado: "Contado",
  "15_dias": "15 días",
  "30_dias": "30 días",
  "45_dias": "45 días",
  "60_dias": "60 días",
};

const DELIVERY_TIME_LABELS: Record<string, string> = {
  inmediato: "Inmediato",
  "1_semana": "1 semana",
  "2_semanas": "2 semanas",
  "3_semanas": "3 semanas",
  "1_mes": "1 mes",
  por_confirmar: "Por confirmar",
};

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return "$" + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export async function generateQuotationPDFStream(data: QuotationPDFData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { quotation, items, customer, user, tenant } = data;

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
    // HEADER BAND — full width colored bar
    // ═══════════════════════════════════════════════
    const HEADER_H = 112;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

    // Logo: always on the LEFT side
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, {
          fit: [110, 68] as [number, number],
        });
      } catch { /* ignore logo errors */ }
    }

    // Text block: always on the RIGHT side, right-aligned
    const TEXT_X = PAGE_W / 2;
    const TEXT_W = PAGE_W - TEXT_X - MARGIN;

    // Company name — single line, never wraps
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });

    // Company info lines — each part on its own line to avoid overflow
    const infoLines: string[] = [];
    if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
    if (tenant?.address) infoLines.push(tenant.address);
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("   |   "));
    if (tenant?.website) infoLines.push(tenant.website);

    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
    infoLines.forEach((line, i) => {
      doc.text(line, TEXT_X, 33 + i * 11, { width: TEXT_W, align: "right", lineBreak: false });
    });

    // ═══════════════════════════════════════════════
    // DOCUMENT TITLE BAND
    // ═══════════════════════════════════════════════
    const TITLE_BAND_Y = HEADER_H;
    const TITLE_BAND_H = 32;
    doc.rect(0, TITLE_BAND_Y, PAGE_W, TITLE_BAND_H).fill(mediumColor);

    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("COTIZACIÓN", MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2, align: "left" });

    doc.fontSize(10).font("Helvetica").fillColor(primaryColor);
    doc.text(`Folio: ${quotation.folio}`, MARGIN + CONTENT_W / 2, TITLE_BAND_Y + 10, { width: CONTENT_W / 2, align: "right" });

    let currentY = TITLE_BAND_Y + TITLE_BAND_H + 18;

    // ═══════════════════════════════════════════════
    // TWO COLUMN INFO BOXES
    // ═══════════════════════════════════════════════
    const COL_W = CONTENT_W / 2 - 8;
    const COL2_X = MARGIN + COL_W + 16;

    // Box backgrounds
    const BOX_H = 115;
    doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
    doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);

    // Section headers
    doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
    doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);

    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text("DATOS DE LA COTIZACIÓN", COL2_X + 6, currentY + 4, { width: COL_W - 10 });

    // Customer info
    let leftY = currentY + 22;
    doc.fontSize(8).font("Helvetica").fillColor("#333333");

    const customerRows: [string, string][] = [
      ["Razón Social:", customer.name],
      ...(customer.rfc ? [["RFC:", customer.rfc] as [string, string]] : []),
      ...(customer.contactName ? [["Contacto:", customer.contactName] as [string, string]] : []),
      ...(customer.phone ? [["Teléfono:", customer.phone] as [string, string]] : []),
      ...(customer.email ? [["Email:", customer.email] as [string, string]] : []),
    ];
    if (customer.city || customer.state) {
      customerRows.push(["Ciudad:", [customer.city, customer.state].filter(Boolean).join(", ")]);
    }

    const LABEL_W = 68;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 10;
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L, lineBreak: false });
      leftY += 12;
    }

    // Quotation info
    let rightY = currentY + 22;
    const quotationRows: [string, string][] = [
      ["Fecha:", formatDate(quotation.createdAt)],
      ["Moneda:", quotation.currency || "MXN"],
      ["Vendedor:", user.fullName],
    ];
    if (quotation.validUntil) quotationRows.push(["Vigencia:", formatDate(quotation.validUntil)]);
    if (quotation.paymentTerms) quotationRows.push(["Cond. Pago:", PAYMENT_TERMS_LABELS[quotation.paymentTerms] || quotation.paymentTerms]);
    if (quotation.deliveryTime) quotationRows.push(["T. Entrega:", DELIVERY_TIME_LABELS[quotation.deliveryTime] || quotation.deliveryTime]);

    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 10;
    for (const [label, value] of quotationRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
      rightY += 12;
    }

    currentY += BOX_H + 20;

    // ═══════════════════════════════════════════════
    // PRODUCTS TABLE
    // ═══════════════════════════════════════════════
    // Section label
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("PRODUCTOS Y SERVICIOS", MARGIN + 6, currentY + 4);
    currentY += 16;

    // Table column widths
    const cols = {
      num:    { x: MARGIN,           w: 22  },
      code:   { x: MARGIN + 22,      w: 72  },
      desc:   { x: MARGIN + 94,      w: 200 },
      qty:    { x: MARGIN + 294,     w: 44  },
      price:  { x: MARGIN + 338,     w: 72  },
      disc:   { x: MARGIN + 410,     w: 42  },
      total:  { x: MARGIN + 452,     w: 80  },
    };

    // Table header row
    const TH = 15;
    doc.rect(MARGIN, currentY, CONTENT_W, TH).fill(primaryColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("#",          cols.num.x  + 2, currentY + 4, { width: cols.num.w  - 2, align: "center" });
    doc.text("Código",     cols.code.x + 2, currentY + 4, { width: cols.code.w - 2 });
    doc.text("Descripción",cols.desc.x + 2, currentY + 4, { width: cols.desc.w - 2 });
    doc.text("Cant.",      cols.qty.x  + 2, currentY + 4, { width: cols.qty.w  - 4, align: "center" });
    doc.text("P. Unit.",   cols.price.x+ 2, currentY + 4, { width: cols.price.w- 4, align: "right" });
    doc.text("Desc%",      cols.disc.x + 2, currentY + 4, { width: cols.disc.w - 2, align: "center" });
    doc.text("Subtotal",   cols.total.x+ 2, currentY + 4, { width: cols.total.w- 4, align: "right" });
    currentY += TH;

    // Table rows — dynamic height to handle long product names
    const ROW_PAD = 4;
    const MIN_ROW_H = 16;
    doc.fontSize(7.5).font("Helvetica");

    items.forEach((item, index) => {
      // Calculate row height based on description text wrapping
      const descH = doc.heightOfString(item.productName, { width: cols.desc.w - 4 });
      const rowH = Math.max(MIN_ROW_H, descH + ROW_PAD * 2);

      if (currentY + rowH > PAGE_H - 160) {
        doc.addPage({ size: "LETTER", margin: 0 });
        currentY = 20;
      }

      const rowBg = index % 2 === 0 ? "#ffffff" : lightColor;
      doc.rect(MARGIN, currentY, CONTENT_W, rowH).fill(rowBg);
      doc.fillColor("#333333");

      const rowY = currentY + ROW_PAD;
      doc.text(String(index + 1),  cols.num.x  + 2, rowY, { width: cols.num.w  - 2, align: "center", lineBreak: false });
      doc.text(item.productCode || "-", cols.code.x + 2, rowY, { width: cols.code.w - 4, lineBreak: false });
      // Description allows wrapping
      doc.text(item.productName,   cols.desc.x + 2, rowY, { width: cols.desc.w - 4 });
      doc.text(parseFloat(item.quantity).toString(), cols.qty.x + 2, rowY, { width: cols.qty.w - 4, align: "center", lineBreak: false });
      doc.text(formatCurrency(item.unitPrice), cols.price.x + 2, rowY, { width: cols.price.w - 4, align: "right", lineBreak: false });
      doc.text(parseFloat(item.discountPercent || "0").toFixed(1) + "%", cols.disc.x + 2, rowY, { width: cols.disc.w - 2, align: "center", lineBreak: false });
      doc.text(formatCurrency(item.subtotal), cols.total.x + 2, rowY, { width: cols.total.w - 4, align: "right", lineBreak: false });

      currentY += rowH;
    });

    // Bottom border of table
    doc.rect(MARGIN, currentY, CONTENT_W, 1).fill(mediumColor);
    currentY += 20;

    // ═══════════════════════════════════════════════
    // TOTALS BOX (right-aligned)
    // ═══════════════════════════════════════════════
    const TOTALS_W = 200;
    const TOTALS_X = PAGE_W - MARGIN - TOTALS_W;

    const subtotalVal = parseFloat(String(quotation.subtotal));
    const taxVal = parseFloat(String(quotation.tax));
    const totalVal = parseFloat(String(quotation.total));
    const discountPct = parseFloat(quotation.globalDiscount || "0");
    const discountAmt = discountPct > 0 ? subtotalVal * (discountPct / 100) : 0;

    const totalsRows: [string, string, boolean][] = [
      ["Subtotal:", formatCurrency(subtotalVal), false],
      ...(discountAmt > 0 ? [[`Descuento (${discountPct}%):`, `-${formatCurrency(discountAmt)}`, false] as [string, string, boolean]] : []),
      ["IVA (16%):", formatCurrency(taxVal), false],
    ];

    const TOTALS_ROW_H = 16;
    const TOTALS_H = totalsRows.length * TOTALS_ROW_H + 22;

    doc.rect(TOTALS_X, currentY, TOTALS_W, TOTALS_H + 26).fill(lightColor);
    doc.rect(TOTALS_X, currentY, TOTALS_W, TOTALS_H + 26).stroke(mediumColor);

    let totY = currentY + 8;
    doc.fontSize(8.5).font("Helvetica").fillColor("#444");
    for (const [label, value] of totalsRows) {
      doc.text(label, TOTALS_X + 6, totY, { width: 100 });
      doc.text(value, TOTALS_X + 106, totY, { width: TOTALS_W - 112, align: "right" });
      totY += TOTALS_ROW_H;
    }

    // Separator line before total
    doc.rect(TOTALS_X, totY, TOTALS_W, 1).fill(mediumColor);
    totY += 6;

    // Total row
    doc.rect(TOTALS_X, totY, TOTALS_W, 22).fill(primaryColor);
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("TOTAL:", TOTALS_X + 6, totY + 6, { width: 80 });
    doc.text(formatCurrency(totalVal), TOTALS_X + 86, totY + 6, { width: TOTALS_W - 92, align: "right" });

    currentY += TOTALS_H + 26 + 20;

    // Currency note (left side, same level as totals)
    const noteY = currentY - TOTALS_H - 26 - 20 + 8;
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#777");
    doc.text(`Precios expresados en ${quotation.currency || "MXN"} (Pesos Mexicanos).`, MARGIN, noteY, { width: TOTALS_X - MARGIN - 10 });
    doc.text("Los precios incluyen IVA 16%.", MARGIN, noteY + 10, { width: TOTALS_X - MARGIN - 10 });

    // ═══════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════
    if (quotation.notes) {
      const notesH = Math.max(40, doc.heightOfString(quotation.notes, { width: CONTENT_W - 12 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("NOTAS", MARGIN + 6, currentY + 3);
      currentY += 14;

      doc.rect(MARGIN, currentY, CONTENT_W, notesH).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      doc.text(quotation.notes, MARGIN + 6, currentY + 6, { width: CONTENT_W - 12 });
      currentY += notesH + 10;
    }

    // ═══════════════════════════════════════════════
    // CONDITIONS
    // ═══════════════════════════════════════════════
    if ((quotation as any).conditions) {
      const condText = (quotation as any).conditions as string;
      const condH = Math.max(40, doc.heightOfString(condText, { width: CONTENT_W - 12 }) + 16);
      if (currentY + condH + 30 > PAGE_H - 60) {
        doc.addPage({ size: "LETTER", margin: 0 });
        currentY = 20;
      }
      doc.rect(MARGIN, currentY, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("CONDICIONES", MARGIN + 6, currentY + 3);
      currentY += 14;

      doc.rect(MARGIN, currentY, CONTENT_W, condH).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      doc.text(condText, MARGIN + 6, currentY + 6, { width: CONTENT_W - 12 });
      currentY += condH + 10;
    }

    // ═══════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);

    // Left: legal disclaimer
    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text("Este documento es una cotización y no constituye un pedido en firme.", MARGIN, FOOTER_Y + 6, { width: 260 });
    doc.text(`Generado el ${formatDateTime(new Date())}`, MARGIN, FOOTER_Y + 16, { width: 260 });

    // Right: company contact summary
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
    console.error("Error generating quotation PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
