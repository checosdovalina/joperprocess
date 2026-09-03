import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { Order, Quotation, Customer, QuotationItem, Product, OrderStatus, type Empresa } from "@shared/schema";
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
import { Factory, Eye, EyeOff, Calendar, Clock, AlertCircle, Save, X, CheckCircle2, Package, Truck, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
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
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchCombobox } from "@/components/search-combobox";

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

type OrderWithQuotation = Order & { quotation: Quotation & { customer: Customer } };
type EditableEquipment = { id?: string; productId: string; quantity: string };

export default function ProductionPage() {
  const { t } = useI18n();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editEstimatedDelivery, setEditEstimatedDelivery] = useState("");
  const [editFactoryNotes, setEditFactoryNotes] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingEquipment, setIsEditingEquipment] = useState(false);
  const [editEquipment, setEditEquipment] = useState<EditableEquipment[]>([]);
  const [hideDelivered, setHideDelivered] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const { data: orders, isLoading } = useQuery<OrderWithQuotation[]>({
    queryKey: ["/api/orders"],
  });

  const { data: empresas } = useQuery<Empresa[]>({ queryKey: ["/api/empresas"] });
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAdmin && detailsDialogOpen,
  });
  const empresaName = (id: string | null | undefined) =>
    (id && empresas?.find(e => e.id === id)?.name) || "";

  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", selectedOrderId, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${selectedOrderId}/details`);
      if (!res.ok) throw new Error("Failed to fetch order details");
      return res.json();
    },
    enabled: !!selectedOrderId && detailsDialogOpen,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (data: { 
      estimatedDelivery?: string | null; 
      factoryNotes?: string;
      productionProgress?: number;
      status?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/orders/${selectedOrderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("production.updated-title"), description: t("production.updated-desc") });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "details"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: t("label.error"), description: t("production.error-update"), variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async (items: EditableEquipment[]) => {
      const res = await apiRequest("PUT", `/api/orders/${selectedOrderId}/equipment`, {
        items: items.map(item => ({
          ...(item.id ? { id: item.id } : {}),
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Equipos actualizados", description: "La lista de equipos del MEX se actualizó correctamente." });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setIsEditingEquipment(false);
    },
    onError: (error: Error) => {
      toast({ title: t("label.error"), description: error.message || "No fue posible actualizar los equipos.", variant: "destructive" });
    },
  });

  const quickShipMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/shipments`, { 
        orderId,
        transporter: "Por asignar",
        transportType: "propio",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al enviar a embarque");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("production.sent-to-shipping-title"), description: t("production.sent-to-shipping-desc") });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
    },
    onError: (error: Error) => {
      toast({ title: t("label.error"), description: error.message || t("production.error-ship"), variant: "destructive" });
    },
  });

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsDialogOpen(true);
  };

  const startEditing = () => {
    if (orderDetails) {
      setEditEstimatedDelivery(orderDetails.estimatedDelivery 
        ? format(new Date(orderDetails.estimatedDelivery), "yyyy-MM-dd") 
        : "");
      setEditFactoryNotes(orderDetails.factoryNotes || "");
      setEditProgress(orderDetails.productionProgress || 0);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateOrderMutation.mutate({
      estimatedDelivery: editEstimatedDelivery ? new Date(editEstimatedDelivery).toISOString() : null,
      factoryNotes: editFactoryNotes,
      productionProgress: editProgress,
    });
  };

  const startEditingEquipment = () => {
    if (!orderDetails) return;
    setEditEquipment(orderDetails.quotation.items.map(item => ({
      id: item.id,
      productId: item.productId || "",
      quantity: String(Number(item.quantity)),
    })));
    setIsEditingEquipment(true);
  };

  const saveEquipment = () => {
    if (editEquipment.length === 0) {
      toast({ title: t("label.error"), description: "El pedido debe conservar al menos un equipo.", variant: "destructive" });
      return;
    }
    if (editEquipment.some(item => !item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      toast({ title: t("label.error"), description: "Selecciona un producto y captura una cantidad mayor a cero.", variant: "destructive" });
      return;
    }
    const productIds = editEquipment.map(item => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      toast({ title: t("label.error"), description: "Un mismo producto no puede aparecer dos veces.", variant: "destructive" });
      return;
    }
    updateEquipmentMutation.mutate(editEquipment);
  };

  const handleNoDeliveryTime = () => {
    setEditEstimatedDelivery("");
    const noTimeNote = "[Sin tiempo de entrega definido]";
    setEditFactoryNotes(editFactoryNotes 
      ? editFactoryNotes + "\n" + noTimeNote 
      : noTimeNote
    );
  };

  const handleMarkAsInProduction = () => {
    updateOrderMutation.mutate({
      status: OrderStatus.IN_PRODUCTION,
      productionProgress: editProgress > 0 ? editProgress : 10,
    });
  };

  const handleMarkAsReady = () => {
    updateOrderMutation.mutate({
      status: OrderStatus.READY,
      productionProgress: 100,
    });
  };

  const handleSendToShipping = () => {
    if (selectedOrderId) {
      quickShipMutation.mutate(selectedOrderId);
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
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const pendingOrders = orders?.filter(o => o.status === OrderStatus.PENDING) || [];
  const inProductionOrders = orders?.filter(o => o.status === OrderStatus.IN_PRODUCTION) || [];
  const readyOrders = orders?.filter(o => o.status === OrderStatus.READY) || [];
  const otherOrders = orders?.filter(o => 
    ![OrderStatus.PENDING, OrderStatus.IN_PRODUCTION, OrderStatus.READY].includes(o.status as any)
  ) || [];

  const renderOrdersTable = (ordersList: OrderWithQuotation[], emptyMessage: string) => {
    const q = norm(searchTerm.trim());
    if (q) {
      ordersList = ordersList.filter((order) =>
        norm(order.quotation?.folio || "").includes(q)
        || norm(order.quotation?.customer?.name || "").includes(q)
      );
    }
    if (filterEmpresa !== "all") {
      ordersList = ordersList.filter((order) => order.empresaId === filterEmpresa);
    }
    if (ordersList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("production.col.folio")}</TableHead>
            <TableHead>{t("production.col.date")}</TableHead>
            <TableHead>{t("production.col.progress")}</TableHead>
            <TableHead>{t("production.col.delivery")}</TableHead>
            <TableHead className="text-right">{t("production.col.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersList.map((order) => (
            <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
              <TableCell className="font-medium">
                <div className="flex flex-col gap-1">
                  <span>{order.quotation.folio}</span>
                  {order.empresaId && empresaName(order.empresaId) && (
                    <Badge variant="secondary" className="w-fit" data-testid={`badge-empresa-${order.id}`}>
                      {empresaName(order.empresaId)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: es })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={order.productionProgress} className="h-2 w-20" />
                  <span className="text-xs text-muted-foreground">{order.productionProgress}%</span>
                </div>
              </TableCell>
              <TableCell>
                {order.estimatedDelivery ? (
                  <span className="text-sm">
                    {format(new Date(order.estimatedDelivery), "dd/MM/yyyy", { locale: es })}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t("production.undefined-delivery")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {order.status === OrderStatus.READY && (
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => quickShipMutation.mutate(order.id)}
                      disabled={quickShipMutation.isPending}
                      data-testid={`button-quick-ship-${order.id}`}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      {t("production.to-shipping")}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewDetails(order.id)}
                    data-testid={`button-view-order-${order.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t("production.manage")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("production.title")}</h1>
          <p className="text-muted-foreground">{t("production.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("production.pending")}</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("production.in-production")}</p>
                <p className="text-2xl font-bold">{inProductionOrders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("production.ready")}</p>
                <p className="text-2xl font-bold">{readyOrders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("production.total-active")}</p>
                <p className="text-2xl font-bold">{(orders?.length || 0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search.folio-client")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-production"
          />
        </div>
        {empresas && empresas.length > 0 && !(user?.role === 'vendedor' && user?.empresaId) && (
          <Select value={filterEmpresa} onValueChange={setFilterEmpresa} data-testid="select-filter-empresa">
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {empresas.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            {t("production.pending")} ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="in-production" data-testid="tab-in-production">
            {t("production.in-production")} ({inProductionOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready" data-testid="tab-ready">
            {t("production.ready")} ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            {t("production.tab.all")} ({orders?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>{t("production.card.pending")}</CardTitle>
              <CardDescription>{t("production.card.pending-desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(pendingOrders, t("production.no-orders-pending"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-production">
          <Card>
            <CardHeader>
              <CardTitle>{t("production.card.in-production")}</CardTitle>
              <CardDescription>{t("production.card.in-production-desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(inProductionOrders, t("production.no-orders-in-production"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready">
          <Card>
            <CardHeader>
              <CardTitle>{t("production.card.ready")}</CardTitle>
              <CardDescription>{t("production.card.ready-desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(readyOrders, t("production.no-orders-ready"))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{t("production.card.all")}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const terminal = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];
                      const closedCount = orders?.filter(o => terminal.includes(o.status as any)).length ?? 0;
                      const visible = hideDelivered ? (orders?.filter(o => !terminal.includes(o.status as any)).length ?? 0) : (orders?.length ?? 0);
                      return <>
                        {visible} {t("production.of")} {orders?.length || 0} {t("production.orders")}
                        {hideDelivered && closedCount > 0 && <span className="ml-1">({closedCount} {closedCount !== 1 ? t("production.closed-hidden-pl") : t("production.closed-hidden")} {closedCount !== 1 ? t("production.hidden-pl") : t("production.hidden")})</span>}
                      </>;
                    })()}
                  </CardDescription>
                </div>
                {(orders?.filter(o => o.status === OrderStatus.SHIPPED || o.status === OrderStatus.DELIVERED).length ?? 0) > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setHideDelivered(v => !v)} data-testid="button-toggle-delivered">
                    {hideDelivered ? <><Eye className="h-4 w-4 mr-2" />{t("btn.show-shipped")}</> : <><EyeOff className="h-4 w-4 mr-2" />{t("btn.hide-shipped")}</>}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(
                hideDelivered
                  ? (orders || []).filter(o => o.status !== OrderStatus.SHIPPED && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.CANCELLED)
                  : (orders || []),
                t("production.no-orders")
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              {t("production.dialog-title")}
            </DialogTitle>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(orderDetails.status)}
                  <span className="text-sm text-muted-foreground">
                    {t("production.created")}: {format(new Date(orderDetails.createdAt), "PPP", { locale: es })}
                  </span>
                </div>
                {!isEditing && (
                  <Button onClick={startEditing} variant="outline" data-testid="button-edit-production">
                    {t("btn.edit-info")}
                  </Button>
                )}
              </div>

              <Separator />

              {isEditing ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDelivery">{t("production.est-delivery")}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="estimatedDelivery"
                          type="date"
                          value={editEstimatedDelivery}
                          onChange={(e) => setEditEstimatedDelivery(e.target.value)}
                          data-testid="input-estimated-delivery"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleNoDeliveryTime}
                          data-testid="button-no-delivery-time"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {t("btn.no-time")}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("production.progress-label")}: {editProgress}%</Label>
                      <Slider
                        value={[editProgress]}
                        onValueChange={(value) => setEditProgress(value[0])}
                        max={100}
                        step={5}
                        className="mt-2"
                        data-testid="slider-progress"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="factoryNotes">{t("production.notes-label")}</Label>
                    <Textarea
                      id="factoryNotes"
                      value={editFactoryNotes}
                      onChange={(e) => setEditFactoryNotes(e.target.value)}
                      placeholder={t("production.notes-placeholder")}
                      rows={4}
                      data-testid="input-factory-notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEditing} data-testid="button-cancel-edit">
                      <X className="h-4 w-4 mr-1" />
                      {t("btn.cancel")}
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={updateOrderMutation.isPending}
                      data-testid="button-save-production"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateOrderMutation.isPending ? t("btn.saving") : t("btn.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("production.est-delivery")}</Label>
                    <div className="text-sm font-medium mt-1">
                      {orderDetails.estimatedDelivery
                        ? format(new Date(orderDetails.estimatedDelivery), "PPP", { locale: es })
                        : <span className="text-orange-600">{t("production.no-delivery")}</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("production.col.progress")}</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={orderDetails.productionProgress} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{orderDetails.productionProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("production.notes-label")}</Label>
                    <div className="text-sm mt-1">
                      {orderDetails.factoryNotes || <span className="text-muted-foreground">{t("production.no-notes")}</span>}
                    </div>
                  </div>
                </div>
              )}

              {orderDetails.quotation.notes && (
                <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3">
                  <Label className="text-xs text-muted-foreground">{t("production.order-notes")}</Label>
                  <div className="text-sm mt-1 whitespace-pre-wrap" data-testid="text-order-notes">
                    {orderDetails.quotation.notes}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold">{t("production.products")}</h3>
                  {isAdmin && !isEditingEquipment && [OrderStatus.PENDING, OrderStatus.IN_PRODUCTION, OrderStatus.READY].includes(orderDetails.status as any) && (
                    <Button variant="outline" size="sm" onClick={startEditingEquipment} data-testid="button-edit-equipment">
                      <Pencil className="h-4 w-4 mr-2" />
                      Modificar equipos
                    </Button>
                  )}
                </div>
                {isEditingEquipment ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-2">
                      {editEquipment.map((item, index) => (
                        <div key={item.id || `new-${index}`} className="grid grid-cols-[minmax(0,1fr)_100px_40px] gap-2 items-center">
                          <SearchCombobox
                            options={(products || []).filter(product =>
                              product.active || product.id === item.productId
                            ).map(product => ({
                              value: product.id,
                              label: product.name,
                              sublabel: product.code,
                            }))}
                            value={item.productId}
                            onValueChange={(productId) => setEditEquipment(current =>
                              current.map((row, rowIndex) => rowIndex === index ? { ...row, productId } : row)
                            )}
                            placeholder="Seleccionar equipo"
                            searchPlaceholder="Buscar por nombre o código..."
                            data-testid={`select-equipment-${index}`}
                            disabled={Boolean(item.id)}
                          />
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(event) => setEditEquipment(current =>
                              current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row)
                            )}
                            aria-label="Cantidad"
                            data-testid={`input-equipment-quantity-${index}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditEquipment(current => current.filter((_, rowIndex) => rowIndex !== index))}
                            aria-label="Quitar equipo"
                            data-testid={`button-remove-equipment-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditEquipment(current => [...current, { productId: "", quantity: "1" }])}
                        data-testid="button-add-equipment"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar equipo
                      </Button>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingEquipment(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button type="button" size="sm" onClick={saveEquipment} disabled={updateEquipmentMutation.isPending} data-testid="button-save-equipment">
                          <Save className="h-4 w-4 mr-2" />
                          {updateEquipmentMutation.isPending ? "Guardando..." : "Guardar equipos"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("production.col.code")}</TableHead>
                        <TableHead>{t("production.col.product")}</TableHead>
                        <TableHead className="text-right">{t("production.col.qty")}</TableHead>
                        <TableHead className="text-right">{t("production.col.unit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.quotation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.product?.code || item.productCode}</TableCell>
                          <TableCell className="font-medium">{item.product?.name || item.productName}</TableCell>
                          <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {t("production.status-actions")}
                </div>
                <div className="flex gap-2">
                  {orderDetails.status === OrderStatus.PENDING && (
                    <Button 
                      onClick={handleMarkAsInProduction}
                      disabled={updateOrderMutation.isPending}
                      data-testid="button-mark-in-production"
                    >
                      <Factory className="h-4 w-4 mr-1" />
                      {t("btn.start-production")}
                    </Button>
                  )}
                  {orderDetails.status === OrderStatus.IN_PRODUCTION && (
                    <Button 
                      onClick={handleMarkAsReady}
                      disabled={updateOrderMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-mark-ready"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t("btn.mark-ready")}
                    </Button>
                  )}
                  {orderDetails.status === OrderStatus.READY && (
                    <Button 
                      onClick={handleSendToShipping}
                      disabled={updateOrderMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-send-to-shipping"
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      {t("btn.send-to-shipping")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              {t("btn.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
