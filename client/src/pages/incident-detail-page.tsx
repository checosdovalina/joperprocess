import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Incident,
  Customer,
  User,
  IncidentType,
  IncidentStatus,
  IncidentUrgency,
  CommentVisibility,
  UserRole,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User2,
  Building2,
  MessageSquare,
  Send,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  Tag,
  FileText,
  Activity,
  Link2,
  Mail,
  Phone,
  Paperclip,
  Download,
  Image,
  Video,
  File,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

type IncidentComment = {
  id: string;
  incidentId: string;
  userId: string | null;
  content: string;
  visibility: string;
  isFromCustomer: boolean;
  createdAt: Date;
  user: User | null;
};

type IncidentActivity = {
  id: string;
  incidentId: string;
  userId: string | null;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  details: string | null;
  isFromCustomer: boolean;
  createdAt: Date;
  user: User | null;
};

type IncidentAttachment = {
  id: string;
  incidentId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  isFromCustomer: boolean;
  createdAt: string;
};

type IncidentWithDetails = Incident & {
  customer: Customer;
  assignee: User | null;
  creator: User | null;
  resolver: User | null;
  closer: User | null;
  comments: IncidentComment[];
  activities: IncidentActivity[];
  attachments?: IncidentAttachment[];
};

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

const typeLabels: Record<string, string> = {
  [IncidentType.GARANTIA]: "Garantía",
  [IncidentType.RETRABAJO]: "Retrabajo",
  [IncidentType.QUEJA]: "Queja",
  [IncidentType.CONSULTA]: "Consulta",
  [IncidentType.ADMINISTRATIVO]: "Administrativo",
};

const statusLabels: Record<string, string> = {
  [IncidentStatus.NUEVO]: "Nuevo",
  [IncidentStatus.ASIGNADO]: "Asignado",
  [IncidentStatus.EN_PROCESO]: "En Proceso",
  [IncidentStatus.ESPERANDO_CLIENTE]: "Esperando Cliente",
  [IncidentStatus.ESPERANDO_INTERNO]: "Esperando Interno",
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

const actionLabels: Record<string, string> = {
  created: "Creación",
  status_change: "Cambio de estado",
  assignment_change: "Asignación",
  type_change: "Cambio de tipo",
  urgency_change: "Cambio de urgencia",
  comment_added: "Comentario agregado",
  customer_comment: "Comentario del cliente",
  customer_confirmed_close: "Cliente confirmó cierre",
};

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    [IncidentStatus.NUEVO]: "default",
    [IncidentStatus.ASIGNADO]: "secondary",
    [IncidentStatus.EN_PROCESO]: "default",
    [IncidentStatus.ESPERANDO_CLIENTE]: "outline",
    [IncidentStatus.ESPERANDO_INTERNO]: "outline",
    [IncidentStatus.RESUELTO]: "secondary",
    [IncidentStatus.CERRADO]: "secondary",
    [IncidentStatus.CANCELADO]: "destructive",
  };

  const icons: Record<string, typeof Clock> = {
    [IncidentStatus.NUEVO]: AlertCircle,
    [IncidentStatus.ASIGNADO]: User2,
    [IncidentStatus.EN_PROCESO]: Clock,
    [IncidentStatus.ESPERANDO_CLIENTE]: Clock,
    [IncidentStatus.ESPERANDO_INTERNO]: Clock,
    [IncidentStatus.RESUELTO]: CheckCircle2,
    [IncidentStatus.CERRADO]: CheckCircle2,
    [IncidentStatus.CANCELADO]: XCircle,
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
    [IncidentType.GARANTIA]: "destructive",
    [IncidentType.RETRABAJO]: "destructive",
    [IncidentType.QUEJA]: "outline",
    [IncidentType.CONSULTA]: "secondary",
    [IncidentType.ADMINISTRATIVO]: "secondary",
  };

  return (
    <Badge variant={variants[type] || "secondary"}>
      {typeLabels[type] || type}
    </Badge>
  );
}

