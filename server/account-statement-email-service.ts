import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import type { Invoice, Payment, Customer } from "@shared/schema";

interface StatementLine {
  serie: string;
  folio: string;
  issuedAt: Date | string;
  dueDate: Date | string | null;
  total: string;
  balanceDue: string;
  status: string;
}

interface PaymentLine {
  paymentDate: Date | string;
  amount: string;
  reference: string | null;
  invoiceRef: string;
}

export interface CxcLiveInvoice {
  FOLIO: string;
  FECHA: Date;
  FECHA_VEN: Date | null;
  IMPORTE_TOTAL: number;
  SALDO: number;
  TIPO_CAMBIO?: number; // 1 = MXN, > 1.5 = USD (exchange rate used at invoicing)
}

export interface CxcLivePayment {
  REFERENCIA: string;
  FECHA: Date;
  IMPORTE: number;
  FACTURA_FOLIO: string | null;
}

interface SendAccountStatementParams {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  recipientEmails: string[];
  tenantName?: string;
  cutoffDate?: Date;
  /** When provided, overrides local-DB invoices/payments with real-time CXC data */
  liveData?: { invoices: CxcLiveInvoice[]; payments: CxcLivePayment[] };
  /** Additional CC emails (e.g. internal admin copy) */
  ccEmails?: string[];
}

function fmt(value: string | number, currency = "MXN"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_payment: "Pendiente",
    partially_paid: "Pago Parcial",
    paid: "Pagado",
    cancelled: "Cancelada",
    draft: "Borrador",
  };
  return map[status] ?? status;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending_payment: "#dc2626",
    partially_paid: "#d97706",
    paid: "#16a34a",
    cancelled: "#6b7280",
    draft: "#9ca3af",
  };
  return map[status] ?? "#374151";
}

