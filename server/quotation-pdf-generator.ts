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
  return `${currency}$ ${formatted}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

    // === HEADER SECTION (Company info on the right) ===
    const headerHeight = 80;
    
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, pageWidth - margin - 150, currentY, { 
          width: 150,
          height: 50,
          fit: [150, 50] as [number, number]
        });
      } catch (logoError) {
        console.error('Error rendering logo in PDF:', logoError);
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor(primaryColor)
          .text(companyName.toUpperCase(), pageWidth - margin - 200, currentY, { 
            width: 200,
            align: "right" 
          });
      }
    } else {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(companyName.toUpperCase(), pageWidth - margin - 200, currentY, { 
          width: 200,
          align: "right" 
        });
    }

    // Company address below logo (right aligned)
    let companyInfoY = currentY + 55;
    doc.fontSize(8).font("Helvetica").fillColor("#4a5568");
    
    if (tenant?.address) {
      doc.text(tenant.address, pageWidth - margin - 200, companyInfoY, { width: 200, align: "right" });
      companyInfoY += 10;
    }
    if (tenant?.city || tenant?.state) {
      const location = [tenant.city, tenant.state, tenant.zipCode].filter(Boolean).join(", ");
      doc.text(location, pageWidth - margin - 200, companyInfoY, { width: 200, align: "right" });
      companyInfoY += 10;
    }

    currentY += headerHeight + 20;

    // === CUSTOMER INFO BOX ===
    doc.rect(margin, currentY, contentWidth, 80).stroke("#e2e8f0");
    
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#2d3748");
    doc.text(customer.name, margin + 10, currentY + 10, { width: contentWidth - 20 });
    
    doc.fontSize(8).font("Helvetica").fillColor("#4a5568");
    let custY = currentY + 25;
    
    if (customer.address) {
      doc.text(customer.address, margin + 10, custY, { width: 250 });
      custY += 10;
    }
    if (customer.city || customer.state) {
      doc.text([customer.zipCode, customer.city, customer.state].filter(Boolean).join(" "), margin + 10, custY, { width: 250 });
      custY += 10;
    }
    doc.text("México", margin + 10, custY, { width: 250 });
    custY += 10;
    if (customer.rfc) {
      doc.text(`RFC: ${customer.rfc}`, margin + 10, custY, { width: 250 });
    }

    currentY += 90;

    // === ORDER INFO SECTION ===
    doc.fontSize(12).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text(`Número de orden ${quotation.folio}`, margin, currentY);
    
    currentY += 25;

    // Two columns: Fecha on left, Vendedor on right
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#4a5568");
    doc.text("Fecha de la orden:", margin, currentY);
    doc.text("Vendedor:", margin + 280, currentY);
    
    currentY += 12;
    doc.font("Helvetica");
    doc.text(formatDateTime(quotation.createdAt), margin, currentY);
    doc.text(user.fullName, margin + 280, currentY);

    currentY += 30;

    // === PRODUCTS TABLE ===
    const tableLeft = margin;
    const colWidths = {
      description: 250,
      qty: 80,
      price: 90,
      total: 92,
    };

    // Table header
    doc.rect(tableLeft, currentY, contentWidth, 20).fill("#f0f0f0");
    
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#2d3748");
    let x = tableLeft + 5;
    doc.text("DESCRIPCIÓN", x, currentY + 6, { width: colWidths.description - 10 });
    x += colWidths.description;
    doc.text("CANTIDAD", x, currentY + 6, { width: colWidths.qty - 10, align: "center" });
    x += colWidths.qty;
    doc.text("PRECIO UNITARIO", x, currentY + 6, { width: colWidths.price - 10, align: "right" });
    x += colWidths.price;
    doc.text("MONTO", x, currentY + 6, { width: colWidths.total - 10, align: "right" });

    currentY += 25;

    // Table rows
    doc.font("Helvetica").fontSize(8).fillColor("#4a5568");

    items.forEach((item) => {
      if (currentY > pageHeight - 150) {
        doc.addPage();
        currentY = margin;
      }

      const rowHeight = 30;
      x = tableLeft + 5;
      
      // Product code and name
      doc.font("Helvetica-Bold").fillColor("#2d3748");
      doc.text(item.productCode || "", x, currentY, { width: colWidths.description - 10 });
      doc.font("Helvetica").fillColor("#4a5568");
      doc.text(item.productName, x, currentY + 10, { width: colWidths.description - 10 });
      
      x += colWidths.description;
      doc.text(`${parseFloat(item.quantity).toFixed(2)} PZA`, x, currentY + 5, { width: colWidths.qty - 10, align: "center" });
      
      x += colWidths.qty;
      doc.text(parseFloat(item.unitPrice).toLocaleString("es-MX", { minimumFractionDigits: 2 }), x, currentY + 5, { width: colWidths.price - 10, align: "right" });
      
      x += colWidths.price;
      doc.text(formatCurrency(item.subtotal, quotation.currency || "MXN"), x, currentY + 5, { width: colWidths.total - 10, align: "right" });

      currentY += rowHeight;

      // Draw line separator
      doc.moveTo(tableLeft, currentY).lineTo(tableLeft + contentWidth, currentY).stroke("#e2e8f0");
      currentY += 5;
    });

    currentY += 20;

    // === TOTALS SECTION ===
    const totalsX = pageWidth - margin - 200;
    const totalsLabelWidth = 100;
    const totalsValueWidth = 100;

    // Subtotal
    doc.fontSize(9).font("Helvetica").fillColor("#4a5568");
    doc.text("Subtotal", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.subtotal, quotation.currency || "MXN"), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
    currentY += 15;

    // Global discount if any
    if (parseFloat(quotation.globalDiscount || "0") > 0) {
      const discountAmount = parseFloat(quotation.subtotal) * (parseFloat(quotation.globalDiscount || "0") / 100);
      doc.text(`Descuento ${quotation.globalDiscount}%`, totalsX, currentY, { width: totalsLabelWidth, align: "right" });
      doc.text(`-${formatCurrency(discountAmount, quotation.currency || "MXN")}`, totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
      currentY += 15;
    }

    // IVA
    doc.text("IVA 16%", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.tax, quotation.currency || "MXN"), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });
    currentY += 15;

    // Total line
    doc.moveTo(totalsX, currentY).lineTo(totalsX + totalsLabelWidth + totalsValueWidth, currentY).stroke("#2d3748");
    currentY += 5;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#2d3748");
    doc.text("Total", totalsX, currentY, { width: totalsLabelWidth, align: "right" });
    doc.text(formatCurrency(quotation.total, quotation.currency || "MXN"), totalsX + totalsLabelWidth, currentY, { width: totalsValueWidth, align: "right" });

    currentY += 30;

    // === NOTES SECTION ===
    if (quotation.paymentTerms || quotation.deliveryTime || quotation.notes) {
      doc.fontSize(8).font("Helvetica").fillColor("#4a5568");
      
      if (quotation.paymentTerms) {
        doc.text(`Condiciones de pago: ${PAYMENT_TERMS_LABELS[quotation.paymentTerms] || quotation.paymentTerms}`, margin, currentY);
        currentY += 12;
      }
      if (quotation.deliveryTime) {
        doc.text(`Tiempo de entrega: ${DELIVERY_TIME_LABELS[quotation.deliveryTime] || quotation.deliveryTime}`, margin, currentY);
        currentY += 12;
      }
      if (quotation.notes) {
        doc.text(quotation.notes, margin, currentY, { width: contentWidth });
        currentY += 20;
      }
    }

    // === FOOTER ===
    const footerY = pageHeight - 40;
    
    doc.moveTo(margin, footerY - 10).lineTo(pageWidth - margin, footerY - 10).stroke("#e2e8f0");
    
    doc.fontSize(8).font("Helvetica").fillColor("#4a5568");
    
    const footerParts = [];
    if (tenant?.rfc) footerParts.push(`RFC: ${tenant.rfc}`);
    if (tenant?.email) footerParts.push(`Email: ${tenant.email}`);
    if (tenant?.phone) footerParts.push(tenant.phone);
    
    if (footerParts.length > 0) {
      doc.text(footerParts.join(" | "), margin, footerY, { 
        width: contentWidth, 
        align: "center" 
      });
    }

    doc.text("Página: 1 / 1", margin, footerY + 12, { width: contentWidth, align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    doc.end();
  }

  return doc as unknown as Readable;
}
