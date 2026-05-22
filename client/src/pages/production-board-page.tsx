import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Factory,
  RotateCcw,
  Maximize2,
  Minimize2,
  RefreshCw,
  CalendarDays,
  User,
  ChevronRight,
  Layers,
  ShieldAlert,
} from "lucide-react";

const REFRESH_INTERVAL = 60; // seconds

interface BoardOrder {
  id: string;
  folio: string;
  status: string;
  productionProgress: number;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  factoryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  daysRemaining: number | null;
  customerName: string;
  customerCity: string | null;
  purchaseOrder: string | null;
  deliveryTime: string | null;
  shippingNotes: string | null;
  itemCount: number;
  items: { productCode: string | null; productName: string; quantity: string; unitOfMeasure: string }[];
}

// Status columns to display (in order), excluding "delivered" from main board
const COLUMNS = [
  { key: "pending", label: "Pendiente", icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)" },
  { key: "in_production", label: "En Producción", icon: Factory, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)" },
  { key: "ready", label: "Listo", icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)" },
  { key: "partially_released", label: "Parcial. Surtido", icon: Layers, color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)" },
  { key: "released", label: "Surtido", icon: Package, color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)" },
  { key: "shipped", label: "Embarcado", icon: Truck, color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.4)" },
];

const DELIVERED_COL = { key: "delivered", label: "Entregados (7 días)", icon: CheckCircle2, color: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.3)" };

function urgencyLevel(daysRemaining: number | null, status: string): "overdue" | "warning" | "soon" | "ok" | "done" {
  if (status === "delivered" || status === "shipped") return "done";
  if (daysRemaining === null) return "ok";
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining === 0) return "warning";
  if (daysRemaining <= 3) return "soon";
  return "ok";
}

const URGENCY_STYLES = {
  overdue: { border: "#ef4444", glow: "0 0 0 2px rgba(239,68,68,0.5)", badge: { bg: "#ef4444", text: "#fff" } },
  warning: { border: "#f97316", glow: "0 0 0 2px rgba(249,115,22,0.4)", badge: { bg: "#f97316", text: "#fff" } },
  soon: { border: "#f59e0b", glow: "0 0 0 1px rgba(245,158,11,0.3)", badge: { bg: "#f59e0b", text: "#000" } },
  ok: { border: "rgba(255,255,255,0.08)", glow: "none", badge: { bg: "#22c55e", text: "#fff" } },
  done: { border: "rgba(255,255,255,0.06)", glow: "none", badge: { bg: "#6b7280", text: "#fff" } },
};

function daysBadge(daysRemaining: number | null, status: string) {
  if (status === "delivered") return null;
  if (daysRemaining === null) return null;
  const level = urgencyLevel(daysRemaining, status);
  const style = URGENCY_STYLES[level];
  let label = "";
  if (daysRemaining < 0) label = `${Math.abs(daysRemaining)}d vencido`;
  else if (daysRemaining === 0) label = "Hoy";
  else if (daysRemaining === 1) label = "Mañana";
  else label = `${daysRemaining}d`;
  return (
    <span
      style={{ background: style.badge.bg, color: style.badge.text, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, letterSpacing: "0.03em", whiteSpace: "nowrap" }}
    >
      {label}
    </span>
  );
}

function OrderCard({ order }: { order: BoardOrder }) {
  const [expanded, setExpanded] = useState(false);
  const urgency = urgencyLevel(order.daysRemaining, order.status);
  const style = URGENCY_STYLES[urgency];
  const hasBlock = order.factoryNotes && order.factoryNotes.trim().length > 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1.5px solid ${style.border}`,
        boxShadow: style.glow !== "none" ? style.glow : undefined,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "background 0.2s",
        position: "relative",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Overdue / Warning stripe at top */}
      {urgency === "overdue" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0", background: "linear-gradient(90deg,#ef4444,#f97316)" }} />
      )}
      {urgency === "warning" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0", background: "#f97316" }} />
      )}
      {urgency === "soon" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0", background: "#f59e0b" }} />
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "0.01em" }}>{order.folio}</span>
            {hasBlock && (
              <span title={order.factoryNotes || ""} style={{ display: "flex", alignItems: "center", gap: 3, color: "#ef4444", fontSize: 11, fontWeight: 600 }}>
                <ShieldAlert size={13} />
                Bloqueo
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {daysBadge(order.daysRemaining, order.status)}
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
            {order.itemCount} art.
          </span>
        </div>
      </div>

      {/* Progress bar (only for in_production) */}
      {order.status === "in_production" && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 600 }}>PRODUCCIÓN</span>
            <span style={{ color: "#3b82f6", fontSize: 10, fontWeight: 700 }}>{order.productionProgress}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${order.productionProgress}%`, background: "linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius: 10, transition: "width 0.5s" }} />
          </div>
        </div>
      )}

      {/* Estimated delivery row */}
      {order.estimatedDelivery && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 4 }}>
          <CalendarDays size={11} />
          <span>Entrega: {format(new Date(order.estimatedDelivery), "dd MMM yyyy", { locale: es })}</span>
        </div>
      )}
      {order.actualDelivery && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#22c55e", fontSize: 11, marginBottom: 4 }}>
          <CheckCircle2 size={11} />
          <span>Entregado: {format(new Date(order.actualDelivery), "dd MMM yyyy", { locale: es })}</span>
        </div>
      )}

      {/* OC */}
      {order.purchaseOrder && (
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 4 }}>
          OC: {order.purchaseOrder}
        </div>
      )}

      {/* Block/notes */}
      {hasBlock && !expanded && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, color: "#fca5a5", fontSize: 11, marginTop: 4, background: "rgba(239,68,68,0.08)", borderRadius: 6, padding: "5px 8px" }}>
          <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>
            {order.factoryNotes}
          </span>
        </div>
      )}

      {/* Expanded: full items list */}
      {expanded && (
        <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
          {hasBlock && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, color: "#fca5a5", fontSize: 11, marginBottom: 8, background: "rgba(239,68,68,0.08)", borderRadius: 6, padding: "6px 8px" }}>
              <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{order.factoryNotes}</span>
            </div>
          )}
          {order.deliveryTime && (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 6 }}>Tiempo de entrega: {order.deliveryTime}</div>
          )}
          {order.items.length > 0 && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, marginBottom: 5, letterSpacing: "0.05em" }}>ARTÍCULOS</div>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>
                  <span style={{ color: "#60a5fa", fontWeight: 600, flexShrink: 0 }}>
                    {parseFloat(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unitOfMeasure}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expand hint */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.2)", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </div>
    </div>
  );
}

