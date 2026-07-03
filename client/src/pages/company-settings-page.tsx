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
import { Building2, Upload, Save, Loader2, Palette, TriangleAlert, Trash2, ShieldAlert, ChevronRight, Clock, Tag, Percent, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/use-i18n";
import type { Tenant } from "@shared/schema";

const CONFIRM_PHRASE = "CONFIRMAR RESET";

const TIMEZONES = [
  { value: "America/Mexico_City",   labelKey: "settings.tz.mexico-city" },
  { value: "America/Monterrey",     labelKey: "settings.tz.monterrey" },
  { value: "America/Chihuahua",     labelKey: "settings.tz.chihuahua" },
  { value: "America/Mazatlan",      labelKey: "settings.tz.mazatlan" },
  { value: "America/Hermosillo",    labelKey: "settings.tz.hermosillo" },
  { value: "America/Tijuana",       labelKey: "settings.tz.tijuana" },
  { value: "America/Cancun",        labelKey: "settings.tz.cancun" },
  { value: "America/New_York",      labelKey: "settings.tz.new-york" },
  { value: "America/Los_Angeles",   labelKey: "settings.tz.los-angeles" },
  { value: "America/Chicago",       labelKey: "settings.tz.chicago" },
  { value: "America/Denver",        labelKey: "settings.tz.denver" },
  { value: "UTC",                   labelKey: "settings.tz.utc" },
];

export default function CompanySettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Danger zone state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetUnderstood, setResetUnderstood] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");

  // Discount management state
  const [globalDiscount, setGlobalDiscount] = useState("");
  const [categoryDiscounts, setCategoryDiscounts] = useState<Record<string, string>>({});
  const [applyingCategory, setApplyingCategory] = useState<string | null>(null);

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
        throw new Error(err.error || t("settings.reset.error"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      resetDialogClose();
      toast({
        title: t("settings.reset.done-title"),
        description: t("settings.reset.done-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: company, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/company-settings"],
  });

  // Product categories for discount management
  const { data: categories = [] } = useQuery<{ id: string; name: string; maxDiscount: string | null }[]>({
    queryKey: ["/api/product-categories"],
  });

  // Apply bulk discount mutation
  const bulkDiscountMutation = useMutation({
    mutationFn: async ({ discount, categoryId }: { discount: number; categoryId?: string }) => {
      const res = await apiRequest("POST", "/api/products/bulk-discount", { discount, categoryId });
      if (!res.ok) throw new Error((await res.json()).error || t("settings.discount.error"));
      return res.json() as Promise<{ updated: number; discount: string }>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setApplyingCategory(null);
      toast({
        title: t("settings.discount.applied"),
        description: t("settings.discount.applied-desc")
          .replace("{count}", String(data.updated))
          .replace("{product}", data.updated !== 1 ? t("settings.discount.products") : t("settings.discount.product"))
          .replace("{discount}", data.discount),
      });
      if (!variables.categoryId) setGlobalDiscount("");
    },
    onError: (error: Error) => {
      setApplyingCategory(null);
      toast({ title: t("label.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleApplyCategory = (categoryId: string) => {
    const val = parseFloat(categoryDiscounts[categoryId] ?? "");
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: t("settings.discount.invalid"), description: t("settings.discount.invalid-desc"), variant: "destructive" });
      return;
    }
    setApplyingCategory(categoryId);
    bulkDiscountMutation.mutate({ discount: val, categoryId });
  };

  const handleApplyGlobal = () => {
    const val = parseFloat(globalDiscount);
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: t("settings.discount.invalid"), description: t("settings.discount.invalid-desc"), variant: "destructive" });
      return;
    }
    setApplyingCategory("global");
    bulkDiscountMutation.mutate({ discount: val });
  };

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
        title: t("settings.saved-title"),
        description: t("settings.saved-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message || t("settings.save-error"),
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("label.error"),
        description: t("settings.logo.only-images"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("label.error"),
        description: t("settings.logo.too-large"),
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
        throw new Error(error.error || t("settings.logo.upload-error"));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-config"] });
      toast({
        title: t("settings.logo.updated-title"),
        description: t("settings.logo.updated-desc"),
      });
    } catch (error) {
      toast({
        title: t("label.error"),
        description: error instanceof Error ? error.message : t("settings.logo.upload-fail"),
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
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("settings.logo.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.logo.desc")}
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
                      {t("settings.logo.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("settings.logo.upload")}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("settings.logo.hint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("settings.company.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.company.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("settings.field.commercial-name")}</Label>
                <Input
                  id="name"
                  value={currentData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={t("settings.ph.company-name")}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">{t("settings.field.legal-name")}</Label>
                <Input
                  id="legalName"
                  value={currentData.legalName || ""}
                  onChange={(e) => handleChange("legalName", e.target.value)}
                  placeholder={t("settings.ph.legal-name")}
                  data-testid="input-legal-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfc">{t("label.rfc")}</Label>
                <Input
                  id="rfc"
                  value={currentData.rfc || ""}
                  onChange={(e) => handleChange("rfc", e.target.value)}
                  placeholder={t("settings.ph.rfc")}
                  data-testid="input-rfc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t("settings.field.website")}</Label>
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
                <Label htmlFor="email">{t("settings.field.email")}</Label>
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
                <Label htmlFor="phone">{t("label.phone")}</Label>
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
              <Label htmlFor="address">{t("label.address")}</Label>
              <Textarea
                id="address"
                value={currentData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder={t("settings.ph.address")}
                rows={2}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t("label.city")}</Label>
                <Input
                  id="city"
                  value={currentData.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder={t("settings.ph.city")}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t("label.state")}</Label>
                <Input
                  id="state"
                  value={currentData.state || ""}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder={t("settings.ph.state")}
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
                <Label htmlFor="country">{t("label.country")}</Label>
                <Input
                  id="country"
                  value={currentData.country || t("settings.default.country")}
                  onChange={(e) => handleChange("country", e.target.value)}
                  placeholder={t("settings.ph.country")}
                  data-testid="input-country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">{t("settings.field.timezone")}</Label>
              <Select
                value={currentData.timezone || "America/Mexico_City"}
                onValueChange={(value) => handleChange("timezone" as keyof Tenant, value)}
              >
                <SelectTrigger id="timezone" data-testid="select-timezone">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder={t("settings.ph.timezone")} />
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
                {t("settings.timezone.hint")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("settings.brand.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.brand.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">{t("settings.primary-color")}</Label>
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
                <Label htmlFor="secondaryColor">{t("settings.secondary-color")}</Label>
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
                {t("btn.saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("btn.save-changes")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ─── MAX DISCOUNTS ──────────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase px-2">
            {t("settings.discounts.section")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Global apply */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              {t("settings.discount.apply-all")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("settings.discount.apply-all-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 w-40">
                <Label htmlFor="global-discount" className="text-xs">{t("settings.discount.max-percent")}</Label>
                <div className="relative">
                  <Input
                    id="global-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder={t("settings.discount.ph-example")}
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                    className="pr-7"
                    data-testid="input-global-discount"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                </div>
              </div>
              <Button
                onClick={handleApplyGlobal}
                disabled={!globalDiscount || bulkDiscountMutation.isPending}
                data-testid="button-apply-global-discount"
              >
                {applyingCategory === "global" && bulkDiscountMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("settings.discount.applying")}</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />{t("settings.discount.apply-all-btn")}</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Per-category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              {t("settings.discount.apply-category")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("settings.discount.apply-category-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">{t("settings.discount.no-categories")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("label.category")}</TableHead>
                    <TableHead className="w-32 text-center">{t("settings.discount.current")}</TableHead>
                    <TableHead className="w-44">{t("settings.discount.new-percent")}</TableHead>
                    <TableHead className="w-36" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => {
                    const isBusy = applyingCategory === cat.id && bulkDiscountMutation.isPending;
                    const val = categoryDiscounts[cat.id] ?? "";
                    const currentDiscount = parseFloat(cat.maxDiscount ?? "0");
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                        <TableCell className="text-center">
                          {currentDiscount > 0
                            ? <Badge variant="secondary">{currentDiscount.toFixed(0)}%</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="relative w-36">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0.00"
                              value={val}
                              onChange={(e) => setCategoryDiscounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                              className="pr-7"
                              data-testid={`input-discount-category-${cat.id}`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!val || isBusy || bulkDiscountMutation.isPending}
                            onClick={() => handleApplyCategory(cat.id)}
                            data-testid={`button-apply-discount-${cat.id}`}
                          >
                            {isBusy
                              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("settings.discount.applying-short")}</>
                              : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{t("settings.discount.apply-short")}</>
                            }
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ZONA DE PELIGRO ─────────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase px-2">
            {t("settings.danger.section")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {t("settings.danger.reset-title")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("settings.danger.reset-desc-1")} <strong>{t("settings.danger.reset-desc-2")}</strong>{" "}
              {t("settings.danger.reset-desc-3")}
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
              {t("settings.danger.start-reset")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── MULTI-STEP DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => !open && resetDialogClose()}>
        <DialogContent className="sm:max-w-md">

          {/* PASO 1: Advertencia */}
          {resetStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <TriangleAlert className="h-5 w-5" />
                  {t("settings.reset.step1-title")}
                </DialogTitle>
                <DialogDescription className="text-sm pt-1">
                  {t("settings.reset.step1-desc-1")} <strong>{t("settings.reset.step1-desc-strong")}</strong> {t("settings.reset.step1-desc-2")}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-3">{t("settings.reset.will-delete")}</p>
                {[
                  t("settings.reset.item-clients"),
                  t("settings.reset.item-quotations"),
                  t("settings.reset.item-orders"),
                  t("settings.reset.item-invoices"),
                  t("settings.reset.item-checkins"),
                  t("settings.reset.item-incidents"),
                  t("settings.reset.item-products"),
                  t("settings.reset.item-microsip"),
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                    {item}
                  </div>
                ))}
                <p className="pt-2 font-semibold text-foreground">
                  {t("settings.reset.users-safe")}
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
                  {t("settings.reset.understood")}
                </Label>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={resetDialogClose} data-testid="button-reset-cancel-step1">
                  {t("btn.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={!resetUnderstood}
                  onClick={() => setResetStep(2)}
                  data-testid="button-reset-next-step2"
                >
                  {t("settings.reset.continue")}
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
                  {t("settings.reset.step2-title")}
                </DialogTitle>
                <DialogDescription className="text-sm pt-1">
                  {t("settings.reset.step2-desc")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md bg-muted px-4 py-2 text-center">
                  <code className="text-sm font-bold tracking-widest select-all">{CONFIRM_PHRASE}</code>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="confirm-phrase-input">{t("settings.reset.type-phrase")}</Label>
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
                    <p className="text-xs text-destructive">{t("settings.reset.no-match")}</p>
                  )}
                </div>

                <div className="rounded-md border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20 p-3 text-xs text-orange-700 dark:text-orange-300">
                  {t("settings.reset.warning-box")}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setResetStep(1)} data-testid="button-reset-back">
                  {t("settings.reset.back")}
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
                      {t("settings.reset.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("settings.reset.delete-all")}
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
