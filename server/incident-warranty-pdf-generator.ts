import PDFDocument from "pdfkit";
import { Readable } from "stream";
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
  timezone?: string | null;
}

export interface WarrantyIncidentData {
  ticketNumber: string;
  type: string;
  status: string;
  urgency: string;
  subject: string;
  description: string;
  createdAt: Date | string;
  // Customer
  customerName: string;
  customerAddress?: string | null;
  customerCity?: string | null;
  // Contact at customer
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  // Product / equipment
  productName?: string | null;
  productSku?: string | null;
  warrantySerialNumber?: string | null;
  referenceNumber?: string | null;
  orderId?: string | null;
  orderFolio?: string | null;
  invoiceFolio?: string | null;
  // Assigned
  assigneeName?: string | null;
  assignedArea?: string | null;
  // Resolution (optional — if already resolved)
  resolution?: string | null;
  // User-provided observations (editable before PDF)
  observations?: string | null;
  // Tenant branding
  tenant?: TenantBranding | null;
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      return await localStorageService.getFile(`logos/${logoUrl.replace("/api/logos/", "")}`);
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

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `#${Math.min(255, r + Math.round((255 - r) * amount)).toString(16).padStart(2, "0")}${Math.min(255, g + Math.round((255 - g) * amount)).toString(16).padStart(2, "0")}${Math.min(255, b + Math.round((255 - b) * amount)).toString(16).padStart(2, "0")}`;
}

const TYPE_LABELS: Record<string, string> = {
  garantia: "Garantía",
  retrabajo: "Retrabajo",
  queja: "Queja",
  consulta: "Consulta",
  administrativo: "Administrativo",
};

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_proceso: "En Proceso",
  esperando_cliente: "Esperando Cliente",
  esperando_interno: "En Revisión",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

