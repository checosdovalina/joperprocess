import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@shared/schema";
import {
  Users,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  pendingQuotations: number;
  activeOrders: number;
  overdueInvoices: number;
  totalRevenue: number;
  todayCheckins: number;
  pendingShipments: number;
  pendingCreditAuth: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (!user) return null;

  const getRoleTitle = (role: string) => {
    const titles: Record<string, string> = {
      admin: "Panel de Administrador",
      vendedor: "Panel del Vendedor",
      credito_cobranza: "Panel de Crédito y Cobranza",
      ventas_logistica: "Panel de Ventas y Logística",
      fabrica: "Panel de Fábrica",
      embarques: "Panel de Embarques",
      facturacion: "Panel de Facturación",
    };
    return titles[role] || "Dashboard";
  };

  const getMetricsForRole = (role: string) => {
    const allMetrics = [
      {
        title: "Cotizaciones Pendientes",
        value: stats?.pendingQuotations || 0,
        icon: FileText,
        description: "Requieren seguimiento",
        color: "text-blue-600",
        roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.VENTAS_LOGISTICA],
      },
      {
        title: "Check-ins Hoy",
        value: stats?.todayCheckins || 0,
        icon: Users,
        description: "Visitas realizadas",
        color: "text-green-600",
        roles: [UserRole.ADMIN, UserRole.VENDEDOR],
      },
      {
        title: "Autorizaciones Pendientes",
        value: stats?.pendingCreditAuth || 0,
        icon: AlertCircle,
        description: "Requieren aprobación",
        color: "text-orange-600",
        roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
      },
      {
        title: "Pedidos Activos",
        value: stats?.activeOrders || 0,
        icon: Package,
        description: "En producción",
        color: "text-purple-600",
        roles: [UserRole.ADMIN, UserRole.FABRICA, UserRole.VENTAS_LOGISTICA],
      },
      {
        title: "Embarques Pendientes",
        value: stats?.pendingShipments || 0,
        icon: Clock,
        description: "Por despachar",
        color: "text-indigo-600",
        roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA],
      },
      {
        title: "Facturas Vencidas",
        value: stats?.overdueInvoices || 0,
        icon: AlertCircle,
        description: "Requieren cobranza",
        color: "text-red-600",
        roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
      },
      {
        title: "Ingresos del Mes",
        value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
        icon: DollarSign,
        description: "Total facturado",
        color: "text-green-600",
        roles: [UserRole.ADMIN, UserRole.FACTURACION, UserRole.CREDITO_COBRANZA],
      },
    ];

    return allMetrics.filter((metric) => metric.roles.includes(role as any));
  };

  const metrics = getMetricsForRole(user.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getRoleTitle(user.role)}</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido, {user.fullName}. Aquí está el resumen de tus actividades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          metrics.map((metric, index) => (
            <Card key={index} className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`stat-${metric.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividades Recientes</CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay actividades recientes
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tareas Pendientes</CardTitle>
            <CardDescription>
              Acciones que requieren tu atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
                      <Skeleton className="h-4 w-4 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay tareas pendientes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
