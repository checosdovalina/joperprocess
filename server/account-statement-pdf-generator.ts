import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Invoice, Payment, Customer } from "@shared/schema";
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
  timezone?: string | null;
  website?: string | null;
  rfc?: string | null;
}

interface CxcOpenInvoice {
  folio: string;
  issueDate: Date;
  dueDate: Date | null;
  total: number;
  balance: number;
  currency?: string; // "MXN" | "USD"
}

interface CxcPaymentRow {
  reference: string;
  date: Date;
  amount: number;
  invoiceFolio: string | null;
}

interface AccountStatementPDFData {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  tenant?: TenantBranding | null;
  /** When present, CXC live data overrides local invoices/payments (matches Microsip figures). */
  cxcData?: {
    invoices: CxcOpenInvoice[];
    payments: CxcPaymentRow[];
  };
}

async function loadLogoBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/api/logos/")) {
      const filename = logoUrl.replace("/api/logos/", "");
      return await localStorageService.getFile(`logos/${filename}`);
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

function fmt(value: string | number, currency = "MXN"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return currency === "USD" ? "US$0.00" : "$0.00";
  const prefix = currency === "USD" ? "US$" : "$";
  return prefix + num.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_payment: "Pendiente",
    partially_paid: "Pago Parcial",
    paid: "Pagado",
    cancelled: "Cancelada",
  };
  return map[status] ?? status;
}

