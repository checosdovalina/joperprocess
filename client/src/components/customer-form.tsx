import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, InsertCustomer } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { EntityFormDialog } from "@/components/entity-form-dialog";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertCustomer) => void;
  isPending: boolean;
  onCancel?: () => void;
}

// Extend schema with client-side decimal validation
const customerFormSchema = insertCustomerSchema.extend({
  creditLimit: z.string()
    .min(1, { message: "El límite de crédito es requerido" })
    .refine(
      (val) => /^\d+(\.\d{0,2})?$/.test(val),
      { message: "Debe ser un número decimal válido (ej: 100.50)" }
    ),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export function CustomerForm({ open, onOpenChange, onSubmit, isPending, onCancel }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      rfc: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      creditLimit: "0",
      creditDays: 30,
      blocked: false,
      contactName: "",
    },
  });

  const handleSubmit = (data: CustomerFormData) => {
    // Transform data to ensure correct types - schema already validated creditLimit
    const transformedData: InsertCustomer = {
      ...data,
      creditLimit: data.creditLimit,  // Already validated and transformed by schema
      creditDays: data.creditDays,
      blocked: data.blocked || false,
    };
    onSubmit(transformedData);
    // Don't reset form here - let parent handle it on success
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo Cliente"
      description="Agrega un nuevo cliente al sistema"
    >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Razón Social *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nombre del cliente"
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
                        placeholder="RFC del cliente"
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
                    <FormLabel>Contacto</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Nombre del contacto"
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
                    <FormLabel>Correo Electrónico</FormLabel>
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
                    <FormLabel>Teléfono</FormLabel>
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
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Calle y número"
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
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Ciudad"
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
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Estado"
                        data-testid="input-customer-state"
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
                    <FormLabel>Código Postal</FormLabel>
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
                    <FormLabel>Límite de Crédito</FormLabel>
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
                    <FormLabel>Días de Crédito</FormLabel>
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
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-customer">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cliente
              </Button>
            </div>
          </form>
        </Form>
    </EntityFormDialog>
  );
}
