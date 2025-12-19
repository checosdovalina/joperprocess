import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  HeadphonesIcon,
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  User2,
  Building2,
  Calendar,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Wrench,
  FileText,
  XCircle,
  Upload,
  Paperclip,
  Image,
  Video,
  File,
  X,
} from "lucide-react";
import { IncidentType, IncidentStatus, IncidentUrgency } from "@shared/schema";

type UploadedFile = {
  entityId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type Comment = {
  id: string;
  content: string;
  visibility: string;
  isFromCustomer: boolean;
  createdAt: string;
  user: { fullName: string } | null;
};

type Activity = {
  id: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  details: string | null;
  isFromCustomer: boolean;
  createdAt: string;
};

type IncidentDetails = {
  id: string;
  ticketNumber: string;
  status: string;
  type: string;
  urgency: string;
  subject: string;
  description: string;
  contactName: string | null;
  contactEmail: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { name: string };
  assignee: { fullName: string } | null;
  product: { name: string } | null;
  comments: Comment[];
  activities: Activity[];
};

const typeLabels: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  [IncidentType.GARANTIA]: { label: "Garantía", icon: AlertTriangle },
  [IncidentType.RETRABAJO]: { label: "Retrabajo", icon: Wrench },
  [IncidentType.QUEJA]: { label: "Queja", icon: MessageSquare },
  [IncidentType.CONSULTA]: { label: "Consulta", icon: HelpCircle },
  [IncidentType.ADMINISTRATIVO]: { label: "Administrativo", icon: FileText },
};

const statusLabels: Record<string, string> = {
  [IncidentStatus.NUEVO]: "Nuevo",
  [IncidentStatus.ASIGNADO]: "Asignado",
  [IncidentStatus.EN_PROCESO]: "En Proceso",
  [IncidentStatus.ESPERANDO_CLIENTE]: "Esperando su Respuesta",
  [IncidentStatus.ESPERANDO_INTERNO]: "En Revisión",
  [IncidentStatus.RESUELTO]: "Resuelto",
  [IncidentStatus.CERRADO]: "Cerrado",
  [IncidentStatus.CANCELADO]: "Cancelado",
};

const urgencyLabels: Record<string, string> = {
  [IncidentUrgency.BAJA]: "Baja",
  [IncidentUrgency.MEDIA]: "Media",
  [IncidentUrgency.ALTA]: "Alta",
  [IncidentUrgency.CRITICA]: "Crítica",
};

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    [IncidentStatus.NUEVO]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    [IncidentStatus.ASIGNADO]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    [IncidentStatus.EN_PROCESO]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [IncidentStatus.ESPERANDO_CLIENTE]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    [IncidentStatus.ESPERANDO_INTERNO]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    [IncidentStatus.RESUELTO]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    [IncidentStatus.CERRADO]: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    [IncidentStatus.CANCELADO]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const icons: Record<string, typeof Clock> = {
    [IncidentStatus.NUEVO]: Clock,
    [IncidentStatus.ASIGNADO]: User2,
    [IncidentStatus.EN_PROCESO]: Loader2,
    [IncidentStatus.ESPERANDO_CLIENTE]: AlertCircle,
    [IncidentStatus.ESPERANDO_INTERNO]: Clock,
    [IncidentStatus.RESUELTO]: CheckCircle2,
    [IncidentStatus.CERRADO]: CheckCircle2,
    [IncidentStatus.CANCELADO]: XCircle,
  };

  const Icon = icons[status] || Clock;
  return (
    <Badge className={colors[status] || "bg-gray-100"}>
      <Icon className="h-3 w-3 mr-1" />
      {statusLabels[status] || status}
    </Badge>
  );
}

