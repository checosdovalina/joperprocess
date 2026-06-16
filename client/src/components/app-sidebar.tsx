import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  FileText,
  ClipboardCheck,
  Package,
  Truck,
  FileSpreadsheet,
  DollarSign,
  Building2,
  LogOut,
  AlertTriangle,
  Globe,
  Settings,
  Database,
  Factory,
  FileBarChart2,
  MonitorPlay,
  CreditCard,
  LayoutGrid,
  Mail,
  ShieldCheck,
} from "lucide-react";
import nexxoLogo from "@assets/generated_images/nexxo_tech_company_logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useI18n } from "@/hooks/use-i18n";
import { UserRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

type MenuItem = {
  titleKey: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
};

type MenuGroup = {
  labelKey: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    labelKey: "nav.group.principal",
    items: [
      { titleKey: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard, roles: Object.values(UserRole) },
      { titleKey: "nav.pipeline", url: "/pipeline", icon: LayoutGrid, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    labelKey: "nav.group.clientes",
    items: [
      { titleKey: "nav.customers", url: "/customers", icon: Building2, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA] },
      { titleKey: "nav.checkins", url: "/checkins", icon: MapPin, roles: [UserRole.ADMIN, UserRole.VENDEDOR] },
      { titleKey: "nav.scheduled-visits", url: "/scheduled-visits", icon: Calendar, roles: [UserRole.ADMIN, UserRole.VENDEDOR] },
    ],
  },
  {
    labelKey: "nav.group.ventas",
    items: [
      { titleKey: "nav.quotations", url: "/quotations", icon: FileText, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA] },
      { titleKey: "nav.credit-auth", url: "/credit-auth", icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA] },
      { titleKey: "nav.order-release", url: "/order-release", icon: ShieldCheck, roles: [UserRole.ADMIN] },
      { titleKey: "nav.orders", url: "/orders", icon: Package, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    labelKey: "nav.group.operaciones",
    items: [
      { titleKey: "nav.production", url: "/production", icon: Factory, roles: [UserRole.ADMIN, UserRole.FABRICA] },
      { titleKey: "nav.board", url: "/board", icon: MonitorPlay, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.FABRICA, UserRole.EMBARQUES] },
      { titleKey: "nav.shipments", url: "/shipments", icon: Truck, roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    labelKey: "nav.group.finanzas",
    items: [
      { titleKey: "nav.accounts-receivable", url: "/accounts-receivable", icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.FACTURACION] },
      { titleKey: "nav.payments", url: "/payments", icon: DollarSign, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA] },
      { titleKey: "nav.account-statements", url: "/account-statements", icon: Mail, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION] },
    ],
  },
  {
    labelKey: "nav.group.analisis",
    items: [
      { titleKey: "nav.reports", url: "/reports", icon: FileBarChart2, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA] },
      { titleKey: "nav.incidents", url: "/incidents", icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SERVICIO_CLIENTE, UserRole.SERVICIO_TECNICO] },
    ],
  },
  {
    labelKey: "nav.group.administracion",
    items: [
      { titleKey: "nav.products", url: "/products", icon: Package, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.VENTAS_LOGISTICA] },
      { titleKey: "nav.users", url: "/users", icon: Users, roles: [UserRole.ADMIN] },
      { titleKey: "nav.company-settings", url: "/company-settings", icon: Settings, roles: [UserRole.ADMIN] },
      { titleKey: "nav.microsip", url: "/microsip", icon: Database, roles: [UserRole.ADMIN] },
    ],
  },
];

const getRoleLabel = (role: string, t: (k: string) => string) => {
  const key = `role.${role}`;
  return t(key) !== key ? t(key) : role;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { tenant, selectedTenantId, setSelectedTenantId } = useTenant();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    enabled: !!user?.isSuperAdmin,
  });

  if (!user) return null;

  const isOnMainDomain = !tenant || !tenant.subdomain;

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user.role as any)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src={nexxoLogo} alt="Nexxo" className="h-9 w-9 rounded-md" />
            <div>
              <h2 className="font-bold text-sm text-primary tracking-wide">NEXXO</h2>
              <p className="text-[10px] text-muted-foreground leading-tight">Sistema Comercial</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.labelKey} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-1">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || location.startsWith(item.url + "/")}
                      data-testid={`link-${item.url.slice(1) || "dashboard"}`}
                      size="lg"
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {user.isSuperAdmin && isOnMainDomain && (
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-1">
              {t("nav.group.plataforma")}
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              <div className="px-2">
                <label className="text-xs text-muted-foreground mb-1 block">{t("nav.working-in")}</label>
                <Select
                  value={selectedTenantId || ""}
                  onValueChange={(value) => setSelectedTenantId(value || null)}
                >
                  <SelectTrigger className="w-full" data-testid="select-tenant">
                    <SelectValue placeholder={t("nav.select-company")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((ten) => (
                      <SelectItem key={ten.id} value={ten.id} data-testid={`select-tenant-${ten.subdomain}`}>
                        {ten.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/tenants"}
                    data-testid="link-tenants"
                    size="lg"
                  >
                    <Link href="/tenants" onClick={handleNavClick}>
                      <Globe className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{t("nav.tenants")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user.fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {getRoleLabel(user.role, t)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("nav.logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