function getUrgencyBadge(urgency: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    [IncidentUrgency.BAJA]: "secondary",
    [IncidentUrgency.MEDIA]: "outline",
    [IncidentUrgency.ALTA]: "default",
    [IncidentUrgency.CRITICA]: "destructive",
  };

  return (
    <Badge variant={variants[urgency] || "secondary"}>
      {urgencyLabels[urgency] || urgency}
    </Badge>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<string>(CommentVisibility.INTERNAL);
  const [resolution, setResolution] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data: incident, isLoading, dataUpdatedAt } = useQuery<IncidentWithDetails>({
    queryKey: ["/api/incidents", id],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [incident?.comments?.length]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Incident>) => {
      const response = await apiRequest("PATCH", `/api/incidents/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      toast({
        title: "Incidente actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el incidente.",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, visibility }: { content: string; visibility: string }) => {
      const response = await apiRequest("POST", `/api/incidents/${id}/comments`, { content, visibility });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
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

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment, visibility: commentVisibility });
  };

  const handleResolve = () => {
    if (!resolution.trim()) {
      toast({
        title: "Resolución requerida",
        description: "Por favor escribe la resolución del incidente.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ resolution, status: IncidentStatus.RESUELTO });
    setResolution("");
  };

  const copyAccessLink = () => {
    if (!incident?.accessToken) return;
    const url = `${window.location.origin}/public/incidents/${incident.accessToken}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace de acceso se ha copiado al portapapeles.",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Incidente no encontrado</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/incidents")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Incidentes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManage = user?.role === UserRole.ADMIN || 
    user?.role === UserRole.SERVICIO_CLIENTE || 
    user?.role === UserRole.SERVICIO_TECNICO;

  const isResolved = incident.status === IncidentStatus.RESUELTO || incident.status === IncidentStatus.CERRADO;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/incidents")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-ticket-number">
              <span className="font-mono">{incident.ticketNumber}</span>
              {getStatusBadge(incident.status)}
            </h1>
            <p className="text-muted-foreground">{incident.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyAccessLink} data-testid="button-copy-link">
            <Link2 className="h-4 w-4 mr-2" />
            Copiar Enlace Cliente
          </Button>
          {incident.accessToken && (
            <Button
              variant="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/public/incidents/${incident.accessToken}/pdf`;
                a.download = `Incidente-${incident.ticketNumber}.pdf`;
                a.click();
              }}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información del Incidente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <div className="mt-1">{getTypeBadge(incident.type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Urgencia</Label>
                  <div className="mt-1">{getUrgencyBadge(incident.urgency)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha de Creación</Label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(incident.createdAt), "PPP 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground text-xs">Descripción</Label>
                <p className="text-sm mt-2 whitespace-pre-wrap">{incident.description}</p>
              </div>

              {incident.attachments && incident.attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Archivos Adjuntos ({incident.attachments.length})
                    </Label>
                    <div className="grid gap-2 mt-2">
                      {incident.attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.mimeType);
                        return (
                          <a
                            key={attachment.id}
                            href={`/api/incidents/${incident.id}/attachments/${attachment.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            data-testid={`attachment-${attachment.id}`}
                          >
                            <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)} · {format(new Date(attachment.createdAt), "d MMM, HH:mm", { locale: es })}
                              </p>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {incident.resolution && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolución
                    </Label>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{incident.resolution}</p>
                    {incident.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resuelto el {format(new Date(incident.resolvedAt), "PPP 'a las' HH:mm", { locale: es })}
                        {incident.resolver && ` por ${incident.resolver.fullName}`}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments & Activity Tabs */}
          <Card>
            <Tabs defaultValue="comments">
              <CardHeader className="pb-0">
                <TabsList>
                  <TabsTrigger value="comments" className="gap-1" data-testid="tab-comments">
                    <MessageSquare className="h-4 w-4" />
                    Comentarios ({incident.comments?.length || 0})
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-1" title="Actualización automática activa" />
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1" data-testid="tab-activity">
                    <Activity className="h-4 w-4" />
                    Actividad ({incident.activities?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="comments" className="m-0">
                  <ScrollArea className="h-64 pr-4">
                    {incident.comments?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay comentarios aún
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {incident.comments?.map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg ${
                              comment.isFromCustomer
                                ? "bg-accent/50 ml-4"
                                : "bg-muted/50 mr-4"
                            }`}
                            data-testid={`comment-${comment.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User2 className="h-3 w-3" />
                                <span className="text-sm font-medium">
                                  {comment.isFromCustomer
                                    ? "Cliente"
                                    : comment.user?.fullName || "Sistema"}
                                </span>
                                {comment.visibility === CommentVisibility.CUSTOMER && !comment.isFromCustomer && (
                                  <Badge variant="outline" className="text-xs">
                                    Visible para cliente
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), "dd/MM/yy HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {canManage && !isResolved && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <Textarea
                        placeholder="Escribe un comentario..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        data-testid="input-new-comment"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="visibility"
                            checked={commentVisibility === CommentVisibility.CUSTOMER}
                            onCheckedChange={(checked) =>
                              setCommentVisibility(checked ? CommentVisibility.CUSTOMER : CommentVisibility.INTERNAL)
                            }
                            data-testid="switch-visibility"
                          />
                          <Label htmlFor="visibility" className="text-sm">
                            Visible para cliente
                          </Label>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                          data-testid="button-add-comment"
                        >
                          {addCommentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="m-0">
                  <ScrollArea className="h-64 pr-4">
                    {incident.activities?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay actividad registrada
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-4">
                          {incident.activities?.map((activity) => (
                            <div
                              key={activity.id}
                              className="relative pl-8"
                              data-testid={`activity-${activity.id}`}
                            >
                              <div className="absolute left-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {actionLabels[activity.action] || activity.action}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(activity.createdAt), "dd/MM/yy HH:mm")}
                                  </span>
                                </div>
                                {activity.details && (
                                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                                )}
                                {activity.previousValue && activity.newValue && (
                                  <p className="text-sm text-muted-foreground">
                                    {activity.previousValue} → {activity.newValue}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.isFromCustomer
                                    ? "Cliente"
                                    : activity.user?.fullName || "Sistema"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{incident.customer?.name}</p>
              {incident.contactName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User2 className="h-3 w-3" />
                  {incident.contactName}
                </div>
              )}
              {incident.contactEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {incident.contactEmail}
                </div>
              )}
              {incident.contactPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {incident.contactPhone}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment & Status */}
          {canManage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  Gestión
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select
                    value={incident.status}
                    onValueChange={(value) => updateMutation.mutate({ status: value })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Asignado a</Label>
                  <Select
                    value={incident.assignedTo || "_none"}
                    onValueChange={(value) => updateMutation.mutate({ assignedTo: value === "_none" ? null : value })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-assignee">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sin asignar</SelectItem>
                      {allUsers
                        ?.filter(u => u.active)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Urgencia</Label>
                  <Select
                    value={incident.urgency}
                    onValueChange={(value) => updateMutation.mutate({ urgency: value })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(urgencyLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={incident.type}
                    onValueChange={(value) => updateMutation.mutate({ type: value })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolve Card */}
          {canManage && !isResolved && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Resolver Incidente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Describe la resolución del incidente..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  data-testid="input-resolution"
                />
                <Button
                  className="w-full"
                  onClick={handleResolve}
                  disabled={!resolution.trim() || updateMutation.isPending}
                  data-testid="button-resolve"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Marcar como Resuelto
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Created By */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado por</span>
                <span>{incident.creator?.fullName || "Sistema"}</span>
              </div>
              {incident.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referencia</span>
                  <span>{incident.referenceNumber}</span>
                </div>
              )}
              {incident.closedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cerrado</span>
                  <span>{format(new Date(incident.closedAt), "dd/MM/yy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
