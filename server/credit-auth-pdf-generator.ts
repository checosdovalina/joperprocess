import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { CreditAuthorization, Quotation, Customer, User } from "@shared/schema";

interface CreditAuthPDFData {
  authorization: CreditAuthorization;
  quotation: Quotation;
  customer: Customer;
  requestedBy: User;
  approvedBy?: User | null;
}

function formatCurrency(value: string | number | null, currency: string = "MXN"): string {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#d69e2e",
    approved: "#38a169",
    rejected: "#e53e3e",
  };
  return colors[status] || "#4a5568";
}

export function generateCreditAuthPDFStream(data: CreditAuthPDFData): Readable {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const { authorization, quotation, customer, requestedBy, approvedBy } = data;

  try {
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#1a365d")
      .text("GRUPO JOPER", { align: "center" })
      .moveDown(0.3);

    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#4a5568")
      .text("Sistema Comercial", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("AUTORIZACIÓN DE CRÉDITO", { align: "center" })
      .moveDown(0.5);

    const statusColor = getStatusColor(authorization.status);
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(statusColor)
      .text(`Estado: ${getStatusLabel(authorization.status).toUpperCase()}`, { align: "center" })
      .moveDown(1.5);

    const leftColumnX = 50;
    const rightColumnX = 320;
    let currentY = doc.y;

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("DATOS DEL CLIENTE", leftColumnX, currentY);
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568");

    doc.text(`Razón Social: ${customer.name}`, leftColumnX);
    if (customer.rfc) doc.text(`RFC: ${customer.rfc}`, leftColumnX);
    if (customer.contactName) doc.text(`Contacto: ${customer.contactName}`, leftColumnX);
    if (customer.phone) doc.text(`Teléfono: ${customer.phone}`, leftColumnX);
    if (customer.email) doc.text(`Email: ${customer.email}`, leftColumnX);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("DATOS DE LA COTIZACIÓN", rightColumnX, currentY);
    
    currentY = doc.y + 10;
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568")
      .text(`Folio: ${quotation.folio}`, rightColumnX, currentY)
      .text(`Total: ${formatCurrency(quotation.total, quotation.currency)}`, rightColumnX)
      .text(`Fecha: ${formatDate(quotation.createdAt)}`, rightColumnX);

    doc.moveDown(2);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("INFORMACIÓN DE CRÉDITO", leftColumnX)
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568");

    const creditInfoY = doc.y;
    
    doc.rect(leftColumnX, creditInfoY, 500, 80).stroke("#e2e8f0");

    doc.text(`Crédito Disponible: ${formatCurrency(authorization.creditAvailable)}`, leftColumnX + 10, creditInfoY + 10);
    doc.text(`Crédito Utilizado: ${formatCurrency(authorization.creditUsed)}`, leftColumnX + 10);
    doc.text(`Saldo Vencido: ${formatCurrency(authorization.overdueBalance)}`, leftColumnX + 10);
    doc.text(`Monto Solicitado: ${formatCurrency(quotation.total, quotation.currency)}`, leftColumnX + 10);

    doc.y = creditInfoY + 90;

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("SOLICITANTE", leftColumnX)
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568")
      .text(`Nombre: ${requestedBy.fullName}`, leftColumnX)
      .text(`Fecha de Solicitud: ${formatDate(authorization.createdAt)}`, leftColumnX);

    doc.moveDown(1);

    if (authorization.notes) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#2d3748")
        .text("NOTAS", leftColumnX)
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#4a5568")
        .text(authorization.notes, leftColumnX, doc.y, { width: 500 });

      doc.moveDown(1);
    }

    if (authorization.status === "approved" && approvedBy) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#38a169")
        .text("APROBACIÓN", leftColumnX)
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#4a5568")
        .text(`Aprobado por: ${approvedBy.fullName}`, leftColumnX)
        .text(`Fecha de Aprobación: ${formatDate(authorization.authorizedAt)}`, leftColumnX);

      if (authorization.approvalSignature) {
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Firma Digital:", leftColumnX);
        
        try {
          const signatureData = authorization.approvalSignature;
          if (signatureData.startsWith("data:image")) {
            const base64Data = signatureData.split(",")[1];
            const imageBuffer = Buffer.from(base64Data, "base64");
            doc.image(imageBuffer, leftColumnX, doc.y + 5, { width: 200, height: 80 });
            doc.y += 90;
          }
        } catch (e) {
          doc.text("[Firma registrada]", leftColumnX);
        }
      }
    }

    if (authorization.status === "rejected") {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#e53e3e")
        .text("RECHAZO", leftColumnX)
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#4a5568");

      if (authorization.rejectionNotes) {
        doc.text(`Motivo: ${authorization.rejectionNotes}`, leftColumnX, doc.y, { width: 500 });
      }
    }

    doc.moveDown(2);

    const footerY = doc.page.height - 80;
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#a0aec0")
      .text("Este documento fue generado automáticamente por el Sistema Comercial de GRUPO JOPER.", leftColumnX, footerY, { align: "center", width: 500 })
      .text(`Fecha de generación: ${formatDate(new Date())}`, { align: "center", width: 500 });

    doc.end();
  } catch (error) {
    console.error("Error generating credit authorization PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
