import { useQuery } from "@tanstack/react-query";
import { Invoice, Customer } from "@shared/schema";
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
import { FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useQuery<(Invoice & { customer: Customer })[]>({
    queryKey: ["/api/invoices"],
  });

  const isOverdue = (invoice: Invoice) => {
    return invoice.dueDate && isPast(new Date(invoice.dueDate));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona facturas CFDI y envío automático
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter((i) => isOverdue(i)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter((i) => i.dueDate && !isOverdue(i)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoices?.reduce((sum, inv) => sum + parseFloat(inv.total), 0).toLocaleString("es-MX", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Facturas</CardTitle>
          <CardDescription>
            {invoices?.length || 0} facturas emitidas
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
                    <TableHead>Serie - Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
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
                          <div className="text-sm">
                            {format(new Date(invoice.dueDate), "PP", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No definida</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${parseFloat(invoice.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOverdue(invoice) ? (
                          <Badge variant="destructive" data-testid={`status-overdue-${invoice.id}`}>Vencida</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${invoice.id}`}>Vigente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-invoice-${invoice.id}`}
                        >
                          Ver PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay facturas emitidas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
