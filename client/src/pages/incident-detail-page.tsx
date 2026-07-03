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
  ShieldCheck,
  Upload,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
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
  [IncidentType.GARANTIA]: "incidents.type.warranty",
  [IncidentType.RETRABAJO]: "incidents.type.rework",
  [IncidentType.QUEJA]: "incidents.type.complaint",
  [IncidentType.CONSULTA]: "incidents.type.inquiry",
  [IncidentType.ADMINISTRATIVO]: "incidents.type.admin",
};

const statusLabels: Record<string, string> = {
  [IncidentStatus.NUEVO]: "status.new",
  [IncidentStatus.ASIGNADO]: "status.assigned",
  [IncidentStatus.EN_PROCESO]: "status.in-progress",
  [IncidentStatus.ESPERANDO_CLIENTE]: "status.waiting-client",
  [IncidentStatus.ESPERANDO_INTERNO]: "status.waiting-internal",
  [IncidentStatus.RESUELTO]: "status.resolved",
  [IncidentStatus.CERRADO]: "status.closed",
  [IncidentStatus.CANCELADO]: "status.cancelled",
};

const urgencyLabels: Record<string, string> = {
  [IncidentUrgency.BAJA]: "incidents.urgency.low",
  [IncidentUrgency.MEDIA]: "incidents.urgency.medium",
  [IncidentUrgency.ALTA]: "incidents.urgency.high",
  [IncidentUrgency.CRITICA]: "incidents.urgency.critical",
};

const actionLabels: Record<string, string> = {
  created: "incidents.action.created",
  status_change: "incidents.action.status-change",
  assignment_change: "incidents.action.assignment-change",
  type_change: "incidents.action.type-change",
  urgency_change: "incidents.action.urgency-change",
  comment_added: "incidents.action.comment-added",
  customer_comment: "incidents.action.customer-comment",
  customer_confirmed_close: "incidents.action.customer-confirmed-close",
};

function getStatusBadge(status: string, t: (key: string) => string) {
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
      {statusLabels[status] ? t(statusLabels[status]) : status}
    </Badge>
  );
}

function getTypeBadge(type: string, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    [IncidentType.GARANTIA]: "destructive",
    [IncidentType.RETRABAJO]: "destructive",
    [IncidentType.QUEJA]: "outline",
    [IncidentType.CONSULTA]: "secondary",
    [IncidentType.ADMINISTRATIVO]: "secondary",
  };

  return (
    <Badge variant={variants[type] || "secondary"}>
      {typeLabels[type] ? t(typeLabels[type]) : type}
    </Badge>
  );
}

