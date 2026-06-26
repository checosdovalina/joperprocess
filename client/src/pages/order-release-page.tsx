import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText,
  Truck,
  Pencil,
  Search,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QuotationForm } from "@/components/quotation-form";
import { Customer, InsertQuotation, InsertQuotationItem } from "@shared/schema";

interface ReleaseOrderItem {
  id: string;
  productCode: string | null;
  productName: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  discountPercent: string;
  subtotal: string;
  currency: string;
}

interface ReleaseOrder {
  id: string;
  quotationId: string;
  folio: string;
  customerName: string;
  customerRfc: string | null;
  vendedorName: string;
  vendedorEmail: string;
  purchaseOrder: string | null;
  quotationTotal: string;
  currency: string;
  paymentTerms: string | null;
  deliveryTime: string | null;
  conditions: string | null;
  subtotal: string;
  globalDiscount: string;
  tax: string;
  exchangeRate: string | null;
  shippingHandledByJoper: boolean;
  shippingMethod: string | null;
  shippingCost: string;
  creditReleaseDate: string | null;
  shippingDate: string | null;
  notes: string | null;
  releaseStatus: string;
  releaseNotes: string | null;
  releasedAt: string | null;
  releasedByName: string | null;
  createdAt: string;
  items: ReleaseOrderItem[];
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}

function formatMoney(amount: string | number, currency?: string) {
  const num = typeof amount === "string" ? parseFloat(amount || "0") : amount;
  const curr = currency && /^[A-Z]{3}$/.test(currency) ? currency : "MXN";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: curr }).format(num);
}

function formatPercent(val: string | null | undefined) {
  const n = parseFloat(val || "0");
  if (n === 0) return "—";
  return `${n.toFixed(1)}%`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Liberado",
  rejected: "Rechazado",
  closed: "Cerrado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  closed: "bg-gray-200 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
};

const STATUS_DONE_VERB: Record<string, string> = {
  approved: "Liberado",
  rejected: "Rechazado",
  closed: "Cerrado",
};

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}

