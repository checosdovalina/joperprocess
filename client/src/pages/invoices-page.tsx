import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { Invoice, Customer, InvoiceStatus } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Download, Mail, Eye, MoreHorizontal, Loader2, Send, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type InvoiceWithDetails = Invoice & { customer: Customer };

export default function InvoicesPage() {
  const { t } = useI18n();
  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    [InvoiceStatus.DRAFT]: { label: t("status.draft"), className: "bg-gray-100 text-gray-800" },
    [InvoiceStatus.PENDING_PAYMENT]: { label: t("status.pending"), className: "bg-yellow-100 text-yellow-800" },
    [InvoiceStatus.PARTIALLY_PAID]: { label: t("status.partial-pay"), className: "bg-blue-100 text-blue-800" },
    [InvoiceStatus.PAID]: { label: t("status.paid"), className: "bg-green-100 text-green-800" },
    [InvoiceStatus.CANCELLED]: { label: t("status.cancelled"), className: "bg-red-100 text-red-800" },
    overdue: { label: t("status.overdue"), className: "bg-red-100 text-red-800" },
  };
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { toast } = useToast();

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFolio, setSearchFolio] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [filterEstado, setFilterEstado] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("status") || "all";
  });

  const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const isOverdue = (invoice: Invoice) => {
    return (
      invoice.status === InvoiceStatus.PENDING_PAYMENT &&
      invoice.dueDate &&
      isPast(new Date(invoice.dueDate))
    );
  };

  const getStatusKey = (invoice: Invoice) =>
    isOverdue(invoice) ? "overdue" : invoice.status;

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    const q = norm(searchTerm.trim());
    return invoices.filter((inv) => {
      const folio = `${inv.serie}-${inv.folio}`.toLowerCase();
      const cliente = inv.customer.name.toLowerCase();
      const fechaEmision = new Date(inv.issuedAt);

      if (q) {
        const matchFolio = norm(`${inv.serie}-${inv.folio}`).includes(q);
        const matchCliente = norm(inv.customer?.name || "").includes(q);
        if (!matchFolio && !matchCliente) return false;
      }
      if (searchFolio && !folio.includes(searchFolio.toLowerCase())) return false;
      if (searchCliente && !cliente.includes(searchCliente.toLowerCase())) return false;
      if (filterFechaDesde && fechaEmision < new Date(filterFechaDesde)) return false;
      if (filterFechaHasta) {
        const hasta = new Date(filterFechaHasta);
        hasta.setHours(23, 59, 59);
        if (fechaEmision > hasta) return false;
      }
      if (filterEstado !== "all") {
        const key = getStatusKey(inv);
        if (key !== filterEstado) return false;
      }
      return true;
    });
  }, [invoices, searchTerm, searchFolio, searchCliente, filterFechaDesde, filterFechaHasta, filterEstado]);

  const hasActiveFilters =
    searchTerm || searchFolio || searchCliente || filterFechaDesde || filterFechaHasta || filterEstado !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSearchFolio("");
    setSearchCliente("");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
    setFilterEstado("all");
  };

  const handleViewDetails = async (invoice: InvoiceWithDetails) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedInvoice(data);
      setDetailsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDownloadPDF = async (invoice: InvoiceWithDetails) => {
    setIsDownloading(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al generar PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${invoice.serie}-${invoice.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: `Factura ${invoice.serie}-${invoice.folio} descargada correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    setIsSending(true);
    try {
      const response = await apiRequest("POST", `/api/invoices/${selectedInvoice.id}/send-email`, {});
      const data = await response.json();
      toast({
        title: "Factura enviada",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSendEmailDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la factura por correo",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const openSendEmailDialog = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setSendEmailDialogOpen(true);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalFacturado = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  const vencidas = filteredInvoices.filter((i) => isOverdue(i)).length;
  const pendientes = filteredInvoices.filter((i) => i.status === InvoiceStatus.PENDING_PAYMENT && !isOverdue(i)).length;
  const pagadas = filteredInvoices.filter((i) => i.status === InvoiceStatus.PAID).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona facturas CFDI y envío automático
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
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
            <FileSpreadsheet className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vencidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalFacturado.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">{pagadas} pagadas</p>
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
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                {t("btn.clear-filters")}
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
                data-testid="input-filter-folio"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input
                placeholder="Nombre del cliente"
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                data-testid="input-filter-cliente"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha desde</Label>
              <Input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                data-testid="input-filter-fecha-desde"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha hasta</Label>
              <Input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                data-testid="input-filter-fecha-hasta"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger data-testid="select-filter-estado">
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle>Facturas</CardTitle>
              <CardDescription>
                {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " con los filtros aplicados" : " emitidas"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-invoices"
              />
            </div>
          </div>
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
                    <TableHead>Serie - Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const statusKey = getStatusKey(invoice);
                    const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS[InvoiceStatus.PENDING_PAYMENT];
                    return (
                      <TableRow key={invoice.id} className="hover-elevate" data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell>
                          <div className="font-mono font-medium">
                            {invoice.serie}-{invoice.folio}
                          </div>
                          {invoice.cfdiUuid && (
                            <div className="text-xs text-muted-foreground">
                              UUID: {invoice.cfdiUuid.slice(0, 8)}...
                            </div>
                          )}
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
                            <div className={`text-sm ${isOverdue(invoice) ? "text-red-600 font-medium" : ""}`}>
                              {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No definida</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(invoice.total)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`text-sm font-medium ${parseFloat(invoice.balanceDue || invoice.total) > 0 && invoice.status !== InvoiceStatus.PAID ? "text-orange-600" : "text-green-600"}`}>
                            {formatCurrency(invoice.balanceDue || invoice.total)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className} data-testid={`status-invoice-${invoice.id}`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(invoice)}
                              disabled={isLoadingDetails}
                              title="Ver detalles"
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-menu-invoice-${invoice.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPDF(invoice)}
                                  data-testid={`menu-pdf-invoice-${invoice.id}`}
                                >
                                  {isDownloading === invoice.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                  )}
                                  Descargar PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openSendEmailDialog(invoice)}
                                  data-testid={`menu-email-invoice-${invoice.id}`}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Enviar por correo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? "No hay facturas con los filtros aplicados" : "No hay facturas emitidas"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  {t("btn.clear-filters")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Factura {selectedInvoice?.serie}-{selectedInvoice?.folio}
            </DialogTitle>
            <DialogDescription>
              Detalles completos de la factura
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h4>
                    <p className="font-medium">{selectedInvoice.customer.name}</p>
                    {selectedInvoice.customer.rfc && (
                      <p className="text-sm text-muted-foreground">{selectedInvoice.customer.rfc}</p>
                    )}
                    {selectedInvoice.customer.email && (
                      <p className="text-sm text-muted-foreground">{selectedInvoice.customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado</h4>
                    {(() => {
                      const statusKey = getStatusKey(selectedInvoice);
                      const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS[InvoiceStatus.PENDING_PAYMENT];
                      return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
                    })()}
                    <p className="text-sm text-muted-foreground mt-1">
                      Emitida: {format(new Date(selectedInvoice.issuedAt), "PPP", { locale: es })}
                    </p>
                    {selectedInvoice.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Vence: {format(new Date(selectedInvoice.dueDate), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {selectedInvoice.cfdiUuid && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">UUID CFDI</h4>
                      <p className="font-mono text-sm">{selectedInvoice.cfdiUuid}</p>
                    </div>
                    <Separator />
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Método de Pago</h4>
                    <p>{selectedInvoice.paymentMethod || "Por definir"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Forma de Pago</h4>
                    <p>{selectedInvoice.paymentForm || "Por definir"}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                    {selectedInvoice.balanceDue !== null && selectedInvoice.balanceDue !== undefined && (
                      <div className="flex justify-between text-sm font-medium text-orange-600">
                        <span>Saldo pendiente:</span>
                        <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Notas</h4>
                      <p className="text-sm">{selectedInvoice.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}
              disabled={isDownloading === selectedInvoice?.id}
            >
              {isDownloading === selectedInvoice?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <AlertDialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Factura por Correo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se enviará la factura <strong>{selectedInvoice?.serie}-{selectedInvoice?.folio}</strong> al cliente{" "}
                  <strong>{selectedInvoice?.customer.name}</strong>.
                </p>
                {selectedInvoice?.customer.email ? (
                  <p className="text-sm">
                    El correo se enviará a: <strong>{selectedInvoice.customer.email}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    El cliente no tiene correo electrónico configurado.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendEmail}
              disabled={isSending || !selectedInvoice?.customer.email}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Factura
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
