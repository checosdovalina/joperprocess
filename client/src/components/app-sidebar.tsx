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
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: Object.values(UserRole),
    },
    {
      title: "Clientes",
      url: "/customers",
      icon: Building2,
      roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA],
    },
    {
      title: "Check-ins",
      url: "/checkins",
      icon: MapPin,
      roles: [UserRole.ADMIN, UserRole.VENDEDOR],
    },
    {
      title: "Visitas Programadas",
      url: "/scheduled-visits",
      icon: Calendar,
      roles: [UserRole.ADMIN, UserRole.VENDEDOR],
    },
    {
      title: "Cotizaciones",
      url: "/quotations",
      icon: FileText,
      roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CREDITO_COBRANZA, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: "Autorización Crédito",
      url: "/credit-auth",
      icon: ClipboardCheck,
      roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
    },
    {
      title: "Pedidos",
      url: "/orders",
      icon: Package,
      roles: [UserRole.ADMIN, UserRole.FABRICA, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: "Embarques",
      url: "/shipments",
      icon: Truck,
      roles: [UserRole.ADMIN, UserRole.EMBARQUES, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: "Facturación",
      url: "/accounts-receivable",
      icon: FileSpreadsheet,
      roles: [UserRole.ADMIN, UserRole.FACTURACION],
    },
    {
      title: "Cobranza",
      url: "/payments",
      icon: DollarSign,
      roles: [UserRole.ADMIN, UserRole.CREDITO_COBRANZA],
    },
    {
      title: "Productos",
      url: "/products",
      icon: Package,
      roles: [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.VENTAS_LOGISTICA],
    },
    {
      title: "Incidentes",
      url: "/incidents",
      icon: AlertTriangle,
      roles: [UserRole.ADMIN, UserRole.SERVICIO_CLIENTE, UserRole.SERVICIO_TECNICO],
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: Users,
      roles: [UserRole.ADMIN],
    },
  ];

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(user.role as any)
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      vendedor: "Vendedor",
      credito_cobranza: "Crédito y Cobranza",
      ventas_logistica: "Ventas/Logística",
      fabrica: "Fábrica",
      embarques: "Embarques",
      facturacion: "Facturación",
    };
    return labels[role] || role;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={nexxoLogo} alt="Nexxo" className="h-10 w-10" />
          <div>
            <h2 className="font-semibold text-base text-primary">NEXXO</h2>
            <p className="text-xs text-muted-foreground">Sistema Comercial</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.url.slice(1) || "dashboard"}`}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {getRoleLabel(user.role)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
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
