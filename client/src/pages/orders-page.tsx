import { useState } from "react";
import { Order, Quotation, Customer, OrderStatus, InsertOrder } from "@shared/schema";
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
import { Package, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { OrderForm } from "@/components/order-form";
import { useAuth } from "@/lib/auth";

export default function OrdersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const { data: orders, isLoading } = useEntityQuery<
    (Order & { quotation: Quotation & { customer: Customer } })[]
  >("/api/orders");

  const { data: quotations } = useEntityQuery<Quotation[]>("/api/quotations");

  const createOrderMutation = useEntityMutation<Order, InsertOrder>({
    endpoint: "/api/orders",
    method: "POST",
    successMessage: "Orden creada exitosamente",
    invalidateQueries: ["/api/orders"],
    onSuccessCallback: () => setDialogOpen(false),
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      [OrderStatus.PENDING]: { label: "Pendiente", className: "bg-gray-100 text-gray-800" },
      [OrderStatus.IN_PRODUCTION]: { label: "En Producción", className: "bg-blue-100 text-blue-800" },
      [OrderStatus.READY]: { label: "Listo", className: "bg-green-100 text-green-800" },
      [OrderStatus.SHIPPED]: { label: "Enviado", className: "bg-purple-100 text-purple-800" },
      [OrderStatus.DELIVERED]: { label: "Entregado", className: "bg-green-100 text-green-800" },
    };
    const config = statusConfig[status] || statusConfig[OrderStatus.PENDING];
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos y Producción</h1>
          <p className="text-muted-foreground mt-1">
            Seguimiento de pedidos y avances de producción
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-order">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.PENDING).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Producción</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.IN_PRODUCTION).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.READY).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter((o) => o.status === OrderStatus.SHIPPED).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Pedidos</CardTitle>
          <CardDescription>
            {orders?.length || 0} pedidos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio Cotización</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Entrega Estimada</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover-elevate" data-testid={`row-order-${order.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{order.quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.quotation.customer.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.createdAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.estimatedDelivery ? (
                          <div className="text-sm">
                            {format(new Date(order.estimatedDelivery), "PP", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No definida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 w-32">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Producción</span>
                            <span className="font-medium">{order.productionProgress}%</span>
                          </div>
                          <Progress value={order.productionProgress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-update-order-${order.id}`}
                        >
                          Actualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay pedidos registrados</p>
              <Button
                className="mt-4"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-first-order"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Orden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createOrderMutation.mutate}
        isPending={createOrderMutation.isPending}
        quotations={quotations?.map(q => ({ id: q.id, folio: q.folio })) || []}
        userId={user?.id}
      />
    </div>
  );
}
