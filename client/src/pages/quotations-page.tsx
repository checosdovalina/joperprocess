import { useState } from "react";
import { Quotation, Customer, QuotationStatus, InsertQuotation } from "@shared/schema";
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
import { Plus, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { QuotationForm } from "@/components/quotation-form";
import { useAuth } from "@/hooks/use-auth";

export default function QuotationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: quotations, isLoading } = useEntityQuery<(Quotation & { customer: Customer })[]>(
    "/api/quotations"
  );

  const { data: customers } = useEntityQuery<Customer[]>("/api/customers");

  const createQuotationMutation = useEntityMutation<Quotation, InsertQuotation>({
    endpoint: "/api/quotations",
    method: "POST",
    successMessage: "Cotización creada exitosamente",
    invalidateQueries: ["/api/quotations"],
    onSuccessCallback: () => setDialogOpen(false),
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [QuotationStatus.DRAFT]: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
      [QuotationStatus.SENT]: { label: "Enviada", className: "bg-blue-100 text-blue-800" },
      [QuotationStatus.AUTHORIZED]: { label: "Autorizada", className: "bg-green-100 text-green-800" },
      [QuotationStatus.CONVERTED]: { label: "Convertida", className: "bg-purple-100 text-purple-800" },
      [QuotationStatus.REJECTED]: { label: "Rechazada", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || statusConfig[QuotationStatus.DRAFT];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona cotizaciones y conviértelas en pedidos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-quotation">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Cotizaciones</CardTitle>
          <CardDescription>
            {quotations?.length || 0} cotizaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : quotations && quotations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id} className="hover-elevate" data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{quotation.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{quotation.customer.rfc}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(quotation.createdAt), "PPP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${parseFloat(quotation.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-quotation-${quotation.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
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
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay cotizaciones registradas</p>
              <Button
                className="mt-4"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-first-quotation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Cotización
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <QuotationForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createQuotationMutation.mutate}
        isPending={createQuotationMutation.isPending}
        customers={customers?.map(c => ({ id: c.id, name: c.name })) || []}
        userId={user?.id}
      />
    </div>
  );
}
