import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { getSelectedTenantId } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Empresa } from "@shared/schema";
import {
  RefreshCw, FileText, ShieldCheck, Package, Truck,
  Radio, Maximize2, Minimize2, ChevronDown,
  Calendar, DollarSign, User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Constants ─────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 20; // seconds

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PipelineQuotation {
  id: string; folio: string; status: string; total: string; currency: string;
  customerName: string | null; sellerName: string | null; createdAt: string;
  validUntil: string | null; tenantName?: string | null; empresaName?: string | null;
}
interface PipelineOrder {
  id: string; status: string; productionProgress: number;
  quotFolio: string | null; quotTotal: string | null; quotCurrency: string | null;
  customerName: string | null; sellerName: string | null; estimatedDelivery: string | null; createdAt: string;
  tenantName?: string | null; empresaName?: string | null;
}
interface PipelineShipment {
  id: string; status: string; transporter: string;
  trackingNumber: string | null; quotFolio: string | null; customerName: string | null;
  sellerName: string | null; shippedAt: string | null; createdAt: string;
  tenantName?: string | null; empresaName?: string | null;
}
interface PipelineCreditAuth {
  id: string; status: string; quotFolio: string | null; quotTotal: string | null;
  quotCurrency: string | null; customerName: string | null; sellerName: string | null; createdAt: string;
  tenantName?: string | null; empresaName?: string | null;
}
interface PipelineData {
  quotations: PipelineQuotation[];
  orders: PipelineOrder[];
  shipments: PipelineShipment[];
  creditAuths: PipelineCreditAuth[];
}
interface PipelineItem {
  id: string; productCode: string; description: string;
  qty: string | number; unit: string | null;
  unitPrice: string | null; discount: string | null; total: string | null;
}

// ─── Status configs ─────────────────────────────────────────────────────────────

const QUOT_STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", pending_approval: "#f59e0b",
  pending_authorization: "#f97316", authorized: "#22c55e",
  converted: "#14b8a6", rejected: "#ef4444", expired: "#6b7280",
};
const AUTH_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", approved: "#22c55e", rejected: "#ef4444",
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280", in_production: "#3b82f6", ready: "#22c55e",
  partially_released: "#f97316", released: "#a855f7", shipped: "#818cf8", delivered: "#10b981",
  closed: "#64748b", cancelled: "#ef4444",
};
const SHIP_STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280", in_transit: "#3b82f6", delivered: "#10b981",
};

const ACTIVE_QUOT  = new Set(["draft", "sent", "pending_approval", "pending_authorization", "authorized"]);
const ACTIVE_AUTH  = new Set(["pending"]);
const ACTIVE_ORDER = new Set(["pending", "in_production", "ready", "partially_released", "released"]);
const ACTIVE_SHIP  = new Set(["pending", "in_transit"]);

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: "quotations" as const,
    labelKey: "pipeline.quotations",
    icon: FileText,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.35)",
  },
  {
    key: "creditAuths" as const,
    labelKey: "pipeline.authorizations",
    icon: ShieldCheck,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.35)",
  },
  {
    key: "orders" as const,
    labelKey: "pipeline.orders",
    icon: Package,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.10)",
    border: "rgba(168,85,247,0.35)",
  },
  {
    key: "shipments" as const,
    labelKey: "pipeline.shipments",
    icon: Truck,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.35)",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}55`,
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      padding: "1px 7px",
      whiteSpace: "nowrap",
      letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

function EmpresaTag({ name }: { name?: string | null }) {
  if (!name) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: "uppercase",
      color: "rgba(255,255,255,0.75)",
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 4, padding: "1px 6px",
      letterSpacing: "0.06em", whiteSpace: "nowrap",
      flexShrink: 0,
    }} data-testid={`tag-empresa-${name}`}>
      {name}
    </span>
  );
}

function Money({ amount, currency }: { amount: string | null | undefined; currency?: string | null }) {
  if (!amount) return <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>;
  const cur = currency || "MXN";
  const n = parseFloat(amount).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return <span>{cur} {n}</span>;
}

function ShortDate({ date }: { date: string | null | undefined }) {
  if (!date) return <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>;
  return <span>{format(new Date(date), "d MMM yy", { locale: es })}</span>;
}

// ─── Expandable cards ────────────────────────────────────────────────────────

