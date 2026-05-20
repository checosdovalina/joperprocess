import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Globe, Palette, Settings, Users, Loader2, ExternalLink, Languages } from "lucide-react";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  active: boolean;
  email: string | null;
  phone: string | null;
  plan: string | null;
  maxUsers: number | null;
  locale: string | null;
  createdAt: string;
}

export default function TenantsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    email: "",
    phone: "",
    primaryColor: "#4DA3FF",
    secondaryColor: "#1F3C88",
    active: true,
    plan: "basic",
    maxUsers: 10,
    locale: "es" as Locale,
  });

  const { data: tenantsList = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    enabled: !!user?.isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/tenants", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Empresa creada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear empresa", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/tenants/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Empresa actualizada exitosamente" });
      setIsDialogOpen(false);
      setEditingTenant(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar empresa", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subdomain: "",
      email: "",
      phone: "",
      primaryColor: "#4DA3FF",
      secondaryColor: "#1F3C88",
      active: true,
      plan: "basic",
      maxUsers: 10,
      locale: "es" as Locale,
    });
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      subdomain: tenant.subdomain,
      email: tenant.email || "",
      phone: tenant.phone || "",
      primaryColor: tenant.primaryColor || "#4DA3FF",
      secondaryColor: tenant.secondaryColor || "#1F3C88",
      active: tenant.active,
      plan: tenant.plan || "basic",
      maxUsers: tenant.maxUsers || 10,
      locale: (tenant.locale as Locale) || "es",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="access-denied">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              Solo los super administradores pueden acceder a esta sección.
            </CardDescription>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Administración de Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las empresas (tenants) que utilizan la plataforma Nexxo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTenant(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tenant">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? "Editar Empresa" : "Nueva Empresa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Mi Empresa"
                    required
                    data-testid="input-tenant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdominio</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      placeholder="mi-empresa"
                      required
                      disabled={!!editingTenant}
                      data-testid="input-tenant-subdomain"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">.nexxo.com.mx</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contacto@empresa.com"
                    data-testid="input-tenant-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+52 555 123 4567"
                    data-testid="input-tenant-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Color Primario</Label>
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
                  <Label htmlFor="secondaryColor">Color Secundario</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <select
                    id="plan"
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    data-testid="select-plan"
                  >
                    <option value="basic">Básico</option>
                    <option value="professional">Profesional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Máx. Usuarios</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min={1}
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 10 })}
                    data-testid="input-max-users"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">Idioma de la Interfaz</Label>
                <select
                  id="locale"
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value as Locale })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  data-testid="select-locale"
                >
                  {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  data-testid="switch-active"
                />
                <Label htmlFor="active">Empresa Activa</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-tenant"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingTenant ? "Guardar Cambios" : "Crear Empresa"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenantsList.map((tenant) => (
          <Card key={tenant.id} className="hover-elevate cursor-pointer" data-testid={`card-tenant-${tenant.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: tenant.primaryColor || "#4DA3FF" }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tenant.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {tenant.subdomain}.nexxo.com.mx
                    </div>
                  </div>
                </div>
                <Badge variant={tenant.active ? "default" : "secondary"}>
                  {tenant.active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Colores
                  </span>
                  <div className="flex gap-1">
                    <div 
                      className="w-5 h-5 rounded-sm border"
                      style={{ backgroundColor: tenant.primaryColor || "#4DA3FF" }}
                    />
                    <div 
                      className="w-5 h-5 rounded-sm border"
                      style={{ backgroundColor: tenant.secondaryColor || "#1F3C88" }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Máx. Usuarios
                  </span>
                  <span>{tenant.maxUsers || 10}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    Plan
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {tenant.plan || "basic"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    Idioma
                  </span>
                  <Badge variant="outline">
                    {LOCALE_LABELS[(tenant.locale as Locale) || "es"] || "Español"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openEditDialog(tenant)}
                  data-testid={`button-edit-tenant-${tenant.id}`}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://${tenant.subdomain}.nexxo.com.mx`, "_blank")}
                  data-testid={`button-open-tenant-${tenant.id}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tenantsList.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay empresas registradas</h3>
            <p className="text-muted-foreground mb-4">
              Crea la primera empresa para comenzar a usar la plataforma
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Empresa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
