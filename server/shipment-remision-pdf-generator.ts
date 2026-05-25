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

interface RemisionProduct {
  name: string;
  quantity: number;
  unitOfMeasure: string;
  desde: string; // e.g. "Almacén / Salida"
  serialNumbers: string[]; // one row per serial
}

interface ShipmentRemisionData {
  folio: string;           // order folio e.g. MEX-05156
  orderStatus: string;
  scheduledDate: string | null;
  customerName: string;
  customerAddress?: string | null;
  transporter: string;
  transportType: string;
  driverName?: string | null;
  vehiclePlates?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  products: RemisionProduct[];
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

export async function generateShipmentRemisionPDF(data: ShipmentRemisionData): Promise<Readable> {
  const { tenant, products } = data;
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

  // Company info (right side of header)
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

  // ── TITLE BAND ──────────────────────────────────────────────────────────
  const TITLE_Y = HEADER_H;
  const TITLE_H = 30;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("REMISIÓN DE SALIDA", MARGIN, TITLE_Y + 7, { width: CONTENT_W * 0.6 });
  doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor);
  doc.text(`Fecha: ${fmtDate(now)}`, MARGIN + CONTENT_W * 0.6, TITLE_Y + 10, { width: CONTENT_W * 0.4, align: "right" });

  let Y = TITLE_Y + TITLE_H + 14;

  // ── FOLIO + ORDER INFO ───────────────────────────────────────────────────
  doc.fontSize(18).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(data.folio, MARGIN, Y);
  Y += 28;