function getUrgencyBadge(urgency: string, t: (key: string) => string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    [IncidentUrgency.BAJA]: "secondary",
    [IncidentUrgency.MEDIA]: "outline",
    [IncidentUrgency.ALTA]: "default",
    [IncidentUrgency.CRITICA]: "destructive",
  };

  return (
    <Badge variant={variants[urgency] || "secondary"}>
      {urgencyLabels[urgency] ? t(urgencyLabels[urgency]) : urgency}
    </Badge>
  );
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useI18n();
  const [newComment, setNewComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<string>(CommentVisibility.INTERNAL);
  const [resolution, setResolution] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Warranty sheet form state
  const [warrantyForm, setWarrantyForm] = useState({
    productName: "",
    productSku: "",
    warrantySerialNumber: "",
    referenceNumber: "",
    invoiceNumber: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    observations: "",
  });
  const [warrantyFormInitialized, setWarrantyFormInitialized] = useState(false);
  const [isDownloadingWarranty, setIsDownloadingWarranty] = useState(false);
  const [isSendingWarrantyEmail, setIsSendingWarrantyEmail] = useState(false);
  const [ccAdmins, setCcAdmins] = useState(true);

  // Attachment upload state
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Pre-fill warranty form once incident loads
  useEffect(() => {
    if (incident && !warrantyFormInitialized) {
      setWarrantyForm({
        productName: (incident as any).product?.name || "",
        productSku: (incident as any).product?.sku || "",
        warrantySerialNumber: incident.warrantySerialNumber || "",
        referenceNumber: incident.referenceNumber || "",
        invoiceNumber: (incident as any).invoice?.folio || "",
        contactName: incident.contactName || "",
        contactEmail: incident.contactEmail || "",
        contactPhone: incident.contactPhone || "",
        observations: "",
      });
      setWarrantyFormInitialized(true);
    }
  }, [incident, warrantyFormInitialized]);

  const handleDownloadWarrantyPDF = async () => {
    setIsDownloadingWarranty(true);
    try {
      const resp = await fetch(`/api/incidents/${id}/warranty-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(warrantyForm),
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Error al generar el PDF");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Garantia-${incident?.ticketNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: t("label.error"), description: err.message, variant: "destructive" });
    } finally {
      setIsDownloadingWarranty(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    setIsUploadingFiles(true);
    let uploaded = 0;
    const total = files.length;
    try {
      for (const file of Array.from(files)) {
        setUploadProgress(`${t("incidents.uploading")} ${uploaded + 1}/${total}: ${file.name}`);
        // Step 1: get upload URL
        const urlResp = await apiRequest("POST", `/api/incidents/${id}/attachments/upload-url`, {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        const urlData = await urlResp.json();
        const { uploadURL, entityId, useDirectUpload } = urlData;

        // Step 2: upload the file
        if (useDirectUpload) {
          await fetch(uploadURL, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream", "X-Entity-Id": entityId },
            body: file,
            credentials: "include",
          });
        } else {
          await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
        }

        // Step 3: confirm
        await apiRequest("POST", `/api/incidents/${id}/attachments/confirm`, {
          entityId,
          filename: entityId,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        });
        uploaded++;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      toast({ title: `${uploaded} ${t("incidents.files-uploaded")}`, description: t("incidents.files-attached-desc") });
    } catch (err: any) {
      toast({ title: t("incidents.upload-error"), description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingFiles(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await apiRequest("DELETE", `/api/incidents/${id}/attachments/${attachmentId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      toast({ title: t("incidents.file-deleted") });
    } catch {
      toast({ title: t("label.error"), description: t("incidents.file-delete-error"), variant: "destructive" });
    }
  };

  const handleSendWarrantyEmail = async () => {
    if (!warrantyForm.contactEmail) {
      toast({ title: t("incidents.email-required"), description: t("incidents.email-required-desc"), variant: "destructive" });
      return;
    }
    setIsSendingWarrantyEmail(true);
    try {
      const resp = await apiRequest("POST", `/api/incidents/${id}/send-warranty-email`, {
        toEmail: warrantyForm.contactEmail,
        toName: warrantyForm.contactName || incident?.customer?.name,
        ccAdmins,
        overrides: warrantyForm,
      });
      const result = await resp.json();
      toast({
        title: t("incidents.email-sent"),
        description: `${t("incidents.sent-to")} ${result.sentTo}${result.cc?.length ? ` (CC: ${result.cc.join(", ")})` : ""}`,
      });
    } catch (err: any) {
      toast({ title: t("incidents.email-send-error"), description: err.message, variant: "destructive" });
    } finally {
      setIsSendingWarrantyEmail(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Incident>) => {
      const response = await apiRequest("PATCH", `/api/incidents/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      toast({
        title: t("incidents.updated"),
        description: t("incidents.updated-desc"),
      });
    },
    onError: () => {
      toast({
        title: t("label.error"),
        description: t("incidents.update-error"),
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
        title: t("incidents.comment-added"),
        description: t("incidents.comment-added-desc"),
      });
    },
    onError: () => {
      toast({
        title: t("label.error"),
        description: t("incidents.comment-add-error"),
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
        title: t("incidents.resolution-required"),
        description: t("incidents.resolution-required-desc"),
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
      title: t("incidents.link-copied"),
      description: t("incidents.link-copied-desc"),
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
            <p className="text-muted-foreground">{t("incidents.not-found")}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/incidents")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("incidents.back-to-incidents")}
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
              {getStatusBadge(incident.status, t)}
            </h1>
            <p className="text-muted-foreground">{incident.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyAccessLink} data-testid="button-copy-link">
            <Link2 className="h-4 w-4 mr-2" />
            {t("incidents.copy-client-link")}
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
              {t("incidents.download-pdf")}
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
                {t("incidents.info-title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">{t("label.type")}</Label>
                  <div className="mt-1">{getTypeBadge(incident.type, t)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">{t("label.urgency")}</Label>
                  <div className="mt-1">{getUrgencyBadge(incident.urgency, t)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">{t("incidents.creation-date")}</Label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(incident.createdAt), "PPP 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground text-xs">{t("label.description")}</Label>
                <p className="text-sm mt-2 whitespace-pre-wrap">{incident.description}</p>
              </div>

              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {t("incidents.attachments")} ({incident.attachments?.length || 0})
                  </Label>
                  <div className="flex items-center gap-2">
                    {uploadProgress && (
                      <span className="text-xs text-muted-foreground">{uploadProgress}</span>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      data-testid="input-file-upload"
                      onChange={e => handleUploadFiles(e.target.files)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUploadingFiles}
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-attachment"
                    >
                      {isUploadingFiles ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      {t("incidents.add-image")}
                    </Button>
                  </div>
                </div>

                {/* Image gallery */}
                {incident.attachments && incident.attachments.some(a => a.mimeType.startsWith("image/")) && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {incident.attachments.filter(a => a.mimeType.startsWith("image/")).map((attachment) => (
                      <div key={attachment.id} className="relative group rounded-md overflow-hidden bg-muted aspect-square" data-testid={`img-attachment-${attachment.id}`}>
                        <a
                          href={`/api/incidents/${incident.id}/attachments/${attachment.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img
                            src={`/api/incidents/${incident.id}/attachments/${attachment.id}/download`}
                            alt={attachment.originalName}
                            className="w-full h-full object-cover"
                          />
                        </a>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-between p-1" style={{ visibility: "visible" }}>
                          <span className="text-white text-xs truncate max-w-[70%] opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                            {attachment.originalName}
                          </span>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded p-0.5"
                            onClick={e => { e.preventDefault(); handleDeleteAttachment(attachment.id); }}
                            data-testid={`button-delete-attachment-${attachment.id}`}
                            title={t("btn.delete")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Non-image files list */}
                {incident.attachments && incident.attachments.filter(a => !a.mimeType.startsWith("image/")).length > 0 && (
                  <div className="grid gap-2">
                    {incident.attachments.filter(a => !a.mimeType.startsWith("image/")).map((attachment) => {
                      const FileIcon = getFileIcon(attachment.mimeType);
                      return (
                        <div key={attachment.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group" data-testid={`attachment-${attachment.id}`}>
                          <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)} · {format(new Date(attachment.createdAt), "d MMM, HH:mm", { locale: es })}
                              {attachment.isFromCustomer && <span className="ml-1 text-blue-500">({t("incidents.customer-lower")})</span>}
                            </p>
                          </div>
                          <a
                            href={`/api/incidents/${incident.id}/attachments/${attachment.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4 text-muted-foreground hover-elevate" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ visibility: "visible" }}
                            data-testid={`button-delete-file-${attachment.id}`}
                            title={t("btn.delete")}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(!incident.attachments || incident.attachments.length === 0) && (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("incidents.no-attachments")}
                  </p>
                )}
              </div>

              {incident.resolution && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("incidents.resolution")}
                    </Label>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{incident.resolution}</p>
                    {incident.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("incidents.resolved-on")} {format(new Date(incident.resolvedAt), "PPP 'a las' HH:mm", { locale: es })}
                        {incident.resolver && ` ${t("incidents.by")} ${incident.resolver.fullName}`}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments, Activity & Warranty Tabs */}
          <Card>
            <Tabs defaultValue="comments">
              <CardHeader className="pb-0">
                <TabsList>
                  <TabsTrigger value="comments" className="gap-1" data-testid="tab-comments">
                    <MessageSquare className="h-4 w-4" />
                    {t("incidents.comments")} ({incident.comments?.length || 0})
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse ml-1" title={t("incidents.auto-refresh-active")} />
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="gap-1" data-testid="tab-activity">
                    <Activity className="h-4 w-4" />
                    {t("incidents.activity")} ({incident.activities?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="warranty" className="gap-1" data-testid="tab-warranty">
                    <ShieldCheck className="h-4 w-4" />
                    {t("incidents.warranty-sheet")}
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="comments" className="m-0">
                  <ScrollArea className="h-64 pr-4">
                    {incident.comments?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {t("incidents.no-comments")}
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
                                    ? t("label.client")
                                    : comment.user?.fullName || t("incidents.system")}
                                </span>
                                {comment.visibility === CommentVisibility.CUSTOMER && !comment.isFromCustomer && (
                                  <Badge variant="outline" className="text-xs">
                                    {t("incidents.visible-to-customer")}
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
                        placeholder={t("incidents.comment-placeholder")}
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
                            {t("incidents.visible-to-customer")}
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
                          {t("incidents.send")}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="m-0">
                  <ScrollArea className="h-64 pr-4">
                    {incident.activities?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {t("incidents.no-activity")}
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
                                    {actionLabels[activity.action] ? t(actionLabels[activity.action]) : activity.action}
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
                                    ? t("label.client")
                                    : activity.user?.fullName || t("incidents.system")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* ── Warranty Sheet Tab ─────────────────────────────────── */}
                <TabsContent value="warranty" className="m-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("incidents.warranty-intro")}
                    </p>

                    {/* Product / Equipment */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("incidents.product-equipment")}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.product-name")}</Label>
                          <Input
                            value={warrantyForm.productName}
                            onChange={e => setWarrantyForm(f => ({ ...f, productName: e.target.value }))}
                            placeholder={t("incidents.ph-product-name")}
                            data-testid="input-warranty-product-name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.sku-model")}</Label>
                          <Input
                            value={warrantyForm.productSku}
                            onChange={e => setWarrantyForm(f => ({ ...f, productSku: e.target.value }))}
                            placeholder={t("incidents.ph-sku")}
                            data-testid="input-warranty-product-sku"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.serial-number")}</Label>
                          <Input
                            value={warrantyForm.warrantySerialNumber}
                            onChange={e => setWarrantyForm(f => ({ ...f, warrantySerialNumber: e.target.value }))}
                            placeholder={t("incidents.ph-serial")}
                            data-testid="input-warranty-serial"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.reference-part")}</Label>
                          <Input
                            value={warrantyForm.referenceNumber}
                            onChange={e => setWarrantyForm(f => ({ ...f, referenceNumber: e.target.value }))}
                            placeholder={t("incidents.ph-reference")}
                            data-testid="input-warranty-reference"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.invoice-number")}</Label>
                          <Input
                            value={warrantyForm.invoiceNumber}
                            onChange={e => setWarrantyForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                            placeholder={t("incidents.ph-invoice")}
                            data-testid="input-warranty-invoice"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("incidents.customer-contact")}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.contact-name")}</Label>
                          <Input
                            value={warrantyForm.contactName}
                            onChange={e => setWarrantyForm(f => ({ ...f, contactName: e.target.value }))}
                            placeholder={t("label.name")}
                            data-testid="input-warranty-contact-name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("incidents.email-address")}</Label>
                          <Input
                            type="email"
                            value={warrantyForm.contactEmail}
                            onChange={e => setWarrantyForm(f => ({ ...f, contactEmail: e.target.value }))}
                            placeholder="correo@cliente.com"
                            data-testid="input-warranty-contact-email"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("label.phone")}</Label>
                          <Input
                            value={warrantyForm.contactPhone}
                            onChange={e => setWarrantyForm(f => ({ ...f, contactPhone: e.target.value }))}
                            placeholder={t("incidents.ph-phone")}
                            data-testid="input-warranty-contact-phone"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Observations */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("incidents.observations-condition")}</Label>
                      <Textarea
                        value={warrantyForm.observations}
                        onChange={e => setWarrantyForm(f => ({ ...f, observations: e.target.value }))}
                        placeholder={t("incidents.observations-placeholder")}
                        rows={3}
                        data-testid="input-warranty-observations"
                      />
                    </div>

                    <Separator />

                    {/* Email options */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cc-admins"
                        checked={ccAdmins}
                        onCheckedChange={setCcAdmins}
                        data-testid="switch-cc-admins"
                      />
                      <Label htmlFor="cc-admins" className="text-sm cursor-pointer">
                        {t("incidents.cc-admins")}
                      </Label>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        onClick={handleDownloadWarrantyPDF}
                        disabled={isDownloadingWarranty}
                        data-testid="button-download-warranty-pdf"
                      >
                        {isDownloadingWarranty ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {t("incidents.download-pdf")}
                      </Button>
                      <Button
                        onClick={handleSendWarrantyEmail}
                        disabled={isSendingWarrantyEmail || !warrantyForm.contactEmail}
                        data-testid="button-send-warranty-email"
                      >
                        {isSendingWarrantyEmail ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        {t("incidents.send-by-email")}
                      </Button>
                    </div>
                  </div>
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
                {t("label.client")}
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
                  {t("incidents.management")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">{t("label.status")}</Label>
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
                        <SelectItem key={value} value={value}>{t(label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">{t("incidents.assigned-to")}</Label>
                  <Select
                    value={incident.assignedTo || "_none"}
                    onValueChange={(value) => updateMutation.mutate({ assignedTo: value === "_none" ? null : value })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-assignee">
                      <SelectValue placeholder={t("incidents.unassigned")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t("incidents.unassigned")}</SelectItem>
                      {allUsers
                        ?.filter(u => u.active)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">{t("label.urgency")}</Label>
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
                        <SelectItem key={value} value={value}>{t(label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">{t("label.type")}</Label>
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
                        <SelectItem key={value} value={value}>{t(label)}</SelectItem>
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
                  {t("incidents.resolve-incident")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder={t("incidents.resolution-placeholder")}
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
                  {t("incidents.mark-resolved")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Created By */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t("incidents.additional-info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("incidents.created-by")}</span>
                <span>{incident.creator?.fullName || t("incidents.system")}</span>
              </div>
              {incident.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("incidents.reference")}</span>
                  <span>{incident.referenceNumber}</span>
                </div>
              )}
              {incident.closedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("incidents.closed")}</span>
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
