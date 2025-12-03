import { useState } from "react";
import { Quotation, Customer, QuotationStatus, InsertQuotation, InsertQuotationItem, QuotationItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Clock, CheckCircle, AlertTriangle, XCircle, Send, ShoppingCart, Download, Mail, Loader2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { QuotationForm } from "@/components/quotation-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type QuotationWithDetails = Quotation & { 
  customer: Customer; 
  items?: QuotationItem[];
};

export default function QuotationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: quotations, isLoading } = useEntityQuery<QuotationWithDetails[]>(
    "/api/quotations"
  );

  const { data: customers } = useEntityQuery<Customer[]>("/api/customers");

  const createQuotationMutation = useEntityMutation<Quotation, InsertQuotation & { items: InsertQuotationItem[] }>({
    endpoint: "/api/quotations",
    method: "POST",
    successMessage: "Cotización creada exitosamente",
    invalidateQueries: ["/api/quotations"],
    onSuccessCallback: () => setDialogOpen(false),
  });

  const handleDownloadPDF = async (quotation: QuotationWithDetails) => {
    setIsDownloading(quotation.id);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al generar PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotizacion-${quotation.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF descargado",
        description: `Cotización ${quotation.folio} descargada correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedQuotation) return;
    setIsSending(true);
    try {
      const response = await apiRequest("POST", `/api/quotations/${selectedQuotation.id}/send-email`, {});
      const data = await response.json();
      
      toast({
        title: "Cotización enviada",
        description: data.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-authorizations"] });
      setSendEmailDialogOpen(false);
      setSelectedQuotation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la cotización por correo",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const openSendEmailDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    setSendEmailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
      [QuotationStatus.DRAFT]: { label: "Borrador", variant: "secondary", icon: FileText },
      [QuotationStatus.SENT]: { label: "Enviada", variant: "outline", icon: Send },
      [QuotationStatus.PENDING_APPROVAL]: { label: "Pendiente Aprobación", variant: "default", icon: Clock },
      [QuotationStatus.PENDING_AUTHORIZATION]: { label: "En Autorización", variant: "default", icon: Clock },
      [QuotationStatus.AUTHORIZED]: { label: "Autorizada", variant: "default", icon: CheckCircle },
      [QuotationStatus.CONVERTED]: { label: "Convertida", variant: "default", icon: ShoppingCart },
      [QuotationStatus.REJECTED]: { label: "Rechazada", variant: "destructive", icon: XCircle },
      [QuotationStatus.EXPIRED]: { label: "Expirada", variant: "secondary", icon: AlertTriangle },
    };
    const config = statusConfig[status] || statusConfig[QuotationStatus.DRAFT];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} data-testid={`status-${status}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona cotizaciones y conviértelas en pedidos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-quotation">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Cotizaciones</CardTitle>
          <CardDescription>
            {quotations?.length || 0} cotizaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : quotations && quotations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id} className="hover-elevate" data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{quotation.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{quotation.customer.rfc}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(quotation.createdAt), "PPP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium font-mono">
                          ${parseFloat(quotation.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {quotation.currency || "MXN"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {quotation.items?.length || 0} productos
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(quotation)}
                            disabled={isDownloading === quotation.id}
                            title="Descargar PDF"
                            data-testid={`button-pdf-quotation-${quotation.id}`}
                          >
                            {isDownloading === quotation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          
                          {(quotation.status === QuotationStatus.DRAFT || quotation.status === QuotationStatus.SENT) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSendEmailDialog(quotation)}
                              title="Enviar por correo"
                              data-testid={`button-email-quotation-${quotation.id}`}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-menu-quotation-${quotation.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem data-testid={`menu-view-quotation-${quotation.id}`}>
                                <FileText className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(quotation)}
                                data-testid={`menu-pdf-quotation-${quotation.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              {(quotation.status === QuotationStatus.DRAFT || quotation.status === QuotationStatus.SENT) && (
                                <DropdownMenuItem 
                                  onClick={() => openSendEmailDialog(quotation)}
                                  data-testid={`menu-email-quotation-${quotation.id}`}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Enviar por correo
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay cotizaciones registradas</p>
              <Button
                className="mt-4"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-first-quotation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Cotización
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <QuotationForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={createQuotationMutation.mutate}
        isPending={createQuotationMutation.isPending}
        customers={customers?.map(c => ({ id: c.id, name: c.name })) || []}
        userId={user?.id}
      />

      <AlertDialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Cotización por Correo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Se enviará la cotización <strong>{selectedQuotation?.folio}</strong> al cliente{" "}
                <strong>{selectedQuotation?.customer.name}</strong>.
              </p>
              <p className="text-sm">
                El correo incluirá el PDF de la cotización y se enviará a:
              </p>
              <ul className="text-sm list-disc list-inside ml-2 space-y-1">
                {selectedQuotation?.customer.email && (
                  <li>{selectedQuotation.customer.email} (cliente)</li>
                )}
                {user?.email && <li>{user.email} (vendedor)</li>}
              </ul>
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Al enviar, la cotización pasará automáticamente a proceso de autorización de crédito.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar y Solicitar Autorización
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
