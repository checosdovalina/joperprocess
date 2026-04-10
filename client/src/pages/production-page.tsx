import { useState } from "react";
import { Order, Quotation, Customer, QuotationItem, Product, OrderStatus } from "@shared/schema";
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
import { Factory, Eye, Calendar, Clock, AlertCircle, Save, X, CheckCircle2, Package, Truck } from "lucide-react";
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

export default function ProductionPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editEstimatedDelivery, setEditEstimatedDelivery] = useState("");
  const [editFactoryNotes, setEditFactoryNotes] = useState("");
  const [editProgress, setEditProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<OrderWithQuotation[]>({
    queryKey: ["/api/orders"],
  });

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
      toast({ title: "Pedido actualizado", description: "La información de producción se guardó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", selectedOrderId, "details"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el pedido", variant: "destructive" });
    },
  });

  const quickShipMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Create a shipment record for the order
      const res = await apiRequest("POST", `/api/shipments`, { 
        orderId,
        transporter: "Por asignar",
        transportType: "propio",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Enviado a Embarque", description: "El pedido ha sido transferido al departamento de embarques" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo enviar a embarque", variant: "destructive" });
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
      [OrderStatus.PENDING]: { label: "Pendiente", className: "bg-gray-100 text-gray-800" },
      [OrderStatus.IN_PRODUCTION]: { label: "En Producción", className: "bg-blue-100 text-blue-800" },
      [OrderStatus.READY]: { label: "Listo", className: "bg-green-100 text-green-800" },
      [OrderStatus.PARTIALLY_RELEASED]: { label: "Parcialmente Liberado", className: "bg-yellow-100 text-yellow-800" },
      [OrderStatus.SHIPPED]: { label: "Enviado", className: "bg-purple-100 text-purple-800" },
      [OrderStatus.DELIVERED]: { label: "Entregado", className: "bg-green-100 text-green-800" },
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
            <TableHead>Folio</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead>Entrega Est.</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersList.map((order) => (
            <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
              <TableCell className="font-medium">{order.quotation.folio}</TableCell>
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
                    Sin definir
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
                      A Embarque
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewDetails(order.id)}
                    data-testid={`button-view-order-${order.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Gestionar
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
          <h1 className="text-2xl font-bold">Producción</h1>
          <p className="text-muted-foreground">Gestión de pedidos en fábrica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
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
                <p className="text-sm text-muted-foreground">En Producción</p>
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
                <p className="text-sm text-muted-foreground">Listos</p>
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
                <p className="text-sm text-muted-foreground">Total Activos</p>
                <p className="text-2xl font-bold">{(orders?.length || 0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pendientes ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="in-production" data-testid="tab-in-production">
            En Producción ({inProductionOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready" data-testid="tab-ready">
            Listos ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            Todos ({orders?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Pendientes</CardTitle>
              <CardDescription>Pedidos que aún no han iniciado producción</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(pendingOrders, "No hay pedidos pendientes")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-production">
          <Card>
            <CardHeader>
              <CardTitle>En Producción</CardTitle>
              <CardDescription>Pedidos actualmente en proceso de fabricación</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(inProductionOrders, "No hay pedidos en producción")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready">
          <Card>
            <CardHeader>
              <CardTitle>Listos para Embarque</CardTitle>
              <CardDescription>Pedidos completados listos para enviar</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(readyOrders, "No hay pedidos listos")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Pedidos</CardTitle>
              <CardDescription>Lista completa de pedidos</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrdersTable(orders || [], "No hay pedidos")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Gestión de Producción
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
                    Creado: {format(new Date(orderDetails.createdAt), "PPP", { locale: es })}
                  </span>
                </div>
                {!isEditing && (
                  <Button onClick={startEditing} variant="outline" data-testid="button-edit-production">
                    Editar Información
                  </Button>
                )}
              </div>

              <Separator />

              {isEditing ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDelivery">Fecha Estimada de Entrega</Label>
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
                          Sin tiempo
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Progreso de Producción: {editProgress}%</Label>
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
                    <Label htmlFor="factoryNotes">Notas de Producción</Label>
                    <Textarea
                      id="factoryNotes"
                      value={editFactoryNotes}
                      onChange={(e) => setEditFactoryNotes(e.target.value)}
                      placeholder="Notas internas de producción..."
                      rows={4}
                      data-testid="input-factory-notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={cancelEditing} data-testid="button-cancel-edit">
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={updateOrderMutation.isPending}
                      data-testid="button-save-production"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha Estimada de Entrega</Label>
                    <div className="text-sm font-medium mt-1">
                      {orderDetails.estimatedDelivery
                        ? format(new Date(orderDetails.estimatedDelivery), "PPP", { locale: es })
                        : <span className="text-orange-600">No definida</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Progreso</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={orderDetails.productionProgress} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{orderDetails.productionProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notas</Label>
                    <div className="text-sm mt-1">
                      {orderDetails.factoryNotes || <span className="text-muted-foreground">Sin notas</span>}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Productos del Pedido</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Unidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails.quotation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.product.code}</TableCell>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Acciones rápidas de estado
                </div>
                <div className="flex gap-2">
                  {orderDetails.status === OrderStatus.PENDING && (
                    <Button 
                      onClick={handleMarkAsInProduction}
                      disabled={updateOrderMutation.isPending}
                      data-testid="button-mark-in-production"
                    >
                      <Factory className="h-4 w-4 mr-1" />
                      Iniciar Producción
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
                      Marcar como Listo
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
                      Enviar a Embarque
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
