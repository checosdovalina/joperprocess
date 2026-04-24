import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, FileText, ShieldCheck, Package, Truck, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineQuotation {
  id: string; folio: string; status: string; total: string; currency: string;
  customerName: string | null; sellerName: string | null; createdAt: string;
  validUntil: string | null; shippingApprovalStatus: string | null;
}

interface PipelineOrder {
  id: string; status: string; productionProgress: number;
  quotFolio: string | null; quotTotal: string | null; quotCurrency: string | null;
  customerName: string | null; estimatedDelivery: string | null; createdAt: string;
}

interface PipelineShipment {
  id: string; status: string; transporter: string; transportType: string;
  trackingNumber: string | null; quotFolio: string | null; customerName: string | null;
  shippedAt: string | null; deliveredAt: string | null; createdAt: string;
}

interface PipelineCreditAuth {
  id: string; status: string; quotFolio: string | null; quotTotal: string | null;
  quotCurrency: string | null; customerName: string | null; createdAt: string;
}

interface PipelineData {
  quotations: PipelineQuotation[];
  orders: PipelineOrder[];
  shipments: PipelineShipment[];
  creditAuths: PipelineCreditAuth[];
}

// ─── Status configs ────────────────────────────────────────────────────────────

const QUOT_STATUS: Record<string, { label: string; color: string }> = {
  draft:                  { label: "Borrador",          color: "bg-muted text-muted-foreground" },
  sent:                   { label: "Enviada",           color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  pending_approval:       { label: "Pend. Aprobación",  color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  pending_authorization:  { label: "Pend. Autorización",color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  authorized:             { label: "Autorizada",        color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  converted:              { label: "Convertida",        color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  rejected:               { label: "Rechazada",         color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  expired:                { label: "Vencida",           color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const AUTH_STATUS: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  approved: { label: "Aprobada",  color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:            { label: "Pendiente",          color: "bg-muted text-muted-foreground" },
  in_production:      { label: "En Producción",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  ready:              { label: "Listo",               color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  partially_released: { label: "Parcial",             color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  released:           { label: "Liberado",            color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  shipped:            { label: "Embarcado",           color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  delivered:          { label: "Entregado",           color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

const SHIP_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pendiente",   color: "bg-muted text-muted-foreground" },
  in_transit: { label: "En Tránsito", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  delivered:  { label: "Entregado",   color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

// Active statuses (shown in "Activos" filter)
const ACTIVE_QUOT = new Set(["draft", "sent", "pending_approval", "pending_authorization", "authorized"]);
const ACTIVE_AUTH = new Set(["pending"]);
const ACTIVE_ORDER = new Set(["pending", "in_production", "ready", "partially_released", "released"]);
const ACTIVE_SHIP = new Set(["pending", "in_transit"]);

// ─── Helper components ─────────────────────────────────────────────────────────

function StatusBadge({ map, status }: { map: Record<string, { label: string; color: string }>; status: string }) {
  const cfg = map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold leading-tight ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function Money({ amount, currency }: { amount: string | null | undefined; currency?: string | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const n = parseFloat(amount);
  const cur = currency || "MXN";
  return <span>{cur} {n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>;
}

function ShortDate({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  return <span>{format(new Date(date), "d MMM yy", { locale: es })}</span>;
}

function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
    </div>
  );
}

// ─── Stat summary strip ────────────────────────────────────────────────────────

function StatStrip({ icon: Icon, title, total, highlight, highlightLabel, color }:
  { icon: React.ElementType; title: string; total: number; highlight: number; highlightLabel: string; color: string }) {
  return (
    <Card className="flex-1">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex items-center justify-center h-9 w-9 rounded-md shrink-0 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-bold leading-tight">{total}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{highlight}</span> {highlightLabel}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Panel cards ───────────────────────────────────────────────────────────────

function QuotCard({ q, onClick }: { q: PipelineQuotation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md border bg-card hover-elevate transition-all"
      data-testid={`card-quotation-${q.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-primary">{q.folio}</span>
        <StatusBadge map={QUOT_STATUS} status={q.status} />
      </div>
      <p className="text-sm font-medium truncate">{q.customerName ?? "Sin cliente"}</p>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-sm font-semibold"><Money amount={q.total} currency={q.currency} /></span>
        <span className="text-[11px] text-muted-foreground"><ShortDate date={q.createdAt} /></span>
      </div>
      {q.sellerName && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{q.sellerName}</p>
      )}
    </button>
  );
}

function AuthCard({ a, onClick }: { a: PipelineCreditAuth; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md border bg-card hover-elevate transition-all"
      data-testid={`card-auth-${a.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-primary">{a.quotFolio ?? "—"}</span>
        <StatusBadge map={AUTH_STATUS} status={a.status} />
      </div>
      <p className="text-sm font-medium truncate">{a.customerName ?? "Sin cliente"}</p>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-sm font-semibold"><Money amount={a.quotTotal} currency={a.quotCurrency} /></span>
        <span className="text-[11px] text-muted-foreground"><ShortDate date={a.createdAt} /></span>
      </div>
    </button>
  );
}

function OrderCard({ o, onClick }: { o: PipelineOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md border bg-card hover-elevate transition-all"
      data-testid={`card-order-${o.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-primary">{o.quotFolio ?? "—"}</span>
        <StatusBadge map={ORDER_STATUS} status={o.status} />
      </div>
      <p className="text-sm font-medium truncate">{o.customerName ?? "Sin cliente"}</p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Producción</span>
          <span className="font-semibold text-foreground">{o.productionProgress}%</span>
        </div>
        <Progress value={o.productionProgress} className="h-1.5" />
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-sm font-semibold"><Money amount={o.quotTotal} currency={o.quotCurrency} /></span>
        {o.estimatedDelivery ? (
          <span className="text-[11px] text-muted-foreground">Est: <ShortDate date={o.estimatedDelivery} /></span>
        ) : (
          <span className="text-[11px] text-muted-foreground"><ShortDate date={o.createdAt} /></span>
        )}
      </div>
    </button>
  );
}

function ShipmentCard({ s, onClick }: { s: PipelineShipment; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-md border bg-card hover-elevate transition-all"
      data-testid={`card-shipment-${s.id}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-bold text-primary">{s.quotFolio ?? "—"}</span>
        <StatusBadge map={SHIP_STATUS} status={s.status} />
      </div>
      <p className="text-sm font-medium truncate">{s.customerName ?? "Sin cliente"}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.transporter}</p>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {s.trackingNumber ? (
          <span className="text-[11px] font-mono text-muted-foreground truncate">{s.trackingNumber}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">Sin guía</span>
        )}
        <span className="text-[11px] text-muted-foreground shrink-0">
          <ShortDate date={s.shippedAt ?? s.createdAt} />
        </span>
      </div>
    </button>
  );
}

// ─── Panel container ───────────────────────────────────────────────────────────

function Panel({ title, icon: Icon, count, total, color, children, isLoading }:
  { title: string; icon: React.ElementType; count: number; total: number; color: string; children: React.ReactNode; isLoading: boolean }) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${color} text-white`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-semibold text-sm flex-1">{title}</span>
        <span className="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded">{count}</span>
        {count !== total && (
          <span className="text-[10px] opacity-75">de {total}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-2 border border-t-0 rounded-b-md bg-muted/30 min-h-[200px] max-h-[calc(100vh-280px)]">
        {isLoading ? <PanelSkeleton /> : (
          count === 0
            ? <p className="text-center text-sm text-muted-foreground py-8">Sin registros</p>
            : children
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [, navigate] = useLocation();
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<PipelineData>({
    queryKey: ["/api/pipeline"],
    staleTime: 30_000,
  });

  // Filtered items
  const quots = (data?.quotations ?? []).filter(q => showAll || ACTIVE_QUOT.has(q.status));
  const auths = (data?.creditAuths ?? []).filter(a => showAll || ACTIVE_AUTH.has(a.status));
  const ords  = (data?.orders ?? []).filter(o => showAll || ACTIVE_ORDER.has(o.status));
  const ships = (data?.shipments ?? []).filter(s => showAll || ACTIVE_SHIP.has(s.status));

  const totalQuots = data?.quotations.length ?? 0;
  const totalAuths = data?.creditAuths.length ?? 0;
  const totalOrds  = data?.orders.length ?? 0;
  const totalShips = data?.shipments.length ?? 0;

  // KPI highlights
  const pendingAuth   = (data?.creditAuths ?? []).filter(a => a.status === "pending").length;
  const inProduction  = (data?.orders ?? []).filter(o => o.status === "in_production").length;
  const inTransit     = (data?.shipments ?? []).filter(s => s.status === "in_transit").length;
  const pendingApproval = (data?.quotations ?? []).filter(q => ["pending_approval", "pending_authorization"].includes(q.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-pipeline-title">Tablero de Operaciones</h1>
          <p className="text-sm text-muted-foreground">Seguimiento del flujo comercial en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAll(v => !v)}
            data-testid="button-toggle-filter"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            {showAll ? "Todos" : "Activos"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI summary strip */}
      <div className="flex flex-wrap gap-3">
        <StatStrip
          icon={FileText}
          title="Cotizaciones"
          total={totalQuots}
          highlight={pendingApproval}
          highlightLabel="requieren atención"
          color="bg-blue-600"
        />
        <StatStrip
          icon={ShieldCheck}
          title="Autorizaciones"
          total={totalAuths}
          highlight={pendingAuth}
          highlightLabel="pendientes"
          color="bg-amber-600"
        />
        <StatStrip
          icon={Package}
          title="Pedidos"
          total={totalOrds}
          highlight={inProduction}
          highlightLabel="en producción"
          color="bg-violet-600"
        />
        <StatStrip
          icon={Truck}
          title="Embarques"
          total={totalShips}
          highlight={inTransit}
          highlightLabel="en tránsito"
          color="bg-emerald-600"
        />
      </div>

      {/* 4-panel pipeline grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Cotizaciones */}
        <Panel
          title="Cotizaciones"
          icon={FileText}
          count={quots.length}
          total={totalQuots}
          color="bg-blue-600"
          isLoading={isLoading}
        >
          {quots.map(q => (
            <QuotCard
              key={q.id}
              q={q}
              onClick={() => navigate("/quotations")}
            />
          ))}
        </Panel>

        {/* Autorizaciones de Crédito */}
        <Panel
          title="Autorizaciones"
          icon={ShieldCheck}
          count={auths.length}
          total={totalAuths}
          color="bg-amber-600"
          isLoading={isLoading}
        >
          {auths.map(a => (
            <AuthCard
              key={a.id}
              a={a}
              onClick={() => navigate("/credit-auth")}
            />
          ))}
        </Panel>

        {/* Pedidos */}
        <Panel
          title="Pedidos"
          icon={Package}
          count={ords.length}
          total={totalOrds}
          color="bg-violet-600"
          isLoading={isLoading}
        >
          {ords.map(o => (
            <OrderCard
              key={o.id}
              o={o}
              onClick={() => navigate("/orders")}
            />
          ))}
        </Panel>

        {/* Embarques */}
        <Panel
          title="Embarques"
          icon={Truck}
          count={ships.length}
          total={totalShips}
          color="bg-emerald-600"
          isLoading={isLoading}
        >
          {ships.map(s => (
            <ShipmentCard
              key={s.id}
              s={s}
              onClick={() => navigate("/shipments")}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