  const INFO_COL = CONTENT_W / 3;
  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text("Orden:", MARGIN, Y);
  doc.text("Estado:", MARGIN + INFO_COL, Y);
  doc.text("Fecha programada:", MARGIN + INFO_COL * 2, Y);
  Y += 11;
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.folio, MARGIN, Y);
  doc.text(data.orderStatus, MARGIN + INFO_COL, Y);
  doc.text(fmtDate(data.scheduledDate), MARGIN + INFO_COL * 2, Y);
  Y += 18;

  // ── CUSTOMER & TRANSPORT BOXES ───────────────────────────────────────────
  const BOX_W = CONTENT_W / 2 - 6;
  const BOX2_X = MARGIN + BOX_W + 12;
  const BOX_H = 70;

  // Customer box
  doc.rect(MARGIN, Y, BOX_W, BOX_H).fill(lightColor);
  doc.rect(MARGIN, Y, BOX_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("CLIENTE / DESTINATARIO", MARGIN + 6, Y + 4, { width: BOX_W - 12 });
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.customerName, MARGIN + 6, Y + 20, { width: BOX_W - 12, lineBreak: false, ellipsis: true });
  if (data.customerAddress) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
    doc.text(data.customerAddress, MARGIN + 6, Y + 33, { width: BOX_W - 12, lineBreak: false, ellipsis: true });
  }

  // Transport box
  doc.rect(BOX2_X, Y, BOX_W, BOX_H).fill(lightColor);
  doc.rect(BOX2_X, Y, BOX_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("DATOS DE TRANSPORTE", BOX2_X + 6, Y + 4, { width: BOX_W - 12 });

  const transportLines = [
    { label: "Transportista:", value: data.transporter },
    { label: "Tipo:", value: data.transportType === "propio" ? "Transporte Propio" : "Paquetería" },
    { label: "Chofer:", value: data.driverName || "—" },
    { label: "Placas:", value: data.vehiclePlates || "—" },
  ];
  doc.fontSize(7.5).font("Helvetica").fillColor("#374151");
  transportLines.forEach((row, i) => {
    doc.font("Helvetica-Bold").text(row.label, BOX2_X + 6, Y + 20 + i * 11, { width: 65, continued: false });
    doc.font("Helvetica").text(row.value, BOX2_X + 74, Y + 20 + i * 11, { width: BOX_W - 80, lineBreak: false, ellipsis: true });
  });

  Y += BOX_H + 14;

  // ── AUTHORIZATION TEXT ──────────────────────────────────────────────────
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Nombre: _______________________________________________", MARGIN, Y);
  Y += 16;
  doc.text("A quien corresponda:", MARGIN, Y);
  Y += 12;
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#4b5563");
  doc.text(
    "Por medio de la presente autorizamos al portador trasladar nuestros equipos desde las instalaciones de la empresa hasta el destino marcado previamente.",
    MARGIN, Y, { width: CONTENT_W }
  );
  Y += 24;
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Atte. DIRECCIÓN", MARGIN, Y);
  Y += 18;

  // ── PRODUCTS TABLE ────────────────────────────────────────────────────────
  const COL = {
    producto: MARGIN,
    cantidad: MARGIN + 240,
    desde: MARGIN + 320,
    serie: MARGIN + 400,
  };
  const ROW_H = 18;

  // Table header
  doc.rect(MARGIN, Y, CONTENT_W, ROW_H).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("PRODUCTO", COL.producto + 4, Y + 5, { width: 232 });
  doc.text("CANTIDAD", COL.cantidad + 4, Y + 5, { width: 76 });
  doc.text("DESDE", COL.desde + 4, Y + 5, { width: 76 });
  doc.text("NÚMERO DE LOTE/SERIE", COL.serie + 4, Y + 5, { width: 128 });
  Y += ROW_H;

  // Expand products: one row per serial number (or one row if no serials)
  let rowIndex = 0;
  for (const p of products) {
    const rows = p.serialNumbers.length > 0 ? p.serialNumbers : ["—"];
    for (const serial of rows) {
      if (rowIndex % 2 === 0) doc.rect(MARGIN, Y, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(7.5).font("Helvetica").fillColor("#111827");
      doc.text(p.name, COL.producto + 4, Y + 5, { width: 232, lineBreak: false, ellipsis: true });
      doc.text(`${p.quantity.toFixed(2)} ${p.unitOfMeasure}`, COL.cantidad + 4, Y + 5, { width: 76 });
      doc.text(p.desde, COL.desde + 4, Y + 5, { width: 76 });
      doc.font("Helvetica-Bold").text(serial, COL.serie + 4, Y + 5, { width: 128, lineBreak: false, ellipsis: true });
      Y += ROW_H;
      rowIndex++;

      if (Y > 680) {
        doc.addPage();
        Y = 40;
      }
    }
  }

  Y += 22;

  // ── SIGNATURE BOXES ───────────────────────────────────────────────────────
  if (Y > 630) { doc.addPage(); Y = 40; }

  const SIG_W = CONTENT_W / 4 - 6;
  const SIG_H = 80;
  const sigBoxes = ["DEPTO. DE SEGURIDAD", "EMBARQUES", "FACTURACIÓN", "TRANSPORTACIÓN"];

  sigBoxes.forEach((label, i) => {
    const bx = MARGIN + i * (SIG_W + 8);
    doc.rect(bx, Y, SIG_W, SIG_H).stroke(mediumColor);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(label, bx + 4, Y + 5, { width: SIG_W - 8 });
    // Signature line
    doc.moveTo(bx + 4, Y + 45).lineTo(bx + SIG_W - 4, Y + 45).stroke("#9ca3af");
    doc.fontSize(6.5).font("Helvetica").fillColor("#6b7280");
    doc.text("FIRMA", bx + 4, Y + 47, { width: SIG_W - 8 });
    // Date line
    doc.moveTo(bx + 4, Y + 68).lineTo(bx + SIG_W - 4, Y + 68).stroke("#9ca3af");
    doc.text("FECHA", bx + 4, Y + 70, { width: SIG_W - 8 });
  });

  Y += SIG_H + 20;

  // ── RECEIPT LINE ─────────────────────────────────────────────────────────
  if (Y > 710) { doc.addPage(); Y = 40; }
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Yo ", MARGIN, Y, { continued: true });
  doc.text("___________________________________", { continued: true });
  doc.text(" firmo de que he recibido completa la mercancía arriba descrita.", { continued: false });
  Y += 22;
  doc.text("Fecha ___/___/______", MARGIN, Y);
  doc.moveTo(PAGE_W - MARGIN - 160, Y).lineTo(PAGE_W - MARGIN, Y).stroke("#374151");
  doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
  doc.text("FIRMA DE RECIBIDO POR PARTE DEL CLIENTE", PAGE_W - MARGIN - 160, Y + 4, { width: 160, align: "right" });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  const footerParts: string[] = [];
  if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
  if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
  if (tenant?.phone) footerParts.push(tenant.phone);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
  doc.text(footerParts.join("   |   "), MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" });
  doc.text("Página: 1 / 1", MARGIN, FOOTER_Y + 20, { width: CONTENT_W, align: "center" });

  doc.end();
  return doc as unknown as Readable;
}
