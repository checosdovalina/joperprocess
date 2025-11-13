import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, InsertQuotation, QuotationStatus } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { EntityFormDialog } from "@/components/entity-form-dialog";

interface QuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertQuotation) => void;
  isPending: boolean;
  onCancel?: () => void;
  customers?: Array<{ id: string; name: string }>;
  userId?: string;
}

// Extend schema with client-side decimal validation
const quotationFormSchema = insertQuotationSchema.extend({
  subtotal: z.string()
    .min(1, { message: "El subtotal es requerido" })
    .refine(
      (val) => /^\d+(\.\d{0,2})?$/.test(val),
      { message: "Debe ser un número decimal válido (ej: 100.50)" }
    ),
  tax: z.string()
    .min(1, { message: "El IVA es requerido" })
    .refine(
      (val) => /^\d+(\.\d{0,2})?$/.test(val),
      { message: "Debe ser un número decimal válido (ej: 16.00)" }
    ),
  total: z.string()
    .min(1, { message: "El total es requerido" })
    .refine(
      (val) => /^\d+(\.\d{0,2})?$/.test(val),
      { message: "Debe ser un número decimal válido (ej: 116.00)" }
    ),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;

export function QuotationForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending, 
  onCancel,
  customers = [],
  userId,
}: QuotationFormProps) {
  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: "",
      userId: userId || "",
      status: QuotationStatus.DRAFT,
      subtotal: "0",
      tax: "0",
      total: "0",
      notes: "",
    },
  });

  const handleSubmit = (data: QuotationFormData) => {
    // Convert string decimals to schema-compatible format
    const transformedData: InsertQuotation = {
      customerId: data.customerId,
      userId: data.userId,
      status: data.status,
      subtotal: data.subtotal,  // Already validated as decimal string by schema
      tax: data.tax,  // Already validated as decimal string by schema
      total: data.total,  // Already validated as decimal string by schema
      notes: data.notes || null,
      pdfPath: null,
      authorizedBy: null,
      authorizedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    };
    onSubmit(transformedData);
  };

  const handleCancel = () => {
    form.reset();
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva Cotización"
      description="Crea una nueva cotización para un cliente"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem 
                        key={customer.id} 
                        value={customer.id}
                        data-testid={`option-customer-${customer.id}`}
                      >
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={QuotationStatus.DRAFT}>Borrador</SelectItem>
                    <SelectItem value={QuotationStatus.SENT}>Enviada</SelectItem>
                    <SelectItem value={QuotationStatus.AUTHORIZED}>Autorizada</SelectItem>
                    <SelectItem value={QuotationStatus.CONVERTED}>Convertida</SelectItem>
                    <SelectItem value={QuotationStatus.REJECTED}>Rechazada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subtotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtotal</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0.00"
                    data-testid="input-subtotal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IVA</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0.00"
                    data-testid="input-tax"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0.00"
                    data-testid="input-total"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Notas adicionales (opcional)"
                    data-testid="input-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </Form>
    </EntityFormDialog>
  );
}
