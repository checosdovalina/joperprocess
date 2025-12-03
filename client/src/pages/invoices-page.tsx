import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Invoice, Customer, InsertInvoice } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Mail, Eye, Pencil, MoreHorizontal, Plus, Loader2, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type InvoiceWithDetails = Invoice & { customer: Customer };

export default function InvoicesPage() {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  const isOverdue = (invoice: Invoice) => {
    return invoice.dueDate && isPast(new Date(invoice.dueDate));
  };

  const handleViewDetails = async (invoice: InvoiceWithDetails) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedInvoice(data);
      setDetailsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDownloadPDF = async (invoice: InvoiceWithDetails) => {
    setIsDownloading(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al generar PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${invoice.serie}-${invoice.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF descargado",
        description: `Factura ${invoice.serie}-${invoice.folio} descargada correctamente`,
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
    if (!selectedInvoice) return;
    setIsSending(true);
    try {
      const response = await apiRequest("POST", `/api/invoices/${selectedInvoice.id}/send-email`, {});
      const data = await response.json();
      
      toast({
        title: "Factura enviada",
        description: data.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSendEmailDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la factura por correo",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const openSendEmailDialog = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setSendEmailDialogOpen(true);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona facturas CFDI y envío automático
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter((i) => isOverdue(i)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices?.filter((i) => i.dueDate && !isOverdue(i)).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoices?.reduce((sum, inv) => sum + parseFloat(inv.total), 0).toLocaleString("es-MX", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Facturas</CardTitle>
          <CardDescription>
            {invoices?.length || 0} facturas emitidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serie - Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover-elevate" data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">
                          {invoice.serie}-{invoice.folio}
                        </div>
                        {invoice.cfdiUuid && (
                          <div className="text-xs text-muted-foreground">
                            UUID: {invoice.cfdiUuid.slice(0, 8)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{invoice.customer.rfc}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(invoice.issuedAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? (
                          <div className="text-sm">
                            {format(new Date(invoice.dueDate), "PP", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No definida</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {formatCurrency(invoice.total)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOverdue(invoice) ? (
                          <Badge variant="destructive" data-testid={`status-overdue-${invoice.id}`}>Vencida</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800" data-testid={`status-active-${invoice.id}`}>Vigente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(invoice)}
                            disabled={isLoadingDetails}
                            title="Ver detalles"
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-menu-invoice-${invoice.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(invoice)}
                                data-testid={`menu-pdf-invoice-${invoice.id}`}
                              >
                                {isDownloading === invoice.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openSendEmailDialog(invoice)}
                                data-testid={`menu-email-invoice-${invoice.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Enviar por correo
                              </DropdownMenuItem>
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
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay facturas emitidas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Factura {selectedInvoice?.serie}-{selectedInvoice?.folio}
            </DialogTitle>
            <DialogDescription>
              Detalles completos de la factura
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h4>
                    <p className="font-medium">{selectedInvoice.customer.name}</p>
                    {selectedInvoice.customer.rfc && (
                      <p className="text-sm text-muted-foreground">{selectedInvoice.customer.rfc}</p>
                    )}
                    {selectedInvoice.customer.email && (
                      <p className="text-sm text-muted-foreground">{selectedInvoice.customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado</h4>
                    {isOverdue(selectedInvoice) ? (
                      <Badge variant="destructive">Vencida</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Vigente</Badge>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Emitida: {format(new Date(selectedInvoice.issuedAt), "PPP", { locale: es })}
                    </p>
                    {selectedInvoice.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        Vence: {format(new Date(selectedInvoice.dueDate), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* CFDI Info */}
                {selectedInvoice.cfdiUuid && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">UUID CFDI</h4>
                      <p className="font-mono text-sm">{selectedInvoice.cfdiUuid}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Método de Pago</h4>
                    <p>{selectedInvoice.paymentMethod || "Por definir"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Forma de Pago</h4>
                    <p>{selectedInvoice.paymentForm || "Por definir"}</p>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span>{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Notas</h4>
                      <p className="text-sm">{selectedInvoice.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}
              disabled={isDownloading === selectedInvoice?.id}
            >
              {isDownloading === selectedInvoice?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <AlertDialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Factura por Correo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se enviará la factura <strong>{selectedInvoice?.serie}-{selectedInvoice?.folio}</strong> al cliente{" "}
                  <strong>{selectedInvoice?.customer.name}</strong>.
                </p>
                {selectedInvoice?.customer.email ? (
                  <p className="text-sm">
                    El correo se enviará a: <strong>{selectedInvoice.customer.email}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    El cliente no tiene correo electrónico configurado.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSendEmail} 
              disabled={isSending || !selectedInvoice?.customer.email}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Factura
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
