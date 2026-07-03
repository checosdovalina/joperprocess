import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, InsertCustomer, Customer } from "@shared/schema";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { EntityFormDialog } from "@/components/entity-form-dialog";
import { useI18n } from "@/hooks/use-i18n";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<InsertCustomer, 'tenantId'>) => void;
  isPending: boolean;
  customer?: Customer;
  onCancel?: () => void;
}

const defaultFormValues = {
  name: "",
  rfc: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
  creditLimit: "0",
  creditDays: 30,
  blocked: false,
  skipStatementEmail: false,
  contactName: "",
};

// Extend schema with client-side decimal validation, omitting tenantId (added by backend)
const makeCustomerFormSchema = (t: (key: string) => string) => insertCustomerSchema.omit({ tenantId: true }).extend({
  creditLimit: z.string()
    .min(1, { message: t("customers.credit-limit-required") })
    .refine(
      (val) => /^\d+(\.\d{0,2})?$/.test(val),
      { message: t("customers.credit-limit-invalid") }
    ),
});

type CustomerFormData = z.infer<ReturnType<typeof makeCustomerFormSchema>>;

export function CustomerForm({ open, onOpenChange, onSubmit, isPending, customer, onCancel }: CustomerFormProps) {
  const { t } = useI18n();
  const isEditing = !!customer;
  const customerFormSchema = useMemo(() => makeCustomerFormSchema(t), [t]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultFormValues,
  });

  // Reset form when dialog opens or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        // Edit mode: populate with customer data
        form.reset({
          name: customer.name,
          rfc: customer.rfc || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          country: customer.country || "",
          zipCode: customer.zipCode || "",
          creditLimit: customer.creditLimit || "0",
          creditDays: customer.creditDays,
          blocked: customer.blocked,
          skipStatementEmail: customer.skipStatementEmail ?? false,
          contactName: customer.contactName || "",
        });
      } else {
        // Create mode: reset to empty values
        form.reset(defaultFormValues);
      }
    }
  }, [open, customer, form]);

  const handleSubmit = (data: CustomerFormData) => {
    // Transform data to ensure correct types - schema already validated creditLimit
    // tenantId is added by the backend
    const transformedData: Omit<InsertCustomer, 'tenantId'> = {
      ...data,
      creditLimit: data.creditLimit,
      creditDays: data.creditDays,
      blocked: data.blocked || false,
      skipStatementEmail: data.skipStatementEmail || false,
    };
    onSubmit(transformedData);
    // Don't reset form here - let parent handle it on success
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t("customers.edit-title") : t("customers.new-title")}
      description={isEditing ? t("customers.edit-desc") : t("customers.new-desc")}
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("customers.business-name")} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("customers.name-placeholder")}
                        data-testid="input-customer-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rfc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFC</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("customers.rfc-placeholder")}
                        data-testid="input-customer-rfc"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("label.contact")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("incidents.form.contact-name")}
                        data-testid="input-customer-contact"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.email-label")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="email"
                        placeholder="email@ejemplo.com"
                        data-testid="input-customer-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("label.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="5512345678"
                        data-testid="input-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t("customers.address")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("customers.address-placeholder")}
                        data-testid="input-customer-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.city")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("customers.city")}
                        data-testid="input-customer-city"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.state")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("customers.state")}
                        data-testid="input-customer-state"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.country")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t("customers.country-ph")}
                        data-testid="input-customer-country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.zip-code")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="01000"
                        data-testid="input-customer-zipcode"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.credit-limit")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-customer-credit-limit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.credit-days")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={field.value || 30}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value, 10) : 30);
                        }}
                        placeholder="30"
                        data-testid="input-customer-credit-days"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="skipStatementEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>{t("customers.skip-statement")}</FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t("customers.skip-statement-desc")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-skip-statement-email"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) onCancel();
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isPending}
                data-testid="button-cancel-customer"
              >
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-customer">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t("customers.update-btn") : t("customers.save-btn")}
              </Button>
            </div>
          </form>
        </Form>
    </EntityFormDialog>
  );
}
