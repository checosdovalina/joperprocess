import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User2,
  Building2,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

type PublicComment = {
  id: string;
  content: string;
  visibility: string;
  isFromCustomer: boolean;
  createdAt: Date;
  user: { fullName: string } | null;
};

type PublicIncident = {
  id: string;
  ticketNumber: string;
  type: string;
  status: string;
  urgency: string;
  subject: string;
  description: string;
  resolution: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  customer: { name: string };
  assignee: { fullName: string } | null;
  comments: PublicComment[];
};

const typeLabels: Record<string, string> = {
  garantia: "Garantía",
  retrabajo: "Retrabajo",
  queja: "Queja",
  consulta: "Consulta",
  administrativo: "Administrativo",
};

const statusLabels: Record<string, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_proceso: "En Proceso",
  esperando_cliente: "Esperando tu Respuesta",
  esperando_interno: "En Revisión",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

const urgencyLabels: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    nuevo: "default",
    asignado: "secondary",
    en_proceso: "default",
    esperando_cliente: "outline",
    esperando_interno: "outline",
    resuelto: "secondary",
    cerrado: "secondary",
    cancelado: "destructive",
  };

  const icons: Record<string, typeof Clock> = {
    nuevo: AlertCircle,
    asignado: User2,
    en_proceso: Clock,
    esperando_cliente: AlertTriangle,
    esperando_interno: Clock,
    resuelto: CheckCircle2,
    cerrado: CheckCircle2,
    cancelado: XCircle,
  };

  const Icon = icons[status] || Clock;

  return (
    <Badge variant={variants[status] || "default"} className="gap-1">
      <Icon className="h-3 w-3" />
      {statusLabels[status] || status}
    </Badge>
  );
}

function getTypeBadge(type: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    garantia: "destructive",
    retrabajo: "destructive",
    queja: "outline",
    consulta: "secondary",
    administrativo: "secondary",
  };

  return (
    <Badge variant={variants[type] || "secondary"}>
      {typeLabels[type] || type}
    </Badge>
  );
}

function getUrgencyBadge(urgency: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    baja: "secondary",
    media: "outline",
    alta: "default",
    critica: "destructive",
  };

  return (
    <Badge variant={variants[urgency] || "secondary"}>
      {urgencyLabels[urgency] || urgency}
    </Badge>
  );
}

export default function PublicIncidentPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const { data: incident, isLoading, error, refetch } = useQuery<PublicIncident>({
    queryKey: ["/api/public/incidents", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/incidents/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al cargar el incidente");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/public/incidents/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al enviar comentario");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
      toast({
        title: "Comentario enviado",
        description: "Tu comentario ha sido registrado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmCloseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/public/incidents/${token}/confirm-close`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al confirmar cierre");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setConfirmCloseOpen(false);
      toast({
        title: "Incidente cerrado",
        description: "Has confirmado el cierre del incidente. Gracias por tu colaboración.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Incidente no disponible</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "El enlace puede haber expirado o el incidente no existe."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canComment = incident.status !== "cerrado" && incident.status !== "cancelado";
  const canConfirmClose = incident.status === "resuelto";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <span className="font-semibold">Portal de Seguimiento de Incidentes</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-mono" data-testid="text-ticket-number">
              {incident.ticketNumber}
            </h1>
            {getStatusBadge(incident.status)}
          </div>
          <p className="text-lg text-muted-foreground">{incident.subject}</p>
        </div>

        {/* Status Alert for Waiting Customer */}
        {incident.status === "esperando_cliente" && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Se requiere tu respuesta</p>
                  <p className="text-sm text-muted-foreground">
                    Por favor, agrega un comentario con la información solicitada para continuar con tu caso.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolution Banner */}
        {incident.resolution && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium mb-2">Resolución</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.resolution}</p>
                  {incident.resolvedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resuelto el {format(new Date(incident.resolvedAt), "PPP 'a las' HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirm Close Button */}
        {canConfirmClose && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">¿El problema fue resuelto?</p>
                  <p className="text-sm text-muted-foreground">
                    Confirma si la resolución es satisfactoria para cerrar el incidente.
                  </p>
                </div>
                <Button onClick={() => setConfirmCloseOpen(true)} data-testid="button-confirm-close">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Cierre
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Tipo</span>
                <div className="mt-1">{getTypeBadge(incident.type)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Urgencia</span>
                <div className="mt-1">{getUrgencyBadge(incident.urgency)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Asignado a</span>
                <p className="text-sm mt-1">{incident.assignee?.fullName || "En espera de asignación"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Fecha</span>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(incident.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-xs text-muted-foreground">Descripción</span>
              <p className="text-sm mt-2 whitespace-pre-wrap">{incident.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversación
            </CardTitle>
            <CardDescription>
              Historial de comunicación sobre tu incidente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4 mb-4">
              {incident.comments?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay mensajes aún. Sé el primero en escribir.
                </p>
              ) : (
                <div className="space-y-4">
                  {incident.comments?.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.isFromCustomer
                          ? "bg-primary/10 ml-4 border-l-2 border-primary"
                          : "bg-muted/50 mr-4"
                      }`}
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User2 className="h-3 w-3" />
                          <span className="text-sm font-medium">
                            {comment.isFromCustomer ? "Tú" : comment.user?.fullName || "Equipo de Soporte"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "dd/MM/yy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {canComment && (
              <div className="space-y-3 border-t pt-4">
                <Textarea
                  placeholder="Escribe tu mensaje aquí..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  data-testid="input-comment"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-send-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar Mensaje
                  </Button>
                </div>
              </div>
            )}

            {!canComment && (
              <div className="text-center py-4 text-muted-foreground border-t">
                Este incidente está cerrado y no se pueden agregar más comentarios.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-6 border-t">
          <p>Si tienes alguna pregunta, no dudes en agregar un comentario.</p>
          <p className="mt-1">Nuestro equipo responderá lo antes posible.</p>
        </div>
      </div>

      {/* Confirm Close Dialog */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cierre del incidente</AlertDialogTitle>
            <AlertDialogDescription>
              Al confirmar, indicarás que el problema fue resuelto satisfactoriamente y el incidente será cerrado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCloseMutation.mutate()}
              disabled={confirmCloseMutation.isPending}
            >
              {confirmCloseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
