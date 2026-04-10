import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shipment, Order, Quotation, Customer, ShipmentStatus, ShipmentProductInstance, Product, QuotationItem } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Barcode, Plus, Trash2, Loader2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

type ShipmentWithDetails = Shipment & { 
  order: Order & { 
    quotation: Quotation & { 
      customer: Customer 
    } 
  } 
};

type ProductInstanceWithDetails = ShipmentProductInstance & {
  product: Product;
};

export default function ShipmentsPage() {
  const { toast } = useToast();
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithDetails | null>(null);
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newSerials, setNewSerials] = useState<{ productId: string; serialNumber: string }[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editTransporter, setEditTransporter] = useState("");
  const [editTransportType, setEditTransportType] = useState("");
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editDriverName, setEditDriverName] = useState("");
  const [editVehiclePlates, setEditVehiclePlates] = useState("");

  const { data: shipments, isLoading } = useQuery<ShipmentWithDetails[]>({
    queryKey: ["/api/shipments"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: productInstances, refetch: refetchInstances } = useQuery<ProductInstanceWithDetails[]>({
    queryKey: ["/api/product-instances", selectedShipment?.id],
    queryFn: async () => {
      if (!selectedShipment) return [];
      const response = await fetch(`/api/product-instances?shipmentId=${selectedShipment.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error fetching instances");
      return response.json();
    },
    enabled: !!selectedShipment,
  });

  type OrderDetails = Order & {
    quotation: Quotation & {
      items: (QuotationItem & { product: Product })[];
    };
  };

  const { data: orderDetails } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", selectedShipment?.orderId, "details"],
    queryFn: async () => {
      if (!selectedShipment) throw new Error();
      const response = await fetch(`/api/orders/${selectedShipment.orderId}/details`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error fetching order details");
      return response.json();
    },
    enabled: !!selectedShipment && serialDialogOpen,
  });

  // Products that belong to this order's quotation
  const orderProducts = orderDetails?.quotation?.items
    ?.map(item => item.product)
    .filter((p, idx, arr) => p && arr.findIndex(x => x?.id === p.id) === idx) ?? [];

  const addSerialsMutation = useMutation({
    mutationFn: async (instances: { productId: string; serialNumber: string }[]) => {
      if (!selectedShipment) throw new Error("No shipment selected");
      const data = instances.map(i => ({
        shipmentId: selectedShipment.id,
        orderId: selectedShipment.orderId,
        customerId: selectedShipment.order.quotation.customer.id,
        productId: i.productId,
        serialNumber: i.serialNumber,
      }));
      return apiRequest("POST", "/api/product-instances/bulk", { instances: data });
    },
    onSuccess: () => {
      refetchInstances();
      setNewSerials([]);
      toast({
        title: "Números de serie registrados",
        description: "Los números de serie se guardaron correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los números de serie",
        variant: "destructive",
      });
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async (data: { transporter?: string; transportType?: string; trackingNumber?: string; driverName?: string; vehiclePlates?: string; status?: string; shippedAt?: string }) => {
      if (!selectedShipment) throw new Error("No shipment selected");
      return apiRequest("PATCH", `/api/shipments/${selectedShipment.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Embarque actualizado", description: "La información se guardó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      setEditMode(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el embarque", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [ShipmentStatus.PENDING]: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      [ShipmentStatus.IN_TRANSIT]: { label: "En Tránsito", className: "bg-blue-100 text-blue-800" },
      [ShipmentStatus.DELIVERED]: { label: "Entregado", className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status] || statusConfig[ShipmentStatus.PENDING];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const openDetailsDialog = (shipment: ShipmentWithDetails) => {
    setSelectedShipment(shipment);
    setEditTransporter(shipment.transporter);
    setEditTransportType(shipment.transportType);
    setEditTrackingNumber(shipment.trackingNumber || "");
    setEditDriverName(shipment.driverName || "");
    setEditVehiclePlates(shipment.vehiclePlates || "");
    setDetailsDialogOpen(true);
    setEditMode(false);
  };

  const handleSaveShipment = () => {
    updateShipmentMutation.mutate({
      transporter: editTransporter,
      transportType: editTransportType,
      trackingNumber: editTrackingNumber || undefined,
      driverName: editDriverName || undefined,
      vehiclePlates: editVehiclePlates || undefined,
    });
  };

  const handleMarkAsInTransit = () => {
    updateShipmentMutation.mutate({
      status: ShipmentStatus.IN_TRANSIT,
      shippedAt: new Date().toISOString(),
    });
  };

  const handleMarkAsDelivered = () => {
    updateShipmentMutation.mutate({
      status: ShipmentStatus.DELIVERED,
    });
  };

  const openSerialDialog = (shipment: ShipmentWithDetails) => {
    setSelectedShipment(shipment);
    setSerialDialogOpen(true);
    setNewSerials([]);
  };

  const addNewSerialRow = () => {
    const autoProductId = orderProducts.length === 1 ? (orderProducts[0]?.id ?? "") : "";
    setNewSerials([...newSerials, { productId: autoProductId, serialNumber: "" }]);
  };

  const updateSerialRow = (index: number, field: "productId" | "serialNumber", value: string) => {
    const updated = [...newSerials];
    updated[index][field] = value;
    setNewSerials(updated);
  };

  const removeSerialRow = (index: number) => {
    setNewSerials(newSerials.filter((_, i) => i !== index));
  };

  const handleSaveSerials = () => {
    const validSerials = newSerials.filter(s => s.productId && s.serialNumber.trim());
    if (validSerials.length === 0) {
      toast({
        title: "Sin datos",
        description: "Agrega al menos un número de serie válido",
        variant: "destructive",
      });
      return;
    }
    addSerialsMutation.mutate(validSerials);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Embarques</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona embarques, números de serie y trazabilidad
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Truck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments?.filter((s) => s.status === ShipmentStatus.PENDING).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments?.filter((s) => s.status === ShipmentStatus.IN_TRANSIT).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregados</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments?.filter((s) => s.status === ShipmentStatus.DELIVERED).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Embarques</CardTitle>
          <CardDescription>
            {shipments?.length || 0} embarques registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : shipments && shipments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Transportista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Embarque</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="hover-elevate" data-testid={`row-shipment-${shipment.id}`}>
                      <TableCell>
                        <div className="font-medium">{shipment.order.quotation.customer.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{shipment.order.quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{shipment.transporter}</div>
                        {shipment.trackingNumber && (
                          <div className="text-xs text-muted-foreground">
                            {shipment.trackingNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {shipment.transportType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shipment.shippedAt ? (
                          <div className="text-sm">
                            {format(new Date(shipment.shippedAt), "PP", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No embarcado</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSerialDialog(shipment)}
                            data-testid={`button-serial-${shipment.id}`}
                          >
                            <Barcode className="h-4 w-4 mr-1" />
                            Series
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsDialog(shipment)}
                            data-testid={`button-view-shipment-${shipment.id}`}
                          >
                            Ver Detalles
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
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay embarques registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={serialDialogOpen} onOpenChange={setSerialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Números de Serie - {selectedShipment?.order.quotation.folio}
            </DialogTitle>
            <DialogDescription>
              Cliente: {selectedShipment?.order.quotation.customer.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {productInstances && productInstances.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Series Registradas</Label>
                <ScrollArea className="h-40 mt-2 border rounded-md">
                  <div className="p-3 space-y-2">
                    {productInstances.map((instance) => (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                        data-testid={`serial-${instance.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-mono text-sm">{instance.serialNumber}</div>
                            <div className="text-xs text-muted-foreground">{instance.product?.name}</div>
                          </div>
                        </div>
                        <Badge variant={instance.status === "active" ? "secondary" : "outline"}>
                          {instance.status === "active" ? "Activo" : instance.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Agregar Nuevas Series</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewSerialRow}
                  data-testid="button-add-serial-row"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {newSerials.length === 0 ? (
                <div className="text-center py-6 border rounded-md border-dashed">
                  <Barcode className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic en "Agregar" para registrar números de serie
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newSerials.map((serial, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={serial.productId || "_select"}
                        onValueChange={(v) => updateSerialRow(index, "productId", v === "_select" ? "" : v)}
                      >
                        <SelectTrigger className="w-56" data-testid={`select-product-${index}`}>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_select">Seleccionar producto</SelectItem>
                          {(orderProducts.length > 0 ? orderProducts : products?.filter(p => p.active) ?? []).map((product) => (
                            <SelectItem key={product!.id} value={product!.id}>
                              {product!.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Número de serie"
                        value={serial.serialNumber}
                        onChange={(e) => updateSerialRow(index, "serialNumber", e.target.value)}
                        className="flex-1"
                        data-testid={`input-serial-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSerialRow(index)}
                        data-testid={`button-remove-serial-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {newSerials.length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setNewSerials([])}
                  data-testid="button-cancel-serials"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveSerials}
                  disabled={addSerialsMutation.isPending}
                  data-testid="button-save-serials"
                >
                  {addSerialsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Guardar Series
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Detalles del Embarque
            </DialogTitle>
            <DialogDescription>
              {selectedShipment?.order.quotation.folio} - {selectedShipment?.order.quotation.customer.name}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedShipment.status)}
                {!editMode && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Transportista</Label>
                      <Input
                        value={editTransporter}
                        onChange={(e) => setEditTransporter(e.target.value)}
                        placeholder="Nombre del transportista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Transporte</Label>
                      <Select value={editTransportType} onValueChange={setEditTransportType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="propio">Transporte Propio</SelectItem>
                          <SelectItem value="paqueteria">Paquetería</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número de Guía / Rastreo</Label>
                      <Input
                        value={editTrackingNumber}
                        onChange={(e) => setEditTrackingNumber(e.target.value)}
                        placeholder="Número de guía"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre del Chofer</Label>
                      <Input
                        value={editDriverName}
                        onChange={(e) => setEditDriverName(e.target.value)}
                        placeholder="Nombre del chofer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Placas del Vehículo</Label>
                    <Input
                      value={editVehiclePlates}
                      onChange={(e) => setEditVehiclePlates(e.target.value)}
                      placeholder="Placas"
                      className="w-1/2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveShipment} disabled={updateShipmentMutation.isPending}>
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Transportista</Label>
                    <p className="font-medium">{selectedShipment.transporter}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <p className="font-medium capitalize">{selectedShipment.transportType === "propio" ? "Transporte Propio" : "Paquetería"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Número de Guía</Label>
                    <p className="font-medium">{selectedShipment.trackingNumber || "No asignado"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Chofer</Label>
                    <p className="font-medium">{selectedShipment.driverName || "No asignado"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Placas</Label>
                    <p className="font-medium">{selectedShipment.vehiclePlates || "No asignadas"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Embarque</Label>
                    <p className="font-medium">
                      {selectedShipment.shippedAt 
                        ? format(new Date(selectedShipment.shippedAt), "PPP", { locale: es })
                        : "No embarcado"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm text-muted-foreground">Acciones de estado</span>
                <div className="flex gap-2">
                  {selectedShipment.status === ShipmentStatus.PENDING && (
                    <Button onClick={handleMarkAsInTransit} disabled={updateShipmentMutation.isPending}>
                      <Truck className="h-4 w-4 mr-1" />
                      Marcar En Tránsito
                    </Button>
                  )}
                  {selectedShipment.status === ShipmentStatus.IN_TRANSIT && (
                    <Button onClick={handleMarkAsDelivered} disabled={updateShipmentMutation.isPending} className="bg-green-600 hover:bg-green-700">
                      Marcar Entregado
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
