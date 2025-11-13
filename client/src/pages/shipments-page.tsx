import { useQuery } from "@tanstack/react-query";
import { Shipment, Order, Quotation, Customer, ShipmentStatus } from "@shared/schema";
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
import { Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ShipmentsPage() {
  const { data: shipments, isLoading } = useQuery<
    (Shipment & { order: Order & { quotation: Quotation & { customer: Customer } } })[]
  >({
    queryKey: ["/api/shipments"],
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [ShipmentStatus.PENDING]: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      [ShipmentStatus.IN_TRANSIT]: { label: "En Tránsito", className: "bg-blue-100 text-blue-800" },
      [ShipmentStatus.DELIVERED]: { label: "Entregado", className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status] || statusConfig[ShipmentStatus.PENDING];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Embarques</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona embarques, firmas digitales y trazabilidad
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Truck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments?.filter((s) => s.status === ShipmentStatus.PENDING).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments?.filter((s) => s.status === ShipmentStatus.IN_TRANSIT).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregados</CardTitle>
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
          <CardTitle>Todos los Embarques</CardTitle>
          <CardDescription>
            {shipments?.length || 0} embarques registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : shipments && shipments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Transportista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Embarque</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="hover-elevate" data-testid={`row-shipment-${shipment.id}`}>
                      <TableCell>
                        <div className="font-medium">{shipment.order.quotation.customer.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{shipment.order.quotation.folio}</div>
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
                          <span className="text-xs text-muted-foreground">No embarcado</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-shipment-${shipment.id}`}
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
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay embarques registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
