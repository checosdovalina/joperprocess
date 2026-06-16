import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReleaseOrderItem {
  productCode: string | null;
  productName: string;
  quantity: string;
  unitOfMeasure: string;
}

interface ReleaseOrder {
  id: string;
  folio: string;
  customerName: string;
  customerRfc: string | null;
  vendedorName: string;
  vendedorEmail: string;
  purchaseOrder: string | null;
  quotationTotal: string;
  currency: string;
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

function formatMoney(amount: string, currency: string) {
  const num = parseFloat(amount || "0");
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || "MXN" }).format(num);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Liberado",
  rejected: "Rechazado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function OrderCard({
  order,
  onApprove,
  onReject,
  isPending,
}: {
  order: ReleaseOrder;
  onApprove?: (order: ReleaseOrder) => void;
  onReject?: (order: ReleaseOrder) => void;
  isPending?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden" data-testid={`card-release-order-${order.id}`}>
      <div
        className="flex items-start gap-4 p-4 cursor-pointer select-none"
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
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {order.vendedorName}
            </span>
            {order.creditReleaseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Lib. C&amp;C: {formatDate(order.creditReleaseDate)}
              </span>
            )}
            {order.shippingDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Embarque: {formatDate(order.shippingDate)}
              </span>
            )}
            <span className="font-medium text-foreground">
              {formatMoney(order.quotationTotal, order.currency)}
            </span>
          </div>
          {order.notes && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{order.notes}</p>
          )}
          {order.releaseStatus !== "pending" && order.releasedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {order.releaseStatus === "approved" ? "Liberado" : "Rechazado"} el {formatDate(order.releasedAt)}
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
          <div className="px-4 py-3 bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Folio:</span>{" "}
                <span className="font-semibold">{order.folio}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Total:</span>{" "}
                <span className="font-semibold">{formatMoney(order.quotationTotal, order.currency)}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Vendedor:</span>{" "}
                <span>{order.vendedorName}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Lib. C&amp;C:</span>{" "}
                <span>{formatDate(order.creditReleaseDate)}</span>
              </div>
              {order.customerRfc && (
                <div>
                  <span className="text-muted-foreground font-medium">RFC:</span>{" "}
                  <span>{order.customerRfc}</span>
                </div>
              )}
              {order.purchaseOrder && (
                <div>
                  <span className="text-muted-foreground font-medium">Orden de Compra:</span>{" "}
                  <span>{order.purchaseOrder}</span>
                </div>
              )}
              {order.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium">Notas:</span>{" "}
                  <span>{order.notes}</span>
                </div>
              )}
              {order.releaseStatus === "rejected" && order.releaseNotes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium">Motivo de rechazo:</span>{" "}
                  <span className="text-destructive">{order.releaseNotes}</span>
                </div>
              )}
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Cantidad</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Clave</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-muted-foreground">Sin artículos</td>
                    </tr>
                  ) : order.items.map((item, i) => (
                    <tr key={i} className="bg-background">
                      <td className="px-3 py-2 font-medium">
                        {parseFloat(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unitOfMeasure}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{item.productCode || "—"}</td>
                      <td className="px-3 py-2">{item.productName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {onApprove && onReject && order.releaseStatus === "pending" && (
              <div className="flex gap-2 pt-1">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onReject(order); }}
                  disabled={isPending}
                  data-testid={`button-reject-${order.id}`}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Rechazar
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export default function OrderReleasePage() {
  const { toast } = useToast();
  const [approveTarget, setApproveTarget] = useState<ReleaseOrder | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReleaseOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const { data: pendingOrders = [], isLoading: loadingPending } = useQuery<ReleaseOrder[]>({
    queryKey: ["/api/order-release?status=pending"],
  });

  const { data: historyOrders = [], isLoading: loadingHistory } = useQuery<ReleaseOrder[]>({
    queryKey: ["/api/order-release?status=history"],
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest("POST", `/api/order-release/${orderId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=history"] });
      toast({ title: "Pedido liberado", description: "Se notificó a los involucrados por correo." });
      setApproveTarget(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo liberar el pedido." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes: string }) =>
      apiRequest("POST", `/api/order-release/${orderId}/reject`, { releaseNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-release?status=history"] });
      toast({ title: "Pedido rechazado", description: "Se notificó a los involucrados por correo." });
      setRejectTarget(null);
      setRejectNotes("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar el pedido." });
    },
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

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
          ) : (
            pendingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onApprove={setApproveTarget}
                onReject={(o) => { setRejectTarget(o); setRejectNotes(""); }}
                isPending={isPending}
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
          ) : (
            historyOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar pedido {approveTarget?.folio}</AlertDialogTitle>
            <AlertDialogDescription>
              Se liberará el pedido y se notificará al vendedor, Crédito &amp; Cobranza y administradores. ¿Confirmas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveTarget && approveMutation.mutate(approveTarget.id)}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Liberando..." : "Sí, liberar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button
              variant="outline"
              onClick={() => { setRejectTarget(null); setRejectNotes(""); }}
              disabled={rejectMutation.isPending}
            >
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
    </div>
  );
}
