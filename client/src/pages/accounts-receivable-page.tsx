import { useState } from "react";
import { Invoice, Customer, InvoiceStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import { Plus, FileText, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { AccountReceivableForm } from "@/components/account-receivable-form";
import { useAuth } from "@/hooks/use-auth";

type InvoiceWithCustomer = Invoice & { customer: Customer };

export default function AccountsReceivablePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: invoices, isLoading } = useQuery<InvoiceWithCustomer[]>({
    queryKey: ["/api/accounts-receivable"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [InvoiceStatus.DRAFT]: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
      [InvoiceStatus.PENDING_PAYMENT]: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      [InvoiceStatus.PARTIALLY_PAID]: { label: "Parcialmente Pagada", className: "bg-blue-100 text-blue-800" },
      [InvoiceStatus.PAID]: { label: "Pagada", className: "bg-green-100 text-green-800" },
      [InvoiceStatus.CANCELLED]: { label: "Cancelada", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || statusConfig[InvoiceStatus.PENDING_PAYMENT];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const isOverdue = (dueDate: string | Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Facturas por Cobrar</CardTitle>
          <CardDescription>
            {invoices?.length || 0} facturas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
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
                  {invoices.map((invoice) => (
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
                            {isOverdue(invoice.dueDate) && invoice.status === InvoiceStatus.PENDING_PAYMENT && (
                              <AlertCircle className="h-4 w-4 text-red-500" data-testid="icon-overdue" />
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
                        <div className="font-medium">
                          ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
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
              <h3 className="mt-4 text-lg font-medium">No hay facturas registradas</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Comienza creando tu primera factura por cobrar
              </p>
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
    </div>
  );
}
