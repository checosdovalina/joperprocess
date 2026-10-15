import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAgroesaQuotation, quotationLogoSlots, quotationLogoUrl } from "@shared/quotation-branding";
import type { Tenant } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

type LogoSlot = keyof typeof quotationLogoSlots;
type LogoAction = { slot: LogoSlot; action: "upload"; file: File } | { slot: LogoSlot; action: "remove" };

const acceptedImageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const maxFileSize = 5 * 1024 * 1024;

function getLogoUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  if (value.startsWith("logos/")) return `/api/logos/${value.replace("logos/", "")}`;
  return value;
}

async function readError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return response.statusText || fallback;
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.error || data.message || fallback;
  } catch {
    return text;
  }
}

function PartnerLogoControls({ company, slot }: { company: Tenant; slot: LogoSlot }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brandName = slot === "mccormick" ? "McCormick" : "Faresin";
  const savedLogo = company[quotationLogoSlots[slot].field];
  const logo = quotationLogoUrl(company, slot);
  const isHidden = savedLogo === "";

  const mutation = useMutation({
    mutationFn: async (variables: LogoAction) => {
      const url = `/api/company-settings/quotation-logos/${variables.slot}`;
      const response = variables.action === "upload"
        ? await fetch(url, {
            method: "POST",
            headers: { "Content-Type": variables.file.type },
            body: variables.file,
            credentials: "include",
          })
        : await fetch(url, {
            method: "DELETE",
            credentials: "include",
          });

      if (!response.ok) {
        throw new Error(await readError(response, t("settings.quotation-logos.error")));
      }
      return { action: variables.action };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      toast({
        title: variables.action === "remove"
          ? t("settings.quotation-logos.removed-title")
          : t("settings.quotation-logos.saved-title"),
        description: variables.action === "remove"
          ? t("settings.quotation-logos.removed-desc").replace("{brand}", brandName)
          : t("settings.quotation-logos.saved-desc").replace("{brand}", brandName),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
        description: error.message || t("settings.quotation-logos.error"),
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!acceptedImageTypes.includes(file.type)) {
      toast({
        title: t("label.error"),
        description: t("settings.quotation-logos.invalid-type"),
        variant: "destructive",
      });
      input.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      toast({
        title: t("label.error"),
        description: t("settings.quotation-logos.too-large"),
        variant: "destructive",
      });
      input.value = "";
      return;
    }

    mutation.mutate({ slot, action: "upload", file }, {
      onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const isBusy = mutation.isPending;

  return (
    <section className="rounded-lg border bg-card p-4" aria-labelledby={`quotation-logo-${slot}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`quotation-logo-${slot}-title`} className="text-sm font-semibold">{brandName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isHidden
              ? t("settings.quotation-logos.hidden-preview")
              : savedLogo
                ? t("settings.quotation-logos.customized")
                : t("settings.quotation-logos.default")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedImageTypes.join(",")}
            aria-label={t("settings.quotation-logos.choose-file").replace("{brand}", brandName)}
            className="sr-only"
            onChange={handleFileChange}
            disabled={isBusy}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t("settings.quotation-logos.replace").replace("{brand}", brandName)}
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {isBusy && mutation.variables?.action === "upload"
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Upload className="mr-2 h-4 w-4" />}
            {logo ? t("settings.quotation-logos.replace-short") : t("settings.quotation-logos.upload-short")}
          </Button>
          {!isHidden && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("settings.quotation-logos.remove").replace("{brand}", brandName)}
              onClick={() => mutation.mutate({ slot, action: "remove" })}
              disabled={isBusy}
              className="text-muted-foreground hover:text-destructive"
            >
              {isBusy && mutation.variables?.action === "remove"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 flex h-20 items-center justify-center rounded-md border border-dashed bg-white px-5">
        {logo ? (
          <img src={logo} alt={brandName} className="max-h-14 max-w-full object-contain" />
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            {t("settings.quotation-logos.hidden-preview")}
          </div>
        )}
      </div>
    </section>
  );
}

export default function QuotationBrandLogosSettings({ company }: { company: Tenant | undefined }) {
  const { t } = useI18n();

  if (!company || !isAgroesaQuotation(company)) return null;

  const corporateLogo = getLogoUrl(company.logoUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          {t("settings.quotation-logos.title")}
        </CardTitle>
        <CardDescription>{t("settings.quotation-logos.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("settings.quotation-logos.pdf-preview")}
          </p>
          <div className="flex min-h-24 items-center rounded-md border bg-white px-4 py-3 sm:px-6">
            <div className="flex w-full items-center justify-between gap-3 sm:gap-6">
              <div className="flex min-w-0 flex-1 items-center justify-start">
                {corporateLogo
                  ? <img src={corporateLogo} alt={company.name || t("settings.quotation-logos.company-logo")} className="max-h-14 max-w-full object-contain" />
                  : <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="h-5 w-5" /><span>{t("settings.quotation-logos.company-logo")}</span></div>}
              </div>
              <div className="h-10 w-px shrink-0 bg-border" aria-hidden="true" />
              {(["mccormick", "faresin"] as const).map((slot) => {
                const brand = slot === "mccormick" ? "McCormick" : "Faresin";
                const url = quotationLogoUrl(company, slot);
                return (
                  <div key={slot} className="flex min-w-0 flex-1 items-center justify-center">
                    {url
                      ? <img src={url} alt={brand} className="max-h-14 max-w-full object-contain" />
                      : <span className="text-xs text-muted-foreground">{brand}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PartnerLogoControls company={company} slot="mccormick" />
          <PartnerLogoControls company={company} slot="faresin" />
        </div>
        <p className="text-xs text-muted-foreground">{t("settings.quotation-logos.saved-immediately")}</p>
      </CardContent>
    </Card>
  );
}
