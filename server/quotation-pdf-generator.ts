import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quotation, QuotationItem, Customer, User } from "@shared/schema";
import { localStorageService } from "./localStorage";
import { formatPdfCurrency, formatPdfDate, formatPdfDateTime, formatPdfNumber, pdfText, resolvePdfLanguage } from "./pdf-locale";

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
  timezone?: string | null;
  locale?: string | null;
}

interface QuotationPDFData {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Customer;
  user: User;
  tenant?: TenantBranding | null;
  hideDiscount?: boolean;
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

const PAYMENT_TERMS_LABELS: Record<string, { es: string; en: string }> = {
  contado: { es: "Contado", en: "Cash" },
  "15_dias": { es: "15 días", en: "15 days" },
  "30_dias": { es: "30 días", en: "30 days" },
  "90_dias": { es: "90 días", en: "90 days" },
  "120_dias": { es: "120 días", en: "120 days" },
  "150_dias": { es: "150 días", en: "150 days" },
  "45_dias": { es: "45 días", en: "45 days" },
  "60_dias": { es: "60 días", en: "60 days" },
};

const DELIVERY_TIME_LABELS: Record<string, { es: string; en: string }> = {
  inmediato: { es: "Inmediato", en: "Immediate" },
  "1_semana": { es: "1 semana", en: "1 week" },
  "2_semanas": { es: "2 semanas", en: "2 weeks" },
  "3_semanas": { es: "3 semanas", en: "3 weeks" },
  "1_mes": { es: "1 mes", en: "1 month" },
  por_confirmar: { es: "Por confirmar", en: "To be confirmed" },
};

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
  const { quotation, items, customer, user, tenant, hideDiscount = false } = data;
  const language = resolvePdfLanguage(tenant);
  const t = (es: string, en: string) => pdfText(language, { es, en });

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || t("Empresa", "Company");
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
    if (tenant?.address) {
      tenant.address.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(part => infoLines.push(part));
    }
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `${t("C.P.", "ZIP")} ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `${t("Tel:", "Phone:")} ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
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
    doc.text(t("COTIZACIÓN", "QUOTATION"), MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2, align: "left" });

    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(`${t("Folio", "Number")}: ${quotation.folio}`, MARGIN + CONTENT_W / 2, TITLE_BAND_Y + 8, { width: CONTENT_W / 2, align: "right" });

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
    doc.text(t("DATOS DEL CLIENTE", "CUSTOMER INFORMATION"), MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text(t("DATOS DE LA COTIZACIÓN", "QUOTATION INFORMATION"), COL2_X + 6, currentY + 4, { width: COL_W - 10 });

    // Customer info
    let leftY = currentY + 22;
    doc.fontSize(8).font("Helvetica").fillColor("#333333");

    const customerRows: [string, string][] = [
      [t("Razón Social:", "Business Name:"), customer.name],
      ...(customer.rfc ? [["RFC:", customer.rfc] as [string, string]] : []),
      ...(customer.contactName ? [[t("Contacto:", "Contact:"), customer.contactName] as [string, string]] : []),
      ...(customer.phone ? [[t("Teléfono:", "Phone:"), customer.phone] as [string, string]] : []),
      ...(customer.email ? [["Email:", customer.email] as [string, string]] : []),
    ];
    if (customer.city || customer.state) {
      customerRows.push([t("Ciudad:", "City:"), [customer.city, customer.state].filter(Boolean).join(", ")]);
    }

    const LABEL_W = 72;
    const ROW_H = 13;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 12;
    const textOpts = (w: number) => ({ width: w, height: ROW_H, lineBreak: false, ellipsis: true } as const);
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, textOpts(LABEL_W));
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, textOpts(VALUE_W_L));
      leftY += ROW_H;
    }

    // Quotation info
    let rightY = currentY + 22;
    const quotationRows: [string, string][] = [
      [t("Fecha:", "Date:"), formatPdfDate(quotation.createdAt, language, tenant?.timezone, { day: "numeric", month: "long", year: "numeric" })],
      [t("Moneda:", "Currency:"), quotation.currency || "MXN"],
      [t("Vendedor:", "Salesperson:"), user.fullName],
    ];
    if (quotation.validUntil) quotationRows.push([t("Vigencia:", "Valid Until:"), formatPdfDate(quotation.validUntil, language, tenant?.timezone, { day: "numeric", month: "long", year: "numeric" })]);
    if (quotation.paymentTerms) quotationRows.push([t("Cond. Pago:", "Payment Terms:"), PAYMENT_TERMS_LABELS[quotation.paymentTerms] ? pdfText(language, PAYMENT_TERMS_LABELS[quotation.paymentTerms]) : quotation.paymentTerms]);
    if (quotation.deliveryTime) quotationRows.push([t("T. Entrega:", "Delivery:"), DELIVERY_TIME_LABELS[quotation.deliveryTime] ? pdfText(language, DELIVERY_TIME_LABELS[quotation.deliveryTime]) : quotation.deliveryTime]);

    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 12;
    for (const [label, value] of quotationRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, textOpts(LABEL_W));
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, textOpts(VALUE_W_R));
      rightY += ROW_H;
    }

    currentY += BOX_H + 20;

    // ═══════════════════════════════════════════════
    // CURRENCY SETUP
    // ═══════════════════════════════════════════════
    const rawQuoteCurrency = quotation.currency || "MXN";
    const exRate = parseFloat(String((quotation as any).exchangeRate || "18")) || 18;

    // Detect item-level currencies first so we can infer the effective quote currency
    const mxnItems = items.filter(i => ((i as any).currency || "MXN") === "MXN");
    const usdItems = items.filter(i => (i as any).currency === "USD");
    const showMonColumn = mxnItems.length > 0 && usdItems.length > 0;

    // For AMBAS quotations: infer effective currency from actual items
    //   - all USD items → display as USD
    //   - all MXN items (or mixed) → display as MXN (mixed is handled via showMonColumn path)
    let quoteCurrency: "MXN" | "USD";
    if (rawQuoteCurrency === "AMBAS") {
      quoteCurrency = (usdItems.length > 0 && mxnItems.length === 0) ? "USD" : "MXN";
    } else {
      quoteCurrency = rawQuoteCurrency as "MXN" | "USD";
    }

    const convertToQuote = (amount: number, itemCurrency: string): number => {
      if (itemCurrency === quoteCurrency) return amount;
      if (itemCurrency === "USD" && quoteCurrency === "MXN") return amount * exRate;
      if (itemCurrency === "MXN" && quoteCurrency === "USD") return amount / exRate;
      return amount;
    };

    const discountPct = parseFloat(quotation.globalDiscount || "0");

    // ═══════════════════════════════════════════════
    // PRODUCTS TABLE
    // ═══════════════════════════════════════════════
    // Section label
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(t("PRODUCTOS Y SERVICIOS", "PRODUCTS AND SERVICES"), MARGIN + 6, currentY + 4);
    currentY += 16;

    // Table column widths — squeeze desc slightly when showing Mon. column
    // When hideDiscount, remove disc column (42px) and add to desc
    const MON_W = showMonColumn ? 32 : 0;
    const DISC_W = hideDiscount ? 0 : 42;
    const DESC_W = showMonColumn ? (168 + (hideDiscount ? 42 : 0)) : (200 + (hideDiscount ? 42 : 0));
    const cols = {
      num:    { x: MARGIN,                                   w: 22      },
      code:   { x: MARGIN + 22,                              w: 72      },
      desc:   { x: MARGIN + 94,                              w: DESC_W  },
      qty:    { x: MARGIN + 94 + DESC_W,                     w: 44      },
      price:  { x: MARGIN + 94 + DESC_W + 44,               w: 72      },
      disc:   { x: MARGIN + 94 + DESC_W + 44 + 72,          w: DISC_W  },
      mon:    { x: MARGIN + 94 + DESC_W + 44 + 72 + DISC_W, w: MON_W   },
      total:  { x: MARGIN + 94 + DESC_W + 44 + 72 + DISC_W + MON_W, w: 80 },
    };

    // Table header row
    const TH = 15;
    doc.rect(MARGIN, currentY, CONTENT_W, TH).fill(primaryColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("#",          cols.num.x  + 2, currentY + 4, { width: cols.num.w  - 2, align: "center" });
    doc.text(t("Código", "Code"), cols.code.x + 2, currentY + 4, { width: cols.code.w - 2 });
    doc.text(t("Descripción", "Description"),cols.desc.x + 2, currentY + 4, { width: cols.desc.w - 2 });
    doc.text(t("Cant.", "Qty."), cols.qty.x + 2, currentY + 4, { width: cols.qty.w - 4, align: "center" });
    doc.text(t("P. Unit.", "Unit Price"), cols.price.x + 2, currentY + 4, { width: cols.price.w - 4, align: "right" });
    if (!hideDiscount) {
      doc.text(t("Desc%", "Disc%"), cols.disc.x + 2, currentY + 4, { width: cols.disc.w - 2, align: "center" });
    }
    if (showMonColumn) {
      doc.text(t("Mon.", "Curr."), cols.mon.x + 2, currentY + 4, { width: cols.mon.w - 2, align: "center" });
    }
    doc.text("Subtotal",   cols.total.x+ 2, currentY + 4, { width: cols.total.w- 4, align: "right" });
    currentY += TH;

    // Table rows — dynamic height to handle long product names
    const ROW_PAD = 4;
    const MIN_ROW_H = 16;
    doc.fontSize(7.5).font("Helvetica");

    const fmtMXN = (v: number) => formatPdfCurrency(v, "MXN", language);
    const fmtUSD = (v: number) => formatPdfCurrency(v, "USD", language);
    const fmtQuote = quoteCurrency === "USD" ? fmtUSD : fmtMXN;
    // For legacy mixed-currency rows: format each item in its own currency
    const fmtItem = (v: number, cur: string) => cur === "USD" ? fmtUSD(v) : fmtMXN(v);

    items.forEach((item, index) => {
      const itemCurrency = (item as any).currency || "MXN";
      // If items have mixed currencies (legacy AMBAS), display in their own currency; otherwise convert
      const displayUnitPrice = showMonColumn
        ? (parseFloat(String(item.unitPrice)) || 0)
        : convertToQuote(parseFloat(String(item.unitPrice)) || 0, itemCurrency);
      const displaySubtotal  = showMonColumn
        ? (parseFloat(String(item.subtotal)) || 0)
        : convertToQuote(parseFloat(String(item.subtotal))  || 0, itemCurrency);

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
      doc.text(formatPdfNumber(parseFloat(item.quantity), language), cols.qty.x + 2, rowY, { width: cols.qty.w - 4, align: "center", lineBreak: false });
      const rowFmt = showMonColumn ? (v: number) => fmtItem(v, itemCurrency) : fmtQuote;
      doc.text(rowFmt(displayUnitPrice), cols.price.x + 2, rowY, { width: cols.price.w - 4, align: "right", lineBreak: false });
      if (!hideDiscount) {
        doc.text(formatPdfNumber(parseFloat(item.discountPercent || "0"), language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%", cols.disc.x + 2, rowY, { width: cols.disc.w - 2, align: "center", lineBreak: false });
      }
      if (showMonColumn) {
        doc.fillColor(itemCurrency === "USD" ? "#1a6b3a" : "#444");
        doc.text(itemCurrency, cols.mon.x + 2, rowY, { width: cols.mon.w - 2, align: "center", lineBreak: false });
        doc.fillColor("#333333");
      }
      doc.text(rowFmt(displaySubtotal), cols.total.x + 2, rowY, { width: cols.total.w - 4, align: "right", lineBreak: false });

      currentY += rowH;
    });

    // Bottom border of table
    doc.rect(MARGIN, currentY, CONTENT_W, 1).fill(mediumColor);
    currentY += 20;

    // ═══════════════════════════════════════════════
    // TOTALS BOX — single or dual currency
    // ═══════════════════════════════════════════════
    const TOTALS_ROW_H = 16;

    const FOREIGN_RFC = "XEXX010101000";
    const isForeignCustomer = customer.rfc === FOREIGN_RFC;
    const isMexicoCustomer = !isForeignCustomer && (
      !customer.country ||
      ["mx", "mexico", "méxico", "mex"].includes(customer.country.toLowerCase().trim())
    );

    const drawTotalsBox = (
      bx: number, by: number, bw: number,
      label: string, labelColor: string,
      sub: number, disc: number, tax: number, total: number,
      fmtFn: (v: number) => string
    ) => {
      const rows: [string, string][] = [
        [`${t("Subtotal", "Subtotal")}:`, fmtFn(sub)],
        ...(disc > 0 ? [[`${t("Desc.", "Discount")} (${formatPdfNumber(discountPct, language)}%):`, `-${fmtFn(disc)}`] as [string, string]] : []),
        ...(isMexicoCustomer ? [[`${t("IVA", "VAT")} (16%):`, fmtFn(tax)] as [string, string]] : []),
      ];
      const boxH = rows.length * TOTALS_ROW_H + 22 + 26;

      // Header band
      doc.rect(bx, by, bw, 14).fill(labelColor);
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(label, bx + 4, by + 3, { width: bw - 8, align: "center" });

      doc.rect(bx, by + 14, bw, boxH - 14 - 22).fill(lightColor);
      doc.rect(bx, by + 14, bw, boxH - 14 - 22).stroke(mediumColor);

      let ty = by + 14 + 6;
      doc.fontSize(8).font("Helvetica").fillColor("#444");
      for (const [lbl, val] of rows) {
        doc.text(lbl, bx + 6, ty, { width: bw * 0.52 });
        doc.text(val, bx + bw * 0.52, ty, { width: bw * 0.44, align: "right" });
        ty += TOTALS_ROW_H;
      }

      // Total row
      doc.rect(bx, by + boxH - 22, bw, 22).fill(labelColor);
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(`${t("TOTAL", "TOTAL")}:`, bx + 6, by + boxH - 16, { width: bw * 0.45 });
      doc.text(fmtFn(total), bx + bw * 0.45, by + boxH - 16, { width: bw * 0.5, align: "right" });

      return boxH;
    };

    // Totals box(es)
    if (showMonColumn) {
      // AMBAS / mixed currencies — show TWO boxes: one MXN, one USD
      const mxnSub = mxnItems.reduce((s, i) => s + (parseFloat(String(i.subtotal)) || 0), 0);
      const usdSub = usdItems.reduce((s, i) => s + (parseFloat(String(i.subtotal)) || 0), 0);
      const mxnDisc = discountPct > 0 ? mxnSub * (discountPct / 100) : 0;
      const usdDisc = discountPct > 0 ? usdSub * (discountPct / 100) : 0;
      const mxnTax = isMexicoCustomer ? (mxnSub - mxnDisc) * 0.16 : 0;
      const mxnTotal = mxnSub - mxnDisc + mxnTax;
      const usdTotal = usdSub - usdDisc;

      const TOTALS_W = 195;
      const GAP = 10;
      const BOX2_START = PAGE_W - MARGIN - TOTALS_W * 2 - GAP;

      // When hideDiscount: show post-discount subtotal, pass disc=0 so no discount line appears
      const mxnH = drawTotalsBox(BOX2_START, currentY, TOTALS_W, t("PESOS MEXICANOS (MXN)", "MEXICAN PESOS (MXN)"), primaryColor,
        hideDiscount ? (mxnSub - mxnDisc) : mxnSub,
        hideDiscount ? 0 : mxnDisc,
        mxnTax, mxnTotal, fmtMXN);
      const usdH = drawTotalsBox(BOX2_START + TOTALS_W + GAP, currentY, TOTALS_W, t("DÓLARES AMERICANOS (USD)", "US DOLLARS (USD)"), "#1a6b3a",
        hideDiscount ? (usdSub - usdDisc) : usdSub,
        hideDiscount ? 0 : usdDisc,
        0, usdTotal, fmtUSD);

      currentY += Math.max(mxnH, usdH) + 20;
    } else {
      // Single currency totals box — always recalculate from line items so that
      // AMBAS quotations where all items are USD show correct USD amounts
      // (quotation.subtotal is stored in the aggregation currency which may differ)
      const TOTALS_W = 200;
      const TOTALS_X = PAGE_W - MARGIN - TOTALS_W;

      const subtotalVal = items.reduce((s, i) => {
        const sub = parseFloat(String(i.subtotal)) || 0;
        const iCur = (i as any).currency || "MXN";
        return s + convertToQuote(sub, iCur);
      }, 0);
      const discountAmt = discountPct > 0 ? subtotalVal * (discountPct / 100) : 0;
      const subtotalAfterDisc = subtotalVal - discountAmt;
      const taxVal = isForeignCustomer ? 0 : subtotalAfterDisc * 0.16;
      const totalVal = subtotalAfterDisc + (isForeignCustomer ? 0 : taxVal);

      const quoteLabel = quoteCurrency === "USD" ? t("DÓLARES AMERICANOS (USD)", "US DOLLARS (USD)") : t("PESOS MEXICANOS (MXN)", "MEXICAN PESOS (MXN)");
      const quoteColor = quoteCurrency === "USD" ? "#1a6b3a" : primaryColor;

      // When hideDiscount: pass post-discount subtotal as "sub", disc=0 → no discount row shown
      const singleH = drawTotalsBox(TOTALS_X, currentY, TOTALS_W, quoteLabel, quoteColor,
        hideDiscount ? subtotalAfterDisc : subtotalVal,
        hideDiscount ? 0 : discountAmt,
        taxVal, totalVal, fmtQuote);

      currentY += singleH + 20;
    }

    // ═══════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════
    if (quotation.notes) {
      const notesH = Math.max(40, doc.heightOfString(quotation.notes, { width: CONTENT_W - 12 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, 14).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text(t("NOTAS", "NOTES"), MARGIN + 6, currentY + 3);
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
      doc.text(t("CONDICIONES", "TERMS AND CONDITIONS"), MARGIN + 6, currentY + 3);
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
    doc.text(t("Este documento es una cotización y no constituye un pedido en firme.", "This document is a quotation and does not constitute a firm order."), MARGIN, FOOTER_Y + 6, { width: 260 });
    doc.text(`${t("Generado el", "Generated on")} ${formatPdfDateTime(new Date(), language, tenant?.timezone)}`, MARGIN, FOOTER_Y + 16, { width: 260 });

    // Right: company contact summary
    const footerRight: string[] = [];
    if (tenant?.phone) footerRight.push(`${t("Tel:", "Phone:")} ${tenant.phone}`);
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
