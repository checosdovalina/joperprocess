import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AlertTriangle, Building2, FileText } from "lucide-react";

interface StatementData {
  customer: { id: string; name: string; email: string | null; rfc: string | null; phone: string | null };
  invoices: Array<{
    id: string; serie: string; folio: string; issuedAt: string; dueDate: string | null;
    total: string; balanceDue: string | null; status: string; currency: string;
  }>;
  payments: Array<{
    id: string; paymentDate: string; amount: string; reference: string | null; invoiceId: string | null;
  }>;
  tenant: { name: string; legalName?: string | null; primaryColor?: string | null; logoUrl?: string | null; rfc?: string | null } | null;
}

function fmt(v: string | number, currency = "MXN") {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString("es-MX", { style: "currency", currency, minimumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(s: string) {
  return { pending_payment: "Pendiente", partially_paid: "Pago Parcial", paid: "Pagado", cancelled: "Cancelada" }[s] ?? s;
}

function statusColor(s: string) {
  return { pending_payment: "#dc2626", partially_paid: "#d97706", paid: "#16a34a", cancelled: "#6b7280" }[s] ?? "#374151";
}

export default function PublicAccountStatementPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<StatementData>({
    queryKey: ["/api/public/account-statement", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/account-statement/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error ?? "No se pudo cargar el estado de cuenta");
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando estado de cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no disponible</h2>
          <p className="text-gray-500">{(error as Error)?.message ?? "Este enlace ha expirado o no es válido."}</p>
          <p className="text-sm text-gray-400 mt-4">Los enlaces de estado de cuenta son válidos por 7 días.</p>
        </div>
      </div>
    );
  }

  const { customer, invoices, payments, tenant } = data;
  const now = new Date();
  const primaryColor = tenant?.primaryColor || "#1e3a5f";
  const companyName = tenant?.legalName || tenant?.name || "Nexxo";

  const activeInvoices = invoices.filter((inv) => inv.status === "pending_payment" || inv.status === "partially_paid");
  const totalBalance = activeInvoices.reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
  const totalOverdue = activeInvoices
    .filter((inv) => inv.dueDate && new Date(inv.dueDate) < now)
    .reduce((s, inv) => s + (parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0), 0);
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div style={{ background: primaryColor }} className="px-8 py-7 flex justify-between items-start">
          <div>
            <h1 className="text-white text-xl font-bold tracking-wide">{companyName.toUpperCase()}</h1>
            <p className="text-white/70 text-sm mt-1">Estado de Cuenta</p>
            {tenant?.rfc && <p className="text-white/60 text-xs mt-0.5">RFC: {tenant.rfc}</p>}
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Corte al</p>
            <p className="text-white font-semibold text-sm">{fmtDate(now.toISOString())}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="px-8 py-5 bg-gray-50 border-b">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
          <p className="text-lg font-bold text-gray-900">{customer.name}</p>
          {customer.rfc && <p className="text-sm text-gray-500 mt-0.5">RFC: {customer.rfc}</p>}
          {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-8 py-5 border-b">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-500 uppercase mb-1">Saldo Total</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalBalance)}</p>
          </div>
          {totalOverdue > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Saldo Vencido</p>
              <p className="text-xl font-bold text-orange-600">{fmt(totalOverdue)}</p>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Facturas Activas</p>
            <p className="text-xl font-bold text-blue-700">{activeInvoices.length}</p>
          </div>
        </div>

        {/* Invoices */}
        <div className="px-8 py-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Facturas Pendientes
          </h2>
          {activeInvoices.length === 0 ? (
            <p className="text-gray-400 italic text-sm">Sin facturas pendientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Folio</th>
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Emisión</th>
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Vencimiento</th>
                    <th className="text-right py-2 text-xs text-gray-400 font-semibold">Total</th>
                    <th className="text-right py-2 text-xs text-gray-400 font-semibold">Saldo</th>
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold pl-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoices.map((inv) => {
                    const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
                    const bal = parseFloat(inv.balanceDue ?? inv.total ?? "0") || 0;
                    return (
                      <tr key={inv.id} className="border-b border-gray-50">
                        <td className="py-2.5 font-semibold text-gray-800">{inv.serie}-{inv.folio}</td>
                        <td className="py-2.5 text-gray-500">{fmtDate(inv.issuedAt)}</td>
                        <td className={`py-2.5 ${isOverdue ? "text-red-500 font-medium" : "text-gray-500"}`}>
                          {fmtDate(inv.dueDate)}{isOverdue ? " ⚠" : ""}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">{fmt(inv.total, inv.currency)}</td>
                        <td className="py-2.5 text-right font-bold" style={{ color: statusColor(inv.status) }}>
                          {fmt(bal, inv.currency)}
                        </td>
                        <td className="py-2.5 pl-3">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: statusColor(inv.status) + "20", color: statusColor(inv.status) }}
                          >
                            {statusLabel(inv.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments */}
        {recentPayments.length > 0 && (
          <div className="px-8 pb-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Últimos Pagos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Fecha</th>
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Referencia</th>
                    <th className="text-left py-2 text-xs text-gray-400 font-semibold">Factura</th>
                    <th className="text-right py-2 text-xs text-gray-400 font-semibold">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((pay) => {
                    const inv = invoices.find((i) => i.id === pay.invoiceId);
                    return (
                      <tr key={pay.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-500">{fmtDate(pay.paymentDate)}</td>
                        <td className="py-2.5 text-gray-700">{pay.reference ?? "—"}</td>
                        <td className="py-2.5 text-gray-500">{inv ? `${inv.serie}-${inv.folio}` : "—"}</td>
                        <td className="py-2.5 text-right font-semibold text-green-600">+{fmt(pay.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ background: primaryColor }} className="px-8 py-4 text-center">
          <p className="text-white/60 text-xs">Estado de cuenta generado automáticamente · {companyName}</p>
          <p className="text-white/40 text-xs mt-1">Este enlace es válido por 7 días · No requiere contraseña</p>
        </div>
      </div>
    </div>
  );
}
