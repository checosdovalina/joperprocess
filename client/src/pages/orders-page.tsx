import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Order, Quotation, Customer, QuotationItem, Product, OrderStatus, InsertOrder } from "@shared/schema";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, Eye, EyeOff, Truck, FileText, ChevronRight, Mail, Factory, Calendar, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { OrderForm } from "@/components/order-form";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface OrderRelease {
  id: string;
  orderId: string;
  quotationItemId: string;
  quantityReleased: string;
  releasedById: string;
  invoiceId: string | null;
  shipmentId: string | null;
  notes: string | null;
  createdAt: Date;
}

interface OrderDetails extends Order {
  quotation: Quotation & {
    customer: Customer;
    items: (QuotationItem & { product: Product })[];
  };
  releases: OrderRelease[];
}

export default function OrdersPage() {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [releaseItem, setReleaseItem] = useState<{ itemId: string; productName: string; maxQuantity: number } | null>(null);
  const [releaseQuantity, setReleaseQuantity] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [createShipment, setCreateShipment] = useState(true);
  const [shipmentTransporter, setShipmentTransporter] = useState("");
  const [shipmentTransportType, setShipmentTransportType] = useState<"propio" | "paqueteria">("propio");
  const [shipmentDriverName, setShipmentDriverName] = useState("");
  const [shipmentVehiclePlates, setShipmentVehiclePlates] = useState("");
  const [editEstimatedDelivery, setEditEstimatedDelivery] = useState("");
  const [editFactoryNotes, setEditFactoryNotes] = useState("");
  const [isEditingProduction, setIsEditingProduction] = useState(false);
  const [hideDelivered, setHideDelivered] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading } = useEntityQuery<
    (Order & { quotation: Quotation & { customer: Customer } })[]
  >("/api/orders");

  const { data: quotations } = useEntityQuery<Quotation[]>("/api/quotations");

  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", selectedOrderId, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}/details`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      return res.json();
    },
    enabled: !!selectedOrderId && detailsDialogOpen,
  });

  const createOrderMutation = useEntityMutation<Order, InsertOrder>({
    endpoint: "/api/orders",
    method: "POST",
    successMessage: "Orden creada exitosamente",
    invalidateQueries: ["/api/orders"],
    onSuccessCallback: () => setDialogOpen(false),
  });

  const releaseMutation = useMutation({
    mutationFn: async (data: { 
      quotationItemId: string; 
      quantityReleased: number; 
      notes?: string;
      createInvoice?: boolean;
      createShipment?: boolean;
      shipmentData?: {
        transporter?: string;
        transportType?: string;
        driverName?: string;
        vehiclePlates?: string;
      };
    }) => {
      const res = await apiRequest("POST", `/api/orders/${selectedOrderId}/releases`, data);
      return res.json();
    },
    onSuccess: (data) => {
      let description = "La liberación se registró correctamente";
      if (data.invoiceId) description += ". Factura creada.";
      if (data.shipmentId) description += " Embarque creado.";
      toast({ title: "Productos liberados", description });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      resetReleaseForm();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo registrar la liberación", variant: "destructive" });
    },
  });

  const resetReleaseForm = () => {
    setReleaseDialogOpen(false);
    setReleaseItem(null);
    setReleaseQuantity("");
    setReleaseNotes("");
    setCreateInvoice(true);
    setCreateShipment(true);
    setShipmentTransporter("");
    setShipmentDriverName("");
    setShipmentVehiclePlates("");
  };

  const updateOrderMutation = useMutation({
    mutationFn: async (data: { estimatedDelivery?: string | null; factoryNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${selectedOrderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pedido actualizado", description: "La información de producción se guardó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "details"] });
      setIsEditingProduction(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el pedido", variant: "destructive" });
    },
  });

  const handleSaveProductionInfo = () => {
    updateOrderMutation.mutate({
      estimatedDelivery: editEstimatedDelivery || null,
      factoryNotes: editFactoryNotes,
    });
  };

  const handleNoDeliveryTime = () => {
    setEditEstimatedDelivery("");
    updateOrderMutation.mutate({
      estimatedDelivery: null,
      factoryNotes: editFactoryNotes ? editFactoryNotes + "\n[Sin tiempo de entrega definido]" : "[Sin tiempo de entrega definido]",
    });
  };

  const handleSendToProduction = () => {
    if (!orderDetails) return;
    const customer = orderDetails.quotation.customer;
    const subject = encodeURIComponent(`Pedido ${orderDetails.quotation.folio} - ${customer.name}`);
    const itemsList = orderDetails.quotation.items.map(item => 
      `- ${item.product.name} (${item.product.code}): ${item.quantity} ${item.product.unit}`
    ).join("%0A");
    const body = encodeURIComponent(
      `Pedido: ${orderDetails.quotation.folio}\n` +
      `Cliente: ${customer.name}\n` +
      `Fecha: ${format(new Date(), "PPP", { locale: es })}\n\n` +
      `Productos:\n`
    ) + itemsList + encodeURIComponent(`\n\nNotas: ${orderDetails.factoryNotes || "Sin notas"}`);
    window.open(`mailto:produccion@joper.com.mx?subject=${subject}&body=${body}`, "_blank");
  };

  const startEditingProduction = () => {
    if (orderDetails) {
      setEditEstimatedDelivery(orderDetails.estimatedDelivery 
        ? format(new Date(orderDetails.estimatedDelivery), "yyyy-MM-dd") 
        : "");
      setEditFactoryNotes(orderDetails.factoryNotes || "");
      setIsEditingProduction(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [OrderStatus.PENDING]: { label: t("status.pending"), className: "bg-gray-100 text-gray-800" },
      [OrderStatus.IN_PRODUCTION]: { label: t("status.in-production"), className: "bg-blue-100 text-blue-800" },
      [OrderStatus.READY]: { label: t("status.ready"), className: "bg-green-100 text-green-800" },
      [OrderStatus.PARTIALLY_RELEASED]: { label: t("status.partial"), className: "bg-yellow-100 text-yellow-800" },
      [OrderStatus.SHIPPED]: { label: t("status.shipped"), className: "bg-purple-100 text-purple-800" },
      [OrderStatus.DELIVERED]: { label: t("status.delivered"), className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status] || statusConfig[OrderStatus.PENDING];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const handleReleaseItem = (itemId: string, productName: string, maxQuantity: number) => {
    setReleaseItem({ itemId, productName, maxQuantity });
    setReleaseQuantity(maxQuantity.toString());
    setReleaseDialogOpen(true);
  };

  const handleConfirmRelease = () => {
    if (!releaseItem) return;
    const qty = parseFloat(releaseQuantity);
    if (isNaN(qty) || qty <= 0 || qty > releaseItem.maxQuantity) {
      toast({ title: "Error", description: "Cantidad inválida", variant: "destructive" });
      return;
    }
    releaseMutation.mutate({
      quotationItemId: releaseItem.itemId,
      quantityReleased: qty,
      notes: releaseNotes || undefined,
      createInvoice,
      createShipment,
      shipmentData: createShipment ? {
        transporter: shipmentTransporter || "Por definir",
        transportType: shipmentTransportType,
        driverName: shipmentDriverName || undefined,
        vehiclePlates: shipmentVehiclePlates || undefined,
      } : undefined,
    });
  };


  const getReleasedQuantity = (itemId: string) => {
    if (!orderDetails?.releases) return 0;
    return orderDetails.releases
      .filter(r => r.quotationItemId === itemId)
      .reduce((sum, r) => sum + parseFloat(r.quantityReleased), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("orders.subtitle")}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-order">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.pending")}</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.PENDING).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.in-production")}</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.IN_PRODUCTION).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.ready")}</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.READY).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.partial")}</CardTitle>
            <Truck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.PARTIALLY_RELEASED).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.SHIPPED).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>
                {(() => {
                  const terminal = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];
                  const closedCount = orders?.filter(o => terminal.includes(o.status as any)).length ?? 0;
                  const visible = hideDelivered ? (orders?.filter(o => !terminal.includes(o.status as any)).length ?? 0) : (orders?.length ?? 0);
                  return <>
                    {visible} de {orders?.length || 0} pedidos
                    {hideDelivered && closedCount > 0 && <span className="ml-1">({closedCount} cerrado{closedCount !== 1 ? "s" : ""} oculto{closedCount !== 1 ? "s" : ""})</span>}
                  </>;
                })()}
              </CardDescription>
            </div>
            {(orders?.filter(o => o.status === OrderStatus.SHIPPED || o.status === OrderStatus.DELIVERED).length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setHideDelivered(v => !v)} data-testid="button-toggle-delivered">
                {hideDelivered ? <><Eye className="h-4 w-4 mr-2" />Mostrar enviados/entregados</> : <><EyeOff className="h-4 w-4 mr-2" />Ocultar enviados/entregados</>}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.col.quotation-folio")}</TableHead>
                    <TableHead>{t("orders.col.created")}</TableHead>
                    <TableHead>{t("orders.col.delivery")}</TableHead>
                    <TableHead>{t("orders.col.progress")}</TableHead>
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hideDelivered ? orders.filter(o => o.status !== OrderStatus.SHIPPED && o.status !== OrderStatus.DELIVERED) : orders).map((order) => (
                    <TableRow key={order.id} className="hover-elevate" data-testid={`row-order-${order.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{order.quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.createdAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.estimatedDelivery ? (
                          <div className="text-sm">
                            {format(new Date(order.estimatedDelivery), "PP", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No definida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 w-32">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Producción</span>
                            <span className="font-medium">{order.productionProgress}%</span>
                          </div>
                          <Progress value={order.productionProgress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(order.id)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(order.id)}
                            data-testid={`button-release-order-${order.id}`}
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay pedidos registrados</p>
              <Button
                className="mt-4"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-first-order"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Orden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createOrderMutation.mutate}
        isPending={createOrderMutation.isPending}
        quotations={quotations?.map(q => ({ id: q.id, folio: q.folio })) || []}
        userId={user?.id}
      />

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido</DialogTitle>
            <DialogDescription>
              {orderDetails?.quotation.folio}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(orderDetails.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Creación</Label>
                  <div className="text-sm font-medium mt-1">
                    {format(new Date(orderDetails.createdAt), "PPP", { locale: es })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Progreso Producción</Label>
                  <div className="mt-1">
                    <Progress value={orderDetails.productionProgress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{orderDetails.productionProgress}%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entrega Estimada</Label>
                  <div className="text-sm font-medium mt-1">
                    {orderDetails.estimatedDelivery
                      ? format(new Date(orderDetails.estimatedDelivery), "PPP", { locale: es })
                      : "No definida"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Productos del Pedido
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Liberado</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                        <TableHead className="text-right">{t("label.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.quotation.items.map((item) => {
                        const released = getReleasedQuantity(item.id);
                        const quantity = parseFloat(item.quantity);
                        const pending = quantity - released;
                        const percentReleased = (released / quantity) * 100;

                        return (
                          <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                            <TableCell>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-xs text-muted-foreground">{item.product.code}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {quantity} {item.product.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16">
                                  <Progress value={percentReleased} className="h-2" />
                                </div>
                                <span className="font-mono text-sm">{released}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pending > 0 ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                  {pending}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Completo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {pending > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReleaseItem(item.id, item.product.name, pending)}
                                  data-testid={`button-release-item-${item.id}`}
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Liberar
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {orderDetails.releases.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Historial de Liberaciones
                  </h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderDetails.releases.map((release) => {
                          const item = orderDetails.quotation.items.find(i => i.id === release.quotationItemId);
                          return (
                            <TableRow key={release.id}>
                              <TableCell className="text-sm">
                                {format(new Date(release.createdAt), "PPp", { locale: es })}
                              </TableCell>
                              <TableCell className="font-medium">
                                {item?.product.name || "N/A"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {release.quantityReleased}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {release.notes || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Liberar Productos</DialogTitle>
            <DialogDescription>
              {releaseItem?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Cantidad a liberar</Label>
              <Input
                id="quantity"
                type="number"
                value={releaseQuantity}
                onChange={(e) => setReleaseQuantity(e.target.value)}
                max={releaseItem?.maxQuantity}
                min={0.01}
                step="0.01"
                data-testid="input-release-quantity"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo disponible: {releaseItem?.maxQuantity}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Observaciones sobre esta liberación..."
                data-testid="input-release-notes"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createInvoice"
                  checked={createInvoice}
                  onCheckedChange={(checked) => setCreateInvoice(checked === true)}
                  data-testid="checkbox-create-invoice"
                />
                <Label htmlFor="createInvoice" className="text-sm font-normal cursor-pointer">
                  Generar factura automáticamente
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="createShipment"
                  checked={createShipment}
                  onCheckedChange={(checked) => setCreateShipment(checked === true)}
                  data-testid="checkbox-create-shipment"
                />
                <Label htmlFor="createShipment" className="text-sm font-normal cursor-pointer">
                  Generar embarque automáticamente
                </Label>
              </div>

              {createShipment && (
                <div className="pl-6 space-y-3 border-l-2 border-muted ml-2">
                  <div>
                    <Label htmlFor="transporter" className="text-xs">Transportista</Label>
                    <Input
                      id="transporter"
                      value={shipmentTransporter}
                      onChange={(e) => setShipmentTransporter(e.target.value)}
                      placeholder="Nombre del transportista"
                      data-testid="input-transporter"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportType" className="text-xs">Tipo de transporte</Label>
                    <Select
                      value={shipmentTransportType}
                      onValueChange={(v) => setShipmentTransportType(v as "propio" | "paqueteria")}
                    >
                      <SelectTrigger data-testid="select-transport-type">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="propio">Transporte propio</SelectItem>
                        <SelectItem value="paqueteria">Paquetería</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="driverName" className="text-xs">Chofer</Label>
                      <Input
                        id="driverName"
                        value={shipmentDriverName}
                        onChange={(e) => setShipmentDriverName(e.target.value)}
                        placeholder="Nombre"
                        data-testid="input-driver-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehiclePlates" className="text-xs">Placas</Label>
                      <Input
                        id="vehiclePlates"
                        value={shipmentVehiclePlates}
                        onChange={(e) => setShipmentVehiclePlates(e.target.value)}
                        placeholder="ABC-123"
                        data-testid="input-vehicle-plates"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRelease}
              disabled={releaseMutation.isPending}
              data-testid="button-confirm-release"
            >
              {releaseMutation.isPending ? "Procesando..." : "Confirmar Liberación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
