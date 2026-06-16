import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Truck, Package } from "lucide-react";

interface ShippingQuotation {
  id: string;
  folio: string;
  currency: string;
  total: string;
  shippingMethod: string;
  shippingApprovalStatus: string;
  alreadyProcessed: boolean;
  decision?: "approved" | "rejected";
  processedAt?: string;
  rejectionReason?: string;
  customer?: { name: string };
  user?: { fullName: string };
  itemsCount: number;
  tenantName: string;
}

export default function PublicShippingApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [action, setAction] = useState<"idle" | "approving" | "rejecting">("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [done, setDone] = useState<{ action: "approved" | "rejected"; folio: string } | null>(null);

  const { data: quotation, isLoading, error } = useQuery<ShippingQuotation>({
    queryKey: ["/api/public/shipping-approval", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/shipping-approval/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo cargar la cotización");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/shipping-approve/${token}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al aprobar");
      }
      return res.json();
    },
    onSuccess: () => setDone({ action: "approved", folio: quotation?.folio || "" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/shipping-reject/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason || "No se proporcionó motivo" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al rechazar");
      }
      return res.json();
    },
    onSuccess: () => setDone({ action: "rejected", folio: quotation?.folio || "" }),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace no válido</h2>
            <p className="text-muted-foreground text-sm">
              Este enlace de autorización no existe o ya expiró.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    const isApproved = done.action === "approved";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {isApproved ? (
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold mb-2">
              {isApproved ? "Envío autorizado" : "Envío rechazado"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isApproved
                ? `Has autorizado el envío sin costo para la cotización ${done.folio}. El vendedor será notificado y la cotización se enviará al cliente.`
                : `Has rechazado el envío sin costo para la cotización ${done.folio}. El vendedor será notificado para hacer ajustes.`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quotation.alreadyProcessed) {
    const isApproved = quotation.decision === "approved";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {isApproved ? (
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold mb-2">
              {isApproved ? "Envío ya autorizado" : "Envío ya rechazado"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Esta solicitud ya fue procesada anteriormente.
            </p>
            {quotation.rejectionReason && (
              <p className="text-sm mt-3 text-muted-foreground">
                Motivo: {quotation.rejectionReason}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const shippingIcon = quotation.shippingMethod === "parcel"
    ? <Package className="h-4 w-4" />
    : <Truck className="h-4 w-4" />;
  const shippingLabel = quotation.shippingMethod === "parcel" ? "Paquetería" : "Camión";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-gradient-to-r from-orange-700 to-orange-900 rounded-t-lg p-6 text-white">
          <h1 className="text-xl font-bold">Solicitud de Autorización de Envío</h1>
          <p className="text-orange-200 text-sm mt-1">{quotation.tenantName} — Sistema Comercial</p>
        </div>

        <Card className="rounded-t-none border-t-0">
          <CardContent className="pt-6 pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Se requiere tu autorización para cubrir el costo de envío de la siguiente cotización:
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-800 font-semibold">Cotización:</span>
                <span className="font-bold">{quotation.folio}</span>
              </div>
              {quotation.customer && (
                <div className="flex justify-between">
                  <span className="text-orange-800 font-semibold">Cliente:</span>
                  <span>{quotation.customer.name}</span>
                </div>
              )}
              {quotation.user && (
                <div className="flex justify-between">
                  <span className="text-orange-800 font-semibold">Vendedor:</span>
                  <span>{quotation.user.fullName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-orange-800 font-semibold">Total:</span>
                <span className="font-bold">
                  ${parseFloat(quotation.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })} {quotation.currency === "AMBAS" ? "MXN equiv." : quotation.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-800 font-semibold">Método de envío:</span>
                <span className="flex items-center gap-1">{shippingIcon} {shippingLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-800 font-semibold">Productos:</span>
                <span>{quotation.itemsCount} partida(s)</span>
              </div>
            </div>

            {action === "rejecting" ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">Motivo del rechazo (opcional):</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: El costo de envío debe ser cubierto por el cliente..."
                  className="resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAction("idle")}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate()}
                    disabled={isPending}
                  >
                    {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar rechazo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setAction("rejecting")}
                  disabled={isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate()}
                  disabled={isPending}
                >
                  {approveMutation.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <CheckCircle className="mr-2 h-4 w-4" />}
                  Aprobar envío
                </Button>
              </div>
            )}

            {(approveMutation.error || rejectMutation.error) && (
              <p className="text-sm text-destructive text-center">
                {(approveMutation.error as Error)?.message || (rejectMutation.error as Error)?.message}
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {quotation.tenantName} — Mensaje automático, no respondas a este correo.
        </p>
      </div>
    </div>
  );
}
