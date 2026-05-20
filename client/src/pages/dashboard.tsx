import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { UserRole } from "@shared/schema";
import {
  Users,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Truck,
  Calendar,
  Phone,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface SellerStats {
  myPendingQuotations: number;
  myTodayCheckins: number;
  myOrdersReady: number;
  myMonthlySales: number;
  myRecentQuotations: {
    id: string;
    folio: string;
    status: string;
    total: string;
    createdAt: string;
    customerName: string | null;
  }[];
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

// ─── Status badge helpers ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  rejected: "Rechazada",
  converted: "Convertida",
  expired: "Expirada",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  approved: "default",
  rejected: "destructive",
  converted: "default",
  expired: "secondary",
};

// ─── Seller Dashboard ─────────────────────────────────────────────────────────

function SellerDashboard({ userName }: { userName: string }) {
  const { t } = useI18n();
  const { data: stats, isLoading } = useQuery<SellerStats>({
    queryKey: ["/api/dashboard/seller-stats"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: recentContacts, isLoading: isLoadingContacts } = useQuery<RecentContact[]>({
    queryKey: ["/api/dashboard/recent-contacts"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const kpis = [
    {
      title: t("dashboard.my-quotations"),
      value: stats?.myPendingQuotations ?? 0,
      icon: FileText,
      description: t("dashboard.draft-sent"),
      color: "text-blue-600",
    },
    {
      title: t("dashboard.checkins-today"),
      value: stats?.myTodayCheckins ?? 0,
      icon: Users,
      description: t("dashboard.visits-today"),
      color: "text-green-600",
    },
    {
      title: t("dashboard.orders-to-deliver"),
      value: stats?.myOrdersReady ?? 0,
      icon: Truck,
      description: t("dashboard.ready-dispatch"),
      color: "text-emerald-600",
    },
    {
      title: t("dashboard.month-sales"),
      value: `$${((stats?.myMonthlySales ?? 0) / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}K`,
      icon: TrendingUp,
      description: `${format(new Date(), "MMMM yyyy", { locale: es })}`,
      color: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.seller-panel")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.welcome").replace("{name}", userName)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.title} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Bottom panels */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t("dashboard.recent-visits")}</CardTitle>
              <CardDescription>{t("dashboard.last-checkins")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoadingContacts ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentContacts && recentContacts.length > 0 ? (
                recentContacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-start gap-3 p-3 border rounded-md hover-elevate">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{contact.customerName}</p>
                      {contact.contactName && (
                        <p className="text-xs text-muted-foreground truncate">{contact.contactName}</p>
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
                  {t("dashboard.no-visits")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My recent quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>{t("dashboard.recent-quotations")}</CardTitle>
              <CardDescription>{t("dashboard.last-quotations")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : stats?.myRecentQuotations && stats.myRecentQuotations.length > 0 ? (
                stats.myRecentQuotations.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 border rounded-md hover-elevate">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{q.folio}</span>
                        <Badge variant={STATUS_VARIANTS[q.status] || "secondary"} className="text-xs">
                          {STATUS_LABELS[q.status] || q.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {q.customerName || "Sin cliente"} · {format(new Date(q.createdAt), "dd MMM", { locale: es })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      ${parseFloat(q.total || "0").toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("dashboard.no-quotations")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Admin / Other Roles Dashboard ───────────────────────────────────────────

function GeneralDashboard({ userName, role }: { userName: string; role: string }) {
  const { t } = useI18n();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const isAnalyticsRole = role === UserRole.ADMIN || role === UserRole.VENTAS_LOGISTICA || role === UserRole.CREDITO_COBRANZA;

  const { data: salesByCategory, isLoading: isLoadingCategories } = useQuery<SalesByCategory[]>({
    queryKey: ["/api/dashboard/sales-by-category"],
    enabled: isAnalyticsRole,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: recentContacts, isLoading: isLoadingContacts } = useQuery<RecentContact[]>({
    queryKey: ["/api/dashboard/recent-contacts"],
    enabled: isAnalyticsRole,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const getRoleTitle = (r: string) => {
    const titles: Record<string, string> = {
      admin: t("dashboard.admin-panel"),
      credito_cobranza: t("dashboard.credit-panel"),
      ventas_logistica: t("dashboard.logistics-panel"),
      fabrica: t("dashboard.factory-panel"),
      embarques: t("dashboard.shipping-panel"),
      facturacion: t("dashboard.billing-panel"),
    };
    return titles[r] || t("page.dashboard");
  };

  const allMetrics = [
    {
      title: t("dashboard.pending-quotations"),
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      description: t("dashboard.need-followup"),
      color: "text-blue-600",
      roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: t("dashboard.checkins-today"),
      value: stats?.todayCheckins ?? 0,
      icon: Users,
      description: t("dashboard.visits-done"),
      color: "text-green-600",
      roles: [UserRole.ADMIN],
    },
    {
      title: t("dashboard.pending-auth"),
      value: stats?.pendingCreditAuth ?? 0,
      icon: AlertCircle,
      description: t("dashboard.need-approval"),
      color: "text-orange-600",
      roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
    },
    {
      title: t("dashboard.active-orders"),
      value: stats?.activeOrders ?? 0,
      icon: Package,
      description: t("dashboard.in-production"),
      color: "text-purple-600",
      roles: [UserRole.ADMIN, UserRole.FABRICA, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: t("dashboard.pending-shipments"),
      value: stats?.pendingShipments ?? 0,
      icon: Clock,
      description: t("dashboard.to-dispatch"),
      color: "text-indigo-600",
      roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: t("dashboard.overdue-invoices"),
      value: stats?.overdueInvoices ?? 0,
      icon: AlertCircle,
      description: t("dashboard.need-collection"),
      color: "text-red-600",
      roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
    },
    {
      title: t("dashboard.month-revenue"),
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString("es-MX")}`,
      icon: DollarSign,
      description: t("dashboard.total-billed"),
      color: "text-green-600",
      roles: [UserRole.ADMIN, UserRole.FACTURACION, UserRole.CREDITO_COBRANZA],
    },
    {
      title: t("dashboard.orders-to-deliver"),
      value: stats?.ordersReadyToDeliver ?? 0,
      icon: Truck,
      description: t("dashboard.ready-dispatch"),
      color: "text-emerald-600",
      roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: t("dashboard.annual-sales"),
      value: `$${((stats?.annualSales ?? 0) / 1000).toLocaleString("es-MX", { maximumFractionDigits: 0 })}K`,
      icon: TrendingUp,
      description: `${t("label.year")} ${new Date().getFullYear()}`,
      color: "text-blue-600",
      roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
    },
  ];

  const metrics = allMetrics.filter((m) => m.roles.includes(role as any));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getRoleTitle(role)}</h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.welcome-admin").replace("{name}", userName)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : metrics.map((metric, index) => (
              <Card key={index} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`stat-${metric.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {isAnalyticsRole && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>{t("dashboard.recent-contacts")}</CardTitle>
                <CardDescription>{t("dashboard.last-visits")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingContacts ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
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
                          <p className="text-sm text-muted-foreground truncate">{contact.contactName}</p>
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
                  <p className="text-sm text-muted-foreground text-center py-8">{t("dashboard.no-visits")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>{t("dashboard.sales-by-line")}</CardTitle>
                <CardDescription>{t("dashboard.distribution")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingCategories ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))
                ) : salesByCategory && salesByCategory.length > 0 ? (
                  (() => {
                    const maxSales = Math.max(...salesByCategory.map((c) => parseFloat(c.total_sales) || 0));
                    return salesByCategory
                      .filter((c) => parseFloat(c.total_sales) > 0)
                      .map((category) => {
                        const sales = parseFloat(category.total_sales) || 0;
                        const percentage = maxSales > 0 ? (sales / maxSales) * 100 : 0;
                        return (
                          <div key={category.id} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium truncate max-w-[60%]" data-testid={`category-${category.id}`}>
                                {category.category_name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ${(sales / 1000).toLocaleString("es-MX", { maximumFractionDigits: 0 })}K
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">{category.order_count} pedidos</p>
                          </div>
                        );
                      });
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("dashboard.no-sales-data")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard (router by role) ─────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === UserRole.VENDEDOR) {
    return <SellerDashboard userName={user.fullName} />;
  }

  return <GeneralDashboard userName={user.fullName} role={user.role} />;
}
