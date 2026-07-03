import { useState, useRef, useEffect } from "react";
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
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/hooks/use-i18n";
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

const typeLabelKeys: Record<string, string> = {
  garantia: "public.support.type.garantia",
  retrabajo: "public.support.type.retrabajo",
  queja: "public.support.type.queja",
  consulta: "public.support.type.consulta",
  administrativo: "public.support.type.administrativo",
};

const statusLabelKeys: Record<string, string> = {
  nuevo: "status.new",
  asignado: "status.assigned",
  en_proceso: "status.in-progress",
  esperando_cliente: "public.incident.status.waiting-you",
  esperando_interno: "public.incident.status.in-review",
  resuelto: "status.resolved",
  cerrado: "status.closed",
  cancelado: "public.incident.status.cancelled",
};

const urgencyLabelKeys: Record<string, string> = {
  baja: "public.urgency.baja",
  media: "public.urgency.media",
  alta: "public.urgency.alta",
  critica: "public.urgency.critica",
};

function getStatusBadge(status: string, t: (key: string) => string) {
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
      {statusLabelKeys[status] ? t(statusLabelKeys[status]) : status}
    </Badge>
  );
}

function getTypeBadge(type: string, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    garantia: "destructive",
    retrabajo: "destructive",
    queja: "outline",
    consulta: "secondary",
    administrativo: "secondary",
  };

  return (
    <Badge variant={variants[type] || "secondary"}>
      {typeLabelKeys[type] ? t(typeLabelKeys[type]) : type}
    </Badge>
  );
}

function getUrgencyBadge(urgency: string, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    baja: "secondary",
    media: "outline",
    alta: "default",
    critica: "destructive",
  };

  return (
    <Badge variant={variants[urgency] || "secondary"}>
      {urgencyLabelKeys[urgency] ? t(urgencyLabelKeys[urgency]) : urgency}
    </Badge>
  );
}

export default function PublicIncidentPortal() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data: incident, isLoading, error, refetch } = useQuery<PublicIncident>({
    queryKey: ["/api/public/incidents", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/incidents/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("public.incident.type.load-error"));
      }
      return response.json();
    },
    refetchInterval: 10000,
    enabled: !!token,
  });

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [incident?.comments?.length]);

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/public/incidents/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("public.incident.comment-error"));
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setNewComment("");
      toast({
        title: t("public.incident.comment-sent"),
        description: t("public.incident.comment-sent-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
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
        throw new Error(data.error || t("public.incident.close-error"));
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setConfirmCloseOpen(false);
      toast({
        title: t("public.incident.closed-toast"),
        description: t("public.incident.closed-toast-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("label.error"),
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
            <h2 className="text-xl font-bold mb-2">{t("public.incident.not-available")}</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || t("public.incident.not-available-desc")}
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
            <span className="font-semibold">{t("public.incident.portal-title")}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold font-mono" data-testid="text-ticket-number">
                {incident.ticketNumber}
              </h1>
              {getStatusBadge(incident.status, t)}
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/public/incidents/${token}/pdf`;
                a.download = `Incidente-${incident.ticketNumber}.pdf`;
                a.click();
              }}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("btn.download-pdf")}
            </Button>
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
                  <p className="font-medium">{t("public.incident.response-required")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("public.incident.response-required-desc")}
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
                  <p className="font-medium mb-2">{t("public.incident.resolution")}</p>
                  <p className="text-sm whitespace-pre-wrap">{incident.resolution}</p>
                  {incident.resolvedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("public.incident.resolved-on")} {format(new Date(incident.resolvedAt), "PPP 'a las' HH:mm", { locale: es })}
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
                  <p className="font-medium">{t("public.incident.problem-resolved-q")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("public.incident.confirm-satisfactory")}
                  </p>
                </div>
                <Button onClick={() => setConfirmCloseOpen(true)} data-testid="button-confirm-close">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("public.incident.confirm-close")}
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
              {t("public.incident.details")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">{t("label.type")}</span>
                <div className="mt-1">{getTypeBadge(incident.type, t)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("label.urgency")}</span>
                <div className="mt-1">{getUrgencyBadge(incident.urgency, t)}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("label.assigned-to")}</span>
                <p className="text-sm mt-1">{incident.assignee?.fullName || t("public.incident.awaiting-assignment")}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("label.date")}</span>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(incident.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-xs text-muted-foreground">{t("label.description")}</span>
              <p className="text-sm mt-2 whitespace-pre-wrap">{incident.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t("public.incident.conversation")}
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title={t("public.incident.auto-update-active")} />
            </CardTitle>
            <CardDescription>
              {t("public.incident.conversation-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4 mb-4">
              {incident.comments?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("public.incident.no-messages")}
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
                            {comment.isFromCustomer ? t("public.incident.you") : comment.user?.fullName || t("public.incident.support-team")}
                          </span>
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

            {canComment && (
              <div className="space-y-3 border-t pt-4">
                <Textarea
                  placeholder={t("public.incident.message-ph")}
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
                    {t("public.incident.send-message")}
                  </Button>
                </div>
              </div>
            )}

            {!canComment && (
              <div className="text-center py-4 text-muted-foreground border-t">
                {t("public.incident.closed-no-comments")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-6 border-t">
          <p>{t("public.incident.footer-1")}</p>
          <p className="mt-1">{t("public.incident.footer-2")}</p>
        </div>
      </div>

      {/* Confirm Close Dialog */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("public.incident.confirm-close-title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("public.incident.confirm-close-desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCloseMutation.mutate()}
              disabled={confirmCloseMutation.isPending}
            >
              {confirmCloseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t("public.incident.confirm-close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
