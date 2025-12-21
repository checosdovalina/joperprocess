import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quotation, QuotationItem, Customer, User, Tenant } from "@shared/schema";
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
}

interface QuotationPDFData {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Customer;
  user: User;
  tenant?: TenantBranding | null;
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
  const formatted = num.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function generateQuotationPDFStream(data: QuotationPDFData): Promise<Readable> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const { quotation, items, customer, user, tenant } = data;

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  try {
    let currentY = margin;

    // === HEADER SECTION ===
    // Left side: Company name and title
    doc.fontSize(16).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(companyName.toUpperCase(), margin, currentY);
    
    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    doc.text("Sistema Comercial", margin, currentY + 20);

    // Right side: Logo (if exists)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageWidth - margin - 120, currentY, { 
          width: 120,
          height: 45,
          fit: [120, 45] as [number, number]
        });
      } catch (logoError) {
        console.error('Error rendering logo in PDF:', logoError);
      }
    }

    currentY += 60;

    // === DOCUMENT TITLE ===
    doc.fontSize(14).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("COTIZACIÓN", margin, currentY, { align: "center", width: contentWidth });
    
    currentY += 18;
    doc.fontSize(11).font("Helvetica").fillColor("#333333");
    doc.text(`Folio: ${quotation.folio}`, margin, currentY, { align: "center", width: contentWidth });

    currentY += 35;

    // === TWO COLUMN INFO SECTION ===
    const leftColWidth = (contentWidth / 2) - 10;
    const rightColX = margin + leftColWidth + 20;

    // Left column: Customer data
    doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("DATOS DEL CLIENTE", margin, currentY);
    
    // Right column: Quotation data
    doc.text("DATOS DE LA COTIZACIÓN", rightColX, currentY);

    currentY += 15;
    doc.fontSize(9).font("Helvetica").fillColor("#333333");

    // Customer info (left column)
    let leftY = currentY;
    doc.font("Helvetica-Bold").text("Razón Social: ", margin, leftY, { continued: true });
    doc.font("Helvetica").text(customer.name);
    leftY += 13;
    
    if (customer.rfc) {
      doc.font("Helvetica-Bold").text("RFC: ", margin, leftY, { continued: true });
      doc.font("Helvetica").text(customer.rfc);
      leftY += 13;
    }
    
    if (customer.contactName) {
      doc.font("Helvetica-Bold").text("Contacto: ", margin, leftY, { continued: true });
      doc.font("Helvetica").text(customer.contactName);
      leftY += 13;
    }
    
    if (customer.phone) {
      doc.font("Helvetica-Bold").text("Teléfono: ", margin, leftY, { continued: true });
      doc.font("Helvetica").text(customer.phone);
      leftY += 13;
    }
    
    if (customer.email) {
      doc.font("Helvetica-Bold").text("Email: ", margin, leftY, { continued: true });
      doc.font("Helvetica").text(customer.email);
      leftY += 13;
    }
    
    if (customer.address) {
      doc.font("Helvetica-Bold").text("Dirección: ", margin, leftY, { continued: true });
      doc.font("Helvetica").text(customer.address, { width: leftColWidth - 50 });
      leftY += 13;
    }
    
    if (customer.city || customer.state) {
      doc.text([customer.city, customer.state].filter(Boolean).join(", "), margin, leftY);
      leftY += 13;
    }

    // Quotation info (right column)
    let rightY = currentY;
    doc.font("Helvetica-Bold").text("Fecha: ", rightColX, rightY, { continued: true });
    doc.font("Helvetica").text(formatDate(quotation.createdAt));
    rightY += 13;
    
    doc.font("Helvetica-Bold").text("Moneda: ", rightColX, rightY, { continued: true });
    doc.font("Helvetica").text(quotation.currency || "MXN");
    rightY += 13;
    
    doc.font("Helvetica-Bold").text("Vendedor: ", rightColX, rightY, { continued: true });
    doc.font("Helvetica").text(user.fullName);
    rightY += 13;
    
    if (quotation.validUntil) {
      doc.font("Helvetica-Bold").text("Vigencia: ", rightColX, rightY, { continued: true });
      doc.font("Helvetica").text(formatDate(quotation.validUntil));
      rightY += 13;
    }
    
    if (quotation.paymentTerms) {
      doc.font("Helvetica-Bold").text("Condiciones de Pago: ", rightColX, rightY, { continued: true });
      doc.font("Helvetica").text(PAYMENT_TERMS_LABELS[quotation.paymentTerms] || quotation.paymentTerms);
      rightY += 13;
    }
    
    if (quotation.deliveryTime) {
      doc.font("Helvetica-Bold").text("Tiempo de Entrega: ", rightColX, rightY, { continued: true });
      doc.font("Helvetica").text(DELIVERY_TIME_LABELS[quotation.deliveryTime] || quotation.deliveryTime);
      rightY += 13;
    }

    currentY = Math.max(leftY, rightY) + 25;

    // === PRODUCTS TABLE ===
    doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("PRODUCTOS Y SERVICIOS", margin, currentY);
    currentY += 20;

    // Table header
    const colWidths = {
      code: 80,
      description: 200,
      qty: 50,
      price: 80,
      discount: 50,
      subtotal: 80,
    };

    doc.rect(margin, currentY, contentWidth, 18).fill("#f5f5f5");
    
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333");
    let x = margin + 5;
    doc.text("Código", x, currentY + 5);
    x += colWidths.code;
    doc.text("Descripción", x, currentY + 5);
    x += colWidths.description;
    doc.text("Cant.", x, currentY + 5, { width: colWidths.qty, align: "center" });
    x += colWidths.qty;
    doc.text("P. Unit.", x, currentY + 5, { width: colWidths.price, align: "right" });
    x += colWidths.price;
    doc.text("Desc %", x, currentY + 5, { width: colWidths.discount, align: "center" });
    x += colWidths.discount;
    doc.text("Subtotal", x, currentY + 5, { width: colWidths.subtotal - 5, align: "right" });

    currentY += 22;

    // Table rows
    doc.font("Helvetica").fontSize(8).fillColor("#333333");

    items.forEach((item, index) => {
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = margin;
      }

      // Alternate row background
      if (index % 2 === 1) {
        doc.rect(margin, currentY - 2, contentWidth, 18).fill("#fafafa");
        doc.fillColor("#333333");
      }

      x = margin + 5;
      doc.text(item.productCode || "-", x, currentY, { width: colWidths.code - 5 });
      x += colWidths.code;
      doc.text(item.productName, x, currentY, { width: colWidths.description - 5 });
      x += colWidths.description;
      doc.text(parseFloat(item.quantity).toString(), x, currentY, { width: colWidths.qty, align: "center" });
      x += colWidths.qty;
      doc.text(formatCurrency(item.unitPrice), x, currentY, { width: colWidths.price, align: "right" });
      x += colWidths.price;
      doc.text(parseFloat(item.discountPercent || "0").toFixed(1) + "%", x, currentY, { width: colWidths.discount, align: "center" });
      x += colWidths.discount;
      doc.text(formatCurrency(item.subtotal), x, currentY, { width: colWidths.subtotal - 5, align: "right" });

      currentY += 18;
    });

    // Line after table
    doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke("#dddddd");
    currentY += 25;

    // === TOTALS SECTION ===
    const totalsX = pageWidth - margin - 180;
    const totalsLabelWidth = 90;
    const totalsValueWidth = 90;

    // Subtotal
    doc.fontSize(9).font("Helvetica").fillColor("#333333");
    doc.text("Subtotal:", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.subtotal), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
    currentY += 15;

    // Global discount if any
    if (parseFloat(quotation.globalDiscount || "0") > 0) {
      const discountAmount = parseFloat(quotation.subtotal) * (parseFloat(quotation.globalDiscount || "0") / 100);
      doc.text(`Descuento (${quotation.globalDiscount}%):`, totalsX, currentY, { width: totalsLabelWidth, align: "right" });
      doc.text(`-${formatCurrency(discountAmount)}`, totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
      currentY += 15;
    }

    // IVA
    doc.text("IVA:", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.tax), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
    currentY += 18;

    // Total
    doc.fontSize(11).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("TOTAL:", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.total), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });

    currentY += 35;

    // === NOTES ===
    if (quotation.notes) {
      doc.fontSize(9).font("Helvetica").fillColor("#666666");
      doc.text(quotation.notes, margin, currentY, { width: contentWidth });
      currentY += 30;
    }

    // === FOOTER ===
    const footerY = pageHeight - 50;
    
    doc.moveTo(margin, footerY - 15).lineTo(pageWidth - margin, footerY - 15).stroke("#dddddd");
    
    doc.fontSize(8).font("Helvetica").fillColor("#888888");
    doc.text("Este documento es una cotización y no representa un compromiso de venta.", margin, footerY - 5, { 
      width: contentWidth, 
      align: "center" 
    });
    
    doc.text(`Generado el ${formatDateTime(new Date())}`, margin, footerY + 8, { 
      width: contentWidth, 
      align: "center" 
    });

    doc.end();
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
