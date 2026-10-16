import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { quotationBankDetailsSchema, type QuotationBankDetails } from "@shared/quotation-bank-settings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Landmark, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

const endpoint = "/api/company-settings/bank-details";

const emptyDetails = (): QuotationBankDetails => ({
  beneficiary: "",
  rfc: "",
  accounts: [],
});

type AccountField = "bank" | "account" | "clabe";

export default function QuotationBankSettings({ companyId }: { companyId: string }) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const spanish = locale === "es";
  const text = (es: string, en: string) => spanish ? es : en;
  const queryKey = [endpoint, companyId] as const;
  const [draft, setDraft] = useState<QuotationBankDetails>(emptyDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const detailsQuery = useQuery<QuotationBankDetails>({
    queryKey,
    queryFn: async () => (await apiRequest("GET", endpoint)).json(),
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    if (detailsQuery.data) {
      setDraft({
        beneficiary: detailsQuery.data.beneficiary ?? "",
        rfc: detailsQuery.data.rfc ?? "",
        accounts: detailsQuery.data.accounts ?? [],
      });
      setErrors({});
    }
  }, [detailsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (details: QuotationBankDetails) => {
      const response = await apiRequest("PUT", endpoint, details);
      return response.json() as Promise<QuotationBankDetails>;
    },
    onSuccess: (details) => {
      queryClient.setQueryData(queryKey, details);
      setDraft(details);
      setErrors({});
      toast({
        title: text("Cuentas bancarias guardadas", "Bank accounts saved"),
        description: text("Los datos se actualizaron correctamente.", "Your details were updated successfully."),
      });
    },
    onError: (error: Error) => {
      toast({ title: text("No se pudo guardar", "Could not save"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", endpoint);
      return emptyDetails();
    },
    onSuccess: (details) => {
      queryClient.setQueryData(queryKey, details);
      setDraft(details);
      setErrors({});
      setConfirmDeleteOpen(false);
      toast({
        title: text("Configuración eliminada", "Configuration deleted"),
        description: text("Se quitaron todas las cuentas bancarias.", "All bank accounts were removed."),
      });
    },
    onError: (error: Error) => {
      toast({ title: text("No se pudo eliminar", "Could not delete"), description: error.message, variant: "destructive" });
    },
  });

  const setField = (field: "beneficiary" | "rfc", value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const setAccountField = (index: number, field: AccountField, value: string) => {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [field]: value } : account,
      ),
    }));
    setErrors((current) => ({ ...current, [`accounts.${index}.${field}`]: "" }));
  };

  const addAccount = () => {
    if (draft.accounts.length >= 10) return;
    setDraft((current) => ({
      ...current,
      accounts: [...current.accounts, { bank: "", account: "", clabe: "" }],
    }));
    setErrors({});
  };

  const removeAccount = (index: number) => {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.filter((_, accountIndex) => accountIndex !== index),
    }));
    setErrors({});
  };

  const save = () => {
    if (draft.accounts.length > 0 && (!draft.beneficiary.trim() || !draft.rfc.trim())) {
      const requiredMessage = text("Este campo es obligatorio cuando hay cuentas.", "This field is required when accounts are listed.");
      const requiredErrors = {
        ...errors,
        ...(draft.beneficiary.trim() ? {} : { beneficiary: requiredMessage }),
        ...(draft.rfc.trim() ? {} : { rfc: requiredMessage }),
      };
      setErrors(requiredErrors);
      toast({
        title: text("Revisa los datos", "Check the details"),
        description: requiredMessage,
        variant: "destructive",
      });
      return;
    }
    const result = quotationBankDetailsSchema.safeParse(draft);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast({
        title: text("Revisa los datos", "Check the details"),
        description: text("Corrige los campos marcados antes de guardar.", "Correct the marked fields before saving."),
        variant: "destructive",
      });
      return;
    }
    setErrors({});
    saveMutation.mutate(result.data);
  };

  const isPending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            {text("Cuentas bancarias para cotizaciones", "Quotation bank accounts")}
          </CardTitle>
          <CardDescription>
            {text(
              "Estos datos pueden aparecer en las cotizaciones de la empresa.",
              "These details may appear on the company’s quotations.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {detailsQuery.isLoading ? (
            <div className="space-y-4" aria-label={text("Cargando cuentas bancarias", "Loading bank accounts")}>
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-28 animate-pulse rounded-md bg-muted" />
            </div>
          ) : detailsQuery.isError ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4" role="alert">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {text("No se pudieron cargar las cuentas bancarias.", "Bank account details could not be loaded.")}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => detailsQuery.refetch()} disabled={detailsQuery.isFetching}>
                {detailsQuery.isFetching
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <RotateCcw className="mr-2 h-4 w-4" />}
                {text("Reintentar", "Retry")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank-beneficiary">{text("Beneficiario", "Beneficiary")}</Label>
                  <Input
                    id="bank-beneficiary"
                    value={draft.beneficiary}
                    maxLength={180}
                    disabled={isPending}
                    onChange={(event) => setField("beneficiary", event.target.value)}
                    aria-invalid={Boolean(errors.beneficiary)}
                    data-testid="input-bank-beneficiary"
                  />
                  {errors.beneficiary && <p className="text-xs text-destructive">{errors.beneficiary}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-rfc">RFC</Label>
                  <Input
                    id="bank-rfc"
                    value={draft.rfc}
                    maxLength={20}
                    disabled={isPending}
                    onChange={(event) => setField("rfc", event.target.value)}
                    aria-invalid={Boolean(errors.rfc)}
                    data-testid="input-bank-rfc"
                  />
                  {errors.rfc && <p className="text-xs text-destructive">{errors.rfc}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{text("Cuentas", "Accounts")}</h3>
                    <p className="text-xs text-muted-foreground">
                      {text("Máximo 10 cuentas. CLABE de 18 dígitos.", "Up to 10 accounts. CLABE must contain 18 digits.")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addAccount}
                    disabled={draft.accounts.length >= 10 || isPending}
                    data-testid="button-add-bank-account"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {text("Agregar cuenta", "Add account")}
                  </Button>
                </div>

                {draft.accounts.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    {text("Aún no hay cuentas configuradas.", "No accounts have been configured yet.")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.accounts.map((account, index) => (
                      <div key={index} className="rounded-md border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {text("Cuenta", "Account")} {index + 1}
                          </p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`${text("Quitar cuenta", "Remove account")} ${index + 1}`}
                            onClick={() => removeAccount(index)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-remove-bank-account-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          {([
                            { field: "bank", label: text("Banco", "Bank"), testId: `input-bank-name-${index}` },
                            { field: "account", label: text("Número de cuenta", "Account number"), testId: `input-bank-account-${index}` },
                            { field: "clabe", label: "CLABE", testId: `input-bank-clabe-${index}` },
                          ] as const).map(({ field, label, testId }) => {
                            const errorKey = `accounts.${index}.${field}`;
                            return (
                              <div key={field} className="space-y-2">
                                <Label htmlFor={`${field}-${index}`}>{label}</Label>
                                <Input
                                  id={`${field}-${index}`}
                                  value={account[field]}
                                  maxLength={field === "bank" ? 80 : field === "account" ? 30 : 18}
                                  disabled={isPending}
                                  onChange={(event) => setAccountField(index, field, event.target.value)}
                                  inputMode={field === "clabe" || field === "account" ? "numeric" : undefined}
                                  aria-invalid={Boolean(errors[errorKey])}
                                  data-testid={testId}
                                />
                                {errors[errorKey] && <p className="text-xs text-destructive">{errors[errorKey]}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errors.accounts && <p className="text-sm text-destructive">{errors.accounts}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isPending}
                  data-testid="button-delete-bank-details"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {text("Eliminar toda la configuración", "Delete all configuration")}
                </Button>
                <Button type="button" onClick={save} disabled={isPending} data-testid="button-save-bank-details">
                  {saveMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{text("Guardando…", "Saving…")}</>
                    : <><Save className="mr-2 h-4 w-4" />{text("Guardar cuentas", "Save accounts")}</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDeleteOpen} onOpenChange={(open) => !deleteMutation.isPending && setConfirmDeleteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text("¿Eliminar toda la configuración bancaria?", "Delete all bank details?")}</DialogTitle>
            <DialogDescription>
              {text(
                "Se eliminarán el beneficiario, RFC y todas las cuentas. Esta acción no se puede deshacer.",
                "The beneficiary, RFC, and all accounts will be removed. This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleteMutation.isPending}>
              {text("Cancelar", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-bank-details"
            >
              {deleteMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{text("Eliminando…", "Deleting…")}</>
                : text("Eliminar todo", "Delete all")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
