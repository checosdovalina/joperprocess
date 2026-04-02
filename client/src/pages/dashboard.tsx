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
  Truck,
  Calendar,
  Phone,
  Mail,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  pendingQuotations: number;
  activeOrders: number;
  overdueInvoices: number;
  totalRevenue: number;
  todayCheckins: number;
  pendingShipments: number;
  pendingCreditAuth: number;
  ordersReadyToDeliver: number;
  annualSales: number;
}

interface SalesByCategory {
  id: string;
  category_name: string;
  total_sales: string;
  order_count: string;
}

interface RecentContact {
  id: string;
  customerId: string;
  customerName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  checkinAt: string;
  notes: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  
  const isVendedor = user?.role === UserRole.VENDEDOR || user?.role === UserRole.ADMIN;
  
  const { data: salesByCategory, isLoading: isLoadingCategories } = useQuery<SalesByCategory[]>({
    queryKey: ["/api/dashboard/sales-by-category"],
    enabled: isVendedor,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  
  const { data: recentContacts, isLoading: isLoadingContacts } = useQuery<RecentContact[]>({
    queryKey: ["/api/dashboard/recent-contacts"],
    enabled: isVendedor,
    refetchInterval: 60_000,
    staleTime: 30_000,
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
      {
        title: "Pedidos por Entregar",
        value: stats?.ordersReadyToDeliver || 0,
        icon: Truck,
        description: "Listos para despacho",
        color: "text-emerald-600",
        roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA],
      },
      {
        title: "Ventas Anuales",
        value: `$${((stats?.annualSales || 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`,
        icon: TrendingUp,
        description: `Año ${new Date().getFullYear()}`,
        color: "text-blue-600",
        roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA],
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

      {isVendedor && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Contactos Recientes</CardTitle>
                <CardDescription>
                  Últimas visitas a clientes
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingContacts ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : recentContacts && recentContacts.length > 0 ? (
                  recentContacts.slice(0, 5).map((contact) => (
                    <div key={contact.id} className="flex items-start gap-3 p-3 border rounded-md hover-elevate">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`contact-customer-${contact.id}`}>
                          {contact.customerName}
                        </p>
                        {contact.contactName && (
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.contactName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {contact.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.contactPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(contact.checkinAt), "dd MMM", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay visitas recientes
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Ventas por Línea</CardTitle>
                <CardDescription>
                  Distribución de ventas por categoría (año actual)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingCategories ? (
                  <>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </>
                ) : salesByCategory && salesByCategory.length > 0 ? (
                  (() => {
                    const maxSales = Math.max(...salesByCategory.map(c => parseFloat(c.total_sales) || 0));
                    return salesByCategory.filter(c => parseFloat(c.total_sales) > 0).map((category) => {
                      const sales = parseFloat(category.total_sales) || 0;
                      const percentage = maxSales > 0 ? (sales / maxSales) * 100 : 0;
                      return (
                        <div key={category.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium truncate max-w-[60%]" data-testid={`category-${category.id}`}>
                              {category.category_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ${(sales / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {category.order_count} pedidos
                          </p>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay datos de ventas por categoría
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
