import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { localStorageService } from "./localStorage";
import { formatPdfDate, formatPdfNumber, pdfText, resolvePdfLanguage } from "./pdf-locale";

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
  locale?: string | null;
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
  invoiceNumber?: string | null;
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

function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `#${Math.min(255, r + Math.round((255 - r) * amount)).toString(16).padStart(2, "0")}${Math.min(255, g + Math.round((255 - g) * amount)).toString(16).padStart(2, "0")}${Math.min(255, b + Math.round((255 - b) * amount)).toString(16).padStart(2, "0")}`;
}

export async function generateShipmentRemisionPDF(data: ShipmentRemisionData): Promise<Readable> {
  const { tenant, products } = data;
  const language = resolvePdfLanguage(tenant);
  const t = <T>(values: { es: T; en: T }) => pdfText(language, values);
  const fmtDate = (date: string | Date | null | undefined) => formatPdfDate(date, language, tenant?.timezone);
  const orderStatus = (status: string) => ({
    pending: t({ es: "Pendiente", en: "Pending" }),
    in_production: t({ es: "En producción", en: "In Production" }),
    ready: t({ es: "Listo", en: "Ready" }),
    partially_released: t({ es: "Parcialmente liberado", en: "Partially Released" }),
    released: t({ es: "Liberado", en: "Released" }),
    shipped: t({ es: "Enviado", en: "Shipped" }),
    delivered: t({ es: "Entregado", en: "Delivered" }),
    closed: t({ es: "Cerrado", en: "Closed" }),
    cancelled: t({ es: "Cancelada", en: "Cancelled" }),
  }[status] ?? status);
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || t({ es: "Empresa", en: "Company" });
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
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `${t({ es: "C.P.", en: "ZIP" })} ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  if (tenant?.phone) infoLines.push(`${t({ es: "Tel", en: "Phone" })}: ${tenant.phone}`);
  if (tenant?.email) infoLines.push(tenant.email);

  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 34 + i * 10.5, { width: TEXT_W, align: "right", lineBreak: false }));

  // ── TITLE BAND ──────────────────────────────────────────────────────────
  const TITLE_Y = HEADER_H;
  const TITLE_H = 30;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(t({ es: "REMISIÓN DE SALIDA", en: "OUTBOUND DELIVERY NOTE" }), MARGIN, TITLE_Y + 7, { width: CONTENT_W * 0.6 });
  doc.fontSize(8.5).font("Helvetica").fillColor(primaryColor);
  doc.text(`${t({ es: "Fecha", en: "Date" })}: ${fmtDate(now)}`, MARGIN + CONTENT_W * 0.6, TITLE_Y + 10, { width: CONTENT_W * 0.4, align: "right" });

  let Y = TITLE_Y + TITLE_H + 14;

  // ── FOLIO + ORDER INFO ───────────────────────────────────────────────────
  // Big title: show invoice number when present, otherwise order folio
  doc.fontSize(18).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(data.invoiceNumber || data.folio, MARGIN, Y);
  Y += 28;

  const INFO_COL = CONTENT_W / 3;
  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text(`${t({ es: "Orden", en: "Order" })}:`, MARGIN, Y);
  doc.text(`${t({ es: "Estado", en: "Status" })}:`, MARGIN + INFO_COL, Y);
  doc.text(`${t({ es: "Fecha programada", en: "Scheduled date" })}:`, MARGIN + INFO_COL * 2, Y);
  Y += 11;
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111827");
  doc.text(data.folio, MARGIN, Y);
  doc.text(orderStatus(data.orderStatus), MARGIN + INFO_COL, Y);
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
  doc.text(t({ es: "CLIENTE / DESTINATARIO", en: "CUSTOMER / RECIPIENT" }), MARGIN + 6, Y + 4, { width: BOX_W - 12 });
  if (data.customerAddress) {
    doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
    doc.text(data.customerAddress, MARGIN + 6, Y + 20, { width: BOX_W - 12, lineBreak: false, ellipsis: true });
  }

  // Transport box
  doc.rect(BOX2_X, Y, BOX_W, BOX_H).fill(lightColor);
  doc.rect(BOX2_X, Y, BOX_W, 15).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text(t({ es: "DATOS DE TRANSPORTE", en: "TRANSPORT DETAILS" }), BOX2_X + 6, Y + 4, { width: BOX_W - 12 });

  const transportLines = [
    { label: `${t({ es: "Transportista", en: "Carrier" })}:`, value: data.transporter },
    { label: `${t({ es: "Tipo", en: "Type" })}:`, value: data.transportType === "propio" ? t({ es: "Transporte Propio", en: "Company Transport" }) : t({ es: "Paquetería", en: "Courier" }) },
    { label: `${t({ es: "Chofer", en: "Driver" })}:`, value: data.driverName || "—" },
    { label: `${t({ es: "Placas", en: "License plates" })}:`, value: data.vehiclePlates || "—" },
  ];
  doc.fontSize(7.5).font("Helvetica").fillColor("#374151");
  transportLines.forEach((row, i) => {
    doc.font("Helvetica-Bold").text(row.label, BOX2_X + 6, Y + 20 + i * 11, { width: 65, continued: false });
    doc.font("Helvetica").text(row.value, BOX2_X + 74, Y + 20 + i * 11, { width: BOX_W - 80, lineBreak: false, ellipsis: true });
  });

  Y += BOX_H + 14;

  // ── AUTHORIZATION TEXT ──────────────────────────────────────────────────
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(`${t({ es: "Nombre", en: "Name" })}: _______________________________________________`, MARGIN, Y);
  Y += 16;
  doc.text(t({ es: "A quien corresponda:", en: "To whom it may concern:" }), MARGIN, Y);
  Y += 12;
  doc.fontSize(8).font("Helvetica-Oblique").fillColor("#4b5563");
  doc.text(
    t({ es: "Por medio de la presente autorizamos al portador trasladar nuestros equipos desde las instalaciones de la empresa hasta el destino marcado previamente.", en: "We hereby authorize the bearer to transport our equipment from the company's facilities to the destination previously indicated." }),
    MARGIN, Y, { width: CONTENT_W }
  );
  Y += 24;
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(t({ es: "Atte. DIRECCIÓN", en: "Sincerely, MANAGEMENT" }), MARGIN, Y);
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
  doc.text(t({ es: "PRODUCTO", en: "PRODUCT" }), COL.producto + 4, Y + 5, { width: 232 });
  doc.text(t({ es: "CANTIDAD", en: "QUANTITY" }), COL.cantidad + 4, Y + 5, { width: 76 });
  doc.text(t({ es: "DESDE", en: "FROM" }), COL.desde + 4, Y + 5, { width: 76 });
  doc.text(t({ es: "NÚMERO DE LOTE/SERIE", en: "LOT/SERIAL NUMBER" }), COL.serie + 4, Y + 5, { width: 128 });
  Y += ROW_H;

  // Expand products: one row per serial number (or one row if no serials)
  // When multiple serials exist each one represents 1 unit, so show 1.00 per row
  let rowIndex = 0;
  for (const p of products) {
    const rows = p.serialNumbers.length > 0 ? p.serialNumbers : ["—"];
    const qtyPerRow = p.serialNumbers.length > 1 ? 1 : p.quantity;
    for (const serial of rows) {
      if (rowIndex % 2 === 0) doc.rect(MARGIN, Y, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(7.5).font("Helvetica").fillColor("#111827");
      doc.text(p.name, COL.producto + 4, Y + 5, { width: 232, lineBreak: false, ellipsis: true });
       doc.text(`${formatPdfNumber(qtyPerRow, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.unitOfMeasure}`, COL.cantidad + 4, Y + 5, { width: 76 });
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
  const sigBoxes = t({ es: ["DEPTO. DE SEGURIDAD", "EMBARQUES", "FACTURACIÓN", "TRANSPORTACIÓN"], en: ["SECURITY DEPT.", "SHIPPING", "BILLING", "TRANSPORTATION"] });

  sigBoxes.forEach((label, i) => {
    const bx = MARGIN + i * (SIG_W + 8);
    doc.rect(bx, Y, SIG_W, SIG_H).stroke(mediumColor);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(label, bx + 4, Y + 5, { width: SIG_W - 8 });
    // Signature line
    doc.moveTo(bx + 4, Y + 45).lineTo(bx + SIG_W - 4, Y + 45).stroke("#9ca3af");
    doc.fontSize(6.5).font("Helvetica").fillColor("#6b7280");
     doc.text(t({ es: "FIRMA", en: "SIGNATURE" }), bx + 4, Y + 47, { width: SIG_W - 8 });
    // Date line
    doc.moveTo(bx + 4, Y + 68).lineTo(bx + SIG_W - 4, Y + 68).stroke("#9ca3af");
     doc.text(t({ es: "FECHA", en: "DATE" }), bx + 4, Y + 70, { width: SIG_W - 8 });
  });

  Y += SIG_H + 20;

  // ── RECEIPT LINE ─────────────────────────────────────────────────────────
  if (Y > 710) { doc.addPage(); Y = 40; }
  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(t({ es: "Yo ", en: "I, " }), MARGIN, Y, { continued: true });
  doc.text("___________________________________", { continued: true });
  doc.text(t({ es: " firmo de que he recibido completa la mercancía arriba descrita.", en: " confirm that I have received all of the merchandise described above." }), { continued: false });
  Y += 22;
  doc.text(t({ es: "Fecha ___/___/______", en: "Date ___/___/______" }), MARGIN, Y);
  doc.moveTo(PAGE_W - MARGIN - 160, Y).lineTo(PAGE_W - MARGIN, Y).stroke("#374151");
  doc.fontSize(7).font("Helvetica").fillColor("#6b7280");
  doc.text(t({ es: "FIRMA DE RECIBIDO POR PARTE DEL CLIENTE", en: "CUSTOMER RECEIPT SIGNATURE" }), PAGE_W - MARGIN - 160, Y + 4, { width: 160, align: "right" });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  const footerParts: string[] = [];
  if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
   if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
  if (tenant?.phone) footerParts.push(tenant.phone);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
  doc.text(footerParts.join("   |   "), MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" });
   doc.text(t({ es: "Página: 1 / 1", en: "Page: 1 / 1" }), MARGIN, FOOTER_Y + 20, { width: CONTENT_W, align: "center" });

  doc.end();
  return doc as unknown as Readable;
}
