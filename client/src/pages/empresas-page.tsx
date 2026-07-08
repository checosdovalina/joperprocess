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
import { Plus, Store, Palette, Loader2, Tag } from "lucide-react";
import type { Empresa } from "@shared/schema";

const emptyForm = {
  name: "",
  clave: "",
  subdomain: "",
  primaryColor: "#4DA3FF",
  secondaryColor: "#1F3C88",
  active: true,
};

export default function EmpresasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const { data: empresas = [], isLoading } = useQuery<Empresa[]>({
    queryKey: ["/api/empresas"],
    enabled: user?.role === "admin",
  });

  const resetForm = () => setFormData({ ...emptyForm });

  const buildPayload = () => ({
    name: formData.name,
    clave: formData.clave || null,
    subdomain: formData.subdomain ? formData.subdomain : null,
    primaryColor: formData.primaryColor,
    secondaryColor: formData.secondaryColor,
    active: formData.active,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/empresas", buildPayload());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresas"] });
      toast({ title: "Empresa creada" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear empresa", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/empresas/${id}`, buildPayload());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empresas"] });
      toast({ title: "Empresa actualizada" });
      setIsDialogOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar empresa", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (empresa: Empresa) => {
    setEditing(empresa);
    setFormData({
      name: empresa.name,
      clave: empresa.clave || "",
      subdomain: empresa.subdomain || "",
      primaryColor: empresa.primaryColor || "#4DA3FF",
      secondaryColor: empresa.secondaryColor || "#1F3C88",
      active: empresa.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate(editing.id);
    } else {
      createMutation.mutate();
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="access-denied">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso denegado</CardTitle>
            <CardDescription>Solo los administradores pueden gestionar empresas.</CardDescription>
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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Marcas comerciales dentro de tu compañía (comparten clientes, productos y base de datos).
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditing(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-empresa">
              <Plus className="h-4 w-4 mr-2" />
              Nueva empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Joper Ligero"
                    required
                    data-testid="input-empresa-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clave">Clave corta</Label>
                  <Input
                    id="clave"
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                    placeholder="Ej. LIGERO"
                    data-testid="input-empresa-clave"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdominio (opcional)</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="ligero"
                    data-testid="input-empresa-subdomain"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.nexxo.com.mx</span>
                </div>
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  data-testid="switch-active"
                />
                <Label htmlFor="active">Empresa activa</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} data-testid="button-save-empresa">
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editing ? "Guardar cambios" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {empresas.map((empresa) => (
          <Card key={empresa.id} className="hover-elevate" data-testid={`card-empresa-${empresa.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: empresa.primaryColor || "#4DA3FF" }}
                  >
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base" data-testid={`text-empresa-name-${empresa.id}`}>
                      {empresa.name}
                    </CardTitle>
                    {empresa.clave && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {empresa.clave}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={empresa.active ? "default" : "secondary"}>
                  {empresa.active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Colores
                  </span>
                  <div className="flex gap-1">
                    <div className="w-5 h-5 rounded-sm border" style={{ backgroundColor: empresa.primaryColor || "#4DA3FF" }} />
                    <div className="w-5 h-5 rounded-sm border" style={{ backgroundColor: empresa.secondaryColor || "#1F3C88" }} />
                  </div>
                </div>
                {empresa.subdomain && (
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span>Subdominio</span>
                    <span>{empresa.subdomain}.nexxo.com.mx</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditDialog(empresa)}
                  data-testid={`button-edit-empresa-${empresa.id}`}
                >
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {empresas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aún no hay empresas</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera marca comercial (por ejemplo "Ligero" y "Móvil").
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear empresa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