function ItemsList({ type, id, showPrices }: { type: string; id: string; showPrices: boolean }) {
  const { t } = useI18n();
  const { data: items = [], isLoading } = useQuery<PipelineItem[]>({
    queryKey: ["/api/pipeline/items", type, id],
    queryFn: async () => {
      const selectedTenantId = getSelectedTenantId();
      const headers: Record<string, string> = {};
      if (selectedTenantId) headers["X-Selected-Tenant-Id"] = selectedTenantId;
      const r = await fetch(`/api/pipeline/items?type=${type}&id=${id}`, { credentials: "include", headers });
      if (!r.ok) throw new Error("Error");
      return r.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, padding: "6px 0" }}>
        {t("pipeline.loading-items")}
      </div>
    );
  }
  if (!items.length) {
    return <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>{t("reports.no-items")}</div>;
  }
  return (
    <div>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600, marginBottom: 5, letterSpacing: "0.06em" }}>
        {t("board.items")}
      </div>
      {items.map((item, i) => (
        <div key={item.id ?? i} style={{ display: "flex", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4, alignItems: "baseline" }}>
          <span style={{ color: "#60a5fa", fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {parseFloat(String(item.qty)).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unit ?? "pza"}
          </span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.description || item.productCode || "—"}
          </span>
          {showPrices && item.total && (
            <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {parseFloat(item.total).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Quotation card ───────────────────────────────────────────────────────────

function QuotCard({ q }: { q: PipelineQuotation }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const quotStatusKey: Record<string, string> = {
    draft: "status.draft", sent: "status.sent",
    pending_approval: "status.pending-approval",
    pending_authorization: "status.pending-authorization",
    authorized: "status.authorized", converted: "status.converted",
    rejected: "status.rejected", expired: "status.expired",
  };
  const cfg = { label: t(quotStatusKey[q.status] ?? q.status), color: QUOT_STATUS_COLORS[q.status] ?? "#6b7280" };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(59,130,246,0.2)",
        borderRadius: 10,
        padding: "11px 13px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded(!expanded)}
      data-testid={`card-quotation-${q.id}`}
    >
      {q.tenantName && (
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(99,179,237,0.8)", background: "rgba(59,130,246,0.1)", borderRadius: 4, padding: "2px 6px", marginBottom: 5, letterSpacing: "0.06em", display: "inline-block" }}>
          {q.tenantName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
          <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: 14, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>{q.folio}</span>
          <EmpresaTag name={q.empresaName} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StatusPill color={cfg.color} label={cfg.label} />
          <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 3 }}>
        <DollarSign size={10} style={{ flexShrink: 0 }} />
        <Money amount={q.total} currency={q.currency} />
        <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
          <ShortDate date={q.createdAt} />
        </span>
      </div>

      {q.sellerName && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {q.sellerName}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <ItemsList type="quotation" id={q.id} showPrices />
        </div>
      )}
    </div>
  );
}

// ─── Auth card ────────────────────────────────────────────────────────────────

function AuthCard({ a }: { a: PipelineCreditAuth }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const authStatusKey: Record<string, string> = {
    pending: "status.pending", approved: "status.approved", rejected: "status.rejected",
  };
  const cfg = { label: t(authStatusKey[a.status] ?? a.status), color: AUTH_STATUS_COLORS[a.status] ?? "#6b7280" };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(245,158,11,0.2)",
        borderRadius: 10,
        padding: "11px 13px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded(!expanded)}
      data-testid={`card-auth-${a.id}`}
    >
      {a.tenantName && (
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(253,211,77,0.8)", background: "rgba(245,158,11,0.1)", borderRadius: 4, padding: "2px 6px", marginBottom: 5, letterSpacing: "0.06em", display: "inline-block" }}>
          {a.tenantName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
          <span style={{ color: "#fcd34d", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{a.quotFolio ?? "—"}</span>
          <EmpresaTag name={a.empresaName} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StatusPill color={cfg.color} label={cfg.label} />
          <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 3 }}>
        <DollarSign size={10} style={{ flexShrink: 0 }} />
        <Money amount={a.quotTotal} currency={a.quotCurrency} />
        <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
          <ShortDate date={a.createdAt} />
        </span>
      </div>

      {a.sellerName && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", fontSize: 10, overflow: "hidden" }}>
          <User size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.sellerName}</span>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <ItemsList type="creditAuth" id={a.id} showPrices />
        </div>
      )}
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ o }: { o: PipelineOrder }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const orderStatusKey: Record<string, string> = {
    pending: "status.pending", in_production: "status.in-production", ready: "status.ready",
    partially_released: "status.partial", released: "status.released",
    shipped: "status.shipped", delivered: "status.delivered",
    closed: "status.closed", cancelled: "status.cancelled",
  };
  const cfg = { label: t(orderStatusKey[o.status] ?? o.status), color: ORDER_STATUS_COLORS[o.status] ?? "#6b7280" };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(168,85,247,0.22)",
        borderRadius: 10,
        padding: "11px 13px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded(!expanded)}
      data-testid={`card-order-${o.id}`}
    >
      {o.tenantName && (
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(216,180,254,0.8)", background: "rgba(168,85,247,0.1)", borderRadius: 4, padding: "2px 6px", marginBottom: 5, letterSpacing: "0.06em", display: "inline-block" }}>
          {o.tenantName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
          <span style={{ color: "#d8b4fe", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{o.quotFolio ?? "—"}</span>
          <EmpresaTag name={o.empresaName} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StatusPill color={cfg.color} label={cfg.label} />
          <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>
      </div>

      {/* Progress bar */}
      {o.status === "in_production" && (
        <div style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600 }}>{t("pipeline.production-label")}</span>
            <span style={{ color: "#a855f7", fontSize: 10, fontWeight: 700 }}>{o.productionProgress}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${o.productionProgress}%`, background: "linear-gradient(90deg,#a855f7,#c084fc)", borderRadius: 10, transition: "width 0.5s" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 3 }}>
        <DollarSign size={10} style={{ flexShrink: 0 }} />
        <Money amount={o.quotTotal} currency={o.quotCurrency} />
        {o.estimatedDelivery && (
          <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
            <Calendar size={10} />
            <ShortDate date={o.estimatedDelivery} />
          </span>
        )}
      </div>

      {o.sellerName && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", fontSize: 10, overflow: "hidden" }}>
          <User size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.sellerName}</span>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <ItemsList type="order" id={o.id} showPrices />
        </div>
      )}
    </div>
  );
}

// ─── Shipment card ────────────────────────────────────────────────────────────

function ShipmentCard({ s }: { s: PipelineShipment }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const shipStatusKey: Record<string, string> = {
    pending: "status.pending", in_transit: "status.in-transit", delivered: "status.delivered",
  };
  const cfg = { label: t(shipStatusKey[s.status] ?? s.status), color: SHIP_STATUS_COLORS[s.status] ?? "#6b7280" };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(16,185,129,0.2)",
        borderRadius: 10,
        padding: "11px 13px",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded(!expanded)}
      data-testid={`card-shipment-${s.id}`}
    >
      {s.tenantName && (
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(110,231,183,0.8)", background: "rgba(16,185,129,0.1)", borderRadius: 4, padding: "2px 6px", marginBottom: 5, letterSpacing: "0.06em", display: "inline-block" }}>
          {s.tenantName}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
          <span style={{ color: "#6ee7b7", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{s.quotFolio ?? "—"}</span>
          <EmpresaTag name={s.empresaName} />
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StatusPill color={cfg.color} label={cfg.label} />
          <ChevronDown size={11} style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
        </div>
      </div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
        {s.transporter}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>
        <span style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {s.trackingNumber ?? <em>{t("pipeline.no-tracking")}</em>}
        </span>
        <ShortDate date={s.shippedAt ?? s.createdAt} />
      </div>

      {s.sellerName && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)", fontSize: 10, overflow: "hidden" }}>
          <User size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sellerName}</span>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <ItemsList type="shipment" id={s.id} showPrices={false} />
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ col, count, total, children, isLoading, isFullscreen }:
  { col: typeof COLUMNS[0]; count: number; total: number; children: React.ReactNode; isLoading: boolean; isFullscreen: boolean }) {
  const { t } = useI18n();
  const Icon = col.icon;
  const maxH = isFullscreen ? "calc(100vh - 140px)" : "calc(100vh - 260px)";
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 12px",
        background: col.bg,
        border: `1px solid ${col.border}`,
        borderRadius: "10px 10px 0 0",
        flexShrink: 0,
      }}>
        <Icon size={13} style={{ color: col.color, flexShrink: 0 }} />
        <span style={{ color: col.color, fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t(col.labelKey)}
        </span>
        <span style={{ background: col.border, color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {count}
        </span>
        {count !== total && (
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, flexShrink: 0 }}>/ {total}</span>
        )}
      </div>

      {/* Cards container */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        display: "flex", flexDirection: "column", gap: 6,
        padding: 8,
        background: "rgba(255,255,255,0.015)",
        border: `1px solid ${col.border}`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        maxHeight: maxH,
        minHeight: 80,
      }}>
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            {t("label.loading")}
          </div>
        ) : count === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            {t("pipeline.no-records")}
          </div>
        ) : children}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { t } = useI18n();
  const [location] = useLocation();
  const isTvMode = location === "/pipeline-tv";
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showActive, setShowActive] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [showTvPrompt, setShowTvPrompt] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState("all");

  // Vendedores bound to an empresa are locked to it; other roles (Producción,
  // Administración) can switch empresa to see each board separately.
  const { user } = useAuth();
  const isRestrictedVendedor = user?.role === "vendedor" && !!user?.empresaId;
  const { data: empresas = [] } = useQuery<Empresa[]>({
    queryKey: ["/api/empresas"],
    enabled: !isRestrictedVendedor,
  });
  interface SimpleCompany { id: string; name: string; parentId: string | null; }
  const { data: companies = [] } = useQuery<SimpleCompany[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin",
  });
  const hasMultipleCompanies = user?.role === "admin" && companies.length > 1;
  // "all" with multiple companies = scope=all (todas las compañías combinadas).
  const scopeAll = hasMultipleCompanies && selectedCompany === "all";
  const showEmpresaSelector = !isRestrictedVendedor && !scopeAll && empresas.length > 1;

  const { data, refetch, isFetching, isLoading } = useQuery<PipelineData>({
    queryKey: ["/api/pipeline", scopeAll ? "all" : selectedCompany, selectedEmpresa],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (scopeAll) {
        params.set("scope", "all");
      } else {
        if (hasMultipleCompanies && selectedCompany !== "all") {
          params.set("tenantId", selectedCompany);
        }
        if (selectedEmpresa !== "all") {
          params.set("empresaId", selectedEmpresa);
        }
      }
      const paramStr = params.toString();
      const url = `/api/pipeline${paramStr ? `?${paramStr}` : ""}`;
      const selectedTenantId = getSelectedTenantId();
      const headers: Record<string, string> = {};
      if (selectedTenantId) headers["X-Selected-Tenant-Id"] = selectedTenantId;
      const r = await fetch(url, { credentials: "include", headers });
      if (!r.ok) throw new Error("Error");
      return r.json();
    },
    refetchInterval: REFRESH_INTERVAL * 1000,
    staleTime: 15_000,
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setLastUpdated(new Date()); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastUpdated(new Date());
    setCountdown(REFRESH_INTERVAL);
  }, [refetch]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Filter data
  const allQuots  = data?.quotations  ?? [];
  const allAuths  = data?.creditAuths ?? [];
  const allOrds   = data?.orders      ?? [];
  const allShips  = data?.shipments   ?? [];

  const quots = showActive ? allQuots.filter(q => ACTIVE_QUOT.has(q.status))  : allQuots;
  const auths = showActive ? allAuths.filter(a => ACTIVE_AUTH.has(a.status))  : allAuths;
  const ords  = showActive ? allOrds.filter(o => ACTIVE_ORDER.has(o.status))  : allOrds;
  const ships = showActive ? allShips.filter(s => ACTIVE_SHIP.has(s.status))  : allShips;

  const columnData = [
    { col: COLUMNS[0], items: quots,  total: allQuots.length },
    { col: COLUMNS[1], items: auths,  total: allAuths.length },
    { col: COLUMNS[2], items: ords,   total: allOrds.length  },
    { col: COLUMNS[3], items: ships,  total: allShips.length },
  ];

  const btnBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 8, padding: "7px 11px",
    cursor: "pointer", color: "#fff",
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, fontFamily: "inherit",
  };

  return (
    <div style={{
      height: "100vh",
      background: "linear-gradient(180deg, #0a0f1e 0%, #0d1324 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#fff", overflow: "hidden",
    }}>
      {isTvMode && showTvPrompt && !isFullscreen && (
        <div
          onClick={() => {
            document.documentElement.requestFullscreen()
              .then(() => {
                setIsFullscreen(true);
                setShowTvPrompt(false);
              })
              .catch(() => {});
          }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
          data-testid="overlay-tv-fullscreen"
        >
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            padding: "28px 40px", borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}>
            <Maximize2 size={34} style={{ color: "#3b82f6" }} />
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t("pipeline.click-fullscreen")}</div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        background: "rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0, gap: 12, flexWrap: "wrap",
      }}>
        {/* Left: title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Radio size={22} style={{ color: "#3b82f6" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.03em", color: "#fff" }}>
              {t("pipeline.board-title")}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              Nexxo — {t("app.tagline")}
            </div>
          </div>
        </div>

        {/* Center: KPIs */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: t("pipeline.quotations").toUpperCase(),      value: allQuots.length, color: "#3b82f6" },
            { label: t("pipeline.authorizations").toUpperCase(),  value: allAuths.length, color: "#f59e0b" },
            { label: t("pipeline.orders").toUpperCase(),          value: allOrds.length,  color: "#a855f7" },
            { label: t("pipeline.shipments").toUpperCase(),       value: allShips.length, color: "#10b981" },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.07em", marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
            <div>{t("pipeline.updated")} {format(lastUpdated, "HH:mm:ss")}</div>
            <div style={{ color: countdown <= 8 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
              {t("pipeline.refresh-in")} {countdown}s
            </div>
          </div>

          {hasMultipleCompanies && (
            <select
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setSelectedEmpresa("all"); }}
              style={{ ...btnBase, display: "inline-block", appearance: "auto" }}
              data-testid="select-pipeline-company"
            >
              <option value="all" style={{ color: "#000" }}>Todas las compañías</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} style={{ color: "#000" }}>{c.name}</option>
              ))}
            </select>
          )}

          {showEmpresaSelector && (
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              style={{ ...btnBase, display: "inline-block", appearance: "auto" }}
              data-testid="select-pipeline-empresa"
            >
              <option value="all" style={{ color: "#000" }}>Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id} style={{ color: "#000" }}>{e.name}</option>
              ))}
            </select>
          )}

          <button onClick={handleManualRefresh} title={t("pipeline.refresh")} style={btnBase} data-testid="button-refresh">
            <RefreshCw size={13} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
            <span>{t("pipeline.refresh")}</span>
          </button>

          <button
            onClick={() => setShowActive(!showActive)}
            title={`${t("pipeline.active")} / ${t("pipeline.all")}`}
            style={{ ...btnBase, background: showActive ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.07)", border: showActive ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.14)" }}
            data-testid="button-filter-active"
          >
            <span style={{ fontSize: 11 }}>{showActive ? t("pipeline.active") : t("pipeline.all")}</span>
          </button>

          <button onClick={toggleFullscreen} title={isFullscreen ? t("btn.exit-fullscreen") : t("btn.fullscreen")} style={btnBase} data-testid="button-fullscreen">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, padding: "5px 20px",
        background: "rgba(0,0,0,0.2)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0, flexWrap: "wrap", alignItems: "center",
      }}>
        {[
          { color: "#3b82f6",  labelKey: "pipeline.quotations" },
          { color: "#f59e0b",  labelKey: "pipeline.authorizations" },
          { color: "#a855f7",  labelKey: "pipeline.orders" },
          { color: "#10b981",  labelKey: "pipeline.shipments" },
        ].map(l => (
          <div key={l.labelKey} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            {t(l.labelKey)}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          {t("pipeline.click-hint")}
        </div>
      </div>

      {/* Board */}
      <div style={{
        flex: 1, overflow: "hidden",
        display: "flex", gap: 10,
        padding: "10px 14px 12px",
        alignItems: "stretch",
      }}>
        {columnData.map(({ col, items, total }) => (
          <Column key={col.key} col={col} count={items.length} total={total} isLoading={isLoading} isFullscreen={isFullscreen}>
            {col.key === "quotations"  && (items as PipelineQuotation[]).map(q  => <QuotCard     key={q.id}  q={q} />)}
            {col.key === "creditAuths" && (items as PipelineCreditAuth[]).map(a  => <AuthCard     key={a.id}  a={a} />)}
            {col.key === "orders"      && (items as PipelineOrder[]).map(o       => <OrderCard    key={o.id}  o={o} />)}
            {col.key === "shipments"   && (items as PipelineShipment[]).map(s    => <ShipmentCard key={s.id}  s={s} />)}
          </Column>
        ))}
      </div>

      {/* Loading overlay */}
      {isFetching && (
        <div style={{
          position: "fixed", bottom: 16, right: 16,
          background: "rgba(59,130,246,0.9)", color: "#fff",
          borderRadius: 8, padding: "8px 14px",
          fontSize: 12, display: "flex", alignItems: "center", gap: 6,
          zIndex: 100,
        }}>
          <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
          {t("pipeline.updating")}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}</style>
    </div>
  );
}
