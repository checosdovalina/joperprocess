import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shipment, Order, Quotation, Customer, ShipmentStatus, ShipmentProductInstance, Product, QuotationItem, type Empresa } from "@shared/schema";
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
import { Truck, Barcode, Plus, Trash2, Loader2, Package, Eye, EyeOff, RotateCcw, FileDown, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
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
  const { t } = useI18n();
  const { toast } = useToast();
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithDetails | null>(null);
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newSerials, setNewSerials] = useState<{ productId: string; serialNumber: string }[]>([]);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editingSerialValue, setEditingSerialValue] = useState("");
  const [deletingInstanceId, setDeletingInstanceId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTransporter, setEditTransporter] = useState("");
  const [editTransportType, setEditTransportType] = useState("");
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editDriverName, setEditDriverName] = useState("");
  const [editVehiclePlates, setEditVehiclePlates] = useState("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [hideDelivered, setHideDelivered] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("status") || "all";
  });
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("all");

  const { data: shipments, isLoading } = useQuery<ShipmentWithDetails[]>({
    queryKey: ["/api/shipments"],
  });

  const { data: empresas } = useQuery<Empresa[]>({
    queryKey: ["/api/empresas"],
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
        title: t("shipments.toast.serials-saved"),
        description: t("shipments.toast.serials-saved-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message || t("shipments.toast.serials-save-error"),
        variant: "destructive",
      });
    },
  });

  const deleteSerialMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await apiRequest("DELETE", `/api/product-instances/${instanceId}`);
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      setDeletingInstanceId(null);
      refetchInstances();
      toast({ title: t("shipments.toast.serial-deleted"), description: t("shipments.toast.serial-deleted-desc") });
    },
    onError: () => {
      toast({ title: t("label.error"), description: t("shipments.toast.serial-delete-error"), variant: "destructive" });
    },
  });

  const editSerialMutation = useMutation({
    mutationFn: async ({ id, serialNumber }: { id: string; serialNumber: string }) => {
      const res = await apiRequest("PATCH", `/api/product-instances/${id}`, { serialNumber });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t("shipments.toast.update-error"));
      }
    },
    onSuccess: () => {
      setEditingInstanceId(null);
      setEditingSerialValue("");
      refetchInstances();
      toast({ title: t("shipments.toast.serial-updated"), description: t("shipments.toast.serial-updated-desc") });
    },
    onError: (error: Error) => {
      toast({ title: t("label.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async (data: { transporter?: string; transportType?: string; trackingNumber?: string; driverName?: string; vehiclePlates?: string; status?: string; shippedAt?: string; invoiceNumber?: string }) => {
      if (!selectedShipment) throw new Error("No shipment selected");
      const res = await apiRequest("PATCH", `/api/shipments/${selectedShipment.id}`, data);
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: (updated) => {
      toast({ title: t("shipments.toast.updated"), description: t("shipments.toast.updated-desc") });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      setEditMode(false);
      // Update local state so status buttons reflect the new status immediately
      if (selectedShipment && updated) {
        setSelectedShipment({ ...selectedShipment, ...updated });
      }
    },
    onError: () => {
      toast({ title: t("label.error"), description: t("shipments.toast.update-error"), variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [ShipmentStatus.PENDING]: { label: t("status.pending"), className: "bg-yellow-100 text-yellow-800" },
      [ShipmentStatus.IN_TRANSIT]: { label: t("status.in-transit"), className: "bg-blue-100 text-blue-800" },
      [ShipmentStatus.DELIVERED]: { label: t("status.delivered"), className: "bg-green-100 text-green-800" },
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
    setEditInvoiceNumber((shipment as any).invoiceNumber || "");
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
      invoiceNumber: editInvoiceNumber || undefined,
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
    const totalNeeded = orderDetails?.quotation?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
    const captured = (productInstances?.length ?? 0) + newSerials.length;
    if (totalNeeded > 0 && captured >= totalNeeded) {
      toast({
        title: t("shipments.toast.limit-reached"),
        description: `${t("shipments.toast.limit-desc-1")} ${totalNeeded} ${t("label.of")} ${totalNeeded} ${t("shipments.toast.limit-desc-2")}`,
        variant: "destructive",
      });
      return;
    }
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
        title: t("shipments.toast.no-data"),
        description: t("shipments.toast.no-data-desc"),
        variant: "destructive",
      });
      return;
    }
    addSerialsMutation.mutate(validSerials);
  };

  const hasActiveFilters = searchText !== "" || filterStatus !== "all" || filterEmpresa !== "all" || filterDateFrom !== "" || filterDateTo !== "";

  const filteredShipments = (shipments ?? []).filter(s => {
    if (hideDelivered && s.status === ShipmentStatus.DELIVERED) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterEmpresa !== "all" && s.empresaId !== filterEmpresa) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const matchCustomer = s.order.quotation.customer.name.toLowerCase().includes(q);
      const matchFolio = s.order.quotation.folio?.toLowerCase().includes(q);
      const matchTransporter = s.transporter?.toLowerCase().includes(q);
      if (!matchCustomer && !matchFolio && !matchTransporter) return false;
    }
    if (filterDateFrom) {
      const from = startOfDay(parseISO(filterDateFrom));
      const date = s.shippedAt ? new Date(s.shippedAt) : new Date(s.createdAt);
      if (date < from) return false;
    }
    if (filterDateTo) {
      const to = endOfDay(parseISO(filterDateTo));
      const date = s.shippedAt ? new Date(s.shippedAt) : new Date(s.createdAt);
      if (date > to) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearchText("");
    setFilterStatus("all");
    setFilterEmpresa("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("shipments.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("shipments.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("status.pending")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("status.in-transit")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("status.delivered")}</CardTitle>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t("shipments.all")}</CardTitle>
              <CardDescription>
                {filteredShipments.length} {t("label.of")} {shipments?.length || 0} {t("shipments.count-label")}
                {hideDelivered && (shipments?.filter(s => s.status === ShipmentStatus.DELIVERED).length ?? 0) > 0 && (
                  <span className="ml-1">
                    ({shipments!.filter(s => s.status === ShipmentStatus.DELIVERED).length} {shipments!.filter(s => s.status === ShipmentStatus.DELIVERED).length !== 1 ? t("shipments.delivered-plural") : t("shipments.delivered-singular")} {shipments!.filter(s => s.status === ShipmentStatus.DELIVERED).length !== 1 ? t("shipments.hidden-plural") : t("shipments.hidden-singular")})
                  </span>
                )}
              </CardDescription>
            </div>
            {(shipments?.filter(s => s.status === ShipmentStatus.DELIVERED).length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setHideDelivered(v => !v)} data-testid="button-toggle-delivered">
                {hideDelivered ? <><Eye className="h-4 w-4 mr-2" />{t("shipments.show-delivered")}</> : <><EyeOff className="h-4 w-4 mr-2" />{t("shipments.hide-delivered")}</>}
              </Button>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
            <div className="flex-1 min-w-[180px]">
              <Input
                placeholder={t("shipments.search-ph")}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                data-testid="input-search-shipment"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
                <SelectValue placeholder={t("label.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("shipments.all-statuses")}</SelectItem>
                <SelectItem value={ShipmentStatus.PENDING}>{t("status.pending")}</SelectItem>
                <SelectItem value={ShipmentStatus.IN_TRANSIT}>{t("status.in-transit")}</SelectItem>
                <SelectItem value={ShipmentStatus.DELIVERED}>{t("status.delivered")}</SelectItem>
              </SelectContent>
            </Select>
            {empresas && empresas.length > 0 && (
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa} data-testid="select-filter-empresa">
                <SelectTrigger className="w-[160px]">
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
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
                title={t("shipments.date-from")}
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
                title={t("shipments.date-to")}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("btn.clear")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredShipments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("label.folio")}</TableHead>
                    <TableHead>{t("shipments.col.carrier")}</TableHead>
                    <TableHead>{t("label.type")}</TableHead>
                    <TableHead>{t("shipments.col.date")}</TableHead>
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id} className="hover-elevate" data-testid={`row-shipment-${shipment.id}`}>
                      <TableCell>
                        <div className="font-mono text-sm">{shipment.order.quotation.folio}</div>
                        {shipment.empresaId && empresas && empresas.length > 0 && (
                          <Badge variant="secondary" className="mt-1" data-testid={`badge-empresa-${shipment.id}`}>
                            {empresas.find(e => e.id === shipment.empresaId)?.name ?? ""}
                          </Badge>
                        )}
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
                          <span className="text-xs text-muted-foreground">{t("shipments.not-shipped")}</span>
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
                            {t("shipments.serials")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsDialog(shipment)}
                            data-testid={`button-view-shipment-${shipment.id}`}
                          >
                            {t("btn.view-details")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : shipments && shipments.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
              {t("shipments.no-filter-match")}
            </div>
          ) : (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("shipments.no-results")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={serialDialogOpen} onOpenChange={setSerialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              {t("shipments.serials-title")} - {selectedShipment?.order.quotation.folio}
            </DialogTitle>
            <DialogDescription>
              {selectedShipment?.order.quotation.folio}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const totalNeeded = orderDetails?.quotation?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
            const captured = productInstances?.length ?? 0;
            const pct = totalNeeded > 0 ? Math.round((captured / totalNeeded) * 100) : 0;
            if (totalNeeded === 0) return null;
            return (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("shipments.serials-captured")}</span>
                  <span className={captured >= totalNeeded ? "font-semibold text-green-600" : "font-semibold"}>
                    {captured} {t("label.of")} {totalNeeded}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                {captured >= totalNeeded && (
                  <p className="text-xs text-green-600 text-right">{t("shipments.all-serials-assigned")}</p>
                )}
              </div>
            );
          })()}

          <div className="space-y-4">
            {productInstances && productInstances.length > 0 && (
              <div>
                <Label className="text-sm font-medium">{t("shipments.registered-serials")}</Label>
                <ScrollArea className="h-48 mt-2 border rounded-md">
                  <div className="p-3 space-y-2">
                    {productInstances.map((instance) => (
                      <div
                        key={instance.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                        data-testid={`serial-${instance.id}`}
                      >
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          {editingInstanceId === instance.id ? (
                            <Input
                              value={editingSerialValue}
                              onChange={(e) => setEditingSerialValue(e.target.value)}
                              className="h-7 text-sm font-mono"
                              autoFocus
                              data-testid={`input-edit-serial-${instance.id}`}
                            />
                          ) : (
                            <>
                              <div className="font-mono text-sm truncate">{instance.serialNumber}</div>
                              <div className="text-xs text-muted-foreground truncate">{instance.product?.name}</div>
                            </>
                          )}
                        </div>
                        {deletingInstanceId === instance.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-destructive font-medium">{t("shipments.delete-confirm")}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => deleteSerialMutation.mutate(instance.id)}
                              disabled={deleteSerialMutation.isPending}
                              data-testid={`button-confirm-delete-serial-${instance.id}`}
                            >
                              {deleteSerialMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-destructive" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setDeletingInstanceId(null)}
                              data-testid={`button-cancel-delete-serial-${instance.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : editingInstanceId === instance.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => editSerialMutation.mutate({ id: instance.id, serialNumber: editingSerialValue.trim() })}
                              disabled={editSerialMutation.isPending || !editingSerialValue.trim()}
                              data-testid={`button-confirm-edit-serial-${instance.id}`}
                            >
                              {editSerialMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-600" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => { setEditingInstanceId(null); setEditingSerialValue(""); }}
                              data-testid={`button-cancel-edit-serial-${instance.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => { setEditingInstanceId(instance.id); setEditingSerialValue(instance.serialNumber); setDeletingInstanceId(null); }}
                              data-testid={`button-edit-serial-${instance.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => { setDeletingInstanceId(instance.id); setEditingInstanceId(null); }}
                              data-testid={`button-delete-serial-${instance.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{t("shipments.add-new-serials")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewSerialRow}
                  data-testid="button-add-serial-row"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("shipments.add")}
                </Button>
              </div>

              {newSerials.length === 0 ? (
                <div className="text-center py-6 border rounded-md border-dashed">
                  <Barcode className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("shipments.add-hint")}
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
                          <SelectValue placeholder={t("shipments.product")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_select">{t("shipments.select-product")}</SelectItem>
                          {(orderProducts.length > 0 ? orderProducts : products?.filter(p => p.active) ?? []).map((product) => (
                            <SelectItem key={product!.id} value={product!.id}>
                              {product!.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={t("shipments.serial-number")}
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
                  {t("btn.cancel")}
                </Button>
                <Button
                  onClick={handleSaveSerials}
                  disabled={addSerialsMutation.isPending}
                  data-testid="button-save-serials"
                >
                  {addSerialsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {t("shipments.save-serials")}
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
              {t("shipments.details-title")}
            </DialogTitle>
            <DialogDescription>
              {selectedShipment?.order.quotation.folio}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedShipment.status)}
                {!editMode && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    {t("btn.edit")}
                  </Button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("shipments.col.carrier")}</Label>
                      <Input
                        value={editTransporter}
                        onChange={(e) => setEditTransporter(e.target.value)}
                        placeholder={t("shipments.carrier-ph")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("shipments.transport-type")}</Label>
                      <Select value={editTransportType} onValueChange={setEditTransportType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="propio">{t("shipments.transport-own")}</SelectItem>
                          <SelectItem value="paqueteria">{t("shipments.transport-parcel")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("shipments.tracking-number")}</Label>
                      <Input
                        value={editTrackingNumber}
                        onChange={(e) => setEditTrackingNumber(e.target.value)}
                        placeholder={t("shipments.tracking-ph")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("shipments.driver-name")}</Label>
                      <Input
                        value={editDriverName}
                        onChange={(e) => setEditDriverName(e.target.value)}
                        placeholder={t("shipments.driver-ph")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("shipments.vehicle-plates")}</Label>
                    <Input
                      value={editVehiclePlates}
                      onChange={(e) => setEditVehiclePlates(e.target.value)}
                      placeholder={t("shipments.plates-ph")}
                      className="w-1/2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("shipments.invoice-number")}</Label>
                    <Input
                      value={editInvoiceNumber}
                      onChange={(e) => setEditInvoiceNumber(e.target.value)}
                      placeholder={t("shipments.invoice-ph")}
                      data-testid="input-invoice-number"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      {t("btn.cancel")}
                    </Button>
                    <Button onClick={handleSaveShipment} disabled={updateShipmentMutation.isPending}>
                      {t("btn.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("shipments.col.carrier")}</Label>
                    <p className="font-medium">{selectedShipment.transporter}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("label.type")}</Label>
                    <p className="font-medium capitalize">{selectedShipment.transportType === "propio" ? t("shipments.transport-own") : t("shipments.transport-parcel")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("shipments.tracking-number-short")}</Label>
                    <p className="font-medium">{selectedShipment.trackingNumber || t("shipments.not-assigned")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("shipments.driver")}</Label>
                    <p className="font-medium">{selectedShipment.driverName || t("shipments.not-assigned")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("shipments.plates")}</Label>
                    <p className="font-medium">{selectedShipment.vehiclePlates || t("shipments.not-assigned-fem")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("shipments.shipping-date")}</Label>
                    <p className="font-medium">
                      {selectedShipment.shippedAt 
                        ? format(new Date(selectedShipment.shippedAt), "PPP", { locale: es })
                        : t("status.not-shipped")}
                    </p>
                  </div>
                  {(selectedShipment as any).invoiceNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("shipments.invoice-number")}</Label>
                      <p className="font-medium">{(selectedShipment as any).invoiceNumber}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`/api/shipments/${selectedShipment.id}/remision`, "_blank");
                  }}
                  data-testid={`button-remision-${selectedShipment.id}`}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  {t("shipments.exit-remision")}
                </Button>
                <div className="flex gap-2">
                  {selectedShipment.status === ShipmentStatus.PENDING && (
                    <Button onClick={handleMarkAsInTransit} disabled={updateShipmentMutation.isPending}>
                      <Truck className="h-4 w-4 mr-1" />
                      {t("shipments.mark-in-transit")}
                    </Button>
                  )}
                  {selectedShipment.status === ShipmentStatus.IN_TRANSIT && (
                    <Button onClick={handleMarkAsDelivered} disabled={updateShipmentMutation.isPending} className="bg-green-600 hover:bg-green-700">
                      {t("shipments.mark-delivered")}
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