function OrderCard({
  order,
  onApprove,
  onReject,
  onClose,
  onAdjust,
  isPending,
}: {
  order: ReleaseOrder;
  onApprove?: (order: ReleaseOrder) => void;
  onReject?: (order: ReleaseOrder) => void;
  onClose?: (order: ReleaseOrder) => void;
  onAdjust?: (order: ReleaseOrder) => void;
  isPending?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasTax = parseFloat(order.tax || "0") > 0;
  const hasDiscount = parseFloat(order.globalDiscount || "0") > 0;
  const hasShipping = parseFloat(order.shippingCost || "0") > 0;
  const isUSD = order.currency === "USD";

  return (
    <Card className="overflow-hidden" data-testid={`card-release-order-${order.id}`}>
      {/* Header row — always visible */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0 p-2 rounded-md bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{order.folio}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.releaseStatus] || "bg-muted text-muted-foreground"}`}>
              {STATUS_LABEL[order.releaseStatus] || order.releaseStatus}
            </span>
            {isUSD && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium">USD</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.vendedorName}</span>
            <span className="flex items-center gap-1 text-foreground font-semibold">{formatMoney(order.quotationTotal, order.currency)}</span>
            {order.creditReleaseDate && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Lib. C&C: {formatDate(order.creditReleaseDate)}</span>
            )}
            {order.shippingDate && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Embarque: {formatDate(order.shippingDate)}</span>
            )}
          </div>
          {order.releaseStatus !== "pending" && order.releasedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {STATUS_DONE_VERB[order.releaseStatus] || "Procesado"} el {formatDate(order.releasedAt)}
              {order.releasedByName ? ` por ${order.releasedByName}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {order.items.length} art{order.items.length !== 1 ? "ículos" : "ículo"}
          </Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <div className="space-y-5 px-4 py-4">

            {/* ── Summary chips ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <InfoCell label="Folio" value={order.folio} />
              <InfoCell label="Cliente" value={order.customerName} />
              {order.customerRfc && <InfoCell label="RFC" value={order.customerRfc} />}
              {order.purchaseOrder && <InfoCell label="Orden de Compra" value={order.purchaseOrder} />}
              <InfoCell label="Vendedor" value={order.vendedorName} />
              <InfoCell label="Moneda" value={order.currency === "MXN" ? "Pesos MXN" : order.currency === "USD" ? "Dólares USD" : order.currency} />
              {order.paymentTerms && <InfoCell label="Condiciones de Pago" value={order.paymentTerms} />}
              {order.deliveryTime && <InfoCell label="Tiempo de Entrega" value={order.deliveryTime} />}
              {order.creditReleaseDate && <InfoCell label="Lib. Crédito" value={formatDate(order.creditReleaseDate)} />}
              {order.shippingDate && <InfoCell label="Fecha Embarque" value={formatDate(order.shippingDate)} />}
              {isUSD && order.exchangeRate && (
                <InfoCell label="Tipo de Cambio" value={`$${parseFloat(order.exchangeRate).toFixed(2)} MXN/USD`} />
              )}
            </div>

            {/* ── Shipping row ── */}
            {order.shippingHandledByJoper && (
              <div className="flex items-center gap-2 text-sm rounded-md border border-border bg-muted/40 px-3 py-2">
                <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Envío por cuenta de la empresa
                  {order.shippingMethod === "parcel" ? " — Paquetería" : order.shippingMethod === "truck" ? " — Camión" : ""}
                  {hasShipping ? ` · ${formatMoney(order.shippingCost, order.currency)}` : ""}
                </span>
              </div>
            )}

            {/* ── Notes / conditions ── */}
            {(order.notes || order.conditions) && (
              <div className="space-y-1.5">
                {order.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Notas</p>
                    <p className="text-sm text-foreground">{order.notes}</p>
                  </div>
                )}
                {order.conditions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Condiciones</p>
                    <p className="text-sm text-foreground">{order.conditions}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Rejection reason ── */}
            {order.releaseStatus === "rejected" && order.releaseNotes && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-xs font-medium text-destructive mb-0.5">Motivo de rechazo</p>
                <p className="text-sm text-destructive">{order.releaseNotes}</p>
              </div>
            )}

            {/* ── Products table ── */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Clave</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Descripción</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Cant.</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">P. Unitario</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Desc.</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Sin artículos</td>
                    </tr>
                  ) : order.items.map((item, i) => (
                    <tr key={i} className="bg-background hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{item.productCode || "—"}</td>
                      <td className="px-3 py-2 max-w-[200px]">{item.productName}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {parseFloat(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unitOfMeasure}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-medium">
                        {formatMoney(item.unitPrice, item.currency)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
                        {formatPercent(item.discountPercent)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">
                        {formatMoney(item.subtotal, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals footer */}
              <div className="border-t bg-muted/40 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal, order.currency)}</span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Descuento global ({parseFloat(order.globalDiscount).toFixed(1)}%)</span>
                    <span className="text-green-600 dark:text-green-400">
                      -{formatMoney(
                        (parseFloat(order.subtotal) * parseFloat(order.globalDiscount)) / 100,
                        order.currency
                      )}
                    </span>
                  </div>
                )}
                {hasShipping && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Flete</span>
                    <span>{formatMoney(order.shippingCost, order.currency)}</span>
                  </div>
                )}
                {hasTax && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>IVA</span>
                    <span>{formatMoney(order.tax, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1">
                  <span>Total</span>
                  <span>{formatMoney(order.quotationTotal, order.currency)}</span>
                </div>
              </div>
            </div>

            {/* ── Action buttons ── */}
            {onApprove && onReject && order.releaseStatus === "pending" && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onApprove(order); }}
                  disabled={isPending}
                  data-testid={`button-approve-${order.id}`}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Liberar Pedido
                </Button>
                {onAdjust && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onAdjust(order); }}
                    disabled={isPending}
                    data-testid={`button-adjust-${order.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Ajustar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onReject(order); }}
                  disabled={isPending}
                  data-testid={`button-reject-${order.id}`}
                  className="text-destructive border-destructive/40"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Rechazar
                </Button>
                {onClose && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onClose(order); }}
                    disabled={isPending}
                    data-testid={`button-close-${order.id}`}
                  >
                    <Ban className="h-4 w-4 mr-1.5" />
                    Cerrar
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function OrderReleasePage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [approveTarget, setApproveTarget] = useState<ReleaseOrder | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ReleaseOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [closeTarget, setCloseTarget] = useState<ReleaseOrder | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<ReleaseOrder | null>(null);
  const [adjustQuotationData, setAdjustQuotationData] = useState<any>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustIsFetching, setAdjustIsFetching] = useState(false);

  const { data: pendingOrders = [], isLoading: loadingPending } = useQuery<ReleaseOrder[]>({
    queryKey: ["/api/order-release?status=pending"],
  });

  const { data: historyOrders = [], isLoading: loadingHistory } = useQuery<ReleaseOrder[]>({
    queryKey: ["/api/order-release?status=history"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const matchesSearch = (order: ReleaseOrder) => {
    const q = norm(searchTerm.trim());
    if (!q) return true;
    return norm(order.folio).includes(q) || norm(order.customerName).includes(q) || norm(order.vendedorName).includes(q);
  };
  const filteredPendingOrders = pendingOrders.filter(matchesSearch);
  const filteredHistoryOrders = historyOrders.filter(matchesSearch);

  const approveMutation = useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      apiRequest("POST", `/api/order-release/${orderId}/approve`, { releaseNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Pedido liberado", description: "Se notificó a los involucrados por correo." });
      setApproveTarget(null);
      setApproveNotes("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo liberar el pedido." });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ quotationId, data }: { quotationId: string; data: InsertQuotation & { items: InsertQuotationItem[]; _sendEmail: boolean } }) => {
      const { _sendEmail, ...payload } = data;
      const res = await apiRequest("PATCH", `/api/quotations/${quotationId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      toast({ title: "Pedido ajustado", description: "Los cambios se guardaron. Ya puedes liberarlo." });
      setAdjustDialogOpen(false);
      setAdjustTarget(null);
      setAdjustQuotationData(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo ajustar el pedido." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      apiRequest("POST", `/api/order-release/${orderId}/reject`, { releaseNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Pedido rechazado", description: "Se notificó a los involucrados por correo." });
      setRejectTarget(null);
      setRejectNotes("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar el pedido." });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      apiRequest("POST", `/api/order-release/${orderId}/close`, { releaseNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Pedido cerrado", description: "El pedido se cerró sin enviar correos." });
      setCloseTarget(null);
      setCloseNotes("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cerrar el pedido." });
    },
  });

  const mutating = approveMutation.isPending || rejectMutation.isPending || adjustMutation.isPending || closeMutation.isPending;

  const openAdjust = async (order: ReleaseOrder) => {
    setAdjustTarget(order);
    setAdjustIsFetching(true);
    try {
      const res = await fetch(`/api/quotations/${order.quotationId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar la cotización");
      const quotation = await res.json();
      setAdjustQuotationData(quotation);
      setAdjustDialogOpen(true);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la cotización para editar." });
    } finally {
      setAdjustIsFetching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Liberación de Pedidos</h1>
            <p className="text-sm text-muted-foreground">Autoriza o rechaza pedidos después de la aprobación de crédito</p>
          </div>
        </div>
        {pendingOrders.length > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {pendingOrders.length} pendiente{pendingOrders.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por folio o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
          data-testid="input-search-order-release"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pendientes de Liberar
            {pendingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{pendingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingPending ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay pedidos pendientes de liberar</p>
              <p className="text-xs mt-1">Los pedidos aparecerán aquí después de ser aprobados por Crédito y Cobranza</p>
            </div>
          ) : filteredPendingOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin resultados para la búsqueda</p>
            </div>
          ) : (
            filteredPendingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onApprove={setApproveTarget}
                onReject={(o) => { setRejectTarget(o); setRejectNotes(""); }}
                onClose={(o) => { setCloseTarget(o); setCloseNotes(""); }}
                onAdjust={openAdjust}
                isPending={mutating}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {loadingHistory ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : historyOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay historial de pedidos liberados o rechazados</p>
            </div>
          ) : filteredHistoryOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin resultados para la búsqueda</p>
            </div>
          ) : (
            filteredHistoryOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) { setApproveTarget(null); setApproveNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar pedido {approveTarget?.folio}</DialogTitle>
            <DialogDescription>
              Se liberará el pedido y se notificará al vendedor, C&amp;C y administradores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-notes">Comentarios <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              id="approve-notes"
              placeholder="Instrucciones especiales, observaciones para producción..."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              rows={3}
              data-testid="textarea-approve-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveTarget(null); setApproveNotes(""); }} disabled={approveMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => approveTarget && approveMutation.mutate({ orderId: approveTarget.id, notes: approveNotes })}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
              className="bg-green-600"
            >
              {approveMutation.isPending ? "Liberando..." : "Liberar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar pedido {rejectTarget?.folio}</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. Se notificará al vendedor, Crédito &amp; Cobranza y administradores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-notes">Motivo del rechazo <span className="text-destructive">*</span></Label>
            <Textarea
              id="reject-notes"
              placeholder="Describe el motivo por el que se rechaza este pedido..."
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              rows={4}
              data-testid="textarea-reject-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }} disabled={rejectMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectTarget && rejectMutation.mutate({ orderId: rejectTarget.id, notes: rejectNotes })}
              disabled={rejectMutation.isPending || !rejectNotes.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rechazando..." : "Rechazar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => { if (!open) { setCloseTarget(null); setCloseNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar pedido {closeTarget?.folio}</DialogTitle>
            <DialogDescription>
              El pedido se marcará como <strong>Cerrado</strong> y saldrá de la lista de pendientes,
              sin pasar por producción ni embarque. No se enviará ningún correo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="close-notes">Motivo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              id="close-notes"
              placeholder="Ej. Cliente ya no continúa con el pedido..."
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              rows={3}
              data-testid="textarea-close-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCloseTarget(null); setCloseNotes(""); }} disabled={closeMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => closeTarget && closeMutation.mutate({ orderId: closeTarget.id, notes: closeNotes })}
              disabled={closeMutation.isPending}
              data-testid="button-confirm-close"
            >
              {closeMutation.isPending ? "Cerrando..." : "Cerrar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog — reuses QuotationForm with full product search + auto-calculations */}
      {adjustQuotationData && (
        <QuotationForm
          open={adjustDialogOpen}
          onOpenChange={(open) => {
            setAdjustDialogOpen(open);
            if (!open) { setAdjustTarget(null); setAdjustQuotationData(null); }
          }}
          onSubmit={(data) => {
            if (!adjustTarget) return;
            adjustMutation.mutate({ quotationId: adjustTarget.quotationId, data });
          }}
          isPending={adjustMutation.isPending}
          customers={customers}
          userId={adjustQuotationData.userId}
          initialData={adjustQuotationData}
          isEditing
          adjustMode
        />
      )}
    </div>
  );
}
