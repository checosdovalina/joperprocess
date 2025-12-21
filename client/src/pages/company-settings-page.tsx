import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Save, Loader2, Palette } from "lucide-react";
import type { Tenant } from "@shared/schema";

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: company, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/company-settings"],
  });

  const [formData, setFormData] = useState<Partial<Tenant>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      const response = await apiRequest("PATCH", "/api/company-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-config"] });
      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido aplicados correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no puede superar 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/company-settings/logo", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir el logo");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-config"] });
      toast({
        title: "Logo actualizado",
        description: "El logo de la empresa ha sido actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo subir el logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof Tenant, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getLogoUrl = (logoUrl: string | null | undefined) => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http')) return logoUrl;
    if (logoUrl.startsWith('logos/')) {
      return `/api/logos/${logoUrl.replace('logos/', '')}`;
    }
    return logoUrl;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentData = { ...company, ...formData };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Configuración de Empresa
        </h1>
        <p className="text-muted-foreground">
          Gestiona la información y apariencia de tu empresa
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Logo de la Empresa
            </CardTitle>
            <CardDescription>
              Este logo aparecerá en tus cotizaciones, minutas y documentos PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={getLogoUrl(company?.logoUrl) || undefined} 
                  alt={company?.name || "Logo"} 
                />
                <AvatarFallback className="text-2xl">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  data-testid="input-logo-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-logo"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG o WebP. Máximo 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Empresa
            </CardTitle>
            <CardDescription>
              Datos legales y de contacto de tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Comercial</Label>
                <Input
                  id="name"
                  value={currentData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Nombre de la empresa"
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Razón Social</Label>
                <Input
                  id="legalName"
                  value={currentData.legalName || ""}
                  onChange={(e) => handleChange("legalName", e.target.value)}
                  placeholder="Razón social completa"
                  data-testid="input-legal-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  value={currentData.rfc || ""}
                  onChange={(e) => handleChange("rfc", e.target.value)}
                  placeholder="RFC de la empresa"
                  data-testid="input-rfc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={currentData.website || ""}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://www.ejemplo.com"
                  data-testid="input-website"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="contacto@empresa.com"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={currentData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+52 55 1234 5678"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={currentData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Calle, número, colonia..."
                rows={2}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={currentData.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Ciudad"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={currentData.state || ""}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="Estado"
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">C.P.</Label>
                <Input
                  id="zipCode"
                  value={currentData.zipCode || ""}
                  onChange={(e) => handleChange("zipCode", e.target.value)}
                  placeholder="00000"
                  data-testid="input-zip"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={currentData.country || "México"}
                  onChange={(e) => handleChange("country", e.target.value)}
                  placeholder="País"
                  data-testid="input-country"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Colores de Marca
            </CardTitle>
            <CardDescription>
              Personaliza los colores de tu sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Color Primario</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primaryColor"
                    value={currentData.primaryColor || "#4DA3FF"}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={currentData.primaryColor || "#4DA3FF"}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    placeholder="#4DA3FF"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Color Secundario</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="secondaryColor"
                    value={currentData.secondaryColor || "#1F3C88"}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    value={currentData.secondaryColor || "#1F3C88"}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    placeholder="#1F3C88"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
