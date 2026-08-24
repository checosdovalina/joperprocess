import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { formatPdfDate, formatPdfDateTime, pdfText, resolvePdfLanguage } from "./pdf-locale";

export interface PublicIncidentPdfTenant {
  name?: string | null;
  legalName?: string | null;
  rfc?: string | null;
  email?: string | null;
  phone?: string | null;
  primaryColor?: string | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface PublicIncidentPdfData {
  ticketNumber: string;
  status: string;
  type: string;
  urgency: string;
  subject: string;
  description: string;
  resolution?: string | null;
  createdAt: Date | string;
  assignee?: { fullName?: string | null } | null;
  comments?: Array<{
    content: string;
    createdAt: Date | string;
    isFromCustomer: boolean;
    user?: { fullName?: string | null } | null;
  }>;
}

const statuses: Record<string, { es: string; en: string }> = {
  nuevo: { es: "Nuevo", en: "New" }, asignado: { es: "Asignado", en: "Assigned" },
  en_proceso: { es: "En Proceso", en: "In Progress" }, esperando_cliente: { es: "Esperando Cliente", en: "Waiting for Customer" },
  esperando_interno: { es: "En Revisión", en: "Under Review" }, resuelto: { es: "Resuelto", en: "Resolved" },
  cerrado: { es: "Cerrado", en: "Closed" }, cancelado: { es: "Cancelado", en: "Cancelled" },
};
const types: Record<string, { es: string; en: string }> = {
  garantia: { es: "Garantía", en: "Warranty" }, retrabajo: { es: "Retrabajo", en: "Rework" },
  queja: { es: "Queja", en: "Complaint" }, consulta: { es: "Consulta", en: "Inquiry" },
  administrativo: { es: "Administrativo", en: "Administrative" },
};
const urgencies: Record<string, { es: string; en: string }> = {
  baja: { es: "Baja", en: "Low" }, media: { es: "Media", en: "Medium" },
  alta: { es: "Alta", en: "High" }, critica: { es: "Crítica", en: "Critical" },
};

function lighten(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const component = (offset: number) => {
    const color = parseInt(value.substring(offset, offset + 2), 16);
    return Math.min(255, color + Math.round((255 - color) * amount)).toString(16).padStart(2, "0");
  };
  return `#${component(0)}${component(2)}${component(4)}`;
}

export function generatePublicIncidentPDFStream(incident: PublicIncidentPdfData, tenant?: PublicIncidentPdfTenant | null): Readable {
  const language = resolvePdfLanguage(tenant);
  const text = <T,>(values: { es: T; en: T }) => pdfText(language, values);
  const date = (value: Date | string | null | undefined) => formatPdfDate(value, language, tenant?.timezone);
  const dateTime = (value: Date | string | null | undefined) => formatPdfDateTime(value, language, tenant?.timezone);
  const label = (labels: Record<string, { es: string; en: string }>, value: string) => labels[value] ? text(labels[value]) : value;
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
  const primary = tenant?.primaryColor || "#1a365d";
  const light = lighten(primary, 0.92);
  const medium = lighten(primary, 0.75);
  const pageWidth = 612, margin = 40, contentWidth = pageWidth - margin * 2;

  doc.rect(0, 0, pageWidth, 90).fill(primary);
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#ffffff")
    .text(tenant?.legalName || tenant?.name || text({ es: "Empresa", en: "Company" }), margin, 18, { width: contentWidth });
  doc.fontSize(10).font("Helvetica").fillColor("rgba(255,255,255,0.8)")
    .text(text({ es: "REPORTE DE INCIDENTE / TICKET DE SERVICIO", en: "INCIDENT REPORT / SERVICE TICKET" }), margin, 44, { width: contentWidth });
  if (tenant?.rfc) doc.text(`${text({ es: "RFC", en: "TAX ID" })}: ${tenant.rfc}`, margin, 58, { width: contentWidth });
  doc.rect(0, 90, pageWidth, 28).fill(medium);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(primary).text(incident.ticketNumber, margin, 97, { width: contentWidth * .5 });
  doc.fontSize(9).font("Helvetica").text(`${text({ es: "Estado", en: "Status" })}: ${label(statuses, incident.status)}`, margin + contentWidth * .5, 100, { width: contentWidth * .5, align: "right" });

  let y = 130;
  const info: [string, string][] = [
    [text({ es: "Tipo", en: "Type" }), label(types, incident.type)],
    [text({ es: "Urgencia", en: "Urgency" }), label(urgencies, incident.urgency)],
    [text({ es: "Asignado a", en: "Assigned to" }), incident.assignee?.fullName || text({ es: "Sin asignar", en: "Unassigned" })],
    [text({ es: "Fecha creación", en: "Created on" }), date(incident.createdAt)],
    [text({ es: "Asunto", en: "Subject" }), incident.subject],
  ];
  const columnWidth = contentWidth / 2 - 6;
  info.forEach(([heading, value], index) => {
    const x = margin + (index % 2) * (columnWidth + 12), boxY = y + Math.floor(index / 2) * 38;
    doc.rect(x, boxY, columnWidth, 34).fill(light);
    doc.fontSize(7).font("Helvetica").fillColor("#6b7280").text(heading.toUpperCase(), x + 6, boxY + 5, { width: columnWidth - 12 });
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827").text(value, x + 6, boxY + 16, { width: columnWidth - 12, lineBreak: false, ellipsis: true });
  });
  y += Math.ceil(info.length / 2) * 38 + 16;
  const section = (heading: string, content: string) => {
    doc.rect(margin, y, contentWidth, 14).fill(medium);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primary).text(heading, margin + 6, y + 3);
    y += 14;
    const height = Math.max(40, doc.heightOfString(content, { width: contentWidth - 12 }) + 16);
    doc.rect(margin, y, contentWidth, height).fill(light);
    doc.fontSize(9).font("Helvetica").fillColor("#374151").text(content, margin + 6, y + 8, { width: contentWidth - 12 });
    y += height + 14;
  };
  section(text({ es: "DESCRIPCIÓN", en: "DESCRIPTION" }), incident.description);
  if (incident.resolution) section(text({ es: "RESOLUCIÓN", en: "RESOLUTION" }), incident.resolution);
  if (incident.comments?.length) {
    doc.rect(margin, y, contentWidth, 14).fill(medium);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(primary).text(text({ es: "CONVERSACIÓN", en: "CONVERSATION" }), margin + 6, y + 3);
    y += 14;
    for (const comment of incident.comments) {
      const height = Math.max(32, doc.heightOfString(comment.content, { width: contentWidth - 24 }) + 20);
      if (y + height > 720) { doc.addPage({ size: "LETTER", margin: 0 }); y = 40; }
      doc.rect(margin, y, contentWidth, height).fill(comment.isFromCustomer ? lighten(primary, .85) : light);
      const author = comment.isFromCustomer ? text({ es: "Cliente", en: "Customer" }) : (comment.user?.fullName || text({ es: "Soporte", en: "Support" }));
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#374151").text(`${author}  ·  ${dateTime(comment.createdAt)}`, margin + 8, y + 6, { width: contentWidth - 16 });
      doc.fontSize(8.5).font("Helvetica").fillColor("#111827").text(comment.content, margin + 8, y + 17, { width: contentWidth - 16 });
      y += height + 4;
    }
  }
  doc.rect(0, 755, pageWidth, 37).fill(primary);
  const footer = [tenant?.rfc ? `${text({ es: "RFC", en: "TAX ID" })}: ${tenant.rfc}` : null, tenant?.email, tenant?.phone].filter(Boolean).join("   |   ");
  doc.fontSize(7).font("Helvetica").fillColor("rgba(255,255,255,0.8)").text(footer, margin, 763, { width: contentWidth, align: "center" });
  doc.text(`${text({ es: "Generado el", en: "Generated on" })} ${formatPdfDate(new Date(), language, tenant?.timezone, { day: "2-digit", month: "long", year: "numeric" })}`, margin, 775, { width: contentWidth, align: "center" });
  doc.end();
  return doc as unknown as Readable;
}