function Column({ col, orders }: { col: typeof COLUMNS[0]; orders: BoardOrder[] }) {
  const Icon = col.icon;
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Column header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        background: col.bg,
        border: `1px solid ${col.border}`,
        borderRadius: "10px 10px 0 0",
        flexShrink: 0,
      }}>
        <Icon size={13} style={{ color: col.color, flexShrink: 0 }} />
        <span style={{ color: col.color, fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.label}</span>
        <span style={{
          background: col.border,
          color: "#fff",
          borderRadius: 20,
          padding: "1px 7px",
          fontSize: 11,
          fontWeight: 700,
          minWidth: 22,
          textAlign: "center",
          flexShrink: 0,
        }}>
          {orders.length}
        </span>
      </div>

      {/* Cards container */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 8,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${col.border}`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
      }}>
        {orders.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 60, color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
            Sin pedidos
          </div>
        ) : (
          orders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}

export default function ProductionBoardPage() {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showDelivered, setShowDelivered] = useState(false);

  const { data: orders, refetch, isLoading } = useQuery<BoardOrder[]>({
    queryKey: ["/api/board/orders"],
    refetchInterval: REFRESH_INTERVAL * 1000,
    staleTime: 30 * 1000,
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setLastUpdated(new Date());
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Group orders by status
  const grouped: Record<string, BoardOrder[]> = {};
  (orders || []).forEach(o => {
    if (!grouped[o.status]) grouped[o.status] = [];
    grouped[o.status].push(o);
  });

  // Sort active orders by urgency within columns (overdue first, then by daysRemaining asc)
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => {
      const aD = a.daysRemaining ?? 9999;
      const bD = b.daysRemaining ?? 9999;
      return aD - bD;
    });
  });

  const totalActive = COLUMNS.reduce((sum, col) => sum + (grouped[col.key]?.length || 0), 0);
  const totalOverdue = (orders || []).filter(o => o.daysRemaining !== null && o.daysRemaining < 0 && o.status !== "delivered" && o.status !== "shipped").length;

  return (
    <div style={{
      height: "100vh",
      background: "linear-gradient(180deg, #0a0f1e 0%, #0d1324 100%)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#fff",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
        gap: 12,
        flexWrap: "wrap",
      }}>
        {/* Left: title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Factory size={22} style={{ color: "#3b82f6" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.03em", color: "#fff" }}>
              Tablero de Producción
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              Nexxo — Sistema Comercial
            </div>
          </div>
        </div>

        {/* Center: stats */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>{totalActive}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>PEDIDOS ACTIVOS</div>
          </div>
          {totalOverdue > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{totalOverdue}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>VENCIDOS</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#6b7280" }}>{grouped["delivered"]?.length || 0}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>ENTREGADOS (7d)</div>
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
            <div>Actualizado {format(lastUpdated, "HH:mm:ss")}</div>
            <div style={{ color: countdown <= 10 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
              Refresco en {countdown}s
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Actualizar ahora"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 5 }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            <span style={{ fontSize: 12 }}>Actualizar</span>
          </button>

          <button
            onClick={() => setShowDelivered(!showDelivered)}
            title="Mostrar/ocultar entregados"
            style={{ background: showDelivered ? "rgba(107,114,128,0.3)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 5 }}
          >
            <CheckCircle2 size={14} style={{ color: "#6b7280" }} />
            <span style={{ fontSize: 12 }}>Entregados</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 9px", cursor: "pointer", color: "#fff" }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, padding: "6px 20px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, flexWrap: "wrap" }}>
        {[
          { color: "#ef4444", label: "Vencido" },
          { color: "#f97316", label: "Hoy" },
          { color: "#f59e0b", label: "≤ 3 días" },
          { color: "#22c55e", label: "En tiempo" },
          { color: "#ef4444", label: "Con bloqueo", icon: true },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {l.icon ? <ShieldAlert size={11} style={{ color: l.color }} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }} />}
            {l.label}
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          Haz clic en una tarjeta para ver los detalles
        </div>
      </div>

      {/* Board columns */}
      <div style={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        gap: 10,
        padding: "10px 14px 12px",
        alignItems: "stretch",
      }}>
        {/* Active status columns */}
        {COLUMNS.map(col => (
          <Column key={col.key} col={col} orders={grouped[col.key] || []} />
        ))}

        {/* Delivered column (optional) */}
        {showDelivered && (
          <Column col={DELIVERED_COL} orders={grouped["delivered"] || []} />
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div style={{ position: "fixed", bottom: 16, right: 16, background: "rgba(59,130,246,0.9)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <RotateCcw size={13} style={{ animation: "spin 1s linear infinite" }} />
          Actualizando...
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
