import { useState, useMemo } from "react";
import { Invoice, Customer, InvoiceStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, FileText, AlertCircle, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { AccountReceivableForm } from "@/components/account-receivable-form";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type InvoiceWithCustomer = Invoice & { customer: Customer };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [InvoiceStatus.DRAFT]: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
  [InvoiceStatus.PENDING_PAYMENT]: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
  [InvoiceStatus.PARTIALLY_PAID]: { label: "Pago Parcial", className: "bg-blue-100 text-blue-800" },
  [InvoiceStatus.PAID]: { label: "Pagada", className: "bg-green-100 text-green-800" },
  [InvoiceStatus.CANCELLED]: { label: "Cancelada", className: "bg-gray-100 text-gray-600" },
  overdue: { label: "Vencida", className: "bg-red-100 text-red-800" },
};

export default function AccountsReceivablePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);
  const { user } = useAuth();

  const [searchFolio, setSearchFolio] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");

  const { data: invoices, isLoading } = useQuery<InvoiceWithCustomer[]>({
    queryKey: ["/api/accounts-receivable"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const isOverdue = (invoice: InvoiceWithCustomer) =>
    invoice.status === InvoiceStatus.PENDING_PAYMENT &&
    invoice.dueDate &&
    isPast(new Date(invoice.dueDate));

  const getStatusKey = (invoice: InvoiceWithCustomer) =>
    isOverdue(invoice) ? "overdue" : invoice.status;

  const getStatusBadge = (invoice: InvoiceWithCustomer) => {
    const key = getStatusKey(invoice);
    const cfg = STATUS_CONFIG[key] || STATUS_CONFIG[InvoiceStatus.PENDING_PAYMENT];
    return <Badge className={cfg.className} data-testid={`status-${invoice.id}`}>{cfg.label}</Badge>;
  };

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const folio = `${inv.serie}-${inv.folio}`.toLowerCase();
      const cliente = inv.customer.name.toLowerCase();
      const fecha = new Date(inv.issuedAt);

      if (searchFolio && !folio.includes(searchFolio.toLowerCase())) return false;
      if (searchCliente && !cliente.includes(searchCliente.toLowerCase())) return false;
      if (filterFechaDesde && fecha < new Date(filterFechaDesde)) return false;
      if (filterFechaHasta) {
        const hasta = new Date(filterFechaHasta);
        hasta.setHours(23, 59, 59);
        if (fecha > hasta) return false;
      }
      if (filterEstado !== "all") {
        if (getStatusKey(inv) !== filterEstado) return false;
      }
      return true;
    });
  }, [invoices, searchFolio, searchCliente, filterFechaDesde, filterFechaHasta, filterEstado]);

  const hasActiveFilters =
    searchFolio || searchCliente || filterFechaDesde || filterFechaHasta || filterEstado !== "all";

  const clearFilters = () => {
    setSearchFolio("");
    setSearchCliente("");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
    setFilterEstado("all");
  };

  // Summary counts from filtered data
  const totalSaldo = filteredInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.balanceDue || inv.total),
    0
  );
  const totalFacturado = filteredInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total),
    0
  );
  const vencidas = filteredInvoices.filter((inv) => isOverdue(inv)).length;
  const pendientes = filteredInvoices.filter(
    (inv) => inv.status === InvoiceStatus.PENDING_PAYMENT && !isOverdue(inv)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona facturas por cobrar y pagos de clientes
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-invoice">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground">de {invoices?.length || 0} total</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{vencidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSaldo.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              de ${totalFacturado.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} facturado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters-ar">
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Folio / Factura</Label>
              <Input
                placeholder="Ej: F-1234"
                value={searchFolio}
                onChange={(e) => setSearchFolio(e.target.value)}
                data-testid="input-filter-folio-ar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input
                placeholder="Nombre del cliente"
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                data-testid="input-filter-cliente-ar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha desde</Label>
              <Input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                data-testid="input-filter-fecha-desde-ar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha hasta</Label>
              <Input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                data-testid="input-filter-fecha-hasta-ar"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger data-testid="select-filter-estado-ar">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={InvoiceStatus.PENDING_PAYMENT}>Pendiente</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                  <SelectItem value={InvoiceStatus.PARTIALLY_PAID}>Pago Parcial</SelectItem>
                  <SelectItem value={InvoiceStatus.PAID}>Pagada</SelectItem>
                  <SelectItem value={InvoiceStatus.CANCELLED}>Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas por Cobrar</CardTitle>
          <CardDescription>
            {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " con los filtros aplicados" : " registradas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serie/Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Emisión</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="hover-elevate"
                      data-testid={`row-invoice-${invoice.id}`}
                    >
                      <TableCell>
                        <div className="font-mono font-medium">
                          {invoice.serie}-{invoice.folio}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{invoice.customer.rfc}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(invoice.issuedAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm">
                              {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </span>
                            {isOverdue(invoice) && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${parseFloat(invoice.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-medium ${parseFloat(invoice.balanceDue || invoice.total) > 0 && invoice.status !== InvoiceStatus.PAID ? "text-red-600" : "text-green-600"}`}>
                          ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                          data-testid={`button-view-invoice-${invoice.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">
                {hasActiveFilters ? "No hay facturas con los filtros aplicados" : "No hay facturas registradas"}
              </h3>
              {hasActiveFilters ? (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Comienza creando tu primera factura por cobrar
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {dialogOpen && customers && (
        <AccountReceivableForm
          customers={customers}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Factura
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Serie/Folio</p>
                  <p className="font-mono text-lg font-bold">{selectedInvoice.serie}-{selectedInvoice.folio}</p>
                </div>
                {getStatusBadge(selectedInvoice)}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedInvoice.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.customer.rfc}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moneda</p>
                  <p className="font-medium">{selectedInvoice.currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.issuedAt), "PP", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                  <p className="font-medium">
                    {selectedInvoice.dueDate
                      ? format(new Date(selectedInvoice.dueDate), "PP", { locale: es })
                      : "Sin definir"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ${parseFloat(selectedInvoice.subtotal || "0").toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span className="font-medium">
                    ${parseFloat(selectedInvoice.tax || "0").toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">
                    ${parseFloat(selectedInvoice.total).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Pendiente</span>
                  <span className="font-bold text-primary">
                    ${parseFloat(selectedInvoice.balanceDue || selectedInvoice.total).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm mt-1">{selectedInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
