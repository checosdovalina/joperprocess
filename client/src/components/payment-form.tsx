import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Invoice, Customer } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const paymentFormSchema = z.object({
  invoiceId: z.string().min(1, "Selecciona una factura"),
  customerId: z.string(),
  amount: z.string().min(1, "El monto es requerido").refine((val) => parseFloat(val) > 0, "El monto debe ser mayor a 0"),
  paymentDate: z.string().min(1, "La fecha de pago es requerida"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  maxAmount: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type InvoiceWithCustomer = Invoice & { customer: Customer };

export function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);

  const { data: invoices } = useQuery<InvoiceWithCustomer[]>({
    queryKey: ["/api/accounts-receivable"],
  });

  const pendingInvoices = invoices?.filter(
    (inv) => inv.status === "pending_payment" || inv.status === "partially_paid"
  ) || [];

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: "",
      customerId: "",
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
      maxAmount: "",
    },
  });

  useEffect(() => {
    form.reset({
      invoiceId: "",
      customerId: "",
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      reference: "",
      notes: "",
      maxAmount: "",
    });
    setSelectedInvoice(null);
  }, []);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-receivable"] });
      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado exitosamente.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive",
      });
    },
  });

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = pendingInvoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      const balance = invoice.balanceDue || invoice.total;
      form.setValue("invoiceId", invoiceId);
      form.setValue("customerId", invoice.customerId);
      form.setValue("amount", balance);
      form.setValue("maxAmount", balance);
    }
  };

  const onSubmit = (data: PaymentFormValues) => {
    const amount = parseFloat(data.amount);
    const maxAmount = parseFloat(data.maxAmount || "0");
    if (maxAmount > 0 && amount > maxAmount) {
      toast({
        title: "Monto excedido",
        description: `El monto no puede ser mayor al saldo pendiente ($${maxAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })})`,
        variant: "destructive",
      });
      return;
    }
    createPaymentMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invoiceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Factura</FormLabel>
              <Select
                onValueChange={handleInvoiceChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-invoice">
                    <SelectValue placeholder="Seleccionar factura" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pendingInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.serie}-{invoice.folio} - {invoice.customer.name} - Saldo: $
                      {parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedInvoice && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">{selectedInvoice.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Factura:</span>
              <span className="font-medium">
                ${parseFloat(selectedInvoice.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Saldo Pendiente:</span>
              <span className="font-medium text-orange-600">
                ${parseFloat(selectedInvoice.balanceDue || selectedInvoice.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto del Pago</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="pl-7"
                    placeholder="0.00"
                    data-testid="input-payment-amount"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Pago</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  data-testid="input-payment-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia / No. de Transferencia</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ej: TRF-123456"
                  data-testid="input-payment-reference"
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
                  placeholder="Notas adicionales sobre el pago..."
                  rows={3}
                  data-testid="input-payment-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-payment"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createPaymentMutation.isPending}
            data-testid="button-submit-payment"
          >
            {createPaymentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar Pago"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
