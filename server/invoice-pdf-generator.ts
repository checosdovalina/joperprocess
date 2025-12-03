import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Invoice, Customer } from "@shared/schema";

interface InvoicePDFData {
  invoice: Invoice;
  customer: Customer;
}

function formatCurrency(value: string | number, currency: string = "MXN"): string {
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
  });
}

export function generateInvoicePDFStream(data: InvoicePDFData): Readable {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const { invoice, customer } = data;

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
      .text("FACTURA", { align: "center" })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#4a5568")
      .text(`Serie: ${invoice.serie} - Folio: ${invoice.folio}`, { align: "center" })
      .moveDown(1.5);

    if (invoice.cfdiUuid) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#718096")
        .text(`UUID: ${invoice.cfdiUuid}`, { align: "center" })
        .moveDown(1);
    }

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
    if (customer.phone) doc.text(`Teléfono: ${customer.phone}`, leftColumnX);
    if (customer.email) doc.text(`Email: ${customer.email}`, leftColumnX);
    if (customer.address) {
      doc.text(`Dirección: ${customer.address}`, leftColumnX);
      if (customer.city || customer.state) {
        doc.text(`${customer.city || ""}, ${customer.state || ""}`, leftColumnX);
      }
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("DATOS DE LA FACTURA", rightColumnX, currentY);
    
    currentY = doc.y + 10;
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568");

    doc.text(`Fecha Emisión: ${formatDate(invoice.issuedAt)}`, rightColumnX, currentY);
    if (invoice.dueDate) {
      doc.text(`Fecha Vencimiento: ${formatDate(invoice.dueDate)}`, rightColumnX);
    }
    doc.text(`Método de Pago: ${invoice.paymentMethod || "Por definir"}`, rightColumnX);
    doc.text(`Forma de Pago: ${invoice.paymentForm || "Por definir"}`, rightColumnX);

    doc.moveDown(3);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("RESUMEN DE FACTURA", 50);
    doc.moveDown(1);

    const totalsX = 350;
    let totalsY = doc.y;

    doc.fontSize(10).font("Helvetica").fillColor("#4a5568");

    doc.text("Subtotal:", totalsX, totalsY, { width: 100 });
    doc.text(formatCurrency(invoice.subtotal), totalsX + 100, totalsY, { width: 100, align: "right" });
    totalsY += 20;

    doc.text("IVA (16%):", totalsX, totalsY, { width: 100 });
    doc.text(formatCurrency(invoice.tax), totalsX + 100, totalsY, { width: 100, align: "right" });
    totalsY += 20;

    doc
      .moveTo(totalsX, totalsY)
      .lineTo(562, totalsY)
      .stroke("#2d3748");
    totalsY += 10;

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#2d3748");
    doc.text("TOTAL:", totalsX, totalsY, { width: 100 });
    doc.text(formatCurrency(invoice.total), totalsX + 100, totalsY, { width: 100, align: "right" });

    doc.moveDown(4);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#718096")
      .text("Este documento es una representación impresa de un CFDI.", 50, undefined, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleString("es-MX")}`, { align: "center" });

  } catch (error) {
    console.error("Error generating invoice PDF:", error);
  }

  doc.end();

  return doc as unknown as Readable;
}
