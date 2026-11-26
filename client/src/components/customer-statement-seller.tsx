import { useQuery, useMutation } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ZoneSellerPicker } from "./zone-seller-picker";

export function CustomerStatementSeller({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const customerKey = [`/api/customers/${customerId}`];
  const { data: customer, isLoading, isError } = useQuery<Customer>({ queryKey: customerKey });
  const { data: candidates = [], isLoading: loadingCandidates, isError: candidatesError } = useQuery<{
    id: string; fullName: string; email: string | null; receiveEmailNotifications: boolean;
  }[]>({ queryKey: ["/api/account-statement-schedule/copy-candidates"] });
  const mutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const response = await apiRequest("PATCH", `/api/customers/${customerId}/statement-seller`, { userId });
      return response.json() as Promise<Customer>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(customerKey, updated);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account-statements"] });
      toast({ title: "Vendedor del cliente guardado" });
    },
    onError: (error: Error) => toast({ title: "No se pudo asignar el vendedor", description: error.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="customer-statement-seller">
      <p className="text-sm font-medium">Vendedor para estados de cuenta</p>
      <p className="text-xs text-muted-foreground">
        Recibe la copia de este cliente en lugar del vendedor de la zona. Los cambios se guardan al seleccionar.
      </p>
      {isError || candidatesError ? <p role="alert" className="text-sm text-destructive">No se pudieron cargar los vendedores.</p>
        : isLoading || loadingCandidates || !customer ? <p role="status" className="text-sm">Cargando…</p>
        : <>
          <ZoneSellerPicker
            key={customerId}
            zoneName={customer.name}
            vendedorId={customerId}
            value={customer.statementSellerUserId}
            candidates={candidates}
            pending={mutation.isPending}
            unassignedLabel="Usar vendedor de zona"
            onChange={userId => mutation.mutate(userId)}
          />
          {customer.statementSellerUserId && candidates.find(user => user.id === customer.statementSellerUserId)?.receiveEmailNotifications === false &&
            <p className="text-xs text-destructive">Este usuario tiene desactivadas las notificaciones por correo; no recibirá la copia.</p>}
          <p className="text-xs text-muted-foreground">Sin asignación específica se usa la zona de Microsip. No modifica Microsip ni el acceso al cliente.</p>
        </>}
    </div>
  );
}
