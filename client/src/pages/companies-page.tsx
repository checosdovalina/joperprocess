import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Network, Loader2, ArrowRight } from "lucide-react";

interface Company {
  id: string;
  name: string;
  subdomain: string;
  parentId: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  active: boolean;
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const { tenant, selectedTenantId } = useTenant();

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin",
  });

  const homeCompanyId = user?.tenantId;
  const activeCompanyId = selectedTenantId || tenant?.id || homeCompanyId;

  const switchToCompany = (id: string) => {
    if (id === activeCompanyId) return;
    localStorage.setItem("selectedTenantId", id);
    window.location.reload();
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="access-denied">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>Solo los administradores pueden ver las compañías.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const parents = companies.filter((c) => !c.parentId || c.id === homeCompanyId);
  const childrenOf = (id: string) => companies.filter((c) => c.parentId === id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Compañías
        </h1>
        <p className="text-muted-foreground mt-1">
          Tu compañía y sus compañías hijas. Cada compañía tiene sus propios datos (clientes,
          productos, ventas). Puedes entrar a administrar cualquier compañía hija. La creación y
          configuración de compañías la realiza el equipo de Nexxo.
        </p>
      </div>

      <div className="space-y-4">
        {parents.map((parent) => {
          const children = childrenOf(parent.id);
          return (
            <div key={parent.id} className="space-y-2">
              <CompanyCard
                company={parent}
                isActive={parent.id === activeCompanyId}
                isHome
                onSwitch={switchToCompany}
              />
              {children.length > 0 && (
                <div className="ml-6 space-y-2 border-l border-border pl-4">
                  {children.map((child) => (
                    <CompanyCard
                      key={child.id}
                      company={child}
                      isActive={child.id === activeCompanyId}
                      onSwitch={switchToCompany}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {companies.length <= 1 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aún no tienes compañías hijas</h3>
            <p className="text-muted-foreground max-w-md">
              Si necesitas operar otra sucursal o negocio con sus propios clientes, productos y
              ventas, solicítalo al equipo de Nexxo para que configure una nueva compañía hija.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompanyCard({
  company,
  isActive,
  isHome,
  onSwitch,
}: {
  company: Company;
  isActive: boolean;
  isHome?: boolean;
  onSwitch: (id: string) => void;
}) {
  return (
    <Card
      className={isActive ? "border-primary" : "hover-elevate"}
      data-testid={`card-company-${company.id}`}
    >
      <CardContent className="flex items-center justify-between gap-4 flex-wrap py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: company.primaryColor || "#4DA3FF" }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium" data-testid={`text-company-name-${company.id}`}>
                {company.name}
              </span>
              {isHome && <Badge variant="secondary">Principal</Badge>}
              {isActive && <Badge>Viendo ahora</Badge>}
              {!company.active && <Badge variant="outline">Inactiva</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{company.subdomain}.nexxo.com.mx</p>
          </div>
        </div>
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSwitch(company.id)}
            data-testid={`button-enter-company-${company.id}`}
          >
            Entrar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
