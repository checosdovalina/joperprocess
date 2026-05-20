import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Customer } from "@shared/schema";
import {
  FileBarChart2,
  Filter,
  Download,
  Package,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  pending: "Pendiente",
  in_production: "En Producción",
  ready: "Listo",
  partially_released: "Parcialmente Surtido",
  released: "Surtido",
  shipped: "Embarcado",
  delivered: "Entregado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_production: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  partially_released: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  released: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

interface ReportOrderItem {
  productCode: string | null;
  productName: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice?: string | null;
}

interface ReportOrder {
  id: string;
  folio: string;
  customerName: string;
  customerRfc?: string | null;
  purchaseOrder?: string | null;
  closeDate?: string | null;
  shippingDate?: string | null;
  comments?: string | null;
  status: string;
  createdAt: string;
  items: ReportOrderItem[];
}

function formatDateStr(d: string | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}

function OrderCard({ order }: { order: ReportOrder }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden" data-testid={`card-order-${order.id}`}>
      <div
        className="flex items-start gap-4 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-order-${order.id}`}
      >
        {/* Left: icon */}
        <div className="mt-0.5 shrink-0 p-2 rounded-md bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Center: main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm" data-testid={`text-folio-${order.id}`}>{order.folio}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {order.customerName}
            </span>
            {order.closeDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Cierre: {formatDateStr(order.closeDate)}
              </span>
            )}
            {order.shippingDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Embarque: {formatDateStr(order.shippingDate)}
              </span>
            )}
            {order.purchaseOrder && (
              <span>OC: {order.purchaseOrder}</span>
            )}
          </div>
          {order.comments && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{order.comments}</p>
          )}
        </div>

        {/* Right: item count + expand */}
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {order.items.length} art{order.items.length !== 1 ? "ículos" : "ículo"}
          </Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <div className="px-4 py-3 bg-muted/30">
            {/* Full detail grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
              <div>
                <span className="text-muted-foreground font-medium">Folio:</span>{" "}
                <span className="font-semibold">{order.folio}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Fecha de Cierre:</span>{" "}
                <span>{formatDateStr(order.closeDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Orden de Compra:</span>{" "}
                <span>{order.purchaseOrder || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Fecha de Embarque:</span>{" "}
                <span>{formatDateStr(order.shippingDate)}</span>
              </div>
              {order.customerRfc && (
                <div>
                  <span className="text-muted-foreground font-medium">RFC:</span>{" "}
                  <span>{order.customerRfc}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground font-medium">Estatus:</span>{" "}
                <span>{STATUS_LABELS[order.status] || order.status}</span>
              </div>
              {order.comments && (
                <div className="col-span-2">
                  <span className="text-muted-foreground font-medium">Comentarios:</span>{" "}
                  <span>{order.comments}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Cantidad</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Clave de Producto</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-muted-foreground">Sin artículos</td>
                    </tr>
                  ) : (
                    order.items.map((item, i) => (
                      <tr key={i} className="bg-background">
                        <td className="px-3 py-2 font-medium">
                          {parseFloat(item.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unitOfMeasure}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{item.productCode || "—"}</td>
                        <td className="px-3 py-2">{item.productName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [applied, setApplied] = useState(false);

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.rfc || "").toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 8) || [];

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (statusFilter && statusFilter !== "all") queryParams.set("status", statusFilter);
  if (selectedCustomerId) queryParams.set("customerId", selectedCustomerId);

  const {
    data: reportOrders,
    isLoading,
    refetch,
  } = useQuery<ReportOrder[]>({
    queryKey: [`/api/reports/orders?${queryParams.toString()}`],
    enabled: applied,
  });

  const pdfMutation = useMutation({
    mutationFn: async () => {
      const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);
      const response = await fetch("/api/reports/orders/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orders: reportOrders || [],
          filters: {
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            customerName: selectedCustomer?.name || undefined,
          },
        }),
      });
      if (!response.ok) throw new Error("Error generando PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-pedidos-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF" });
    },
  });

  const handleApply = () => {
    setApplied(true);
    refetch();
  };

  const handleClear = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setCustomerSearch("");
    setSelectedCustomerId("");
    setApplied(false);
  };

  const hasFilters = dateFrom || dateTo || statusFilter !== "all" || selectedCustomerId;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileBarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{t("reports.title")}</h1>
            <p className="text-sm text-muted-foreground">Genera y visualiza reportes de pedidos</p>
          </div>
        </div>

        {applied && reportOrders && reportOrders.length > 0 && (
          <Button
            onClick={() => pdfMutation.mutate()}
            disabled={pdfMutation.isPending}
            data-testid="button-download-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            {pdfMutation.isPending ? "Generando..." : "Descargar PDF"}
          </Button>
        )}
      </div>

      {/* Filters card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t("reports.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date from */}
            <div className="space-y-1">
              <Label className="text-xs">Fecha desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <Label className="text-xs">Fecha hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Estatus</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer search */}
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar cliente..."
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(""); }}
                  data-testid="input-customer-search"
                />
                {customerSearch && (
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setCustomerSearch(""); setSelectedCustomerId(""); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {customerSearch && !selectedCustomerId && filteredCustomers.length > 0 && (
                <div className="absolute z-50 mt-1 w-72 bg-background border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover-elevate"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name);
                      }}
                      data-testid={`option-customer-${c.id}`}
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.rfc && <div className="text-xs text-muted-foreground">{c.rfc}</div>}
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomerId && (
                <p className="text-xs text-muted-foreground">
                  Cliente seleccionado
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={handleApply} data-testid="button-apply-filters">
              <Search className="h-4 w-4 mr-2" />
              {t("reports.generate")}
            </Button>
            {hasFilters && (
              <Button variant="outline" onClick={handleClear} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!applied && (
        <div className="text-center py-16 text-muted-foreground">
          <FileBarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("reports.configure-hint")}</p>
        </div>
      )}

      {applied && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {applied && !isLoading && reportOrders && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{reportOrders.length}</span>{" "}
              pedido{reportOrders.length !== 1 ? "s" : ""} encontrado{reportOrders.length !== 1 ? "s" : ""}
            </p>
            {reportOrders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  reportOrders.reduce((acc, o) => {
                    acc[o.status] = (acc[o.status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([st, count]) => (
                  <Badge
                    key={st}
                    variant="secondary"
                    className={`text-xs ${STATUS_COLORS[st] || ""}`}
                  >
                    {STATUS_LABELS[st] || st}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {reportOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron pedidos con los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
