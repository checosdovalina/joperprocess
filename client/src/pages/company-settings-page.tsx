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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Upload, Save, Loader2, Palette, TriangleAlert, Trash2, ShieldAlert, ChevronRight, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant } from "@shared/schema";

const CONFIRM_PHRASE = "CONFIRMAR RESET";

const TIMEZONES = [
  { value: "America/Mexico_City",   label: "Ciudad de México (CST/CDT)" },
  { value: "America/Monterrey",     label: "Monterrey (CST/CDT)" },
  { value: "America/Chihuahua",     label: "Chihuahua (MST/MDT)" },
  { value: "America/Mazatlan",      label: "Mazatlán (MST/MDT)" },
  { value: "America/Hermosillo",    label: "Hermosillo (MST, sin DST)" },
  { value: "America/Tijuana",       label: "Tijuana (PST/PDT)" },
  { value: "America/Cancun",        label: "Cancún (EST, sin DST)" },
  { value: "America/New_York",      label: "Nueva York (EST/EDT)" },
  { value: "America/Los_Angeles",   label: "Los Ángeles (PST/PDT)" },
  { value: "America/Chicago",       label: "Chicago (CST/CDT)" },
  { value: "America/Denver",        label: "Denver (MST/MDT)" },
  { value: "UTC",                   label: "UTC (Coordinado Universal)" },
];

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Danger zone state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetUnderstood, setResetUnderstood] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");

  const resetDialogClose = () => {
    setResetDialogOpen(false);
    setTimeout(() => {
      setResetStep(1);
      setResetUnderstood(false);
      setResetPhrase("");
    }, 300);
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reset-tenant-data", {
        confirmPhrase: CONFIRM_PHRASE,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al resetear");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      resetDialogClose();
      toast({
        title: "Base de datos reseteada",
        description: "Todos los datos fueron eliminados. Solo quedan los usuarios.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={currentData.timezone || "America/Mexico_City"}
                onValueChange={(value) => handleChange("timezone" as keyof Tenant, value)}
              >
                <SelectTrigger id="timezone" data-testid="select-timezone">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Zona horaria para las fechas en PDFs generados por el sistema
              </p>
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

      {/* ─── ZONA DE PELIGRO ─────────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase px-2">
            Zona de Peligro
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Resetear Base de Datos
            </CardTitle>
            <CardDescription className="text-xs">
              Elimina permanentemente todos los datos operativos de esta empresa: clientes, cotizaciones,
              pedidos, facturas, pagos, embarques, incidentes y productos. <strong>Los usuarios no serán eliminados.</strong>
              Esta acción no puede deshacerse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => setResetDialogOpen(true)}
              data-testid="button-open-reset-dialog"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Iniciar proceso de reset
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── DIÁLOGO MULTI-PASO ───────────────────────────────────────────────── */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => !open && resetDialogClose()}>
        <DialogContent className="sm:max-w-md">

          {/* PASO 1: Advertencia */}
          {resetStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <TriangleAlert className="h-5 w-5" />
                  Advertencia — Acción Irreversible
                </DialogTitle>
                <DialogDescription className="text-sm pt-1">
                  Estás a punto de eliminar <strong>todos los datos operativos</strong> de esta empresa.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-3">Se eliminarán permanentemente:</p>
                {[
                  "Todos los clientes y sus ubicaciones",
                  "Cotizaciones y sus artículos",
                  "Pedidos, embarques y surtidos",
                  "Facturas y pagos",
                  "Check-ins y visitas programadas",
                  "Incidentes y comentarios",
                  "Productos y categorías",
                  "Configuración e historial de Microsip",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                    {item}
                  </div>
                ))}
                <p className="pt-2 font-semibold text-foreground">
                  Los usuarios del sistema NO serán eliminados.
                </p>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="understood"
                  checked={resetUnderstood}
                  onCheckedChange={(v) => setResetUnderstood(!!v)}
                  data-testid="checkbox-understood"
                />
                <Label htmlFor="understood" className="text-sm leading-snug cursor-pointer">
                  Entiendo que esta acción es permanente e irreversible y que perderé todos los datos listados arriba.
                </Label>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={resetDialogClose} data-testid="button-reset-cancel-step1">
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={!resetUnderstood}
                  onClick={() => setResetStep(2)}
                  data-testid="button-reset-next-step2"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* PASO 2: Confirmar con frase */}
          {resetStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Confirmación Final
                </DialogTitle>
                <DialogDescription className="text-sm pt-1">
                  Para confirmar, escribe exactamente la siguiente frase en el campo de abajo:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md bg-muted px-4 py-2 text-center">
                  <code className="text-sm font-bold tracking-widest select-all">{CONFIRM_PHRASE}</code>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="confirm-phrase-input">Escribe la frase de confirmación</Label>
                  <Input
                    id="confirm-phrase-input"
                    value={resetPhrase}
                    onChange={(e) => setResetPhrase(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    className={resetPhrase && resetPhrase !== CONFIRM_PHRASE ? "border-destructive" : ""}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="input-confirm-phrase"
                  />
                  {resetPhrase && resetPhrase !== CONFIRM_PHRASE && (
                    <p className="text-xs text-destructive">La frase no coincide exactamente.</p>
                  )}
                </div>

                <div className="rounded-md border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 p-3 text-xs text-orange-700 dark:text-orange-300">
                  Esta operación es inmediata y no tiene confirmación adicional. Una vez ejecutada, los datos no se pueden recuperar salvo que tengas un respaldo externo.
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setResetStep(1)} data-testid="button-reset-back">
                  Atrás
                </Button>
                <Button
                  variant="destructive"
                  disabled={resetPhrase !== CONFIRM_PHRASE || resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                  data-testid="button-reset-confirm-final"
                >
                  {resetMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando datos...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar todos los datos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