export async function sendAccountStatementEmail({
  customer,
  invoices,
  payments,
  recipientEmails,
  tenantName = "Nexxo",
  cutoffDate,
  liveData,
  ccEmails,
}: SendAccountStatementParams): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) throw new Error("MAILERSEND_API_KEY no está configurado");

  const now = new Date();
  let totalBalance: number;
  let totalOverdue: number;
  let usdTotal = 0;
  let invoiceRows: string;
  let invoiceTableHeader: string;
  let paymentRows: string;
  let activeCount: number;

  // Dedup helpers — keep highest-balance row when same folio appears more than once
  const dedupLive = (list: CxcLiveInvoice[]) => {
    const seen = new Map<string, CxcLiveInvoice>();
    for (const inv of list) {
      const prev = seen.get(inv.FOLIO);
      if (!prev || inv.SALDO > prev.SALDO) seen.set(inv.FOLIO, inv);
    }
    return Array.from(seen.values());
  };
  const dedupLocalInvoices = (list: Invoice[]) => {
    const seen = new Map<string, Invoice>();
    for (const inv of list) {
      const key = `${inv.serie ?? ""}-${inv.folio}`;
      const prev = seen.get(key);
      if (!prev || parseFloat(inv.balanceDue ?? inv.total ?? "0") > parseFloat(prev.balanceDue ?? prev.total ?? "0")) seen.set(key, inv);
    }
    return Array.from(seen.values());
  };

  if (liveData) {
    // ── Live CXC path: real-time balances from Firebird ──────────────────────
    const liveInvoices = dedupLive(liveData.invoices); // already filtered SALDO > 0.005; also deduped by folio
    // TIPO_CAMBIO > 1.5 means the invoice was issued in USD (rate ~17-25 MXN/USD)
    const currencyOf = (inv: CxcLiveInvoice) => (inv.TIPO_CAMBIO && inv.TIPO_CAMBIO > 1.5) ? "USD" : "MXN";

    // Separate totals per currency
    const mxnInvoices = liveInvoices.filter((i) => currencyOf(i) === "MXN");
    const usdInvoices = liveInvoices.filter((i) => currencyOf(i) === "USD");
    const totalMXN = mxnInvoices.reduce((s, i) => s + i.SALDO, 0);
    const totalUSD = usdInvoices.reduce((s, i) => s + i.SALDO, 0);
    // For the main "totalBalance" card use MXN (primary currency); USD shown separately below
    totalBalance = totalMXN;
    const overdueInv = liveInvoices.filter((i) => i.FECHA_VEN && new Date(i.FECHA_VEN) < now);
    totalOverdue = overdueInv.filter((i) => currencyOf(i) === "MXN").reduce((s, i) => s + i.SALDO, 0);
    activeCount = liveInvoices.length;

    invoiceRows = liveInvoices.map((inv) => {
      const isOverdue = inv.FECHA_VEN && new Date(inv.FECHA_VEN) < now;
      const statusCol = isOverdue ? "#dc2626" : "#d97706";
      const statusTxt = isOverdue ? "Vencida" : "Pendiente";
      const cur = currencyOf(inv);
      return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;font-weight:600;">${inv.FOLIO}</td>
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate(inv.FECHA)}</td>
        <td style="padding:8px 10px;color:${isOverdue ? "#dc2626" : "#374151"};">
          ${inv.FECHA_VEN ? fmtDate(inv.FECHA_VEN) : "—"}${isOverdue ? " ⚠" : ""}
        </td>
        <td style="padding:8px 10px;text-align:right;">${fmt(inv.IMPORTE_TOTAL, cur)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:${statusCol};">
          ${fmt(inv.SALDO, cur)}
        </td>
        <td style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">${cur}</td>
        <td style="padding:8px 10px;">
          <span style="background:${statusCol}20;color:${statusCol};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">
            ${statusTxt}
          </span>
        </td>
      </tr>`;
    }).join("");

    usdTotal = totalUSD;
    invoiceTableHeader = `
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Folio</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Emisión</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Total</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Saldo</th>
            <th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;">Moneda</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>`;

    paymentRows = liveData.payments.slice(0, 10).map((pay) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate(pay.FECHA)}</td>
        <td style="padding:8px 10px;">${pay.REFERENCIA ?? "—"}</td>
        <td style="padding:8px 10px;color:#6b7280;">${pay.FACTURA_FOLIO ?? "—"}</td>
        <td style="padding:8px 10px;text-align:right;color:#16a34a;font-weight:600;">+${fmt(pay.IMPORTE)}</td>
      </tr>`).join("");

  } else {
    // ── Local-DB fallback path ────────────────────────────────────────────────
    const activeInvoices = dedupLocalInvoices(invoices.filter(
      (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
    ));
    activeCount = activeInvoices.length;

    totalBalance = activeInvoices.reduce((sum, inv) => {
      const b = parseFloat(inv.balanceDue ?? inv.total ?? "0");
      return sum + (Number.isFinite(b) ? b : 0);
    }, 0);

    const overdueInvoices = activeInvoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now
    );
    totalOverdue = overdueInvoices.reduce((sum, inv) => {
      const b = parseFloat(inv.balanceDue ?? inv.total ?? "0");
      return sum + (Number.isFinite(b) ? b : 0);
    }, 0);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentPayments = [...payments]
      .filter((p) => new Date(p.paymentDate) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 10);

    invoiceRows = activeInvoices
      .map((inv) => {
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
        const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0");
        return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;font-weight:600;">${inv.serie}-${inv.folio}</td>
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate(inv.issuedAt)}</td>
        <td style="padding:8px 10px;color:${isOverdue ? "#dc2626" : "#374151"};">
          ${inv.dueDate ? fmtDate(inv.dueDate) : "—"}${isOverdue ? " ⚠" : ""}
        </td>
        <td style="padding:8px 10px;text-align:right;">${fmt(inv.total, inv.currency)}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;color:${statusColor(inv.status)};">
          ${fmt(bal, inv.currency)}
        </td>
        <td style="padding:8px 10px;">
          <span style="background:${statusColor(inv.status)}20;color:${statusColor(inv.status)};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">
            ${statusLabel(inv.status)}
          </span>
        </td>
      </tr>`;
      })
      .join("");

    paymentRows = recentPayments
      .map((pay) => {
        const inv = invoices.find((i) => i.id === pay.invoiceId);
        return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;color:#6b7280;">${fmtDate(pay.paymentDate)}</td>
        <td style="padding:8px 10px;">${pay.reference ?? "—"}</td>
        <td style="padding:8px 10px;color:#6b7280;">${inv ? `${inv.serie}-${inv.folio}` : "—"}</td>
        <td style="padding:8px 10px;text-align:right;color:#16a34a;font-weight:600;">+${fmt(pay.amount)}</td>
      </tr>`;
      })
      .join("");

    invoiceTableHeader = `
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Folio</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Emisión</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Vencimiento</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Total (MXN)</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Saldo (MXN)</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Estado</th>
          </tr>`;
  }

  const cutoffStr = cutoffDate
    ? fmtDate(cutoffDate)
    : fmtDate(now);

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:700px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    
    <!-- Header -->
    <div style="background:#1e3a5f;padding:28px 32px;color:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:.5px;">${tenantName}</h1>
          <p style="margin:0;opacity:.8;font-size:13px;">Estado de Cuenta</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:12px;opacity:.7;">Corte al</p>
          <p style="margin:0;font-size:15px;font-weight:600;">${cutoffStr}</p>
        </div>
      </div>
    </div>

    <!-- Customer info -->
    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Cliente</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${customer.name}</p>
      ${customer.rfc ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">RFC: ${customer.rfc}</p>` : ""}
      ${customer.email ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${customer.email}</p>` : ""}
    </div>

    <!-- Summary cards -->
    <div style="display:flex;padding:20px 32px;gap:16px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#fef2f2;border-radius:8px;padding:16px 18px;border:1px solid #fecaca;">
        <p style="margin:0 0 6px;font-size:12px;color:#ef4444;font-weight:600;text-transform:uppercase;">Saldo Total</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#dc2626;">${fmt(totalBalance)}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">MXN</p>
      </div>
      ${totalOverdue > 0 ? `
      <div style="flex:1;min-width:140px;background:#fff7ed;border-radius:8px;padding:16px 18px;border:1px solid #fed7aa;">
        <p style="margin:0 0 6px;font-size:12px;color:#f97316;font-weight:600;text-transform:uppercase;">Saldo Vencido</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#ea580c;">${fmt(totalOverdue)}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">MXN</p>
      </div>` : ""}
      ${usdTotal > 0 ? `
      <div style="flex:1;min-width:140px;background:#eff6ff;border-radius:8px;padding:16px 18px;border:1px solid #bfdbfe;">
        <p style="margin:0 0 6px;font-size:12px;color:#2563eb;font-weight:600;text-transform:uppercase;">Saldo Total</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#1d4ed8;">${fmt(usdTotal, "USD")}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">USD</p>
      </div>` : ""}
      <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:8px;padding:16px 18px;border:1px solid #bbf7d0;">
        <p style="margin:0 0 6px;font-size:12px;color:#16a34a;font-weight:600;text-transform:uppercase;">Facturas Activas</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#15803d;">${activeCount}</p>
      </div>
    </div>

    <!-- Invoices table -->
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;">
        Facturas Pendientes
      </h2>
      ${activeCount === 0 ? `
        <p style="color:#6b7280;font-style:italic;padding:16px 0;">Sin facturas pendientes.</p>
      ` : `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>${invoiceTableHeader}</thead>
        <tbody>${invoiceRows}</tbody>
      </table>`}
    </div>

    <!-- Payments table -->
    ${paymentRows.length > 0 ? `
    <div style="padding:0 32px 24px;">
      <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:.5px;">
        Últimos Pagos Registrados
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Fecha</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Referencia</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;">Factura</th>
            <th style="padding:8px 10px;text-align:right;color:#6b7280;font-weight:600;">Importe</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>` : ""}

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Estado de cuenta generado automáticamente por ${tenantName} · ${fmtDate(now)}
      </p>
      <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">Por favor, no responda a este correo.</p>
    </div>
  </div>
</body>
</html>`;

  const mailerSend = new MailerSend({ apiKey });
  const sentFrom = new Sender("noreply@nexxo.com.mx", tenantName);

  // Deduplicate recipients (MailerSend rejects the whole email if an address is
  // duplicated in TO or CC, or appears in both lists).
  const norm = (e: string) => e.trim().toLowerCase();
  const toSet = new Set<string>();
  const toList: string[] = [];
  for (const e of recipientEmails) {
    const k = norm(e);
    if (k && !toSet.has(k)) { toSet.add(k); toList.push(e.trim()); }
  }
  const ccSet = new Set<string>();
  const ccList: string[] = [];
  for (const e of ccEmails ?? []) {
    const k = norm(e);
    if (k && !toSet.has(k) && !ccSet.has(k)) { ccSet.add(k); ccList.push(e.trim()); }
  }

  let emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(toList.map((e) => new Recipient(e, customer.name)))
    .setSubject(`Estado de Cuenta — ${customer.name} — ${fmtDate(now)}`)
    .setHtml(html);

  if (ccList.length > 0) {
    emailParams = emailParams.setCc(ccList.map((e) => new Recipient(e, e)));
  }

  // Send with retry on rate limit (MailerSend error 429 / cloudflare 1015)
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mailerSend.email.send(emailParams);
      return;
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status ?? err?.body?.status;
      const isRateLimit = status === 429 || err?.body?.error_code === 1015;
      if (isRateLimit && attempt < maxAttempts) {
        const waitMs = 15000 * attempt;
        console.warn(`[StatementEmail] Rate limited (intento ${attempt}/${maxAttempts}), esperando ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}
