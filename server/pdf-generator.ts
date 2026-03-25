import PDFDocument from "pdfkit";
import { Checkin, Customer, User } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { localStorageService } from "./localStorage";
import sharp from "sharp";
import pLimit from "p-limit";
import { Readable } from "stream";

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

interface MinuteData {
  checkin: Checkin;
  customer: Customer;
  user: User;
  checkoutNotes?: string;
  tenant?: TenantBranding | null;
}

const MAX_PHOTOS_PER_PDF = 6;
const MAX_PHOTO_WIDTH = 1280;
const PHOTO_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function useLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === "true" ||
    (process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR);
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient =
        error.code === "ETIMEDOUT" ||
        error.status >= 500 ||
        error.message?.includes("timeout");
      if (!isTransient || attempt === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }
  throw new Error("Max retries exceeded");
}

async function downloadAndResizePhoto(
  photoEntityId: string,
  objectStorageService: ObjectStorageService | null
): Promise<Buffer | null> {
  try {
    if (useLocalStorage()) {
      const extensions = ["", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
      let photoBuffer: Buffer | null = null;
      for (const ext of extensions) {
        photoBuffer = await localStorageService.getFile(`photos/${photoEntityId}${ext}`);
        if (photoBuffer) break;
      }
      if (!photoBuffer) return null;
      return await sharp(photoBuffer)
        .resize(MAX_PHOTO_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
    return await retryWithBackoff(async () => {
      const photoFile = await objectStorageService!.getObjectEntityFile(photoEntityId);
      const [photoBuffer] = await photoFile.download();
      return await sharp(photoBuffer)
        .resize(MAX_PHOTO_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    });
  } catch (error) {
    console.error(`Failed to download/resize photo ${photoEntityId}:`, error);
    return null;
  }
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
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

function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function generateMinutePDFStream(data: MinuteData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { checkin, customer, user, tenant } = data;

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  (async () => {
    try {
      // ═══════════════════════════════════════════════
      // HEADER BAND
      // ═══════════════════════════════════════════════
      const HEADER_H = 90;
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

      let logoRightEdge = MARGIN;
      if (logoBuffer) {
        try {
          const logoMaxW = 140;
          const logoMaxH = 65;
          doc.image(logoBuffer, MARGIN, (HEADER_H - logoMaxH) / 2, {
            fit: [logoMaxW, logoMaxH] as [number, number],
          });
          logoRightEdge = MARGIN + logoMaxW + 12;
        } catch { /* fallback */ }
      }

      const nameX = logoBuffer ? logoRightEdge : MARGIN;
      const nameW = PAGE_W - nameX - MARGIN;

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(companyName.toUpperCase(), nameX, 16, { width: nameW, align: logoBuffer ? "left" : "right" });

      const infoLines: string[] = [];
      if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
      const addrParts = [
        tenant?.address,
        [tenant?.city, tenant?.state].filter(Boolean).join(", "),
        tenant?.zipCode ? `C.P. ${tenant.zipCode}` : "",
      ].filter(Boolean);
      if (addrParts.length) infoLines.push(addrParts.join(" | "));
      const contactParts = [
        tenant?.phone ? `Tel: ${tenant.phone}` : "",
        tenant?.email || "",
      ].filter(Boolean);
      if (contactParts.length) infoLines.push(contactParts.join("  |  "));
      if (tenant?.website) infoLines.push(tenant.website);

      doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.88)");
      let infoY = 36;
      for (const line of infoLines) {
        doc.text(line, nameX, infoY, { width: nameW, align: logoBuffer ? "left" : "right" });
        infoY += 10;
      }

      // ═══════════════════════════════════════════════
      // DOCUMENT TITLE BAND
      // ═══════════════════════════════════════════════
      const TITLE_BAND_Y = HEADER_H;
      const TITLE_BAND_H = 32;
      doc.rect(0, TITLE_BAND_Y, PAGE_W, TITLE_BAND_H).fill(mediumColor);

      doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("MINUTA DE VISITA A CLIENTE", MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2 });

      // Visit date on right
      const visitDate = formatDateTime(checkin.checkinAt);
      doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
      doc.text(visitDate, MARGIN + CONTENT_W / 2, TITLE_BAND_Y + 11, { width: CONTENT_W / 2, align: "right" });

      let currentY = TITLE_BAND_Y + TITLE_BAND_H + 18;

      // ═══════════════════════════════════════════════
      // INFO BOXES: Customer + Visit Details (2 columns)
      // ═══════════════════════════════════════════════
      const COL_W = CONTENT_W / 2 - 8;
      const COL2_X = MARGIN + COL_W + 16;
      const BOX_H = 100;

      doc.rect(MARGIN,  currentY, COL_W, BOX_H).fill(lightColor);
      doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
      doc.rect(MARGIN,  currentY, COL_W, 16).fill(mediumColor);
      doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);

      doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("INFORMACIÓN DEL CLIENTE", MARGIN + 6, currentY + 4, { width: COL_W - 10 });
      doc.text("DATOS DE LA VISITA",       COL2_X + 6, currentY + 4, { width: COL_W - 10 });

      // Customer info
      let leftY = currentY + 22;
      const customerRows: [string, string][] = [
        ["Cliente:", customer.name],
        ...(customer.rfc ? [["RFC:", customer.rfc] as [string, string]] : []),
        ...(customer.contactName ? [["Contacto:", customer.contactName] as [string, string]] : []),
        ...(customer.phone ? [["Teléfono:", customer.phone] as [string, string]] : []),
      ];
      if (customer.address) {
        const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
        customerRows.push(["Dirección:", addr]);
      }

      doc.fontSize(8).fillColor("#333");
      for (const [label, value] of customerRows) {
        doc.font("Helvetica-Bold").fillColor("#555").text(label, MARGIN + 6, leftY, { continued: true, width: 60 });
        doc.font("Helvetica").fillColor("#222").text(value, { width: COL_W - 70 });
        leftY += 12;
      }

      // Visit info
      let rightY = currentY + 22;
      const visitRows: [string, string][] = [
        ["Vendedor:", user.fullName],
        ["Check-in:", formatDateTime(checkin.checkinAt)],
        ...(checkin.checkoutAt ? [["Check-out:", formatDateTime(checkin.checkoutAt)] as [string, string]] : []),
      ];
      if (checkin.latitude && checkin.longitude) {
        visitRows.push(["Ubicación:", `${Number(checkin.latitude).toFixed(4)}, ${Number(checkin.longitude).toFixed(4)}`]);
      }

      for (const [label, value] of visitRows) {
        doc.font("Helvetica-Bold").fillColor("#555").text(label, COL2_X + 6, rightY, { continued: true, width: 65 });
        doc.font("Helvetica").fillColor("#222").text(value, { width: COL_W - 75 });
        rightY += 12;
      }

      currentY += BOX_H + 18;

      // ═══════════════════════════════════════════════
      // SECTION: Topics Discussed
      // ═══════════════════════════════════════════════
      if (checkin.topics && checkin.topics.length > 0) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("TEMAS TRATADOS", MARGIN + 6, currentY + 4);
        currentY += 16;

        const topicsH = checkin.topics.length * 14 + 12;
        doc.rect(MARGIN, currentY, CONTENT_W, topicsH).fill(lightColor);

        let topicY = currentY + 6;
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        checkin.topics.forEach((topic, idx) => {
          doc.text(`${idx + 1}.  ${topic}`, MARGIN + 10, topicY, { width: CONTENT_W - 20 });
          topicY += 14;
        });

        currentY += topicsH + 14;
      }

      // ═══════════════════════════════════════════════
      // SECTION: Notes
      // ═══════════════════════════════════════════════
      if (checkin.notes) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("NOTAS Y OBSERVACIONES", MARGIN + 6, currentY + 4);
        currentY += 16;

        const textHeight = Math.max(40, doc.heightOfString(checkin.notes, { width: CONTENT_W - 16 }) + 16);
        doc.rect(MARGIN, currentY, CONTENT_W, textHeight).fill(lightColor);
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        doc.text(checkin.notes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16, align: "justify" });
        currentY += textHeight + 14;
      }

      // ═══════════════════════════════════════════════
      // SECTION: Agreements / Checkout Notes
      // ═══════════════════════════════════════════════
      if (data.checkoutNotes) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text("ACUERDOS Y COMPROMISOS", MARGIN + 6, currentY + 4);
        currentY += 16;

        const textHeight = Math.max(40, doc.heightOfString(data.checkoutNotes, { width: CONTENT_W - 16 }) + 16);
        doc.rect(MARGIN, currentY, CONTENT_W, textHeight).fill(lightColor);
        doc.fontSize(8.5).font("Helvetica").fillColor("#333");
        doc.text(data.checkoutNotes, MARGIN + 8, currentY + 8, { width: CONTENT_W - 16, align: "justify" });
        currentY += textHeight + 14;
      }

      // ═══════════════════════════════════════════════
      // SECTION: Photos
      // ═══════════════════════════════════════════════
      if (checkin.photos && checkin.photos.length > 0) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(
          `FOTOGRAFÍAS DE LA VISITA${checkin.photos.length > MAX_PHOTOS_PER_PDF ? ` (mostrando ${MAX_PHOTOS_PER_PDF} de ${checkin.photos.length})` : ""}`,
          MARGIN + 6, currentY + 4
        );
        currentY += 20;

        const objectStorageService = useLocalStorage() ? null : new ObjectStorageService();
        const photosToProcess = checkin.photos.slice(0, MAX_PHOTOS_PER_PDF);

        const limit = pLimit(PHOTO_CONCURRENCY);
        const photoBuffers = await Promise.all(
          photosToProcess.map((id) => limit(() => downloadAndResizePhoto(id, objectStorageService)))
        );

        // 2-column photo grid
        const PHOTO_COL_W = (CONTENT_W - 10) / 2;
        const PHOTO_MAX_H = 170;

        for (let i = 0; i < photoBuffers.length; i += 2) {
          // Check if we need a new page
          if (currentY + PHOTO_MAX_H + 10 > PAGE_H - 60) {
            doc.addPage({ size: "LETTER", margin: 0 });
            currentY = 20;
          }

          const leftBuf = photoBuffers[i];
          const rightBuf = photoBuffers[i + 1];

          const photoY = currentY;

          if (leftBuf) {
            doc.image(leftBuf, MARGIN, photoY, { fit: [PHOTO_COL_W, PHOTO_MAX_H] as [number, number] });
          } else {
            doc.rect(MARGIN, photoY, PHOTO_COL_W, PHOTO_MAX_H).fill("#f0f0f0");
            doc.fontSize(8).fillColor("#999").text("[Foto no disponible]", MARGIN, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }

          if (rightBuf) {
            doc.image(rightBuf, MARGIN + PHOTO_COL_W + 10, photoY, { fit: [PHOTO_COL_W, PHOTO_MAX_H] as [number, number] });
          } else if (i + 1 < photosToProcess.length) {
            doc.rect(MARGIN + PHOTO_COL_W + 10, photoY, PHOTO_COL_W, PHOTO_MAX_H).fill("#f0f0f0");
            doc.fontSize(8).fillColor("#999").text("[Foto no disponible]", MARGIN + PHOTO_COL_W + 10, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }

          currentY += PHOTO_MAX_H + 10;
        }
      }

      // ═══════════════════════════════════════════════
      // SIGNATURE AREA
      // ═══════════════════════════════════════════════
      if (currentY + 80 > PAGE_H - 60) {
        doc.addPage({ size: "LETTER", margin: 0 });
        currentY = 20;
      }

      currentY += 20;
      const SIG_W = (CONTENT_W / 2) - 20;
      const SIG_X2 = MARGIN + CONTENT_W / 2 + 20;
      const SIG_LINE_Y = currentY + 50;

      // Signature lines
      doc.moveTo(MARGIN, SIG_LINE_Y).lineTo(MARGIN + SIG_W, SIG_LINE_Y).stroke(mediumColor);
      doc.moveTo(SIG_X2, SIG_LINE_Y).lineTo(SIG_X2 + SIG_W, SIG_LINE_Y).stroke(mediumColor);

      doc.fontSize(8).font("Helvetica").fillColor("#666");
      doc.text("Firma del Vendedor", MARGIN, SIG_LINE_Y + 4, { width: SIG_W, align: "center" });
      doc.text(user.fullName, MARGIN, SIG_LINE_Y + 14, { width: SIG_W, align: "center" });

      doc.text("Firma del Cliente / Representante", SIG_X2, SIG_LINE_Y + 4, { width: SIG_W, align: "center" });
      doc.text(customer.contactName || customer.name, SIG_X2, SIG_LINE_Y + 14, { width: SIG_W, align: "center" });

      // ═══════════════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════════════
      const FOOTER_Y = PAGE_H - 42;
      doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);

      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
      doc.text("Documento generado automáticamente. Válido como constancia de visita comercial.", MARGIN, FOOTER_Y + 6, { width: 260 });
      doc.text(`Generado el ${formatDateTime(new Date())}`, MARGIN, FOOTER_Y + 16, { width: 260 });

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
      console.error("Error generating PDF content:", error);
      doc.end();
    }
  })();

  return doc as unknown as Readable;
}
