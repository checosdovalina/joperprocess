import { useParams, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Checkin, Customer } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, FileText, Loader2, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckinPhotoUploader } from "@/components/checkin-photo-uploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerSummary {
  customer: Customer;
  creditSummary?: {
    creditLimit?: number;
    creditUsed?: number;
    creditAvailable?: number;
  } | null;
  overdueInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  upcomingInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  pendingInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  hasPendingReceivables?: boolean;
  totalBalanceDue?: number;
  pendingOrders?: Array<{
    id: string;
    status: string;
    totalAmount: string;
    estimatedDelivery: string | null;
  }>;
  recentCheckins?: Array<{
    id: string;
    checkinAt: string;
    latitude: string | null;
    longitude: string | null;
  }>;
}

function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

export default function CheckinDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");

  const { data: checkin, isLoading: checkinLoading } = useQuery<Checkin & { customer: Customer }>({
    queryKey: [`/api/checkins/${id}`],
    enabled: !!id,
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<CustomerSummary>({
    queryKey: [`/api/customers/${checkin?.customerId}/summary`],
    enabled: !!checkin?.customerId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/checkins/${id}/checkout`, {
        checkoutNotes: checkoutNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      setCheckoutDialogOpen(false);
      toast({
        title: "Visita finalizada",
        description: "La minuta PDF se ha generado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo finalizar la visita",
      });
    },
  });

  if (!id) {
    return <Redirect to="/checkins" />;
  }

  if (checkinLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Check-in no encontrado</h2>
        <p className="text-muted-foreground mb-6">El check-in que buscas no existe</p>
        <Link href="/checkins">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Check-ins
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/checkins">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Detalle de Check-in</h1>
          <p className="text-muted-foreground mt-1">
            {checkin.customer.name} - {format(new Date(checkin.checkinAt), "PPP", { locale: es })}
          </p>
        </div>
        {!checkin.checkoutAt && (
          <Button 
            data-testid="button-checkout"
            onClick={() => setCheckoutDialogOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Finalizar Visita
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Información de la Visita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Estado</div>
              <div className="mt-1">
                {checkin.checkoutAt ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Finalizado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    En curso
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Check-in</div>
              <div className="mt-1 text-sm">
                {format(new Date(checkin.checkinAt), "PPP 'a las' p", { locale: es })}
              </div>
            </div>

            {checkin.checkoutAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Checkout</div>
                <div className="mt-1 text-sm">
                  {format(new Date(checkin.checkoutAt), "PPP 'a las' p", { locale: es })}
                </div>
              </div>
            )}

            {checkin.latitude && checkin.longitude && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Ubicación GPS</div>
                <div className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                  Lat: {parseFloat(checkin.latitude).toFixed(6)}<br />
                  Lng: {parseFloat(checkin.longitude).toFixed(6)}
                </div>
              </div>
            )}

            {checkin.notes && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Notas</div>
                <div className="mt-1 text-sm">{checkin.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del Cliente</CardTitle>
            <CardDescription>{checkin.customer.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : summaryError ? (
              <div className="text-center py-6">
                <p className="text-destructive mb-2">Error al cargar información del cliente</p>
                <p className="text-xs text-muted-foreground">
                  {summaryError instanceof Error ? summaryError.message : "Error desconocido"}
                </p>
              </div>
            ) : summary?.creditSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Límite de Crédito</div>
                    <div className="mt-1 text-lg font-semibold">
                      ${safeNumber(summary.creditSummary?.creditLimit).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Crédito Disponible</div>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      ${safeNumber(summary.creditSummary?.creditAvailable).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Crédito Usado</div>
                    <div className="mt-1 text-lg font-semibold text-orange-600">
                      ${safeNumber(summary.creditSummary?.creditUsed).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Facturas Vencidas</div>
                    <div className="mt-1">
                      <Badge variant={(summary.overdueInvoices?.length || 0) > 0 ? "destructive" : "outline"}>
                        {summary.overdueInvoices?.length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>

                {summary.overdueInvoices && summary.overdueInvoices.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">Facturas Vencidas</div>
                    <div className="space-y-1">
                      {summary.overdueInvoices.slice(0, 3).map((invoice) => (
                        <div key={invoice.id} className="text-xs flex justify-between">
                          <span className="text-muted-foreground">{invoice.folio}</span>
                          <span className="font-medium text-red-600">
                            ${parseFloat(invoice.total).toLocaleString("es-MX")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No hay información disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {summary?.hasPendingReceivables && summary.pendingInvoices && summary.pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Facturas por Cobrar
              <Badge variant="destructive" data-testid="badge-pending-invoices">
                {summary.pendingInvoices.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Total pendiente: ${safeNumber(summary.totalBalanceDue).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.overdueInvoices && summary.overdueInvoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2">Facturas Vencidas</h4>
                  <div className="space-y-2">
                    {summary.overdueInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center p-3 rounded-md border border-red-200 bg-red-50"
                        data-testid={`invoice-overdue-${invoice.id}`}
                      >
                        <div>
                          <div className="font-mono text-sm font-medium">
                            {invoice.serie}-{invoice.folio}
                          </div>
                          {invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              Vence: {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-700">
                            ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">Saldo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.upcomingInvoices && summary.upcomingInvoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Facturas Próximas a Vencer</h4>
                  <div className="space-y-2">
                    {summary.upcomingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center p-3 rounded-md border"
                        data-testid={`invoice-upcoming-${invoice.id}`}
                      >
                        <div>
                          <div className="font-mono text-sm font-medium">
                            {invoice.serie}-{invoice.folio}
                          </div>
                          {invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              Vence: {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">Saldo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fotografías de la Visita</CardTitle>
          <CardDescription>
            {checkin.photos?.length || 0} de 6 fotos capturadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {checkin.photos && checkin.photos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Fotos Actuales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {checkin.photos.map((photoEntityId, index) => (
                  <div
                    key={photoEntityId}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted"
                    data-testid={`image-photo-${index}`}
                  >
                    <img
                      src={`/objects/${photoEntityId}`}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                      Foto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!checkin.checkoutAt && (
            <div>
              <h3 className="text-sm font-medium mb-3">Agregar Fotos</h3>
              <CheckinPhotoUploader
                checkinId={checkin.id}
                currentPhotoCount={checkin.photos?.length || 0}
              />
            </div>
          )}

          {checkin.checkoutAt && (checkin.photos?.length || 0) === 0 && (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <ImageIcon className="w-12 h-12 opacity-20" />
              <p>No se capturaron fotos durante esta visita</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Finalizar Visita</DialogTitle>
            <DialogDescription>
              Se generará una minuta PDF con las fotos y la información de la visita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-notes">
                Acuerdos y Comentarios
              </Label>
              <Textarea
                id="checkout-notes"
                data-testid="textarea-checkout-notes"
                placeholder="Describe los acuerdos alcanzados, próximos pasos, o cualquier comentario relevante..."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Esta información aparecerá en la minuta PDF.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={checkoutMutation.isPending}
              data-testid="button-cancel-checkout"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Finalizar y Generar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
