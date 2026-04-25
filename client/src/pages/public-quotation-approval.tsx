import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, FileText, Clock, AlertTriangle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface QuotationItem {
  id: string;
  productName: string;
  productCode: string | null;
  quantity: number;
  unit: string;
  unitPrice: string;
  discount: string;
  subtotal: string;
  currency?: string;
}

interface PublicQuotation {
  id: string;
  folio: string;
  status: string;
  currency: string;
  subtotal: string;
  globalDiscount: string;
  tax: string;
  total: string;
  paymentTerms: string | null;
  deliveryTime: string | null;
  validUntil: string | null;
  notes: string | null;
  conditions: string | null;
  createdAt: string;
  items?: QuotationItem[];
  customer?: {
    id: string;
    name: string;
    email: string | null;
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  alreadyProcessed: boolean;
  decision?: "approved" | "rejected" | "expired";
  processedAt?: string;
  rejectionReason?: string;
}

export default function PublicQuotationApproval() {
  const { token } = useParams<{ token: string }>();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionCompleted, setActionCompleted] = useState<"approved" | "rejected" | null>(null);

  const { data: quotation, isLoading, error } = useQuery<PublicQuotation>({
    queryKey: ["/api/public/quotations", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/quotations/${token}`);
      if (!response.ok) {
        throw new Error("Cotización no encontrada");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/public/quotations/${token}/approve`);
    },
    onSuccess: () => {
      setActionCompleted("approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest("POST", `/api/public/quotations/${token}/reject`, { reason });
    },
    onSuccess: () => {
      setShowRejectDialog(false);
      setActionCompleted("rejected");
    },
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    rejectMutation.mutate(rejectionReason);
  };

  const formatMXN = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(num);
  };

