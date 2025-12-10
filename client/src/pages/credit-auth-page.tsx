import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditAuthorization, Quotation, Customer } from "@shared/schema";
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
import { ClipboardCheck, CheckCircle2, XCircle, Eye, Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, CircleDollarSign, FileText, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

type CreditAuthWithDetails = CreditAuthorization & { 
  quotation: Quotation & { customer: Customer };
};

type AIAnalysis = {
  riskLevel: string;
  recommendation: string;
  score: number;
  summary: string;
  factors: {
    positive: string[];
    negative: string[];
  };
  conditions: string[];
  reasoning: string;
};

type AnalysisContext = {
  customer: {
    name: string;
    rfc: string;
    creditLimit: number;
    creditUsed: number;
    creditAvailable: number;
    paymentTerms: string;
    createdAt: string;
  };
  quotation: {
    folio: string;
    total: number;
    validUntil: string | null;
    customerApprovedAt: string | null;
  };
  history: {
    totalInvoices: number;
    overdueInvoicesCount: number;
    overdueAmount: number;
    totalPaid: number;
    recentPaymentsCount: number;
  };
  analysis: {
    exceedsCreditLimit: boolean;
    creditUtilization: string;
    hasOverdueBalance: boolean;
  };
};

export default function CreditAuthPage() {
  const [selectedAuth, setSelectedAuth] = useState<CreditAuthWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rulesAnalysis, setRulesAnalysis] = useState<AIAnalysis | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const { toast } = useToast();

  const { data: authorizations, isLoading } = useQuery<CreditAuthWithDetails[]>({
    queryKey: ["/api/credit-authorizations"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/credit-authorizations/${id}`, { status, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-authorizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setDetailsOpen(false);
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setSelectedAuth(null);
      setRulesAnalysis(null);
      setAiAnalysis(null);
      setAnalysisContext(null);
      toast({
        title: "Actualizado",
        description: "La autorización ha sido actualizada correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la autorización.",
        variant: "destructive",
      });
    },
  });

  const handleOpenDetails = async (auth: CreditAuthWithDetails) => {
    setSelectedAuth(auth);
    setRulesAnalysis(null);
    setAiAnalysis(null);
    setAnalysisContext(null);
    setDetailsOpen(true);
    
    // Auto-load rules-based analysis (free)
    setIsLoadingRules(true);
    try {
      const response = await fetch(`/api/credit-authorizations/${auth.id}/analyze-rules`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setRulesAnalysis(data.analysis);
        setAnalysisContext(data.context);
      }
    } catch (error) {
      console.error("Error loading rules analysis:", error);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleAnalyzeAI = async () => {
    if (!selectedAuth) return;
    setIsAnalyzingAI(true);
    try {
      const response = await apiRequest("POST", `/api/credit-authorizations/${selectedAuth.id}/analyze`, {});
      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
        setAnalysisContext(data.context);
        toast({
          title: "Análisis IA completado",
          description: "El análisis avanzado con IA está listo.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo realizar el análisis de IA.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Use AI analysis if available, otherwise use rules analysis
  const currentAnalysis = aiAnalysis || rulesAnalysis;

  const handleApprove = () => {
    if (!selectedAuth) return;
    updateMutation.mutate({ 
      id: selectedAuth.id, 
      status: "approved",
      notes: currentAnalysis ? `Análisis: ${currentAnalysis.summary}` : undefined,
    });
  };

  const handleReject = () => {
    if (!selectedAuth) return;
    updateMutation.mutate({ 
      id: selectedAuth.id, 
      status: "rejected",
      notes: rejectionNotes || (currentAnalysis ? `Análisis: ${currentAnalysis.summary}` : undefined),
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      approved: { label: "Aprobada", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      rejected: { label: "Rechazada", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const getRiskBadge = (riskLevel: string) => {
    const config: Record<string, { label: string; className: string }> = {
      bajo: { label: "Riesgo Bajo", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      medio: { label: "Riesgo Medio", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      alto: { label: "Riesgo Alto", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      muy_alto: { label: "Riesgo Muy Alto", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    };
    const c = config[riskLevel] || { label: riskLevel, className: "bg-gray-100 text-gray-800" };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getRecommendationBadge = (rec: string) => {
    const config: Record<string, { label: string; className: string }> = {
      aprobar: { label: "Aprobar", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      aprobar_con_condiciones: { label: "Aprobar con Condiciones", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      rechazar: { label: "Rechazar", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      revisar_manualmente: { label: "Revisar Manualmente", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    };
    const c = config[rec] || { label: rec, className: "bg-gray-100 text-gray-800" };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Autorización de Crédito</h1>
        <p className="text-muted-foreground mt-1">
          Revisa y autoriza cotizaciones según límites de crédito
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren revisión
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "approved").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authorizations?.filter((a) => a.status === "rejected").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Autorización</CardTitle>
          <CardDescription>
            {authorizations?.length || 0} solicitudes registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : authorizations && authorizations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Folio Cotización</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Crédito Disponible</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authorizations.map((auth) => (
                    <TableRow key={auth.id} className="hover-elevate" data-testid={`row-auth-${auth.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(auth.createdAt), "PP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{auth.quotation.customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {auth.quotation.customer.rfc}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{auth.quotation.folio}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          ${parseFloat(auth.quotation.total).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">
                          ${parseFloat(auth.creditAvailable || "0").toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(auth.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(auth)}
                            data-testid={`button-view-${auth.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay solicitudes de autorización</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Autorización de Crédito - {selectedAuth?.quotation.folio}
            </DialogTitle>
            <DialogDescription>
              Revisa los detalles y realiza un análisis con IA antes de autorizar
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Customer & Quotation Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{selectedAuth?.quotation.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RFC:</span>
                      <span className="font-mono">{selectedAuth?.quotation.customer.rfc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Límite de Crédito:</span>
                      <span className="font-medium">
                        ${parseFloat(selectedAuth?.quotation.customer.creditLimit || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4" />
                      Información de Crédito
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto Cotización:</span>
                      <span className="font-medium text-primary">
                        ${parseFloat(selectedAuth?.quotation.total || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crédito Disponible:</span>
                      <span className="font-medium">
                        ${parseFloat(selectedAuth?.creditAvailable || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crédito Utilizado:</span>
                      <span>
                        ${parseFloat(selectedAuth?.creditUsed || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      {selectedAuth && getStatusBadge(selectedAuth.status)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Análisis de Crédito
                    {aiAnalysis && <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">IA</Badge>}
                    {rulesAnalysis && !aiAnalysis && <Badge variant="outline">Automático</Badge>}
                  </h3>
                  {!aiAnalysis && (
                    <Button 
                      onClick={handleAnalyzeAI} 
                      disabled={isAnalyzingAI || isLoadingRules}
                      variant="outline"
                      size="sm"
                      data-testid="button-analyze-ai"
                    >
                      {isAnalyzingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Análisis IA (Avanzado)
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isLoadingRules && (
                  <Card>
                    <CardContent className="py-8">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">Analizando información del cliente...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentAnalysis && !isLoadingRules && (
                  <div className="space-y-4">
                    {/* Score and Recommendation */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Score de Crédito</p>
                            <div className="text-4xl font-bold text-primary">{currentAnalysis.score}</div>
                            <Progress value={currentAnalysis.score} className="mt-2" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Nivel de Riesgo</p>
                            <div className="mt-2">{getRiskBadge(currentAnalysis.riskLevel)}</div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Recomendación</p>
                            <div className="mt-2">{getRecommendationBadge(currentAnalysis.recommendation)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Summary */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resumen Ejecutivo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{currentAnalysis.summary}</p>
                      </CardContent>
                    </Card>

                    {/* Factors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            Factores Positivos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm">
                            {currentAnalysis.factors.positive.length > 0 ? (
                              currentAnalysis.factors.positive.map((factor, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                  <span>{factor}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-muted-foreground">No se identificaron factores positivos</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                            <TrendingDown className="h-4 w-4" />
                            Factores de Riesgo
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm">
                            {currentAnalysis.factors.negative.length > 0 ? (
                              currentAnalysis.factors.negative.map((factor, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                  <span>{factor}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-muted-foreground">No se identificaron factores de riesgo</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Conditions */}
                    {currentAnalysis.conditions && currentAnalysis.conditions.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            Condiciones Recomendadas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm">
                            {currentAnalysis.conditions.map((condition, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-600">•</span>
                                <span>{condition}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Detailed Reasoning */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Análisis Detallado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentAnalysis.reasoning}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Cerrar
            </Button>
            {selectedAuth?.status === "pending" && (
              <>
                <Button 
                  variant="outline" 
                  className="text-red-600"
                  onClick={() => setRejectDialogOpen(true)}
                  data-testid="button-reject-detail"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setApproveDialogOpen(true)}
                  data-testid="button-approve-detail"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas aprobar esta solicitud de crédito para la cotización{" "}
              <strong>{selectedAuth?.quotation.folio}</strong>?
              {currentAnalysis && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>Análisis:</strong> {currentAnalysis.summary}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Aprobar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  ¿Estás seguro de que deseas rechazar esta solicitud de crédito para la cotización{" "}
                  <strong>{selectedAuth?.quotation.folio}</strong>?
                </p>
                <div>
                  <label className="text-sm font-medium">Notas de rechazo (opcional):</label>
                  <Textarea 
                    placeholder="Ingresa el motivo del rechazo..."
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    className="mt-2"
                    data-testid="input-rejection-notes"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={updateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Rechazar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