const URGENCY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export async function generateIncidentWarrantyPDF(data: WarrantyIncidentData): Promise<Readable> {
  const { tenant } = data;
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = new Date();

  // ── HEADER ──────────────────────────────────────────────────────────────
  const HEADER_H = 110;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

  if (logoBuffer) {
    try { doc.image(logoBuffer, MARGIN, (HEADER_H - 64) / 2, { fit: [110, 64] as [number, number] }); } catch { /**/ }
  }

  const TEXT_X = PAGE_W / 2;
  const TEXT_W = PAGE_W - TEXT_X - MARGIN;
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text(companyName.toUpperCase(), TEXT_X, 16, { width: TEXT_W, align: "right", lineBreak: false });

  const infoLines: string[] = [];
  if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
  if (tenant?.address) tenant.address.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(p => infoLines.push(p));
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  if (tenant?.phone) infoLines.push(`Tel: ${tenant.phone}`);
  if (tenant?.email) infoLines.push(tenant.email);

  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 34 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false }));

  // ── TITLE BAND ───────────────────────────────────────────────────────────
  const TITLE_Y = HEADER_H;
  const TITLE_H = 30;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("HOJA DE GARANTÍA", MARGIN, TITLE_Y + 7, { width: CONTENT_W * 0.65 });
  doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor);
  doc.text(`Generado: ${fmtDate(now)}`, MARGIN + CONTENT_W * 0.65, TITLE_Y + 10, { width: CONTENT_W * 0.35, align: "right" });

  let Y = TITLE_Y + TITLE_H + 14;

  // ── TICKET NUMBER ─────────────────────────────────────────────────────────
  doc.fontSize(18).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(data.ticketNumber, MARGIN, Y);
  Y += 28;

  const INFO_COL = CONTENT_W / 3;
  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text("Tipo:", MARGIN, Y);
  doc.text("Estado:", MARGIN + INFO_COL, Y);
  doc.text("Urgencia:", MARGIN + INFO_COL * 2, Y);
  Y += 11;
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(TYPE_LABELS[data.type] || data.type, MARGIN, Y);
  doc.text(STATUS_LABELS[data.status] || data.status, MARGIN + INFO_COL, Y);
  doc.text(URGENCY_LABELS[data.urgency] || data.urgency, MARGIN + INFO_COL * 2, Y);
  Y += 18;

  // ── PRODUCT / EQUIPMENT BOX ──────────────────────────────────────────────
  // Customer data is intentionally NOT shown on this sheet per requirement.
  const productLines: { label: string; value: string }[] = [];
  if (data.productName) productLines.push({ label: "Producto:", value: data.productName });
  if (data.productSku) productLines.push({ label: "SKU/Modelo:", value: data.productSku });
  if (data.warrantySerialNumber) productLines.push({ label: "No. Serie:", value: data.warrantySerialNumber });
  if (data.referenceNumber) productLines.push({ label: "Referencia:", value: data.referenceNumber });
  if (data.orderFolio) productLines.push({ label: "Pedido:", value: data.orderFolio });
  if (data.invoiceFolio) productLines.push({ label: "Factura:", value: data.invoiceFolio });

  const PROD_BOX_H = Math.max(40, 22 + Math.min(productLines.length, 6) * 11 + 6);

  // Product / equipment box (full width)
  doc.rect(MARGIN, Y, CONTENT_W, PROD_BOX_H).fill(lightColor);
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("PRODUCTO / EQUIPO", MARGIN + 6, Y + 4, { width: CONTENT_W - 12 });

  doc.fontSize(7.5);
  productLines.slice(0, 6).forEach((row, i) => {
    doc.font("Helvetica-Bold").fillColor("#374151").text(row.label, MARGIN + 6, Y + 20 + i * 11, { width: 70, continued: false });
    doc.font("Helvetica").text(row.value, MARGIN + 78, Y + 20 + i * 11, { width: CONTENT_W - 90, lineBreak: false, ellipsis: true });
  });

  Y += PROD_BOX_H + 14;

  // ── SUBJECT & DESCRIPTION ─────────────────────────────────────────────────
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("ASUNTO Y DESCRIPCIÓN DEL PROBLEMA", MARGIN + 6, Y + 4);
  Y += 15;

  doc.rect(MARGIN, Y, CONTENT_W, 14).fill(lightColor);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.subject, MARGIN + 6, Y + 3, { width: CONTENT_W - 12, lineBreak: false, ellipsis: true });
  Y += 14;

  // Description block — calculate height based on text
  const descFontSize = 8;
  doc.fontSize(descFontSize).font("Helvetica").fillColor("#374151");
  const descLines = data.description
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .join("\n");
  const descH = Math.max(44, Math.min(120, Math.ceil(descLines.length / 80) * 12 + 16));
  doc.rect(MARGIN, Y, CONTENT_W, descH).fill("#f9fafb");
  doc.text(descLines || "Sin descripción.", MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: descH - 10, ellipsis: true });
  Y += descH + 12;

  // ── RESOLUTION (if present) ───────────────────────────────────────────────
  if (data.resolution) {
    doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("RESOLUCIÓN / ACCIÓN TOMADA", MARGIN + 6, Y + 4);
    Y += 15;
    const resH = Math.max(32, Math.min(80, Math.ceil(data.resolution.length / 90) * 12 + 12));
    doc.rect(MARGIN, Y, CONTENT_W, resH).fill(lightColor);
    doc.fontSize(8).font("Helvetica").fillColor("#374151");
    doc.text(data.resolution, MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: resH - 10, ellipsis: true });
    Y += resH + 12;
  }

  // ── ASSIGNED INFO ─────────────────────────────────────────────────────────
  if (data.assigneeName || data.assignedArea) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
    const assignParts: string[] = [];
    if (data.assigneeName) assignParts.push(`Responsable: ${data.assigneeName}`);
    if (data.assignedArea) assignParts.push(`Área: ${data.assignedArea}`);
    doc.text(assignParts.join("   |   "), MARGIN, Y, { width: CONTENT_W });
    Y += 16;
  }

  // ── OBSERVATIONS FIELD ────────────────────────────────────────────────────
  if (Y > 580) { doc.addPage(); Y = 40; }
  doc.rect(MARGIN, Y, CONTENT_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("OBSERVACIONES / CONDICIÓN DEL EQUIPO", MARGIN + 6, Y + 4);
  Y += 15;
  if (data.observations) {
    const obsH = Math.max(44, Math.min(90, Math.ceil(data.observations.length / 90) * 12 + 16));
    doc.rect(MARGIN, Y, CONTENT_W, obsH).fill(lightColor);
    doc.fontSize(8).font("Helvetica").fillColor("#374151");
    doc.text(data.observations, MARGIN + 6, Y + 6, { width: CONTENT_W - 12, lineBreak: true, height: obsH - 10, ellipsis: true });
    Y += obsH + 12;
  } else {
    doc.rect(MARGIN, Y, CONTENT_W, 56).stroke(mediumColor);
    Y += 56 + 12;
  }

  // ── SIGNATURE BOXES ───────────────────────────────────────────────────────
  if (Y > 630) { doc.addPage(); Y = 40; }

  const SIG_W = CONTENT_W / 4 - 6;
  const SIG_H = 82;
  const sigBoxes = ["DEPTO. DE\nSEGURIDAD", "EMBARQUES", "FACTURACIÓN", "TRANSPORTE\nO CLIENTE"];

  sigBoxes.forEach((label, i) => {
    const bx = MARGIN + i * (SIG_W + 8);
    doc.rect(bx, Y, SIG_W, SIG_H).stroke(mediumColor);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(label, bx + 4, Y + 5, { width: SIG_W - 8, align: "center" });
    // Name line
    doc.moveTo(bx + 6, Y + 42).lineTo(bx + SIG_W - 6, Y + 42).stroke("#9ca3af");
    doc.fontSize(6).font("Helvetica").fillColor("#6b7280");
    doc.text("NOMBRE Y FIRMA", bx + 4, Y + 44, { width: SIG_W - 8, align: "center" });
    // Date line
    doc.moveTo(bx + 6, Y + 66).lineTo(bx + SIG_W - 6, Y + 66).stroke("#9ca3af");
    doc.text("FECHA", bx + 4, Y + 68, { width: SIG_W - 8, align: "center" });
  });

  Y += SIG_H + 16;

  // ── DECLARATION LINE ─────────────────────────────────────────────────────
  if (Y > 710) { doc.addPage(); Y = 40; }
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#4b5563");
  doc.text(
    "Declaro que el equipo descrito en este documento es entregado para revisión/garantía en las condiciones indicadas y que la información proporcionada es verídica.",
    MARGIN, Y, { width: CONTENT_W }
  );
  Y += 18;
  doc.fontSize(7.5).font("Helvetica").fillColor("#374151");
  doc.text("Yo: ___________________________________", MARGIN, Y, { continued: true });
  doc.text("   confirmo la entrega del equipo arriba descrito.", { continued: false });
  Y += 14;
  doc.text("Fecha: ___/___/______", MARGIN, Y);

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  const footerParts: string[] = [];
  if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
  if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
  if (tenant?.phone) footerParts.push(tenant.phone);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
  doc.text(footerParts.join("   |   "), MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" });
  doc.text(`${data.ticketNumber}   —   Generado el ${fmtDate(now)}`, MARGIN, FOOTER_Y + 20, { width: CONTENT_W, align: "center" });

  doc.end();
  return doc as unknown as Readable;
}