  const formatUSD = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: quotation?.currency || "MXN",
    }).format(num);
  };

  // Detect mixed currencies in items
  const mxnItems = quotation?.items?.filter(i => (i.currency || "MXN") === "MXN") ?? [];
  const usdItems = quotation?.items?.filter(i => i.currency === "USD") ?? [];
  const hasMixedCurrencies = mxnItems.length > 0 && usdItems.length > 0;

  const discountPct = parseFloat(quotation?.globalDiscount || "0");

  const calcTotals = (currItems: QuotationItem[]) => {
    const sub = currItems.reduce((s, i) => s + parseFloat(i.subtotal), 0);
    const disc = discountPct > 0 ? sub * (discountPct / 100) : 0;
    const afterDisc = sub - disc;
    const tax = afterDisc * 0.16;
    return { subtotal: sub, discount: disc, afterDisc, tax, total: afterDisc + tax };
  };

  const mxnTotals = calcTotals(mxnItems);
  const usdTotals = calcTotals(usdItems);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Cotización No Encontrada</CardTitle>
            <CardDescription>
              El enlace que utilizaste no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show already processed state
  if (quotation.alreadyProcessed || actionCompleted) {
    const decision = actionCompleted || quotation.decision;
    const isApproved = decision === "approved";
    const isRejected = decision === "rejected";
    const isExpired = decision === "expired";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            {isApproved && <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />}
            {isRejected && <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />}
            {isExpired && <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />}
            <CardTitle className="text-2xl">
              {isApproved && "Cotización Aprobada"}
              {isRejected && "Cotización Rechazada"}
              {isExpired && "Cotización Expirada"}
            </CardTitle>
            <CardDescription className="text-base">
              {isApproved && "Gracias por aprobar esta cotización. Nuestro equipo de crédito revisará y autorizará su pedido."}
              {isRejected && "Esta cotización ha sido rechazada. Si tiene preguntas, contacte a nuestro equipo de ventas."}
              {isExpired && "Esta cotización ha expirado. Por favor, solicite una nueva cotización a su vendedor."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Cotización</p>
              <p className="font-semibold">{quotation.folio}</p>
              <p className="text-lg font-bold">{formatCurrency(quotation.total)}</p>
              {quotation.customer && (
                <p className="text-sm text-muted-foreground">{quotation.customer.name}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Cotización {quotation.folio}
                </CardTitle>
                <CardDescription className="mt-1">
                  {quotation.customer?.name && `Cliente: ${quotation.customer.name}`}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit text-sm">
                {formatCurrency(quotation.total)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">
                  {format(new Date(quotation.createdAt), "PPP", { locale: es })}
                </p>
              </div>
              {quotation.validUntil && (
                <div>
                  <p className="text-muted-foreground">Válida Hasta</p>
                  <p className="font-medium">
                    {format(new Date(quotation.validUntil), "PPP", { locale: es })}
                  </p>
                </div>
              )}
              {quotation.user && (
                <div>
                  <p className="text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{quotation.user.fullName}</p>
                </div>
              )}
            </div>

            {(quotation.paymentTerms || quotation.deliveryTime) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-4 border-t">
                {quotation.paymentTerms && (
                  <div>
                    <p className="text-muted-foreground">Condiciones de Pago</p>
                    <p className="font-medium">{quotation.paymentTerms}</p>
                  </div>
                )}
                {quotation.deliveryTime && (
                  <div>
                    <p className="text-muted-foreground">Tiempo de Entrega</p>
                    <p className="font-medium">{quotation.deliveryTime}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-center">Desc.</TableHead>
                    {hasMixedCurrencies && <TableHead className="text-center">Mon.</TableHead>}
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.items?.map((item) => {
                    const itemCurrency = item.currency || "MXN";
                    const fmt = itemCurrency === "USD" ? formatUSD : formatMXN;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.productCode && (
                              <p className="text-xs text-muted-foreground">{item.productCode}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                        <TableCell className="text-center">
                          {parseFloat(item.discount) > 0 ? `${item.discount}%` : "-"}
                        </TableCell>
                        {hasMixedCurrencies && (
                          <TableCell className="text-center">
                            <Badge variant={itemCurrency === "USD" ? "secondary" : "outline"} className="text-xs">
                              {itemCurrency}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {fmt(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            {hasMixedCurrencies ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                {/* MXN totals */}
                <div className="w-full sm:w-72 rounded-md border overflow-hidden">
                  <div className="bg-primary px-4 py-2">
                    <p className="text-xs font-semibold text-primary-foreground uppercase tracking-wide">Pesos Mexicanos (MXN)</p>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatMXN(mxnTotals.subtotal)}</span>
                    </div>
                    {mxnTotals.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento ({discountPct}%):</span>
                        <span>-{formatMXN(mxnTotals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span>{formatMXN(mxnTotals.tax)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-base">
                      <span>Total MXN:</span>
                      <span>{formatMXN(mxnTotals.total)}</span>
                    </div>
                  </div>
                </div>
                {/* USD totals */}
                <div className="w-full sm:w-72 rounded-md border overflow-hidden">
                  <div className="bg-emerald-700 px-4 py-2">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">Dólares Americanos (USD)</p>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatUSD(usdTotals.subtotal)}</span>
                    </div>
                    {usdTotals.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuento ({discountPct}%):</span>
                        <span>-{formatUSD(usdTotals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span>{formatUSD(usdTotals.tax)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-base">
                      <span>Total USD:</span>
                      <span>{formatUSD(usdTotals.total)}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground">Tipo de cambio a convenir al momento del pedido.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end space-y-2">
                <div className="flex justify-between w-full max-w-xs text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(quotation.subtotal)}</span>
                </div>
                {parseFloat(quotation.globalDiscount || "0") > 0 && (
                  <div className="flex justify-between w-full max-w-xs text-sm text-green-600">
                    <span>Descuento ({quotation.globalDiscount}%):</span>
                    <span>
                      -{formatCurrency(
                        parseFloat(quotation.subtotal) * (parseFloat(quotation.globalDiscount) / 100)
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between w-full max-w-xs text-sm">
                  <span className="text-muted-foreground">IVA (16%):</span>
                  <span>{formatCurrency(quotation.tax)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs pt-2 border-t text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(quotation.total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes and Conditions */}
        {(quotation.notes || quotation.conditions) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {quotation.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
                </div>
              )}
              {quotation.conditions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Condiciones</p>
                  <p className="text-sm whitespace-pre-wrap">{quotation.conditions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">¿Desea proceder con esta cotización?</CardTitle>
            <CardDescription>
              Al aprobar, la cotización será enviada a nuestro departamento de crédito para su autorización.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              className="w-full sm:w-auto"
              size="lg"
              onClick={handleApprove}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-approve-quotation"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {approveMutation.isPending ? "Aprobando..." : "Aprobar Cotización"}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              size="lg"
              onClick={() => setShowRejectDialog(true)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-reject-quotation"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Rechazar
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              size="lg"
              asChild
            >
              <a
                href={`/api/public/quotations/${token}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-download-pdf"
              >
                <Download className="h-5 w-5 mr-2" />
                Descargar PDF
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar Cotización</DialogTitle>
              <DialogDescription>
                Por favor, indique el motivo del rechazo (opcional).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Motivo del rechazo..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="input-rejection-reason"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={rejectMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? "Rechazando..." : "Confirmar Rechazo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