function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const lr = Math.min(255, r + Math.round((255 - r) * amount));
  const lg = Math.min(255, g + Math.round((255 - g) * amount));
  const lb = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export async function generateAccountStatementPDF(data: AccountStatementPDFData): Promise<Readable> {
  const { customer, invoices, payments, tenant, cxcData } = data;
  const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });

  const logoBuffer = await loadLogoBuffer(tenant?.logoUrl);
  const companyName = tenant?.legalName || tenant?.name || "Empresa";
  const primaryColor = tenant?.primaryColor || "#1a365d";
  const lightColor = lightenColor(primaryColor, 0.92);
  const mediumColor = lightenColor(primaryColor, 0.75);

  const PAGE_W = 612;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const now = new Date();

  // ── DATA SOURCE: CXC live (Microsip) or local PostgreSQL ────────────────
  let totalBalance: number;
  let totalOverdue: number;
  let activeCount: number;
  let docCurrency = "MXN"; // overall currency for summary header

  // Inline dedup helpers used for totals calculation (full helpers defined below)
  const dedupCxc = (list: CxcOpenInvoice[]) => {
    const seen = new Map<string, CxcOpenInvoice>();
    for (const inv of list) {
      const prev = seen.get(inv.folio);
      if (!prev || Number(inv.balance) > Number(prev.balance)) seen.set(inv.folio, inv);
    }
    return Array.from(seen.values());
  };
  const dedupLocal = (list: Invoice[]) => {
    const seen = new Map<string, Invoice>();
    for (const inv of list) {
      const key = `${inv.serie ?? ""}-${inv.folio}`;
      const prev = seen.get(key);
      if (!prev || parseFloat(inv.balanceDue ?? inv.total ?? "0") > parseFloat(prev.balanceDue ?? prev.total ?? "0")) seen.set(key, inv);
    }
    return Array.from(seen.values());
  };

  if (cxcData) {
    const dedupedCxc = dedupCxc(cxcData.invoices);
    cxcData = { ...cxcData, invoices: dedupedCxc };
    totalBalance = dedupedCxc.reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
    totalOverdue = dedupedCxc
      .filter((inv) => inv.dueDate && new Date(inv.dueDate) < now)
      .reduce((s, inv) => s + (Number(inv.balance) || 0), 0);
    activeCount = dedupedCxc.length;
    if (dedupedCxc.some(inv => inv.currency === "USD")) docCurrency = "USD";
  } else {
    const activeInvoices = dedupLocal(invoices.filter(
      (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
    ));
    totalBalance = activeInvoices.reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
    const overdueInvoices = activeInvoices.filter((inv) => inv.dueDate && new Date(inv.dueDate) < now);
    totalOverdue = overdueInvoices.reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
    activeCount = activeInvoices.length;
  }

  const localActiveInvoices = cxcData ? [] : dedupLocal(
    invoices.filter((inv) => inv.status === "pending_payment" || inv.status === "partially_paid")
  );
  const currentYear = new Date().getFullYear();
  const recentPayments = [...payments]
    .filter((p) => new Date(p.paymentDate).getFullYear() === currentYear)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 15);

  // ── HEADER ──────────────────────────────────────────────
  const HEADER_H = 112;
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor);

  if (logoBuffer) {
    try { doc.image(logoBuffer, MARGIN, (HEADER_H - 68) / 2, { fit: [110, 68] as [number, number] }); } catch { /**/ }
  }

  const TEXT_X = PAGE_W / 2;
  const TEXT_W = PAGE_W - TEXT_X - MARGIN;
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff");
  doc.text(companyName.toUpperCase(), TEXT_X, 14, { width: TEXT_W, align: "right", lineBreak: false });

  const infoLines: string[] = [];
  if (tenant?.rfc) infoLines.push(`RFC: ${tenant.rfc}`);
  if (tenant?.address) tenant.address.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean).forEach((p: string) => infoLines.push(p));
  const cityParts = [tenant?.city, tenant?.state, tenant?.zipCode ? `C.P. ${tenant.zipCode}` : null].filter(Boolean);
  if (cityParts.length) infoLines.push(cityParts.join(", "));
  const contactParts = [tenant?.phone ? `Tel: ${tenant.phone}` : "", tenant?.email || ""].filter(Boolean);
  if (contactParts.length) infoLines.push(contactParts.join("   |   "));
  if (tenant?.website) infoLines.push(tenant.website);

  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.85)");
  infoLines.forEach((line, i) => doc.text(line, TEXT_X, 33 + i * 11, { width: TEXT_W, align: "right", lineBreak: false }));

  // ── TITLE BAND ──────────────────────────────────────────
  const TITLE_Y = HEADER_H;
  const TITLE_H = 32;
  doc.rect(0, TITLE_Y, PAGE_W, TITLE_H).fill(mediumColor);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("ESTADO DE CUENTA", MARGIN, TITLE_Y + 8, { width: CONTENT_W * 0.5 });
  doc.fontSize(9).font("Helvetica").fillColor(primaryColor);
  doc.text(`Corte: ${fmtDate(now)}`, MARGIN + CONTENT_W * 0.5, TITLE_Y + 11, { width: CONTENT_W * 0.5, align: "right" });

  let currentY = TITLE_Y + TITLE_H + 16;

  // ── CUSTOMER INFO ─────────────────────────────────────────
  const COL_W = CONTENT_W / 2 - 8;
  const COL2_X = MARGIN + COL_W + 16;

  // Split multiple emails (separated by ; or ,) — each on its own line
  const customerEmails = customer.email
    ? customer.email.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean)
    : [];
  // 13pt line height for 8pt font gives enough breathing room between lines
  const EMAIL_LINE_H = 13;
  // Original single-email box was 76pt; grow by EMAIL_LINE_H for each extra email
  const extraEmailH = Math.max(0, customerEmails.length - 1) * EMAIL_LINE_H;
  const BOX_H = 76 + extraEmailH;

  doc.rect(MARGIN, currentY, COL_W, BOX_H).fill(lightColor);
  doc.rect(MARGIN, currentY, COL_W, 16).fill(mediumColor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("CLIENTE", MARGIN + 8, currentY + 4, { width: COL_W - 16 });

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#111827");
  doc.text(customer.name, MARGIN + 8, currentY + 22, { width: COL_W - 16, lineBreak: false, ellipsis: true });
  doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
  if (customer.rfc) doc.text(`RFC: ${customer.rfc}`, MARGIN + 8, currentY + 36, { width: COL_W - 16 });
  customerEmails.forEach((email: string, idx: number) => {
    doc.text(email, MARGIN + 8, currentY + 48 + idx * EMAIL_LINE_H, { width: COL_W - 16, lineBreak: false, ellipsis: true });
  });
  if (customer.phone) {
    // Phone goes after the last email row (or at the original offset if no emails)
    const phoneOffY = 48 + Math.max(customerEmails.length, 1) * EMAIL_LINE_H;
    doc.text(`Tel: ${customer.phone}`, MARGIN + 8, currentY + phoneOffY, { width: COL_W - 16 });
  }

  // Summary box — same height as customer box so they align
  doc.rect(COL2_X, currentY, COL_W, BOX_H).fill(lightColor);
  doc.rect(COL2_X, currentY, COL_W, 16).fill(mediumColor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("RESUMEN", COL2_X + 8, currentY + 4, { width: COL_W - 16 });

  // Distribute 3 summary rows evenly within the content area (below the 16px header)
  const summaryContentH = BOX_H - 16;
  const summaryRowStep = summaryContentH / 3;
  const s1Y = currentY + 16 + summaryRowStep * 0 + 6;
  const s2Y = currentY + 16 + summaryRowStep * 1 + 6;
  const s3Y = currentY + 16 + summaryRowStep * 2 + 6;

  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(`Saldo Total por Cobrar${docCurrency === "USD" ? " (USD)" : ""}:`, COL2_X + 8, s1Y, { width: COL_W / 2, continued: false });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#dc2626");
  doc.text(fmt(totalBalance, docCurrency), COL2_X + COL_W / 2, s1Y - 2, { width: COL_W / 2 - 8, align: "right" });

  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text(`Saldo Vencido${docCurrency === "USD" ? " (USD)" : ""}:`, COL2_X + 8, s2Y, { width: COL_W / 2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor(totalOverdue > 0 ? "#ea580c" : "#374151");
  doc.text(fmt(totalOverdue, docCurrency), COL2_X + COL_W / 2, s2Y - 2, { width: COL_W / 2 - 8, align: "right" });

  doc.fontSize(8).font("Helvetica").fillColor("#374151");
  doc.text("Facturas Activas:", COL2_X + 8, s3Y, { width: COL_W / 2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151");
  doc.text(`${activeCount}`, COL2_X + COL_W / 2, s3Y - 2, { width: COL_W / 2 - 8, align: "right" });

  currentY += BOX_H + 20;

  // ── INVOICES TABLE ────────────────────────────────────────
  doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("FACTURAS PENDIENTES", MARGIN, currentY);
  currentY += 16;

  const cols = { folio: MARGIN, fecha: MARGIN + 90, venc: MARGIN + 175, total: MARGIN + 265, saldo: MARGIN + 355, estado: MARGIN + 440 };
  const ROW_H = 18;

  doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(mediumColor);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
  doc.text("FOLIO", cols.folio + 4, currentY + 5, { width: 86 });
  doc.text("EMISIÓN", cols.fecha + 4, currentY + 5, { width: 80 });
  doc.text("VENCIMIENTO", cols.venc + 4, currentY + 5, { width: 85 });
  doc.text("TOTAL", cols.total + 4, currentY + 5, { width: 80, align: "right" });
  doc.text("SALDO", cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
  doc.text("ESTADO", cols.estado + 4, currentY + 5, { width: 90 });
  currentY += ROW_H;

  if (cxcData) {
    // ── CXC live path ────────────────────────────────────────
    if (cxcData.invoices.length === 0) {
      doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Sin facturas pendientes.", MARGIN + 8, currentY + 5, { width: CONTENT_W - 16 });
      currentY += ROW_H;
    } else {
      cxcData.invoices.forEach((inv, i) => {
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
        const bal = Number(inv.balance) || 0;
        const tot = Number(inv.total) || 0;
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111827");
        doc.text(inv.folio, cols.folio + 4, currentY + 5, { width: 86 });
        doc.font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate(inv.issueDate), cols.fecha + 4, currentY + 5, { width: 80 });
        doc.fillColor(isOverdue ? "#dc2626" : "#6b7280");
        doc.text(fmtDate(inv.dueDate), cols.venc + 4, currentY + 5, { width: 85 });
        const cur = inv.currency ?? "MXN";
        doc.fillColor("#374151");
        doc.text(fmt(tot, cur), cols.total + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica-Bold").fillColor(bal > 0 ? "#dc2626" : "#16a34a");
        doc.text(fmt(bal, cur), cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica").fillColor(isOverdue ? "#dc2626" : "#374151");
        doc.text(isOverdue ? "Vencido" : "Pendiente", cols.estado + 4, currentY + 5, { width: 90 });
        currentY += ROW_H;
        if (currentY > 720) { doc.addPage(); currentY = 40; }
      });
    }
  } else {
    // ── Local PostgreSQL path ────────────────────────────────
    if (localActiveInvoices.length === 0) {
      doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
      doc.fontSize(8).font("Helvetica").fillColor("#6b7280");
      doc.text("Sin facturas pendientes.", MARGIN + 8, currentY + 5, { width: CONTENT_W - 16 });
      currentY += ROW_H;
    } else {
      localActiveInvoices.forEach((inv, i) => {
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
        const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0;
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111827");
        doc.text(`${inv.serie}-${inv.folio}`, cols.folio + 4, currentY + 5, { width: 86 });
        doc.font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate(inv.issuedAt), cols.fecha + 4, currentY + 5, { width: 80 });
        doc.fillColor(isOverdue ? "#dc2626" : "#6b7280");
        doc.text(fmtDate(inv.dueDate), cols.venc + 4, currentY + 5, { width: 85 });
        doc.fillColor("#374151");
        doc.text(fmt(inv.total), cols.total + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica-Bold").fillColor(bal > 0 ? "#dc2626" : "#16a34a");
        doc.text(fmt(bal), cols.saldo + 4, currentY + 5, { width: 80, align: "right" });
        doc.font("Helvetica").fillColor("#374151");
        doc.text(statusLabel(inv.status), cols.estado + 4, currentY + 5, { width: 90 });
        currentY += ROW_H;
        if (currentY > 720) { doc.addPage(); currentY = 40; }
      });
    }
  }

  currentY += 20;

  // ── PAYMENTS TABLE ────────────────────────────────────────
  const hasCxcPayments = cxcData && cxcData.payments.length > 0;
  const hasLocalPayments = !cxcData && recentPayments.length > 0;

  if (hasCxcPayments || hasLocalPayments) {
    if (currentY > 620) { doc.addPage(); currentY = 40; }

    doc.fontSize(10).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("ÚLTIMOS PAGOS REGISTRADOS", MARGIN, currentY);
    currentY += 16;

    const pcols = { fecha: MARGIN, ref: MARGIN + 90, factura: MARGIN + 270, importe: MARGIN + 420 };
    doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(mediumColor);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(primaryColor);
    doc.text("FECHA", pcols.fecha + 4, currentY + 5, { width: 86 });
    doc.text("REFERENCIA", pcols.ref + 4, currentY + 5, { width: 175 });
    doc.text("FACTURA", pcols.factura + 4, currentY + 5, { width: 145 });
    doc.text("IMPORTE", pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
    currentY += ROW_H;

    if (cxcData) {
      cxcData.payments.forEach((pay, i) => {
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate(pay.date), pcols.fecha + 4, currentY + 5, { width: 86 });
        doc.fillColor("#374151");
        doc.text(pay.reference ?? "—", pcols.ref + 4, currentY + 5, { width: 175 });
        doc.fillColor("#6b7280");
        doc.text(pay.invoiceFolio ?? "—", pcols.factura + 4, currentY + 5, { width: 145 });
        doc.font("Helvetica-Bold").fillColor("#16a34a");
        doc.text(fmt(pay.amount), pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
        currentY += ROW_H;
        if (currentY > 720) { doc.addPage(); currentY = 40; }
      });
    } else {
      recentPayments.forEach((pay, i) => {
        const inv = invoices.find((inv) => inv.id === pay.invoiceId);
        if (i % 2 === 0) doc.rect(MARGIN, currentY, CONTENT_W, ROW_H).fill(lightColor);
        doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
        doc.text(fmtDate(pay.paymentDate), pcols.fecha + 4, currentY + 5, { width: 86 });
        doc.fillColor("#374151");
        doc.text(pay.reference ?? "—", pcols.ref + 4, currentY + 5, { width: 175 });
        doc.fillColor("#6b7280");
        doc.text(inv ? `${inv.serie}-${inv.folio}` : "—", pcols.factura + 4, currentY + 5, { width: 145 });
        doc.font("Helvetica-Bold").fillColor("#16a34a");
        doc.text(fmt(pay.amount), pcols.importe + 4, currentY + 5, { width: 115, align: "right" });
        currentY += ROW_H;
        if (currentY > 720) { doc.addPage(); currentY = 40; }
      });
    }
  }

  // ── FOOTER ────────────────────────────────────────────────
  const FOOTER_Y = 755;
  doc.rect(0, FOOTER_Y, PAGE_W, 37).fill(primaryColor);
  doc.fontSize(7.5).font("Helvetica").fillColor("rgba(255,255,255,0.7)");
  doc.text(
    `Estado de cuenta generado el ${fmtDate(now)} — ${companyName}`,
    MARGIN, FOOTER_Y + 8, { width: CONTENT_W, align: "center" }
  );
  doc.text("Documento generado automáticamente — no requiere firma", MARGIN, FOOTER_Y + 20, {
    width: CONTENT_W, align: "center",
  });

  doc.end();
  return doc as unknown as Readable;
}
