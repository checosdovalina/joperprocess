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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient =
        error.code === "ETIMEDOUT" ||
        error.status >= 500 ||
        error.message?.includes("timeout");

      if (!isTransient || attempt === retries - 1) {
        throw error;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

async function downloadAndResizePhoto(
  photoEntityId: string,
  objectStorageService: ObjectStorageService | null
): Promise<Buffer | null> {
  try {
    // For local storage, read from filesystem
    if (useLocalStorage()) {
      // Try to find the file with various extensions
      const extensions = ['', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
      let photoBuffer: Buffer | null = null;
      
      for (const ext of extensions) {
        const filePath = `photos/${photoEntityId}${ext}`;
        photoBuffer = await localStorageService.getFile(filePath);
        if (photoBuffer) break;
      }
      
      if (!photoBuffer) {
        console.error(`Local photo not found: ${photoEntityId}`);
        return null;
      }
      
      const resizedPhoto = await sharp(photoBuffer)
        .resize(MAX_PHOTO_WIDTH, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      return resizedPhoto;
    }
    
    // For GCS storage
    return await retryWithBackoff(async () => {
      const photoFile = await objectStorageService!.getObjectEntityFile(
        photoEntityId
      );
      const [photoBuffer] = await photoFile.download();

      const resizedPhoto = await sharp(photoBuffer)
        .resize(MAX_PHOTO_WIDTH, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return resizedPhoto;
    });
  } catch (error) {
    console.error(`Failed to download/resize photo ${photoEntityId}:`, error);
    return null;
  }
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  
  try {
    if (logoUrl.startsWith('logos/')) {
      const buffer = await localStorageService.getFile(logoUrl);
      return buffer;
    }
    return null;
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
}

export async function generateMinutePDFStream(data: MinuteData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const { checkin, customer, user, tenant } = data;

  // Load logo if available
  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";

  // Start async content generation
  (async () => {
    try {
      // Header with company logo or name
      const headerStartY = doc.y;
      
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, headerStartY, { 
            width: 100,
            height: 50,
            fit: [100, 50] as [number, number]
          });
          doc.y = headerStartY;
          doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .fillColor(primaryColor)
            .text(companyName.toUpperCase(), 160, headerStartY + 10, { 
              width: 400,
              align: "right" 
            });
          doc.y = headerStartY + 60;
        } catch (logoError) {
          console.error('Error rendering logo in minute PDF:', logoError);
          doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .fillColor(primaryColor)
            .text(companyName.toUpperCase(), { align: "center" })
            .moveDown(0.5);
        }
      } else {
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .fillColor(primaryColor)
          .text(companyName.toUpperCase(), { align: "center" })
          .moveDown(0.5);
      }

      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#2d3748")
        .text("Minuta de Visita a Cliente", { align: "center" })
        .moveDown(1.5);

      // Visit Information
      doc.fontSize(12).font("Helvetica-Bold").text("Información de la Visita");
      doc.fontSize(10).font("Helvetica").moveDown(0.3);

      doc.text(`Fecha: ${new Date(checkin.checkinAt).toLocaleString("es-MX")}`, {
        continued: false,
      });
      doc.text(`Vendedor: ${user.fullName} (${user.username})`, {
        continued: false,
      });
      doc.moveDown(1);

      // Customer Information
      doc.fontSize(12).font("Helvetica-Bold").text("Información del Cliente");
      doc.fontSize(10).font("Helvetica").moveDown(0.3);

      doc.text(`Cliente: ${customer.name}`, { continued: false });
      if (customer.rfc) {
        doc.text(`RFC: ${customer.rfc}`, { continued: false });
      }
      if (customer.contactName) {
        doc.text(`Contacto: ${customer.contactName}`, { continued: false });
      }
      if (customer.phone) {
        doc.text(`Teléfono: ${customer.phone}`, { continued: false });
      }
      if (customer.address) {
        doc.text(
          `Dirección: ${customer.address}, ${customer.city || ""} ${customer.state || ""}`,
          { continued: false }
        );
      }
      doc.moveDown(1);

      // Topics Discussed
      if (checkin.topics && checkin.topics.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Temas Tratados");
        doc.fontSize(10).font("Helvetica").moveDown(0.3);

        checkin.topics.forEach((topic, index) => {
          doc.text(`${index + 1}. ${topic}`, { continued: false });
        });
        doc.moveDown(1);
      }

      // Notes
      if (checkin.notes) {
        doc.fontSize(12).font("Helvetica-Bold").text("Notas y Observaciones");
        doc.fontSize(10).font("Helvetica").moveDown(0.3);
        doc.text(checkin.notes, { align: "justify" });
        doc.moveDown(1);
      }

      // Checkout Notes (Acuerdos y Comentarios)
      if (data.checkoutNotes) {
        doc.fontSize(12).font("Helvetica-Bold").text("Acuerdos y Comentarios");
        doc.fontSize(10).font("Helvetica").moveDown(0.3);
        doc.text(data.checkoutNotes, { align: "justify" });
        doc.moveDown(1);
      }

      // Photos (limit to MAX_PHOTOS_PER_PDF)
      if (checkin.photos && checkin.photos.length > 0) {
        doc.fontSize(12).font("Helvetica-Bold").text("Fotografías");
        doc.moveDown(0.5);

        // Only create ObjectStorageService when using GCS
        const objectStorageService = useLocalStorage() ? null : new ObjectStorageService();
        const photosToProcess = checkin.photos.slice(0, MAX_PHOTOS_PER_PDF);

        const limit = pLimit(PHOTO_CONCURRENCY);
        const photoPromises = photosToProcess.map((photoEntityId) =>
          limit(() => downloadAndResizePhoto(photoEntityId, objectStorageService))
        );

        const photoBuffers = await Promise.all(photoPromises);

        for (let i = 0; i < photoBuffers.length; i++) {
          const photoBuffer = photoBuffers[i];
          const photoEntityId = photosToProcess[i];

          if (photoBuffer) {
            const pageWidth =
              doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const maxPhotoWidth = pageWidth * 0.8;

            doc.image(photoBuffer, {
              fit: [maxPhotoWidth, 300],
              align: "center",
            });
            doc.moveDown(0.5);
          } else {
            doc
              .fontSize(9)
              .fillColor("#999")
              .text(`[Foto no disponible: ${photoEntityId}]`, {
                align: "center",
              })
              .fillColor("#000");
            doc.moveDown(0.5);
          }
        }

        if (checkin.photos.length > MAX_PHOTOS_PER_PDF) {
          doc
            .fontSize(9)
            .fillColor("#666")
            .text(
              `(${checkin.photos.length - MAX_PHOTOS_PER_PDF} fotos adicionales no incluidas)`,
              { align: "center" }
            )
            .fillColor("#000");
          doc.moveDown(0.5);
        }
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor("#666")
        .text(
          `Documento generado el ${new Date().toLocaleString("es-MX")}`,
          { align: "center" }
        )
        .fillColor("#000");

      // Finalize document
      doc.end();
    } catch (error) {
      console.error("Error generating PDF content:", error);
      doc.end();
    }
  })();

  return doc as unknown as Readable;
}
