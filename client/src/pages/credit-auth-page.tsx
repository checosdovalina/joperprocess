import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditAuthorization, Quotation, Customer, User, CreditAuthorizationComment } from "@shared/schema";
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
import { ClipboardCheck, CheckCircle2, XCircle, Eye, EyeOff, Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, CircleDollarSign, FileText, Building2, MessageSquare, Send, PenLine, User2, Download } from "lucide-react";
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

type CommentWithUser = CreditAuthorizationComment & {
  user: User;
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
  const [newComment, setNewComment] = useState("");
  const [approvalSignature, setApprovalSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hideResolved, setHideResolved] = useState(true);
  const { toast } = useToast();

  const { data: authorizations, isLoading } = useQuery<CreditAuthWithDetails[]>({
    queryKey: ["/api/credit-authorizations"],
  });

  // Load comments when auth is selected
  const { data: comments, refetch: refetchComments } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/credit-authorizations", selectedAuth?.id, "comments"],
    queryFn: async () => {
      if (!selectedAuth) return [];
      const response = await fetch(`/api/credit-authorizations/${selectedAuth.id}/comments`, {
        credentials: "include",
      });
      return response.json();
    },
    enabled: !!selectedAuth,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await apiRequest("POST", `/api/credit-authorizations/${id}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      refetchComments();
      setNewComment("");
      toast({
        title: "Comentario agregado",
        description: "El comentario se ha guardado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes, approvalSignature, rejectionNotes }: { 
      id: string; 
      status: string; 
      notes?: string;
      approvalSignature?: string;
      rejectionNotes?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/credit-authorizations/${id}`, { 
        status, 
        notes,
        approvalSignature,
        rejectionNotes,
      });
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

  // Canvas signature functions
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setApprovalSignature(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    setApprovalSignature(null);
    initCanvas();
  };

  const handleAddComment = () => {
    if (!selectedAuth || !newComment.trim()) return;
    addCommentMutation.mutate({ id: selectedAuth.id, content: newComment.trim() });
  };

  const handleApprove = () => {
    if (!selectedAuth) return;
    if (!approvalSignature) {
      toast({
        title: "Firma requerida",
        description: "Por favor, firme en el recuadro antes de aprobar.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ 
      id: selectedAuth.id, 
      status: "approved",
      notes: currentAnalysis ? `Análisis: ${currentAnalysis.summary}` : undefined,
      approvalSignature,
    });
  };

  const handleReject = () => {
    if (!selectedAuth) return;
    updateMutation.mutate({ 
      id: selectedAuth.id, 
      status: "rejected",
      notes: currentAnalysis ? `Análisis: ${currentAnalysis.summary}` : undefined,
      rejectionNotes: rejectionNotes || undefined,
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Solicitudes de Autorización</CardTitle>
              <CardDescription>
                {(() => {
                  const resolved = authorizations?.filter(a => a.status === "approved" || a.status === "rejected").length ?? 0;
                  const visible = hideResolved ? (authorizations?.filter(a => a.status === "pending").length ?? 0) : (authorizations?.length ?? 0);
                  return <>
                    {visible} de {authorizations?.length || 0} solicitudes
                    {hideResolved && resolved > 0 && <span className="ml-1">({resolved} resuelta{resolved !== 1 ? "s" : ""} oculta{resolved !== 1 ? "s" : ""})</span>}
                  </>;
                })()}
              </CardDescription>
            </div>
            {(authorizations?.filter(a => a.status === "approved" || a.status === "rejected").length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setHideResolved(v => !v)} data-testid="button-toggle-resolved">
                {hideResolved ? <><Eye className="h-4 w-4 mr-2" />Mostrar resueltas</> : <><EyeOff className="h-4 w-4 mr-2" />Ocultar resueltas</>}
              </Button>
            )}
          </div>
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
                  {(hideResolved ? authorizations.filter(a => a.status === "pending") : authorizations).map((auth) => (
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

              <Separator />

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Comentarios ({comments?.length || 0})
                </h3>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Agregar un comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 min-h-[60px]"
                    data-testid="input-new-comment"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    size="icon"
                    data-testid="button-add-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments && comments.length > 0 ? (
                    comments.map((comment) => (
                      <Card key={comment.id} className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="bg-primary/10 rounded-full p-1.5">
                            <User2 className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{comment.user?.fullName || "Usuario"}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay comentarios aún
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedAuth) {
                  window.open(`/api/credit-authorizations/${selectedAuth.id}/pdf`, '_blank');
                }
              }}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
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

      {/* Approve Confirmation Dialog with Signature */}
      <AlertDialog open={approveDialogOpen} onOpenChange={(open) => {
        setApproveDialogOpen(open);
        if (open) {
          setApprovalSignature(null);
          setTimeout(initCanvas, 100);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  ¿Estás seguro de que deseas aprobar esta solicitud de crédito para la cotización{" "}
                  <strong>{selectedAuth?.quotation.folio}</strong>?
                </p>
                {currentAnalysis && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm">
                      <strong>Análisis:</strong> {currentAnalysis.summary}
                    </p>
                  </div>
                )}
                
                {/* Signature Canvas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <PenLine className="h-4 w-4" />
                      Firma Digital (Requerida)
                    </label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSignature}
                      type="button"
                    >
                      Limpiar
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden bg-white">
                    <canvas
                      ref={canvasRef}
                      width={350}
                      height={120}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      data-testid="canvas-signature"
                    />
                  </div>
                  {!approvalSignature && (
                    <p className="text-xs text-muted-foreground">
                      Dibuje su firma en el recuadro para confirmar la aprobación
                    </p>
                  )}
                  {approvalSignature && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Firma capturada
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              disabled={updateMutation.isPending || !approvalSignature}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Aprobar con Firma"
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
