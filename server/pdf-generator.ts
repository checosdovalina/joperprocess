import PDFDocument from "pdfkit";
import { Checkin, Customer, User } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { localStorageService } from "./localStorage";
import sharp from "sharp";
import pLimit from "p-limit";
import { Readable } from "stream";
import { formatPdfDateTime, formatPdfNumber, pdfText, resolvePdfLanguage } from "./pdf-locale";

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
    process.env.NODE_ENV !== "production" ||
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
    // /api/logos/filename → logos/filename in local storage
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
    }
    if (logoUrl.startsWith("logos/")) {
      return await localStorageService.getFile(logoUrl);
    }
    // External URL (https://...) — fetch over HTTP
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

export async function generateMinutePDFStream(data: MinuteData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const { checkin, customer, user, tenant } = data;
  const language = resolvePdfLanguage(tenant);
  const text = <T>(values: { es: T; en: T }) => pdfText(language, values);
  const formatDateTime = (value: Date | string | null | undefined) =>
    formatPdfDateTime(value, language, tenant?.timezone);

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || text({ es: "Empresa", en: "Company" });
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

      // Text block: always on the RIGHT side, right-aligned, no wrapping
      const TEXT_X = PAGE_W / 2;
      const TEXT_W = PAGE_W - TEXT_X - MARGIN;

      doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text(companyName.toUpperCase(), TEXT_X, 12, { width: TEXT_W, align: "right", lineBreak: false });

      // Build info lines — split address into street and city/state for readability
      const infoLines: string[] = [];
      if (tenant?.rfc) infoLines.push(`${text({ es: "RFC:", en: "Tax ID:" })} ${tenant.rfc}`);
      if (tenant?.address) {
        tenant.address.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(part => infoLines.push(part));
      }
      const cityStateParts = [
        tenant?.city,
        tenant?.state,
        tenant?.zipCode ? `${text({ es: "C.P.", en: "ZIP" })} ${tenant.zipCode}` : null,
      ].filter(Boolean);
      if (cityStateParts.length) infoLines.push(cityStateParts.join(", "));
      const contactParts = [
        tenant?.phone ? `${text({ es: "Tel:", en: "Phone:" })} ${tenant.phone}` : "",
        tenant?.email || "",
      ].filter(Boolean);
      if (contactParts.length) infoLines.push(contactParts.join("  |  "));
      if (tenant?.website) infoLines.push(tenant.website);

      // Start Y: leave 4px below company name (which is at 12, ~14pt ≈ 19px → ends ~31)
      const LINE_H = 10.5;
      const START_Y = 33;
      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
      infoLines.forEach((line, i) => {
        doc.text(line, TEXT_X, START_Y + i * LINE_H, { width: TEXT_W, align: "right", lineBreak: false });
      });

      // ═══════════════════════════════════════════════
      // DOCUMENT TITLE BAND
      // ═══════════════════════════════════════════════
      const TITLE_BAND_Y = HEADER_H;
      const TITLE_BAND_H = 32;
      doc.rect(0, TITLE_BAND_Y, PAGE_W, TITLE_BAND_H).fill(mediumColor);

      doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text(text({ es: "MINUTA DE VISITA A CLIENTE", en: "CUSTOMER VISIT MINUTES" }), MARGIN, TITLE_BAND_Y + 8, { width: CONTENT_W / 2 });

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
      doc.text(text({ es: "INFORMACIÓN DEL CLIENTE", en: "CUSTOMER INFORMATION" }), MARGIN + 6, currentY + 4, { width: COL_W - 10 });
      doc.text(text({ es: "DATOS DE LA VISITA", en: "VISIT DETAILS" }), COL2_X + 6, currentY + 4, { width: COL_W - 10 });

      // Customer info
      let leftY = currentY + 22;
      const customerRows: [string, string][] = [
        [text({ es: "Cliente:", en: "Customer:" }), customer.name],
        ...(customer.rfc ? [[text({ es: "RFC:", en: "Tax ID:" }), customer.rfc] as [string, string]] : []),
        ...(customer.contactName ? [[text({ es: "Contacto:", en: "Contact:" }), customer.contactName] as [string, string]] : []),
        ...(customer.phone ? [[text({ es: "Teléfono:", en: "Phone:" }), customer.phone] as [string, string]] : []),
      ];
      if (customer.address) {
        const addr = [customer.address, customer.city, customer.state].filter(Boolean).join(", ");
        customerRows.push([text({ es: "Dirección:", en: "Address:" }), addr]);
      }

      const LABEL_W = 64;
      const VALUE_X_L = MARGIN + 6 + LABEL_W;
      const VALUE_W_L = COL_W - LABEL_W - 10;
      doc.fontSize(8);
      for (const [label, value] of customerRows) {
        // Measure the wrapped height of the value text so long names don't overlap the next row
        const lineH = doc.font("Helvetica").heightOfString(value, { width: VALUE_W_L });
        const rowH = Math.max(lineH, 10);
        doc.font("Helvetica-Bold").fillColor("#555555").text(label, MARGIN + 6, leftY, { width: LABEL_W, lineBreak: false });
        doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_L, leftY, { width: VALUE_W_L });
        leftY += rowH + 2;
      }

      // Visit info
      let rightY = currentY + 22;
      const visitRows: [string, string][] = [
        [text({ es: "Vendedor:", en: "Salesperson:" }), user.fullName],
        ["Check-in:", formatDateTime(checkin.checkinAt)],
        ...(checkin.checkoutAt ? [["Check-out:", formatDateTime(checkin.checkoutAt)] as [string, string]] : []),
      ];
      if (checkin.latitude && checkin.longitude) {
        visitRows.push([
          text({ es: "Ubicación:", en: "Location:" }),
          `${formatPdfNumber(Number(checkin.latitude), language, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}, ${formatPdfNumber(Number(checkin.longitude), language, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`,
        ]);
      }

      const VALUE_X_R = COL2_X + 6 + LABEL_W;
      const VALUE_W_R = COL_W - LABEL_W - 10;
      for (const [label, value] of visitRows) {
        doc.font("Helvetica-Bold").fillColor("#555555").text(label, COL2_X + 6, rightY, { width: LABEL_W, lineBreak: false });
        doc.font("Helvetica").fillColor("#222222").text(value, VALUE_X_R, rightY, { width: VALUE_W_R, lineBreak: false });
        rightY += 12;
      }

      currentY += BOX_H + 18;

      // ═══════════════════════════════════════════════
      // SECTION: Topics Discussed
      // ═══════════════════════════════════════════════
      if (checkin.topics && checkin.topics.length > 0) {
        doc.rect(MARGIN, currentY, CONTENT_W, 16).fill(mediumColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
        doc.text(text({ es: "TEMAS TRATADOS", en: "TOPICS DISCUSSED" }), MARGIN + 6, currentY + 4);
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
        doc.text(text({ es: "NOTAS Y OBSERVACIONES", en: "NOTES AND OBSERVATIONS" }), MARGIN + 6, currentY + 4);
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
        doc.text(text({ es: "ACUERDOS Y COMPROMISOS", en: "AGREEMENTS AND COMMITMENTS" }), MARGIN + 6, currentY + 4);
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
          text({
            es: `FOTOGRAFÍAS DE LA VISITA${checkin.photos.length > MAX_PHOTOS_PER_PDF ? ` (mostrando ${MAX_PHOTOS_PER_PDF} de ${checkin.photos.length})` : ""}`,
            en: `VISIT PHOTOS${checkin.photos.length > MAX_PHOTOS_PER_PDF ? ` (showing ${MAX_PHOTOS_PER_PDF} of ${checkin.photos.length})` : ""}`,
          }),
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
            doc.fontSize(8).fillColor("#999").text(text({ es: "[Foto no disponible]", en: "[Photo unavailable]" }), MARGIN, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }

          if (rightBuf) {
            doc.image(rightBuf, MARGIN + PHOTO_COL_W + 10, photoY, { fit: [PHOTO_COL_W, PHOTO_MAX_H] as [number, number] });
          } else if (i + 1 < photosToProcess.length) {
            doc.rect(MARGIN + PHOTO_COL_W + 10, photoY, PHOTO_COL_W, PHOTO_MAX_H).fill("#f0f0f0");
            doc.fontSize(8).fillColor("#999").text(text({ es: "[Foto no disponible]", en: "[Photo unavailable]" }), MARGIN + PHOTO_COL_W + 10, photoY + PHOTO_MAX_H / 2 - 5, { width: PHOTO_COL_W, align: "center" });
          }

          currentY += PHOTO_MAX_H + 10;
        }
      }

      // ═══════════════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════════════
      const FOOTER_Y = PAGE_H - 42;
      doc.rect(0, FOOTER_Y, PAGE_W, 42).fill(primaryColor);

      doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.80)");
      doc.text(text({ es: "Documento generado automáticamente. Válido como constancia de visita comercial.", en: "Automatically generated document. Valid as proof of commercial visit." }), MARGIN, FOOTER_Y + 6, { width: 260 });
      doc.text(text({ es: "Generado el ", en: "Generated on " }) + formatDateTime(new Date()), MARGIN, FOOTER_Y + 16, { width: 260 });

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
      console.error("Error generating PDF content:", error);
      doc.end();
    }
  })();

  return doc as unknown as Readable;
}
