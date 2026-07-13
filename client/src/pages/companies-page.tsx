import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Network, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin",
  });

  const homeCompanyId = user?.tenantId;
  const activeCompanyId = selectedTenantId || tenant?.id || homeCompanyId;
  const confirmDeleteCompany = companies.find((c) => c.id === confirmDeleteId);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Compañía desactivada", description: "La compañía hija fue desactivada correctamente." });
      setConfirmDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setConfirmDeleteId(null);
    },
  });

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
                      onDelete={() => setConfirmDeleteId(child.id)}
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

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar compañía?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto desactivará <strong>{confirmDeleteCompany?.name}</strong>. Los datos existentes se conservarán pero la compañía dejará de ser accesible. Esta acción puede revertirse contactando al equipo de Nexxo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-company">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-company"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CompanyCard({
  company,
  isActive,
  isHome,
  onSwitch,
  onDelete,
}: {
  company: Company;
  isActive: boolean;
  isHome?: boolean;
  onSwitch: (id: string) => void;
  onDelete?: () => void;
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
        <div className="flex items-center gap-2">
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
          {onDelete && company.active && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-company-${company.id}`}
              title="Desactivar compañía"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
