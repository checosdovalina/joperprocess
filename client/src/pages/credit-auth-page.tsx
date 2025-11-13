import { useQuery } from "@tanstack/react-query";
import { CreditAuthorization, Quotation, Customer } from "@shared/schema";
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
import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CreditAuthPage() {
  const { data: authorizations, isLoading } = useQuery<
    (CreditAuthorization & { quotation: Quotation & { customer: Customer } })[]
  >({
    queryKey: ["/api/credit-authorizations"],
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      approved: { label: "Aprobada", className: "bg-green-100 text-green-800" },
      rejected: { label: "Rechazada", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Autorización de Crédito</h1>
        <p className="text-muted-foreground mt-1">
          Revisa y autoriza cotizaciones según límites de crédito
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren revisión
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "approved").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "rejected").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Autorización</CardTitle>
          <CardDescription>
            {authorizations?.length || 0} solicitudes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : authorizations && authorizations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Folio Cotización</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Crédito Disponible</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authorizations.map((auth) => (
                    <TableRow key={auth.id} className="hover-elevate" data-testid={`row-auth-${auth.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(auth.createdAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{auth.quotation.customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {auth.quotation.customer.rfc}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{auth.quotation.folio}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${parseFloat(auth.quotation.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          ${parseFloat(auth.creditAvailable || "0").toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(auth.status)}</TableCell>
                      <TableCell className="text-right">
                        {auth.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              data-testid={`button-approve-${auth.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-reject-${auth.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay solicitudes de autorización</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