function getUrgencyBadge(urgency: string) {
  const colors: Record<string, string> = {
    [IncidentUrgency.BAJA]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    [IncidentUrgency.MEDIA]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    [IncidentUrgency.ALTA]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    [IncidentUrgency.CRITICA]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Badge className={colors[urgency] || "bg-gray-100"}>
      {urgencyLabels[urgency] || urgency}
    </Badge>
  );
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PublicTicketPage() {
  const [, params] = useRoute("/soporte/ticket/:token");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const token = params?.token;

  const { data: incident, isLoading, error } = useQuery<IncidentDetails>({
    queryKey: ["/api/public/incidents", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/incidents/${token}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al cargar el ticket");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        const uploadUrlResponse = await fetch("/api/public/incidents/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        });

        if (!uploadUrlResponse.ok) {
          const error = await uploadUrlResponse.json();
          throw new Error(error.error || "Error al preparar subida");
        }

        const { uploadUrl, entityId, filename } = await uploadUrlResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Error al subir archivo");
        }

        await fetch("/api/public/incidents/confirm-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId }),
        });

        setUploadedFiles((prev) => [
          ...prev,
          {
            entityId,
            filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        ]);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al subir archivo",
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    event.target.value = "";
  };

  const removeFile = (entityId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.entityId !== entityId));
  };

  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; attachments: UploadedFile[] }) => {
      const response = await fetch(`/api/public/incidents/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.content,
          attachments: data.attachments,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al agregar comentario");
      }
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      setUploadedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/public/incidents", token] });
      toast({
        title: "Comentario agregado",
        description: "Su comentario ha sido enviado exitosamente",
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
        const err = await response.json();
        throw new Error(err.error || "Error al confirmar cierre");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/incidents", token] });
      toast({
        title: "Ticket cerrado",
        description: "Gracias por confirmar que su solicitud fue resuelta",
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

  const handleSubmitComment = () => {
    if (newComment.trim() || uploadedFiles.length > 0) {
      addCommentMutation.mutate({
        content: newComment.trim(),
        attachments: uploadedFiles,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Error al cargar el ticket</CardTitle>
            <CardDescription>
              {(error as Error)?.message || "No se pudo encontrar el ticket solicitado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate("/soporte")}
              data-testid="button-back-to-support"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Centro de Soporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TypeIcon = typeLabels[incident.type]?.icon || HelpCircle;
  const isClosed = incident.status === IncidentStatus.CERRADO || incident.status === IncidentStatus.CANCELADO;
  const isResolved = incident.status === IncidentStatus.RESUELTO;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/soporte")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <HeadphonesIcon className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-bold">Centro de Soporte</h1>
              <p className="text-sm text-primary-foreground/80">GRUPO JOPER</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <span data-testid="text-ticket-number">Ticket #{incident.ticketNumber}</span>
                  <span>·</span>
                  <span>{format(new Date(incident.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TypeIcon className="h-5 w-5 text-primary" />
                  {incident.subject}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(incident.status)}
                {getUrgencyBadge(incident.urgency)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Empresa:</span>
                <span className="font-medium">{incident.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{typeLabels[incident.type]?.label || incident.type}</span>
              </div>
              {incident.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Atendido por:</span>
                  <span className="font-medium">{incident.assignee.fullName}</span>
                </div>
              )}
              {incident.product && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="font-medium">{incident.product.name}</span>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-2">Descripción</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>

            {incident.resolution && (
              <>
                <Separator />
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolución
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                    {incident.resolution}
                  </p>
                </div>
              </>
            )}

            {isResolved && !isClosed && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ¿Está satisfecho con la resolución?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Si considera que su solicitud ha sido resuelta satisfactoriamente, puede confirmar el cierre del ticket.
                </p>
                <Button
                  onClick={() => confirmCloseMutation.mutate()}
                  disabled={confirmCloseMutation.isPending}
                  data-testid="button-confirm-close"
                >
                  {confirmCloseMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmar Cierre
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {incident.comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay comentarios aún</p>
                  <p className="text-sm">Sea el primero en agregar un comentario</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incident.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${
                        comment.isFromCustomer
                          ? "bg-primary/10 ml-8"
                          : "bg-muted mr-8"
                      }`}
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {comment.isFromCustomer
                            ? "Usted"
                            : comment.user?.fullName || "Soporte"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {!isClosed && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <Textarea
                    placeholder="Escriba su comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    data-testid="input-new-comment"
                  />

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => {
                        const FileIcon = getFileIcon(file.mimeType);
                        return (
                          <div
                            key={file.entityId}
                            className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                            data-testid={`file-item-${file.entityId}`}
                          >
                            <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{file.originalName}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(file.entityId)}
                              data-testid={`button-remove-file-${file.entityId}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <input
                        type="file"
                        id="comment-file-upload"
                        className="hidden"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        data-testid="input-comment-file-upload"
                      />
                      <label htmlFor="comment-file-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          asChild
                        >
                          <span className="cursor-pointer">
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-4 w-4 mr-2" />
                                Adjuntar Evidencia
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                    <Button
                      onClick={handleSubmitComment}
                      disabled={(!newComment.trim() && uploadedFiles.length === 0) || addCommentMutation.isPending || isUploading}
                      data-testid="button-send-comment"
                    >
                      {addCommentMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Comentario
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {isClosed && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Este ticket está cerrado. No se pueden agregar más comentarios.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
