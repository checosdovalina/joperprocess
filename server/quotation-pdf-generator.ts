import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quotation, QuotationItem, Customer, User } from "@shared/schema";

interface QuotationPDFData {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Customer;
  user: User;
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  contado: "Contado",
  "15_dias": "15 días",
  "30_dias": "30 días",
  "45_dias": "45 días",
  "60_dias": "60 días",
};

const DELIVERY_TIME_LABELS: Record<string, string> = {
  inmediato: "Inmediato",
  "1_semana": "1 semana",
  "2_semanas": "2 semanas",
  "3_semanas": "3 semanas",
  "1_mes": "1 mes",
  por_confirmar: "Por confirmar",
};

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

export function generateQuotationPDFStream(data: QuotationPDFData): Readable {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const { quotation, items, customer, user } = data;

  try {
    // Header with company name
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

    // Quotation title and folio
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("COTIZACIÓN", { align: "center" })
      .moveDown(0.3);

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#4a5568")
      .text(`Folio: ${quotation.folio}`, { align: "center" })
      .moveDown(1.5);

    // Two column layout for customer and quotation info
    const leftColumnX = 50;
    const rightColumnX = 320;
    let currentY = doc.y;

    // Customer information (left column)
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
    if (customer.address) {
      doc.text(`Dirección: ${customer.address}`, leftColumnX);
      if (customer.city || customer.state) {
        doc.text(`${customer.city || ""}, ${customer.state || ""}`, leftColumnX);
      }
    }

    // Quotation information (right column)
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("DATOS DE LA COTIZACIÓN", rightColumnX, currentY);
    
    currentY = doc.y + 10;
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4a5568");

    doc.text(`Fecha: ${formatDate(quotation.createdAt)}`, rightColumnX, currentY);
    doc.text(`Moneda: ${quotation.currency || "MXN"}`, rightColumnX);
    doc.text(`Vendedor: ${user.fullName}`, rightColumnX);
    
    if (quotation.validUntil) {
      doc.text(`Vigencia: ${formatDate(quotation.validUntil)}`, rightColumnX);
    }
    if (quotation.paymentTerms) {
      doc.text(`Condiciones de Pago: ${PAYMENT_TERMS_LABELS[quotation.paymentTerms] || quotation.paymentTerms}`, rightColumnX);
    }
    if (quotation.deliveryTime) {
      doc.text(`Tiempo de Entrega: ${DELIVERY_TIME_LABELS[quotation.deliveryTime] || quotation.deliveryTime}`, rightColumnX);
    }

    doc.moveDown(2);

    // Products table
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#2d3748")
      .text("PRODUCTOS Y SERVICIOS", 50);
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = {
      code: 60,
      description: 180,
      qty: 40,
      price: 70,
      discount: 50,
      subtotal: 80,
    };

    // Header background
    doc
      .rect(tableLeft, tableTop, 512, 20)
      .fill("#e2e8f0");

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#2d3748");

    let x = tableLeft + 5;
    doc.text("Código", x, tableTop + 5, { width: colWidths.code - 5 });
    x += colWidths.code;
    doc.text("Descripción", x, tableTop + 5, { width: colWidths.description - 5 });
    x += colWidths.description;
    doc.text("Cant.", x, tableTop + 5, { width: colWidths.qty - 5, align: "center" });
    x += colWidths.qty;
    doc.text("P. Unit.", x, tableTop + 5, { width: colWidths.price - 5, align: "right" });
    x += colWidths.price;
    doc.text("Desc %", x, tableTop + 5, { width: colWidths.discount - 5, align: "center" });
    x += colWidths.discount;
    doc.text("Subtotal", x, tableTop + 5, { width: colWidths.subtotal - 5, align: "right" });

    // Table rows
    let rowY = tableTop + 25;
    doc.font("Helvetica").fontSize(8).fillColor("#4a5568");

    items.forEach((item, index) => {
      // Check if we need a new page
      if (rowY > 680) {
        doc.addPage();
        rowY = 50;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableLeft, rowY - 3, 512, 18).fill("#f7fafc");
      }

      doc.fillColor("#4a5568");

      x = tableLeft + 5;
      doc.text(item.productCode || "", x, rowY, { width: colWidths.code - 5 });
      x += colWidths.code;
      doc.text(item.productName, x, rowY, { width: colWidths.description - 5 });
      x += colWidths.description;
      doc.text(parseFloat(item.quantity).toString(), x, rowY, { width: colWidths.qty - 5, align: "center" });
      x += colWidths.qty;
      doc.text(formatCurrency(item.unitPrice, quotation.currency || "MXN"), x, rowY, { width: colWidths.price - 5, align: "right" });
      x += colWidths.price;
      doc.text(`${parseFloat(item.discountPercent || "0").toFixed(1)}%`, x, rowY, { width: colWidths.discount - 5, align: "center" });
      x += colWidths.discount;
      doc.text(formatCurrency(item.subtotal, quotation.currency || "MXN"), x, rowY, { width: colWidths.subtotal - 5, align: "right" });

      rowY += 18;
    });

    // Totals section
    doc.moveDown(1);
    const totalsX = 380;
    let totalsY = rowY + 20;

    // Line separator
    doc
      .moveTo(totalsX, totalsY - 10)
      .lineTo(562, totalsY - 10)
      .stroke("#e2e8f0");

    doc.fontSize(10).font("Helvetica").fillColor("#4a5568");

    doc.text("Subtotal:", totalsX, totalsY, { width: 100 });
    doc.text(formatCurrency(quotation.subtotal, quotation.currency || "MXN"), totalsX + 100, totalsY, { width: 82, align: "right" });
    totalsY += 18;

    if (parseFloat(quotation.globalDiscount || "0") > 0) {
      doc.text(`Descuento Global (${quotation.globalDiscount}%):`, totalsX, totalsY, { width: 100 });
      const discountAmount = parseFloat(quotation.subtotal) * (parseFloat(quotation.globalDiscount || "0") / 100);
      doc.fillColor("#c53030").text(`-${formatCurrency(discountAmount, quotation.currency || "MXN")}`, totalsX + 100, totalsY, { width: 82, align: "right" });
      doc.fillColor("#4a5568");
      totalsY += 18;
    }

    doc.text("IVA:", totalsX, totalsY, { width: 100 });
    doc.text(formatCurrency(quotation.tax, quotation.currency || "MXN"), totalsX + 100, totalsY, { width: 82, align: "right" });
    totalsY += 18;

    // Total line
    doc
      .moveTo(totalsX, totalsY - 3)
      .lineTo(562, totalsY - 3)
      .stroke("#2d3748");

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#2d3748");
    doc.text("TOTAL:", totalsX, totalsY + 5, { width: 100 });
    doc.text(formatCurrency(quotation.total, quotation.currency || "MXN"), totalsX + 100, totalsY + 5, { width: 82, align: "right" });

    if (parseFloat(quotation.totalSavings || "0") > 0) {
      totalsY += 25;
      doc.fontSize(10).font("Helvetica").fillColor("#38a169");
      doc.text(`Ahorro Total: ${formatCurrency(quotation.totalSavings || "0", quotation.currency || "MXN")}`, totalsX, totalsY, { width: 182, align: "right" });
    }

    // Notes and conditions
    doc.moveDown(3);
    
    if (quotation.notes) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#2d3748").text("NOTAS:", 50);
      doc.fontSize(10).font("Helvetica").fillColor("#4a5568").text(quotation.notes, 50);
      doc.moveDown(1);
    }

    if (quotation.conditions) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#2d3748").text("CONDICIONES:", 50);
      doc.fontSize(10).font("Helvetica").fillColor("#4a5568").text(quotation.conditions, 50);
      doc.moveDown(1);
    }

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#718096")
      .text("Este documento es una cotización y no representa un compromiso de venta.", 50, undefined, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleString("es-MX")}`, { align: "center" });

  } catch (error) {
    console.error("Error generating quotation PDF:", error);
  }

  // CRITICAL: Finalize the PDF document
  doc.end();

  return doc as unknown as Readable;
}
