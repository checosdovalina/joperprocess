import { useQuery } from "@tanstack/react-query";
import { Payment, Invoice, Customer } from "@shared/schema";
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
import { DollarSign, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PaymentsPage() {
  const { data: payments, isLoading } = useQuery<
    (Payment & { invoice: Invoice; customer: Customer })[]
  >({
    queryKey: ["/api/payments"],
  });

  const totalPayments = payments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobranza</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona pagos, estados de cuenta y promesas de pago
          </p>
        </div>
        <Button data-testid="button-add-payment">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPayments.toLocaleString("es-MX", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments?.filter((p) => {
                const paymentDate = new Date(p.paymentDate);
                const now = new Date();
                return paymentDate.getMonth() === now.getMonth() &&
                  paymentDate.getFullYear() === now.getFullYear();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            {payments?.length || 0} pagos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover-elevate" data-testid={`row-payment-${payment.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(payment.paymentDate), "PPP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{payment.customer.rfc}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {payment.invoice.serie}-{payment.invoice.folio}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-green-700">
                          ${parseFloat(payment.amount).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
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
                          size="sm"
                          data-testid={`button-view-payment-${payment.id}`}
                        >
                          Ver Detalles
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
              <p className="text-muted-foreground">No hay pagos registrados</p>
              <Button
                className="mt-4"
                data-testid="button-add-first-payment"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Pago
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
