import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { CreditAuthorization, Quotation, Customer, User } from "@shared/schema";
import { localStorageService } from "./localStorage";
import { formatPdfCurrency, formatPdfDate, formatPdfDateTime, pdfText, resolvePdfLanguage } from "./pdf-locale";

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
  timezone?: string | null;
  locale?: string | null;
  website?: string | null;
  rfc?: string | null;
}

interface CreditAuthPDFData {
  authorization: CreditAuthorization;
  quotation: Quotation;
  customer: Customer;
  requestedBy: User;
  approvedBy?: User | null;
  tenant?: TenantBranding | null;
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) return await localStorageService.getFile(logoUrl);
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      const resp = await fetch(logoUrl);
      if (!resp.ok) return null;
      return Buffer.from(await resp.arrayBuffer());
    }
    return null;
  } catch { return null; }
}

function getStatusLabel(status: string, language: "es" | "en"): string {
  const labels = {
    pending: pdfText(language, { es: "Pendiente", en: "Pending" }),
    approved: pdfText(language, { es: "Aprobada", en: "Approved" }),
    rejected: pdfText(language, { es: "Rechazada", en: "Rejected" }),
  };
  return labels[status as keyof typeof labels] || status;
}

function getStatusColor(status: string): string {
  return { pending: "#d69e2e", approved: "#38a169", rejected: "#e53e3e" }[status] || "#4a5568";
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

export async function generateCreditAuthPDFStream(data: CreditAuthPDFData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { authorization, quotation, customer, requestedBy, approvedBy, tenant } = data;
  const language = resolvePdfLanguage(tenant);
  const text = <T>(values: { es: T; en: T }) => pdfText(language, values);
  const formatCurrency = (value: string | number | null | undefined, currency = "MXN") =>
    formatPdfCurrency(value, currency, language);
  const formatDate = (value: Date | string | null | undefined) =>
    formatPdfDate(value, language, tenant?.timezone, { year: "numeric", month: "long", day: "numeric" });
  const formatDateTime = (value: Date | string | null | undefined) =>
    formatPdfDateTime(value, language, tenant?.timezone);

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || text({ es: "Empresa", en: "Company" });
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);
  const statusColor = getStatusColor(authorization.status);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  try {
    // ═══════════════════════════════════════════════
    // HEADER BAND
    // ═══════════════════════════════════════════════
    const HEADER_H = 112;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

    // Logo: always on the LEFT side
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] as [number, number] });
      } catch { /* ignore */ }
    }

    // Text block: always on the RIGHT side, right-aligned, no wrapping
    const TEXT_X = PAGE_W / 2;
    const TEXT_W = PAGE_W - TEXT_X - MARGIN;

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });

    const infoLines: string[] = [];
    if (tenant?.rfc) infoLines.push(`${text({ es: "RFC:", en: "Tax ID:" })} ${tenant.rfc}`);
    if (tenant?.address) {
      tenant.address.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(part => infoLines.push(part));
    }
    const cityStateParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `${text({ es: "C.P.", en: "ZIP" })} ${tenant.zipCode}` : null].filter(Boolean);
    if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
    const contactParts = [tenant?.phone ? `${text({ es: "Tel:", en: "Phone:" })} ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
    if (contactParts.length) infoLines.push(contactParts.join("   |   "));
    if (tenant?.website) infoLines.push(tenant.website);

    doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
    infoLines.forEach((line, i) => {
      doc.text(line, TEXT_X, 32 + i * 11, { width: TEXT_W, align: "right", lineBreak: false });
    });

    // ═══════════════════════════════════════════════
    // TITLE BAND
    // ═══════════════════════════════════════════════
    const TITLE_Y = HEADER_H;
    const TITLE_H = 32;
    doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(text({ es: "AUTORIZACIÓN DE CRÉDITO", en: "CREDIT AUTHORIZATION" }), MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.6 });

    // Status badge (right side)
    const statusBadgeW = 160;
    const statusBadgeX = PAGE_W - MARGIN - statusBadgeW;
    doc.rect(statusBadgeX, TITLE_Y + 5, statusBadgeW, 22).fill(statusColor);
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text(getStatusLabel(authorization.status, language).toUpperCase(), statusBadgeX, TITLE_Y + 11, { width: statusBadgeW, align: "center" });

    let currentY = TITLE_Y + TITLE_H + 18;

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
    doc.text(text({ es: "DATOS DEL CLIENTE", en: "CUSTOMER INFORMATION" }), MARGIN + 6, currentY + 4, { width: COL_W - 10 });
    doc.text(text({ es: "DATOS DE LA COTIZACIÓN", en: "QUOTATION INFORMATION" }), COL2_X + 6, currentY + 4, { width: COL_W - 10 });

    let leftY = currentY + 22;
    const customerRows: [string, string][] = [
      [text({ es: "Razón Social:", en: "Legal Name:" }), customer.name],
      ...(customer.rfc ? [[text({ es: "RFC:", en: "Tax ID:" }), customer.rfc] as [string, string]] : []),
      ...(customer.contactName ? [[text({ es: "Contacto:", en: "Contact:" }), customer.contactName] as [string, string]] : []),
      ...(customer.phone ? [[text({ es: "Teléfono:", en: "Phone:" }), customer.phone] as [string, string]] : []),
      ...(customer.email ? [["Email:", customer.email] as [string, string]] : []),
    ];
    const LABEL_W = 72;
    const VALUE_X_L = MARGIN + 6 + LABEL_W;
    const VALUE_W_L = COL_W - LABEL_W - 10;
    doc.fontSize(8);
    for (const [label, value] of customerRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L, lineBreak: false });
      leftY += 12;
    }

    let rightY = currentY + 22;
    const quotRows: [string, string][] = [
      [text({ es: "Folio:", en: "Reference:" }), quotation.folio],
      [text({ es: "Importe:", en: "Amount:" }), formatCurrency(quotation.total, quotation.currency || "MXN")],
      [text({ es: "Fecha:", en: "Date:" }), formatDate(quotation.createdAt)],
      [text({ es: "Solicitado por:", en: "Requested by:" }), requestedBy.fullName],
      [text({ es: "Solicitud:", en: "Request:" }), formatDate(authorization.createdAt)],
    ];
    const VALUE_X_R = COL2_X + 6 + LABEL_W;
    const VALUE_W_R = COL_W - LABEL_W - 10;
    for (const [label, value] of quotRows) {
      doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
      doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
      rightY += 12;
    }

    currentY += BOX_H + 18;

    // ═══════════════════════════════════════════════
    // CREDIT INFORMATION
    // ═══════════════════════════════════════════════
    doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(text({ es: "ANÁLISIS DE CRÉDITO", en: "CREDIT ANALYSIS" }), MARGIN + 6, currentY + 4);
    currentY += 16;

    const creditFields: [string, string, string][] = [
      [text({ es: "Crédito Disponible", en: "Available Credit" }), formatCurrency(authorization.creditAvailable), "#38a169"],
      [text({ es: "Crédito Utilizado", en: "Credit Used" }), formatCurrency(authorization.creditUsed), "#d69e2e"],
      [text({ es: "Saldo Vencido", en: "Overdue Balance" }), formatCurrency(authorization.overdueBalance), "#e53e3e"],
      [text({ es: "Monto Solicitado", en: "Amount Requested" }), formatCurrency(quotation.total, quotation.currency || "MXN"), primaryColor],
    ];

    const CREDIT_COL_W = CONTENT_W / 4;
    doc.rect(MARGIN, currentY, CONTENT_W, 50).fill(lightColor);

    creditFields.forEach(([label, value, color], idx) => {
      const cx = MARGIN + idx * CREDIT_COL_W;
      doc.rect(cx, currentY, CREDIT_COL_W, 50).stroke(mediumColor);
      doc.fontSize(7).font("Helvetica").fillColor("#666").text(label, cx + 4, currentY + 6, { width: CREDIT_COL_W - 8, align: "center" });
      doc.fontSize(11).font("Helvetica-Bold").fillColor(color).text(value, cx + 4, currentY + 20, { width: CREDIT_COL_W - 8, align: "center" });
    });

    currentY += 60;

    // ═══════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════
    if (authorization.notes) {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text(text({ es: "NOTAS", en: "NOTES" }), MARGIN + 6, currentY + 4);
      currentY += 16;
      const textH = Math.max(36, doc.heightOfString(authorization.notes, { width: CONTENT_W - 16 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, textH).fill(lightColor);
      doc.fontSize(8.5).font("Helvetica").fillColor("#444");
      doc.text(authorization.notes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16 });
      currentY += textH + 14;
    }

    // ═══════════════════════════════════════════════
    // APPROVAL SECTION
    // ═══════════════════════════════════════════════
    if (authorization.status === "approved" && approvedBy) {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill("#38a169");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(text({ es: "APROBACIÓN", en: "APPROVAL" }), MARGIN + 6, currentY + 4);
      currentY += 16;

      doc.rect(MARGIN, currentY, CONTENT_W, 50).fill("#f0fff4");
      doc.fontSize(8).font("Helvetica").fillColor("#333");
      doc.font("Helvetica-Bold").fillColor("#555").text(text({ es: "Aprobado por:", en: "Approved by:" }), MARGIN + 8, currentY + 8, { continued: true, width: 90 });
      doc.font("Helvetica").fillColor("#222").text(approvedBy.fullName);
      doc.font("Helvetica-Bold").fillColor("#555").text(text({ es: "Fecha:", en: "Date:" }), MARGIN + 8, currentY + 20, { continued: true, width: 90 });
      doc.font("Helvetica").fillColor("#222").text(formatDate(authorization.authorizedAt));
      currentY += 50;

      // Signature
      if (authorization.approvalSignature) {
        currentY += 10;
        try {
          const sigData = authorization.approvalSignature;
          if (sigData.startsWith("data:image")) {
            const imageBuffer = Buffer.from(sigData.split(",")[1], "base64");
            doc.image(imageBuffer, MARGIN, currentY, { width: 200, height: 80 });
            doc.fontSize(7).font("Helvetica").fillColor("#777").text(text({ es: "Firma Digital", en: "Digital Signature" }), MARGIN, currentY + 84, { width: 200, align: "center" });
            currentY += 100;
          }
        } catch {
          doc.fontSize(8).font("Helvetica").fillColor("#777").text(text({ es: "[Firma registrada]", en: "[Signature on file]" }), MARGIN + 8, currentY + 8);
          currentY += 30;
        }
      }
    }

    // ═══════════════════════════════════════════════
    // REJECTION SECTION
    // ═══════════════════════════════════════════════
    if (authorization.status === "rejected") {
      doc.rect(MARGIN, currentY, CONTENT_W, 16).fill("#e53e3e");
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(text({ es: "MOTIVO DE RECHAZO", en: "REJECTION REASON" }), MARGIN + 6, currentY + 4);
      currentY += 16;

      const rejText = authorization.rejectionNotes || text({ es: "Sin motivo especificado", en: "No reason specified" });
      const textH = Math.max(36, doc.heightOfString(rejText, { width: CONTENT_W - 16 }) + 16);
      doc.rect(MARGIN, currentY, CONTENT_W, textH).fill("#fff5f5");
      doc.fontSize(8.5).font("Helvetica").fillColor("#c53030");
      doc.text(rejText, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16 });
      currentY += textH + 14;
    }

    // ═══════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════
    const FOOTER_Y = PAGE_H - 42;
    doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);

    doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
    doc.text(text({ es: "Documento generado automáticamente. Válido como constancia de autorización de crédito.", en: "Automatically generated document. Valid as proof of credit authorization." }), MARGIN, FOOTER_Y + 6, { width: 280 });
    doc.text(text({ es: "Generado el ", en: "Generated on " }) + formatDateTime(new Date()), MARGIN, FOOTER_Y + 16, { width: 280 });

    const footerRight: string[] = [];
    if (tenant?.phone) footerRight.push(`${text({ es: "Tel:", en: "Phone:" })} ${tenant.phone}`);
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
    console.error("Error generating credit authorization PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
