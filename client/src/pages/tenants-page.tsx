import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
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
  parentId: string | null;
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
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    parentId: "",
    email: "",
    phone: "",
    primaryColor: "#4DA3FF",
    secondaryColor: "#1F3C88",
    active: true,
    plan: "basic",
    maxUsers: 10,
    locale: "es" as Locale,
    inheritMicrosip: false,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: t("tenants.created-ok"),
        description: data.microsipConfigInherited ? t("tenants.microsip-inherited") : undefined,
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: t("tenants.create-error"), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/tenants/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: t("tenants.updated-ok") });
      setIsDialogOpen(false);
      setEditingTenant(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: t("tenants.update-error"), description: error.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/tenants/${id}`, { active: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: t("tenants.activated") });
    },
    onError: (error: Error) => {
      toast({ title: t("tenants.update-error"), description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subdomain: "",
      parentId: "",
      email: "",
      phone: "",
      primaryColor: "#4DA3FF",
      secondaryColor: "#1F3C88",
      active: true,
      plan: "basic",
      maxUsers: 10,
      locale: "es" as Locale,
      inheritMicrosip: false,
    });
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      subdomain: tenant.subdomain,
      parentId: tenant.parentId || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      primaryColor: tenant.primaryColor || "#4DA3FF",
      secondaryColor: tenant.secondaryColor || "#1F3C88",
      active: tenant.active,
      plan: tenant.plan || "basic",
      maxUsers: tenant.maxUsers || 10,
      locale: (tenant.locale as Locale) || "es",
      inheritMicrosip: false,
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
            <CardTitle>{t("tenants.access-denied")}</CardTitle>
            <CardDescription>
              {t("tenants.access-denied-desc")}
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
            {t("tenants.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("tenants.subtitle")}
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
              {t("tenants.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? t("tenants.edit") : t("tenants.new")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("tenants.field.name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("tenants.ph.name")}
                    required
                    data-testid="input-tenant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">{t("tenants.field.subdomain")}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                      placeholder={t("tenants.ph.subdomain")}
                      required
                      disabled={!!editingTenant}
                      data-testid="input-tenant-subdomain"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">.nexxo.com.mx</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentId">{t("tenants.field.parent")}</Label>
                <select
                  id="parentId"
                  value={formData.parentId}
                   onChange={(e) => setFormData({
                     ...formData,
                     parentId: e.target.value,
                     inheritMicrosip: e.target.value ? formData.inheritMicrosip : false,
                   })}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  data-testid="select-parent-company"
                >
                  <option value="">{t("tenants.parent.none")}</option>
                  {tenantsList
                    .filter((tn) => tn.id !== editingTenant?.id)
                    .map((tn) => (
                      <option key={tn.id} value={tn.id}>{tn.name}</option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">{t("tenants.parent.help")}</p>
              </div>

              {!editingTenant && formData.parentId && (
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Switch
                    id="inheritMicrosip"
                    checked={formData.inheritMicrosip}
                    onCheckedChange={(checked) => setFormData({ ...formData, inheritMicrosip: checked })}
                    data-testid="switch-inherit-microsip"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="inheritMicrosip" className="cursor-pointer">
                      {t("tenants.inherit-microsip")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("tenants.inherit-microsip-help")}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("tenants.field.email")}</Label>
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
                  <Label htmlFor="phone">{t("label.phone")}</Label>
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
                  <Label htmlFor="primaryColor">{t("settings.primary-color")}</Label>
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
                  <Label htmlFor="secondaryColor">{t("settings.secondary-color")}</Label>
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
                  <Label htmlFor="plan">{t("tenants.field.plan")}</Label>
                  <select
                    id="plan"
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    data-testid="select-plan"
                  >
                    <option value="basic">{t("tenants.plan.basic")}</option>
                    <option value="professional">{t("tenants.plan.professional")}</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">{t("tenants.field.max-users")}</Label>
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
                <Label htmlFor="locale">{t("tenants.field.locale")}</Label>
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
                <Label htmlFor="active">{t("tenants.active-company")}</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("btn.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-tenant"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingTenant ? t("btn.save-changes") : t("tenants.create")}
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
                    {tenant.parentId && (
                      <div className="text-xs text-muted-foreground mt-0.5" data-testid={`text-parent-${tenant.id}`}>
                        {t("tenants.field.parent")}: {tenantsList.find((x) => x.id === tenant.parentId)?.name || "—"}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={tenant.active ? "default" : "secondary"}>
                  {tenant.active ? t("status.active") : t("status.inactive")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    {t("tenants.colors")}
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
                    {t("tenants.field.max-users")}
                  </span>
                  <span>{tenant.maxUsers || 10}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    {t("tenants.field.plan")}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {tenant.plan || "basic"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    {t("tenants.language")}
                  </span>
                  <Badge variant="outline">
                    {LOCALE_LABELS[(tenant.locale as Locale) || "es"] || LOCALE_LABELS.es}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {!tenant.active && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => activateMutation.mutate(tenant.id)}
                    disabled={activateMutation.isPending}
                    data-testid={`button-activate-tenant-${tenant.id}`}
                  >
                    {t("tenants.activate")}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openEditDialog(tenant)}
                  data-testid={`button-edit-tenant-${tenant.id}`}
                >
                  {t("btn.edit")}
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
            <h3 className="text-lg font-medium">{t("tenants.empty-title")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("tenants.empty-desc")}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("tenants.create-first")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
