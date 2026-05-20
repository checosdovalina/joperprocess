import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery } from "@tanstack/react-query";
import { Payment, Invoice, Customer, User } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus, Eye, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentForm } from "@/components/payment-form";

type PaymentWithDetails = Payment & {
  invoice: Invoice;
  customer: Customer;
  registeredBy: User;
};

export default function PaymentsPage() {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [searchCliente, setSearchCliente] = useState("");
  const [searchFactura, setSearchFactura] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  const { data: payments, isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      const cliente = (p.customer?.name || "").toLowerCase();
      const factura = p.invoice
        ? `${p.invoice.serie}-${p.invoice.folio}`.toLowerCase()
        : (p.notes || "").toLowerCase();
      const fecha = new Date(p.paymentDate);

      if (searchCliente && !cliente.includes(searchCliente.toLowerCase())) return false;
      if (searchFactura && !factura.includes(searchFactura.toLowerCase())) return false;
      if (filterFechaDesde && fecha < new Date(filterFechaDesde)) return false;
      if (filterFechaHasta) {
        const hasta = new Date(filterFechaHasta);
        hasta.setHours(23, 59, 59);
        if (fecha > hasta) return false;
      }
      return true;
    });
  }, [payments, searchCliente, searchFactura, filterFechaDesde, filterFechaHasta]);

  const hasActiveFilters = searchCliente || searchFactura || filterFechaDesde || filterFechaHasta;

  const clearFilters = () => {
    setSearchCliente("");
    setSearchFactura("");
    setFilterFechaDesde("");
    setFilterFechaHasta("");
  };

  const totalMonto = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const thisMonthPayments = filteredPayments.filter((p) => {
    const d = new Date(p.paymentDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const handleViewDetails = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("payments.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("payments.subtitle")}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-payment">
          <Plus className="h-4 w-4 mr-2" />
          {t("payments.register")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t("payments.total")}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground">de {payments?.length || 0} total</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t("payments.total-amount")}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalMonto.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t("payments.this-month")}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${thisMonthTotal.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">{thisMonthPayments.length} pagos</p>
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
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters-payments">
                <X className="h-4 w-4 mr-1" />
                {t("btn.clear-filters")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input
                placeholder="Nombre del cliente"
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                data-testid="input-filter-cliente-payments"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Factura / Referencia</Label>
              <Input
                placeholder="Ej: F-1234"
                value={searchFactura}
                onChange={(e) => setSearchFactura(e.target.value)}
                data-testid="input-filter-factura-payments"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha desde</Label>
              <Input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                data-testid="input-filter-fecha-desde-payments"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fecha hasta</Label>
              <Input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                data-testid="input-filter-fecha-hasta-payments"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("payments.history")}</CardTitle>
          <CardDescription>
            {filteredPayments.length} pago{filteredPayments.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " con los filtros aplicados" : " registrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("payments.col.date")}</TableHead>
                    <TableHead>{t("label.client")}</TableHead>
                    <TableHead>{t("label.invoice")}</TableHead>
                    <TableHead className="text-right">{t("payments.col.amount")}</TableHead>
                    <TableHead>{t("label.reference")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover-elevate" data-testid={`row-payment-${payment.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(payment.paymentDate), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.customer?.name || "Cliente no vinculado"}</div>
                        <div className="text-xs text-muted-foreground">{payment.customer?.rfc || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {payment.invoice
                            ? `${payment.invoice.serie}-${payment.invoice.folio}`
                            : payment.notes
                              ? payment.notes
                              : t("payments.no-invoice")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-green-700">
                          ${parseFloat(payment.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {payment.reference || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(payment)}
                          data-testid={`button-view-payment-${payment.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? t("payments.no-match") : t("payments.no-results")}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <PaymentForm
              onSuccess={() => setDialogOpen(false)}
              onCancel={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Pago</p>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.paymentDate), "PPP", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium text-green-700 text-lg">
                    ${parseFloat(selectedPayment.amount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{selectedPayment.customer?.name || "Cliente no vinculado"}</p>
                <p className="text-sm text-muted-foreground">{selectedPayment.customer?.rfc || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Factura</p>
                <p className="font-mono">
                  {selectedPayment.invoice
                    ? `${selectedPayment.invoice.serie}-${selectedPayment.invoice.folio}`
                    : selectedPayment.notes || t("payments.no-invoice")}
                </p>
              </div>
              {selectedPayment.reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Referencia</p>
                  <p className="font-medium">{selectedPayment.reference}</p>
                </div>
              )}
              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Registrado por</p>
                <p className="text-sm">{selectedPayment.registeredBy?.fullName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                <p className="text-sm">
                  {format(new Date(selectedPayment.createdAt), "PPP 'a las' p", { locale: es })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
