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
  title: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: Object.values(UserRole) },
      { title: "Tablero Operaciones", url: "/pipeline", icon: LayoutGrid, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Clientes", url: "/customers", icon: Building2, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA] },
      { title: "Check-ins", url: "/checkins", icon: MapPin, roles: [UserRole.ADMIN, UserRole.VENDEDOR] },
      { title: "Visitas Programadas", url: "/scheduled-visits", icon: Calendar, roles: [UserRole.ADMIN, UserRole.VENDEDOR] },
    ],
  },
  {
    label: "Ventas",
    items: [
      { title: "Cotizaciones", url: "/quotations", icon: FileText, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA] },
      { title: "Autorización Crédito", url: "/credit-auth", icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA] },
      { title: "Pedidos", url: "/orders", icon: Package, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { title: "Producción", url: "/production", icon: Factory, roles: [UserRole.ADMIN, UserRole.FABRICA] },
      { title: "Tablero", url: "/board", icon: MonitorPlay, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.FABRICA, UserRole.EMBARQUES] },
      { title: "Embarques", url: "/shipments", icon: Truck, roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA] },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { title: "Facturación", url: "/accounts-receivable", icon: FileSpreadsheet, roles: [UserRole.ADMIN, UserRole.FACTURACION] },
      { title: "Cobranza", url: "/payments", icon: DollarSign, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA] },
      { title: "Estados de Cuenta", url: "/account-statements", icon: Mail, roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION] },
    ],
  },
  {
    label: "Análisis",
    items: [
      { title: "Reportes", url: "/reports", icon: FileBarChart2, roles: [UserRole.ADMIN, UserRole.VENTAS_LOGISTICA, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA] },
      { title: "Incidentes", url: "/incidents", icon: AlertTriangle, roles: [UserRole.ADMIN, UserRole.SERVICIO_CLIENTE, UserRole.SERVICIO_TECNICO] },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Productos", url: "/products", icon: Package, roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.VENTAS_LOGISTICA] },
      { title: "Usuarios", url: "/users", icon: Users, roles: [UserRole.ADMIN] },
      { title: "Configuración", url: "/company-settings", icon: Settings, roles: [UserRole.ADMIN] },
      { title: "Microsip", url: "/microsip", icon: Database, roles: [UserRole.ADMIN] },
    ],
  },
];

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Administrador",
    vendedor: "Vendedor",
    credito_cobranza: "Crédito y Cobranza",
    ventas_logistica: "Ventas / Logística",
    fabrica: "Fábrica",
    embarques: "Embarques",
    facturacion: "Facturación",
    servicio_cliente: "Servicio al Cliente",
    servicio_tecnico: "Servicio Técnico",
  };
  return labels[role] || role;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { tenant, selectedTenantId, setSelectedTenantId } = useTenant();
  const { isMobile, setOpenMobile } = useSidebar();

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
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-1">
              {group.label}
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
                        <span className="text-sm">{item.title}</span>
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
              Plataforma
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              <div className="px-2">
                <label className="text-xs text-muted-foreground mb-1 block">Trabajando en:</label>
                <Select
                  value={selectedTenantId || ""}
                  onValueChange={(value) => setSelectedTenantId(value || null)}
                >
                  <SelectTrigger className="w-full" data-testid="select-tenant">
                    <SelectValue placeholder="Seleccionar empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id} data-testid={`select-tenant-${t.subdomain}`}>
                        {t.name}
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
                      <span className="text-sm">Gestionar Empresas</span>
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
              {getRoleLabel(user.role)}
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
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
