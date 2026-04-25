import { useState } from "react";
import { Quotation, Customer, QuotationStatus, InsertQuotation, InsertQuotationItem, QuotationItem, Product } from "@shared/schema";
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
import { Plus, FileText, Clock, CheckCircle, AlertTriangle, XCircle, Send, ShoppingCart, Download, Mail, Loader2, Eye, Pencil, MoreHorizontal, Copy, Truck, Check, X, UserPlus, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type QuotationWithDetails = Quotation & { 
  customer: Customer; 
  items?: QuotationItem[];
};

export default function QuotationsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [shippingRejectDialogOpen, setShippingRejectDialogOpen] = useState(false);
  const [shippingRejectReason, setShippingRejectReason] = useState("");
  const [isProcessingShipping, setIsProcessingShipping] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: quotations, isLoading, dataUpdatedAt } = useEntityQuery<QuotationWithDetails[]>(
    "/api/quotations",
    { refetchInterval: 20000 }
  );

  const { data: customers } = useEntityQuery<Customer[]>("/api/customers");
  const { data: products } = useEntityQuery<Product[]>("/api/products");

  const createQuotationMutation = useEntityMutation<Quotation, InsertQuotation & { items: InsertQuotationItem[] }>({
    endpoint: "/api/quotations",
    method: "POST",
    successMessage: "Cotización creada exitosamente",
    invalidateQueries: ["/api/quotations"],
    onSuccessCallback: () => setCreateDialogOpen(false),
  });

  const updateQuotationMutation = useEntityMutation<Quotation, Partial<InsertQuotation> & { items?: InsertQuotationItem[] }>({
    endpoint: selectedQuotation ? `/api/quotations/${selectedQuotation.id}` : "/api/quotations",
    method: "PATCH",
    successMessage: "Cotización actualizada exitosamente",
    invalidateQueries: ["/api/quotations"],
    onSuccessCallback: () => {
      setEditDialogOpen(false);
      setSelectedQuotation(null);
    },
  });

  const handleViewDetails = async (quotation: QuotationWithDetails) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedQuotation(data);
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

  const handleEdit = async (quotation: QuotationWithDetails) => {
    if (quotation.status !== QuotationStatus.DRAFT) {
      toast({
        title: "No se puede editar",
        description: "Solo se pueden editar cotizaciones en estado Borrador",
        variant: "destructive",
      });
      return;
    }
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedQuotation(data);
      setEditDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles para editar",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

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

  const [approvalLinkDialogOpen, setApprovalLinkDialogOpen] = useState(false);
  const [approvalLink, setApprovalLink] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    if (emailList.includes(email)) { setEmailInput(""); return; }
    setEmailList(prev => [...prev, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setEmailList(prev => prev.filter(e => e !== email));
  };

  const handleSendEmail = async () => {
    if (!selectedQuotation) return;
    if (emailList.length === 0) return;
    setIsSending(true);
    try {
      const response = await apiRequest("POST", `/api/quotations/${selectedQuotation.id}/send-email`, {
        emails: emailList,
      });
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-authorizations"] });
      setSendEmailDialogOpen(false);
      setSelectedQuotation(null);

      // If email failed but we have approval URL, show the link dialog
      if (data.warning && data.approvalUrl) {
        setApprovalLink(data.approvalUrl);
        setApprovalLinkDialogOpen(true);
        toast({
          title: "Enlace generado",
          description: "El correo no pudo enviarse. Copia el enlace para compartirlo.",
        });
      } else {
        toast({
          title: "Cotización enviada",
          description: data.message,
        });
      }
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

  const copyApprovalLink = () => {
    navigator.clipboard.writeText(approvalLink);
    toast({
      title: "Enlace copiado",
      description: "El enlace de aprobación ha sido copiado al portapapeles",
    });
  };

  const handleApproveShipping = async (quotation: QuotationWithDetails) => {
    setIsProcessingShipping(quotation.id);
    try {
      const response = await apiRequest("POST", `/api/quotations/${quotation.id}/approve-shipping`);
      const result = await response.json();
      
      toast({
        title: "Envío aprobado",
        description: result.message || "Se ha aprobado el envío sin costo",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo aprobar el envío",
        variant: "destructive",
      });
    } finally {
      setIsProcessingShipping(null);
    }
  };

  const handleRejectShipping = async () => {
    if (!selectedQuotation) return;
    
    setIsProcessingShipping(selectedQuotation.id);
    try {
      const response = await apiRequest("POST", `/api/quotations/${selectedQuotation.id}/reject-shipping`, {
        reason: shippingRejectReason,
      });
      const result = await response.json();
      
      toast({
        title: "Envío rechazado",
        description: result.message || "Se ha rechazado el envío sin costo",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setShippingRejectDialogOpen(false);
      setShippingRejectReason("");
      setSelectedQuotation(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar el envío",
        variant: "destructive",
      });
    } finally {
      setIsProcessingShipping(null);
    }
  };

  const openShippingRejectDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    setShippingRejectDialogOpen(true);
  };

  const openSendEmailDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    const initialEmails: string[] = [];
    if (quotation.customer?.email) initialEmails.push(quotation.customer.email.toLowerCase());
    setEmailList(initialEmails);
    setEmailInput("");
    setSendEmailDialogOpen(true);
  };

  const handleCopyApprovalLink = (quotation: QuotationWithDetails) => {
    const token = (quotation as any).approvalToken;
    if (!token) {
      toast({ title: "Sin enlace", description: "Esta cotización aún no tiene un enlace generado. Envíala primero por correo.", variant: "destructive" });
      return;
    }
    const link = `${window.location.origin}/aprobar-cotizacion/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Enlace copiado", description: "El enlace de aprobación fue copiado al portapapeles." });
    }).catch(() => {
      toast({ title: "Error", description: "No se pudo copiar. Enlace: " + link, variant: "destructive" });
    });
  };

  const formatCurrency = (value: string | number, currency: string = "MXN") => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  const PAYMENT_TERMS_LABELS: Record<string, string> = {
    contado: "Contado",
    "15_dias": "15 días",
    "30_dias": "30 días",
    "45_dias": "45 días",
    "60_dias": "60 días",
  };

  const DELIVERY_TIME_LABELS: Record<string, string> = {
    inmediato: "Inmediato",
    "1_semana": "1 semana",
    "2_semanas": "2 semanas",
    "3_semanas": "3 semanas",
    "1_mes": "1 mes",
    por_confirmar: "Por confirmar",
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
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-quotation">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Todas las Cotizaciones
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Actualización automática cada 20 segundos" />
          </CardTitle>
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
                        <div className="font-medium">{quotation.customer?.name || "Sin cliente"}</div>
                        <div className="text-xs text-muted-foreground">{quotation.customer?.rfc || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(quotation.createdAt), "PPP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium font-mono">
                          {formatCurrency(quotation.total, quotation.currency || "MXN")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {quotation.currency || "MXN"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(quotation.status)}
                          {(quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending" && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                              <Truck className="h-3 w-3 mr-1" />
                              Envío pendiente
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
                            onClick={() => handleViewDetails(quotation)}
                            disabled={isLoadingDetails}
                            title="Ver detalles"
                            data-testid={`button-view-quotation-${quotation.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {quotation.status === QuotationStatus.DRAFT && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(quotation)}
                              disabled={isLoadingDetails}
                              title="Editar"
                              data-testid={`button-edit-quotation-${quotation.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-menu-quotation-${quotation.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(quotation)}
                                data-testid={`menu-pdf-quotation-${quotation.id}`}
                              >
                                {isDownloading === quotation.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Descargar PDF
                              </DropdownMenuItem>
                              {quotation.status !== QuotationStatus.CONVERTED && (() => {
                                const shippingPending = (quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending";
                                return (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={shippingPending ? undefined : () => openSendEmailDialog(quotation)}
                                      disabled={shippingPending}
                                      data-testid={`menu-email-quotation-${quotation.id}`}
                                      title={shippingPending ? "El envío a cargo de la empresa debe ser aprobado por el administrador antes de enviar al cliente" : undefined}
                                      className={shippingPending ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {shippingPending ? <Lock className="h-4 w-4 mr-2 text-amber-500" /> : <Mail className="h-4 w-4 mr-2" />}
                                      <span>Enviar por correo</span>
                                      {shippingPending && <span className="ml-auto text-xs text-amber-500">Pendiente</span>}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={shippingPending ? undefined : () => handleCopyApprovalLink(quotation)}
                                      disabled={shippingPending}
                                      data-testid={`menu-copy-link-quotation-${quotation.id}`}
                                      title={shippingPending ? "El envío a cargo de la empresa debe ser aprobado por el administrador antes de compartir el enlace" : undefined}
                                      className={shippingPending ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {shippingPending ? <Lock className="h-4 w-4 mr-2 text-amber-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                      <span>Copiar enlace de aprobación</span>
                                      {shippingPending && <span className="ml-auto text-xs text-amber-500">Pendiente</span>}
                                    </DropdownMenuItem>
                                  </>
                                );
                              })()}
                              {isAdmin && (quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleApproveShipping(quotation)}
                                    disabled={isProcessingShipping === quotation.id}
                                    data-testid={`menu-approve-shipping-${quotation.id}`}
                                    className="text-green-600"
                                  >
                                    {isProcessingShipping === quotation.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Aprobar Envío Gratis
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openShippingRejectDialog(quotation)}
                                    disabled={isProcessingShipping === quotation.id}
                                    data-testid={`menu-reject-shipping-${quotation.id}`}
                                    className="text-destructive"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Rechazar Envío Gratis
                                  </DropdownMenuItem>
                                </>
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
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-add-first-quotation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Cotización
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <QuotationForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createQuotationMutation.mutate}
        isPending={createQuotationMutation.isPending}
        customers={customers || []}
        userId={user?.id}
      />

      {/* Edit Quotation Dialog */}
      {selectedQuotation && (
        <QuotationForm
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedQuotation(null);
          }}
          onSubmit={(data) => updateQuotationMutation.mutate(data)}
          isPending={updateQuotationMutation.isPending}
          customers={customers || []}
          userId={user?.id}
          initialData={selectedQuotation}
          isEditing
        />
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cotización {selectedQuotation?.folio}
            </DialogTitle>
            <DialogDescription>
              Detalles completos de la cotización
            </DialogDescription>
          </DialogHeader>

          {selectedQuotation && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h4>
                    <p className="font-medium">{selectedQuotation.customer?.name || "Sin cliente"}</p>
                    {selectedQuotation.customer?.rfc && (
                      <p className="text-sm text-muted-foreground">{selectedQuotation.customer.rfc}</p>
                    )}
                    {selectedQuotation.customer?.email && (
                      <p className="text-sm text-muted-foreground">{selectedQuotation.customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado</h4>
                    {getStatusBadge(selectedQuotation.status)}
                    <p className="text-sm text-muted-foreground mt-1">
                      Creada: {format(new Date(selectedQuotation.createdAt), "PPP", { locale: es })}
                    </p>
                    {selectedQuotation.validUntil && (
                      <p className="text-sm text-muted-foreground">
                        Vigente hasta: {format(new Date(selectedQuotation.validUntil), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Commercial Conditions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Moneda</h4>
                    <p>{selectedQuotation.currency || "MXN"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Condiciones de Pago</h4>
                    <p>{selectedQuotation.paymentTerms ? PAYMENT_TERMS_LABELS[selectedQuotation.paymentTerms] || selectedQuotation.paymentTerms : "No especificado"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Tiempo de Entrega</h4>
                    <p>{selectedQuotation.deliveryTime ? DELIVERY_TIME_LABELS[selectedQuotation.deliveryTime] || selectedQuotation.deliveryTime : "No especificado"}</p>
                  </div>
                </div>

                {/* Shipping Info */}
                {(selectedQuotation as any).shippingHandledByJoper && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                    <Truck className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">Envío por cuenta de Joper</p>
                      {(selectedQuotation as any).shippingApprovalStatus === "pending" && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600 mt-1">
                          Pendiente de aprobación
                        </Badge>
                      )}
                      {(selectedQuotation as any).shippingApprovalStatus === "approved" && (
                        <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
                          Aprobado
                        </Badge>
                      )}
                      {(selectedQuotation as any).shippingApprovalStatus === "rejected" && (
                        <Badge variant="destructive" className="mt-1">
                          Rechazado
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Products Table */}
                {(() => {
                  const items = selectedQuotation.items ?? [];
                  const mxnItems = items.filter(i => (i.currency || "MXN") === "MXN");
                  const usdItems = items.filter(i => i.currency === "USD");
                  const hasMixed = mxnItems.length > 0 && usdItems.length > 0;
                  const discPct = parseFloat(selectedQuotation.globalDiscount || "0");

                  const calcT = (its: typeof items) => {
                    const sub = its.reduce((s, i) => s + parseFloat(i.subtotal), 0);
                    const disc = discPct > 0 ? sub * (discPct / 100) : 0;
                    const after = sub - disc;
                    return { sub, disc, tax: after * 0.16, total: after * 1.16 };
                  };
                  const mxnT = calcT(mxnItems);
                  const usdT = calcT(usdItems);

                  const fmtMXN2 = (v: number | string) => formatCurrency(v, "MXN");
                  const fmtUSD2 = (v: number | string) => formatCurrency(v, "USD");

                  return (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Productos</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Cantidad</TableHead>
                                <TableHead className="text-right">P. Unitario</TableHead>
                                <TableHead className="text-center">Desc %</TableHead>
                                {hasMixed && <TableHead className="text-center">Mon.</TableHead>}
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item) => {
                                const cur = item.currency || "MXN";
                                const fmt = cur === "USD" ? fmtUSD2 : fmtMXN2;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.productCode || "-"}</TableCell>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-center">{parseFloat(item.quantity)}</TableCell>
                                    <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                                    <TableCell className="text-center">{parseFloat(item.discountPercent || "0").toFixed(1)}%</TableCell>
                                    {hasMixed && (
                                      <TableCell className="text-center">
                                        <Badge variant={cur === "USD" ? "secondary" : "outline"} className="text-xs">
                                          {cur}
                                        </Badge>
                                      </TableCell>
                                    )}
                                    <TableCell className="text-right font-medium">{fmt(item.subtotal)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Totals */}
                      {hasMixed ? (
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                          {/* MXN box */}
                          <div className="w-full sm:w-64 rounded-md border overflow-hidden">
                            <div className="bg-primary px-3 py-1.5">
                              <p className="text-xs font-semibold text-primary-foreground uppercase tracking-wide">Pesos (MXN)</p>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span>{fmtMXN2(mxnT.sub)}</span></div>
                              {mxnT.disc > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desc. ({discPct}%):</span><span>-{fmtMXN2(mxnT.disc)}</span></div>}
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (16%):</span><span>{fmtMXN2(mxnT.tax)}</span></div>
                              <Separator />
                              <div className="flex justify-between font-bold"><span>Total MXN:</span><span>{fmtMXN2(mxnT.total)}</span></div>
                            </div>
                          </div>
                          {/* USD box */}
                          <div className="w-full sm:w-64 rounded-md border overflow-hidden">
                            <div className="bg-emerald-700 px-3 py-1.5">
                              <p className="text-xs font-semibold text-white uppercase tracking-wide">Dólares (USD)</p>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span>{fmtUSD2(usdT.sub)}</span></div>
                              {usdT.disc > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desc. ({discPct}%):</span><span>-{fmtUSD2(usdT.disc)}</span></div>}
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (16%):</span><span>{fmtUSD2(usdT.tax)}</span></div>
                              <Separator />
                              <div className="flex justify-between font-bold"><span>Total USD:</span><span>{fmtUSD2(usdT.total)}</span></div>
                            </div>
                            <div className="px-3 pb-2">
                              <p className="text-xs text-muted-foreground">Tipo de cambio a convenir al momento del pedido.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span>{formatCurrency(selectedQuotation.subtotal, selectedQuotation.currency || "MXN")}</span>
                            </div>
                            {parseFloat(selectedQuotation.globalDiscount || "0") > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>Descuento Global ({selectedQuotation.globalDiscount}%):</span>
                                <span>-{formatCurrency(parseFloat(selectedQuotation.subtotal) * (parseFloat(selectedQuotation.globalDiscount || "0") / 100), selectedQuotation.currency || "MXN")}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">IVA:</span>
                              <span>{formatCurrency(selectedQuotation.tax, selectedQuotation.currency || "MXN")}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total:</span>
                              <span>{formatCurrency(selectedQuotation.total, selectedQuotation.currency || "MXN")}</span>
                            </div>
                            {parseFloat(selectedQuotation.totalSavings || "0") > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>Ahorro total:</span>
                                <span>{formatCurrency(selectedQuotation.totalSavings || "0", selectedQuotation.currency || "MXN")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Notes */}
                {(selectedQuotation.notes || selectedQuotation.conditions) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {selectedQuotation.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Notas</h4>
                          <p className="text-sm">{selectedQuotation.notes}</p>
                        </div>
                      )}
                      {selectedQuotation.conditions && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Condiciones</h4>
                          <p className="text-sm">{selectedQuotation.conditions}</p>
                        </div>
                      )}
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
              onClick={() => selectedQuotation && handleDownloadPDF(selectedQuotation)}
              disabled={isDownloading === selectedQuotation?.id}
            >
              {isDownloading === selectedQuotation?.id ? (
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
      <Dialog open={sendEmailDialogOpen} onOpenChange={(open) => {
        if (!isSending) setSendEmailDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Cotización por Correo
            </DialogTitle>
            <DialogDescription>
              Cotización <strong>{selectedQuotation?.folio}</strong> —{" "}
              {selectedQuotation?.customer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Recipients list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destinatarios</Label>
              {emailList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Agrega al menos un correo destinatario.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[48px]">
                  {emailList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border text-sm"
                      data-testid={`chip-email-${email}`}
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                        data-testid={`remove-email-${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add email input */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Agregar correo</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  disabled={isSending}
                  data-testid="input-add-email"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmail}
                  disabled={isSending || !emailInput.trim()}
                  data-testid="button-add-email"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Presiona Enter o el botón para agregar. Puedes agregar múltiples correos.
              </p>
            </div>

            {/* Info box */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                El correo incluirá el PDF de la cotización con un enlace para que el cliente la apruebe.
                Al enviar, la cotización pasará a proceso de autorización.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendEmailDialogOpen(false)}
              disabled={isSending}
              data-testid="button-cancel-send-email"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending || emailList.length === 0}
              data-testid="button-confirm-send-email"
            >
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Link Dialog - shown when email fails */}
      <Dialog open={approvalLinkDialogOpen} onOpenChange={setApprovalLinkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enlace de Aprobación Generado</DialogTitle>
            <DialogDescription>
              El correo no pudo enviarse, pero el enlace de aprobación está listo. 
              Copia este enlace y envíalo al cliente por WhatsApp u otro medio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input 
                value={approvalLink} 
                readOnly 
                className="flex-1 text-sm"
                data-testid="input-approval-link"
              />
              <Button onClick={copyApprovalLink} variant="outline" data-testid="button-copy-link">
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Al abrir este enlace, el cliente podrá ver la cotización y aprobarla o rechazarla.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setApprovalLinkDialogOpen(false)} data-testid="button-close-link-dialog">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Rejection Dialog */}
      <AlertDialog open={shippingRejectDialogOpen} onOpenChange={setShippingRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Rechazar Envío Gratuito
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  ¿Estás seguro de rechazar el envío gratuito para la cotización{" "}
                  <strong>{selectedQuotation?.folio}</strong>?
                </p>
                <div>
                  <label className="text-sm font-medium">Motivo del rechazo:</label>
                  <Input
                    value={shippingRejectReason}
                    onChange={(e) => setShippingRejectReason(e.target.value)}
                    placeholder="Ingresa el motivo del rechazo..."
                    className="mt-2"
                    data-testid="input-shipping-reject-reason"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  La cotización regresará a <strong>Borrador</strong> y se enviará un correo al vendedor con el motivo del rechazo para que retrabaje su propuesta.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShippingRejectReason("");
                setSelectedQuotation(null);
              }}
              disabled={isProcessingShipping !== null}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectShipping} 
              disabled={isProcessingShipping !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessingShipping !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Rechazar Envío
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
