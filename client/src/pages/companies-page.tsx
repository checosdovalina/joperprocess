import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Network, Loader2, ArrowRight } from "lucide-react";

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

const emptyForm = {
  name: "",
  subdomain: "",
  primaryColor: "#4DA3FF",
  secondaryColor: "#1F3C88",
};

export default function CompaniesPage() {
  const { user } = useAuth();
  const { tenant, selectedTenantId } = useTenant();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin",
  });

  const homeCompanyId = user?.tenantId;
  const activeCompanyId = selectedTenantId || tenant?.id || homeCompanyId;

  const resetForm = () => setFormData({ ...emptyForm });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/companies", {
        name: formData.name,
        subdomain: formData.subdomain,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Compañía creada" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear compañía", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

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
            <CardDescription>Solo los administradores pueden gestionar compañías.</CardDescription>
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Compañías
          </h1>
          <p className="text-muted-foreground mt-1">
            Tu compañía y sus compañías hijas. Cada compañía tiene sus propios datos (clientes,
            productos, ventas). Puedes entrar a administrar cualquier compañía hija.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-company">
              <Plus className="h-4 w-4 mr-2" />
              Nueva compañía hija
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva compañía hija</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la compañía</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Joper Sucursal Norte"
                  required
                  data-testid="input-company-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdominio</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    placeholder="joper-norte"
                    required
                    data-testid="input-company-subdomain"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.nexxo.com.mx</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  La compañía hija tendrá su propia dirección web y sus propios datos.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color primario</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Color secundario</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-secondary-color"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-company">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crear
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
            <p className="text-muted-foreground mb-4 max-w-md">
              Crea una compañía hija para operar otra sucursal o negocio con sus propios clientes,
              productos y ventas, sin mezclar la información con tu compañía principal.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear compañía hija
            </Button>
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
