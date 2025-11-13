import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, InsertOrder, OrderStatus } from "@shared/schema";
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

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertOrder) => void;
  isPending: boolean;
  onCancel?: () => void;
  quotations?: Array<{ id: string; folio: string }>;
  userId?: string;
}

export function OrderForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending, 
  onCancel,
  quotations = [],
  userId,
}: OrderFormProps) {
  const form = useForm<InsertOrder>({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      quotationId: "",
      status: OrderStatus.PENDING,
      productionProgress: 0,
      estimatedDelivery: null,
      actualDelivery: null,
      factoryNotes: "",
      lastUpdatedBy: userId || null,
    },
  });

  const handleSubmit = (data: InsertOrder) => {
    const transformedData: InsertOrder = {
      quotationId: data.quotationId,
      status: data.status,
      productionProgress: data.productionProgress || 0,  // Ensure it's never empty string
      estimatedDelivery: data.estimatedDelivery,
      actualDelivery: data.actualDelivery,
      factoryNotes: data.factoryNotes || null,
      lastUpdatedBy: data.lastUpdatedBy,
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
      title="Nueva Orden de Producción"
      description="Crea una nueva orden de producción desde una cotización autorizada"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="quotationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cotización</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-quotation">
                      <SelectValue placeholder="Seleccionar cotización" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {quotations.map((quotation) => (
                      <SelectItem 
                        key={quotation.id} 
                        value={quotation.id}
                        data-testid={`option-quotation-${quotation.id}`}
                      >
                        {quotation.folio}
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
                    <SelectItem value={OrderStatus.PENDING}>Pendiente</SelectItem>
                    <SelectItem value={OrderStatus.IN_PRODUCTION}>En Producción</SelectItem>
                    <SelectItem value={OrderStatus.READY}>Lista</SelectItem>
                    <SelectItem value={OrderStatus.SHIPPED}>Enviada</SelectItem>
                    <SelectItem value={OrderStatus.DELIVERED}>Entregada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productionProgress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progreso de Producción (%)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-production-progress"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="factoryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas de Fábrica</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Notas de producción (opcional)"
                    data-testid="input-factory-notes"
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
