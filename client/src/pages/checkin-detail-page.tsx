import { useLocation, useParams, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Checkin, CheckinUpdate, Customer, FollowUpOutcome, FollowUpStatus } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, FileText, Loader2, ImageIcon, Download, Phone, Video, Users, Mail, X, UserPlus, Trash2, NotebookPen, Lock, EyeOff, ExternalLink, History, CheckCircle2, Save, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeetingType, type MeetingTypeType } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckinPhotoUploader } from "@/components/checkin-photo-uploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";

interface CustomerSummary {
  customer: Customer;
  creditSummary?: {
    creditLimit?: number;
    creditUsed?: number;
    creditAvailable?: number;
    overdueCount?: number;
    overdueTotal?: number;
    upcomingCount?: number;
    upcomingTotal?: number;
  } | null;
  overdueInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  upcomingInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  pendingInvoices?: Array<{
    id: string;
    serie: string;
    folio: string;
    total: string;
    balanceDue: string;
    dueDate: string;
  }>;
  hasPendingReceivables?: boolean;
  totalBalanceDue?: number;
  pendingOrders?: Array<{
    id: string;
    status: string;
    totalAmount: string;
    estimatedDelivery: string | null;
  }>;
  recentCheckins?: Array<{
    id: string;
    checkinAt: string;
    latitude: string | null;
    longitude: string | null;
    user?: { id: string; fullName: string | null; username: string } | null;
    salesPerson?: { id: string; fullName: string | null; username: string } | null;
  }>;
}

type CheckinUpdateWithUser = CheckinUpdate & {
  user?: { id: string; fullName: string | null; username: string } | null;
};

type CheckinWithHistory = Checkin & {
  customer: Customer;
  updates?: CheckinUpdateWithUser[];
};

function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

export default function CheckinDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpOutcome, setFollowUpOutcome] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [interactionType, setInteractionType] = useState<MeetingTypeType>(MeetingType.VISITA);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [draftAgreements, setDraftAgreements] = useState("");
  const [draftInternalNotes, setDraftInternalNotes] = useState("");
  const [expandedFollowUpIds, setExpandedFollowUpIds] = useState<Set<string>>(new Set());
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const addCheckinEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    if (emailList.includes(email)) { setEmailInput(""); return; }
    setEmailList(prev => [...prev, email]);
    setEmailInput("");
  };

  const removeCheckinEmail = (email: string) => {
    setEmailList(prev => prev.filter(e => e !== email));
  };

  const toggleFollowUpRecord = (recordId: string) => {
    setExpandedFollowUpIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const { data: checkin, isLoading: checkinLoading } = useQuery<CheckinWithHistory>({
    queryKey: [`/api/checkins/${id}`],
    enabled: !!id,
  });
  const hasLocation = Boolean(checkin?.latitude && checkin?.longitude);
  const latitude = hasLocation ? Number(checkin?.latitude) : null;
  const longitude = hasLocation ? Number(checkin?.longitude) : null;
  const mapDelta = 0.003;
  const mapEmbedUrl = latitude != null && longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - mapDelta}%2C${latitude - mapDelta}%2C${longitude + mapDelta}%2C${latitude + mapDelta}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;
  const googleMapsUrl = latitude != null && longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null;

  // Fetch planned email recipients (pre-populate when dialog opens)
  const { data: recipientsData } = useQuery<{ recipients: { email: string; label: string }[] }>({
    queryKey: [`/api/checkins/${id}/email-recipients`],
    enabled: !!id && checkoutDialogOpen,
  });

  // Pre-populate emailList when recipients data loads and dialog just opened
  // Split any multi-value email strings (separated by ; or ,) before storing
  useEffect(() => {
    if (checkoutDialogOpen && recipientsData?.recipients && emailList.length === 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails: string[] = [];
      for (const r of recipientsData.recipients) {
        const parts = r.email.split(/[;,]/).map((e: string) => e.trim()).filter((e: string) => emailRegex.test(e));
        for (const e of parts) {
          if (!emails.includes(e)) emails.push(e);
        }
      }
      setEmailList(emails);
    }
  }, [checkoutDialogOpen, recipientsData]);

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<CustomerSummary>({
    queryKey: [`/api/customers/${checkin?.customerId}/summary`],
    enabled: !!checkin?.customerId,
  });

  // Sync draft notes from loaded checkin data (only on first load)
  useEffect(() => {
    if (checkin) {
      setCheckoutNotes(checkin.checkoutNotes ?? "");
      setInternalNotes(checkin.internalNotes ?? "");
      setDraftAgreements(checkin.checkoutNotes ?? "");
      setDraftInternalNotes(checkin.internalNotes ?? "");
      setInteractionType((checkin.meetingType || MeetingType.VISITA) as MeetingTypeType);
    }
  }, [checkin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/checkins/${id}/checkout`, {
        checkoutNotes,
        internalNotes,
        meetingType: interactionType,
        recipients: emailList,
      });
      return response.json() as Promise<{ email?: { status: "sent" | "partial" | "failed" | "skipped"; sent: string[]; failed: Array<{ email: string }> } }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commercial-results"] });
      setCheckoutDialogOpen(false);
      setEmailList([]);
      setEmailInput("");
      setCheckoutNotes("");
      setInternalNotes("");
      setDraftAgreements("");
      setDraftInternalNotes("");
      toast({
        title: result.email?.status === "failed" || result.email?.status === "partial" || result.email?.status === "skipped"
          ? "Contacto guardado con aviso de correo"
          : "Contacto agregado al historial",
        description: result.email?.status === "failed"
          ? "El contacto se guardó, pero no se pudo enviar ningún correo."
          : result.email?.status === "partial"
            ? "El contacto se guardó, pero algunos correos no pudieron enviarse."
            : result.email?.status === "skipped"
              ? "El contacto se guardó, pero no había destinatarios para el correo."
            : "El seguimiento continúa abierto.",
        variant: result.email?.status === "failed" || result.email?.status === "partial" ? "destructive" : "default",
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("checkins.toast-finish-error"),
      });
    },
  });

  const closeFollowUpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/checkins/${id}/close-followup`, {
        outcome: followUpOutcome,
        reason: followUpReason.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commercial-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${checkin?.customerId}/summary`] });
      setFollowUpDialogOpen(false);
      setFollowUpOutcome("");
      setFollowUpReason("");
      toast({ title: "Seguimiento cerrado", description: "El resultado quedó guardado y el historial se conservó." });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t("label.error"), description: error.message || "No se pudo cerrar el seguimiento." });
    },
  });

  const saveFollowUpNotesMutation = useMutation({
    mutationFn: async (notes: { checkoutNotes: string; internalNotes: string }) => {
      const response = await apiRequest("PATCH", `/api/checkins/${id}`, notes);
      return response.json() as Promise<Checkin>;
    },
    onSuccess: (updated) => {
      setDraftAgreements(updated.checkoutNotes ?? "");
      setDraftInternalNotes(updated.internalNotes ?? "");
      queryClient.setQueryData<CheckinWithHistory>([`/api/checkins/${id}`], (current) =>
        current ? {
          ...current,
          checkoutNotes: updated.checkoutNotes,
          internalNotes: updated.internalNotes,
        } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      toast({
        title: t("checkins.save-notes"),
        description: t("checkins.toast-notes-saved-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || "No se pudieron guardar las notas.",
      });
    },
  });

  const updateMeetingTypeMutation = useMutation({
    mutationFn: async (meetingType: MeetingTypeType) => {
      return await apiRequest("PATCH", `/api/checkins/${id}`, { meetingType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      toast({
        title: t("checkins.toast-type-updated"),
        description: t("checkins.toast-type-updated-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("checkins.toast-type-error"),
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (entityId: string) => {
      return await apiRequest("DELETE", "/api/checkin-photos", { checkinId: id, entityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      toast({ title: t("checkins.toast-photo-deleted"), description: t("checkins.toast-photo-deleted-desc") });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("checkins.toast-photo-delete-error"),
      });
    },
  });

  const openContactDialog = () => {
    setCheckoutNotes(draftAgreements);
    setInternalNotes(draftInternalNotes);
    setInteractionType((checkin?.meetingType || MeetingType.VISITA) as MeetingTypeType);
    setCheckoutDialogOpen(true);
  };

  if (!id) {
    return <Redirect to="/checkins" />;
  }

  if (checkinLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t("checkins.not-found")}</h2>
        <p className="text-muted-foreground mb-6">{t("checkins.not-found-desc")}</p>
        <Link href="/checkins">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("checkins.back-to-checkins")}
          </Button>
        </Link>
      </div>
    );
  }

  const followUpIsOpen = checkin.followUpStatus === FollowUpStatus.OPEN;
  const followUpNotesChanged =
    draftAgreements !== (checkin.checkoutNotes ?? "") ||
    draftInternalNotes !== (checkin.internalNotes ?? "");
  const recordedPhotoIds = new Set((checkin.updates ?? []).flatMap((update) => update.photos));
  const outcomeLabel = checkin.followUpOutcome === FollowUpOutcome.SALE
    ? "Venta concretada"
    : checkin.followUpOutcome === FollowUpOutcome.RENTAL
      ? "Renta concretada"
      : checkin.followUpOutcome === FollowUpOutcome.NOT_CONVERTED
        ? "No concretada"
        : "Seguimiento cerrado";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/checkins">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("checkins.detail-title")}</h1>
          <p className="text-muted-foreground mt-1">
            {checkin.customer.name} - {format(new Date(checkin.checkinAt), "PPP", { locale: es })}
          </p>
          {checkin.customer.contactName && (
            <p className="mt-1 text-sm text-muted-foreground">Contacto: {checkin.customer.contactName}</p>
          )}
        </div>
        <div className="flex gap-2">
          {checkin.minutePdfPath && (
            <Button 
              variant="outline"
              data-testid="button-download-pdf"
              asChild
            >
              <a href={`/api/checkins/${id}/pdf`} download>
                <Download className="h-4 w-4 mr-2" />
                {t("btn.download-pdf")}
              </a>
            </Button>
          )}
          {followUpIsOpen && (
            <>
              <Button
                variant="outline"
                data-testid="button-add-followup-update"
                onClick={openContactDialog}
              >
                <History className="h-4 w-4 mr-2" />
                Registrar contacto
              </Button>
              <Button
              data-testid="button-checkout"
              onClick={() => {
                setFollowUpOutcome("");
                setFollowUpReason("");
                setFollowUpDialogOpen(true);
              }}
            >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Cerrar seguimiento
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {t("checkins.visit-info")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("label.status")}</div>
              <div className="mt-1">
                {!followUpIsOpen ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    {outcomeLabel}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    Seguimiento abierto
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("checkins.meeting-type")}</div>
              <div className="mt-1">
                {followUpIsOpen ? (
                  <Select
                    value={checkin.meetingType || MeetingType.VISITA}
                    onValueChange={(value) => updateMeetingTypeMutation.mutate(value as MeetingTypeType)}
                    disabled={updateMeetingTypeMutation.isPending}
                  >
                    <SelectTrigger className="w-[200px]" data-testid="select-meeting-type-edit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MeetingType.LLAMADA}>
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {t("checkins.type.call")}
                        </span>
                      </SelectItem>
                      <SelectItem value={MeetingType.VISITA}>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {t("checkins.type.visit")}
                        </span>
                      </SelectItem>
                      <SelectItem value={MeetingType.VIDEOLLAMADA}>
                        <span className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          {t("checkins.type.video")}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    {checkin.meetingType === MeetingType.LLAMADA && <Phone className="h-4 w-4" />}
                    {checkin.meetingType === MeetingType.VISITA && <Users className="h-4 w-4" />}
                    {checkin.meetingType === MeetingType.VIDEOLLAMADA && <Video className="h-4 w-4" />}
                    {checkin.meetingType === MeetingType.LLAMADA && t("checkins.type.call")}
                    {checkin.meetingType === MeetingType.VISITA && t("checkins.type.visit")}
                    {checkin.meetingType === MeetingType.VIDEOLLAMADA && t("checkins.type.video")}
                    {!checkin.meetingType && t("checkins.type.visit")}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("checkins.checkin-label")}</div>
              <div className="mt-1 text-sm">
                {format(new Date(checkin.checkinAt), "PPP 'a las' p", { locale: es })}
              </div>
            </div>

            {!followUpIsOpen && checkin.followUpClosedAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Seguimiento cerrado</div>
                <div className="mt-1 text-sm">
                  {format(new Date(checkin.followUpClosedAt), "PPP 'a las' p", { locale: es })}
                </div>
              </div>
            )}
            {!followUpIsOpen && checkin.followUpReason && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Motivo</div>
                <div className="mt-1 text-sm whitespace-pre-wrap">{checkin.followUpReason}</div>
              </div>
            )}

            {mapEmbedUrl && googleMapsUrl && latitude != null && longitude != null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Ubicación registrada</div>
                    <div className="text-xs text-muted-foreground">
                      Capturada automáticamente y bloqueada para edición
                    </div>
                  </div>
                  <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Inmutable</Badge>
                </div>
                <div className="overflow-hidden rounded-lg border bg-muted">
                  <iframe
                    title="Ubicación registrada del vendedor"
                    src={mapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md bg-muted p-2 font-mono">
                    Lat: {latitude.toFixed(6)}<br />
                    Lng: {longitude.toFixed(6)}
                  </div>
                  <div className="rounded-md bg-muted p-2 text-muted-foreground">
                    {checkin.locationCapturedAt && (
                      <div>Capturada: {format(new Date(checkin.locationCapturedAt), "PPP 'a las' p", { locale: es })}</div>
                    )}
                    {checkin.locationAccuracyMeters && (
                      <div>Precisión aproximada: ±{Math.round(Number(checkin.locationAccuracyMeters))} m</div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir en Google Maps
                  </a>
                </Button>
              </div>
            )}

            {checkin.notes && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("label.notes")}</div>
                <div className="mt-1 text-sm">{checkin.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("checkins.customer-summary")}</CardTitle>
            <CardDescription>{checkin.customer.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : summaryError ? (
              <div className="text-center py-6">
                <p className="text-destructive mb-2">{t("checkins.summary-error")}</p>
                <p className="text-xs text-muted-foreground">
                  {summaryError instanceof Error ? summaryError.message : t("checkins.unknown-error")}
                </p>
              </div>
            ) : summary?.creditSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("label.credit-limit")}</div>
                    <div className="mt-1 text-lg font-semibold">
                      ${safeNumber(summary.creditSummary?.creditLimit).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("checkins.credit-available")}</div>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      ${safeNumber(summary.creditSummary?.creditAvailable).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("checkins.credit-used")}</div>
                    <div className="mt-1 text-lg font-semibold text-orange-600">
                      ${safeNumber(summary.creditSummary?.creditUsed).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">{t("checkins.overdue-invoices")}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={(summary.creditSummary?.overdueCount || 0) > 0 ? "destructive" : "outline"}>
                        {summary.creditSummary?.overdueCount || 0}
                      </Badge>
                      {(summary.creditSummary?.overdueTotal || 0) > 0 && (
                        <span className="text-sm font-medium text-red-600">
                          ${safeNumber(summary.creditSummary?.overdueTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {summary.overdueInvoices && summary.overdueInvoices.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">{t("checkins.overdue-invoices")}</div>
                    <div className="space-y-1">
                      {summary.overdueInvoices.slice(0, 3).map((invoice) => (
                        <div key={invoice.id} className="text-xs flex justify-between">
                          <span className="text-muted-foreground">{invoice.folio}</span>
                          <span className="font-medium text-red-600">
                            ${parseFloat(invoice.total).toLocaleString("es-MX")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.recentCheckins && summary.recentCheckins.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-2">Visitas recientes y vendedor</div>
                    <div className="space-y-2">
                      {summary.recentCheckins.map((recent) => (
                        <div key={recent.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {format(new Date(recent.checkinAt), "PP", { locale: es })}
                          </span>
                          <span className="font-medium text-right">
                            {recent.salesPerson?.fullName ||
                              recent.user?.fullName ||
                              recent.salesPerson?.username ||
                              recent.user?.username ||
                              "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                {t("checkins.no-info")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {summary?.hasPendingReceivables && summary.pendingInvoices && summary.pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("checkins.receivable-invoices")}
              <Badge variant="destructive" data-testid="badge-pending-invoices">
                {summary.pendingInvoices.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t("checkins.total-pending")} ${safeNumber(summary.totalBalanceDue).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.overdueInvoices && summary.overdueInvoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2">{t("checkins.overdue-invoices")}</h4>
                  <div className="space-y-2">
                    {summary.overdueInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center p-3 rounded-md border border-red-200 bg-red-50"
                        data-testid={`invoice-overdue-${invoice.id}`}
                      >
                        <div>
                          <div className="font-mono text-sm font-medium">
                            {invoice.serie}-{invoice.folio}
                          </div>
                          {invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              Vence: {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-700">
                            ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">Saldo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.upcomingInvoices && summary.upcomingInvoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t("checkins.upcoming-invoices")}</h4>
                  <div className="space-y-2">
                    {summary.upcomingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center p-3 rounded-md border"
                        data-testid={`invoice-upcoming-${invoice.id}`}
                      >
                        <div>
                          <div className="font-mono text-sm font-medium">
                            {invoice.serie}-{invoice.folio}
                          </div>
                          {invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              Vence: {format(new Date(invoice.dueDate), "PP", { locale: es })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${parseFloat(invoice.balanceDue || invoice.total).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">Saldo</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Historial de seguimiento ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Historial de seguimiento
            </CardTitle>
            <CardDescription className="mt-1">Cada contacto queda guardado por separado; el seguimiento solo se cierra con un resultado.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkin.notes && (
            <details className="group rounded-lg border bg-muted/20" data-testid="card-initial-checkin-record">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">Registro inicial</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(checkin.checkinAt), "PPP 'a las' p", { locale: es })}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t px-4 py-3">
                <p className="whitespace-pre-wrap text-sm">{checkin.notes}</p>
              </div>
            </details>
          )}
          {(checkin.updates ?? []).map((update) => (
            <div key={update.id} className="overflow-hidden rounded-lg border" data-testid={`card-followup-update-${update.id}`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => toggleFollowUpRecord(update.id)}
                  aria-expanded={expandedFollowUpIds.has(update.id)}
                  aria-controls={`followup-update-details-${update.id}`}
                  data-testid={`button-toggle-followup-update-${update.id}`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {update.meetingType === MeetingType.LLAMADA ? t("checkins.type.call")
                        : update.meetingType === MeetingType.VIDEOLLAMADA ? t("checkins.type.video")
                          : t("checkins.type.visit")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {format(new Date(update.createdAt), "PPP 'a las' p", { locale: es })}
                      {update.user ? ` · ${update.user.fullName || update.user.username}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {expandedFollowUpIds.has(update.id) ? "Ocultar" : "Ver detalle"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedFollowUpIds.has(update.id) ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {update.minutePdfPath && (
                  <div className="shrink-0 pr-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/checkins/${id}/updates/${update.id}/pdf`} download>
                        <Download className="mr-2 h-4 w-4" /> Minuta PDF
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <div
                id={`followup-update-details-${update.id}`}
                hidden={!expandedFollowUpIds.has(update.id)}
                className="space-y-4 border-t px-4 py-4"
              >
                {update.agreements && (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-medium"><NotebookPen className="h-4 w-4 text-blue-600" />Acuerdos y comentarios</p>
                    <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{update.agreements}</p>
                  </div>
                )}
                {update.internalNotes && (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><EyeOff className="h-4 w-4" />Notas internas</p>
                    <p className="whitespace-pre-wrap rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">{update.internalNotes}</p>
                  </div>
                )}
                {update.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {update.photos.map((photoId, index) => (
                      <a key={photoId} href={`/objects/${photoId}`} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md bg-muted">
                        <img src={`/objects/${photoId}`} alt={`Foto del contacto ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
                {!update.agreements && !update.internalNotes && update.photos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Este contacto no tiene comentarios ni fotos.</p>
                )}
              </div>
            </div>
          ))}
          {!checkin.updates?.length && (checkin.checkoutNotes || checkin.internalNotes) && (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Notas de la visita registrada</p>
              {checkin.checkoutNotes && <p className="mb-3 whitespace-pre-wrap text-sm">{checkin.checkoutNotes}</p>}
              {checkin.internalNotes && <p className="whitespace-pre-wrap border-t border-dashed pt-3 text-sm text-muted-foreground"><Lock className="mr-1 inline h-3 w-3" />{checkin.internalNotes}</p>}
            </div>
          )}
          {!checkin.notes && !checkin.updates?.length && !checkin.checkoutNotes && !checkin.internalNotes && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay contactos ni notas en el historial.</p>
          )}
        </CardContent>
      </Card>

      {followUpIsOpen && (
        <Card data-testid="card-followup-notes">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <NotebookPen className="h-5 w-5 text-blue-600" />
                  {t("checkins.agreements")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("checkins.followup-notes-draft-hint")}
                </CardDescription>
              </div>
              <Button
                onClick={() => saveFollowUpNotesMutation.mutate({
                  checkoutNotes: draftAgreements,
                  internalNotes: draftInternalNotes,
                })}
                disabled={!followUpNotesChanged || saveFollowUpNotesMutation.isPending}
                data-testid="button-save-followup-notes"
              >
                {saveFollowUpNotesMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />}
                {t("checkins.save-notes")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="followup-draft-agreements" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                {t("checkins.agreements")}
                <span className="text-xs font-normal text-muted-foreground">{t("checkins.goes-to-pdf")}</span>
              </Label>
              <Textarea
                id="followup-draft-agreements"
                data-testid="textarea-followup-draft-agreements"
                placeholder={t("checkins.agreements-placeholder")}
                value={draftAgreements}
                onChange={(event) => setDraftAgreements(event.target.value)}
                disabled={saveFollowUpNotesMutation.isPending}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">{t("checkins.pdf-notice")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-draft-internal-notes" className="flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" />
                {t("checkins.internal-notes")}
                <span className="text-xs font-normal text-muted-foreground">{t("checkins.not-sent-client")}</span>
              </Label>
              <Textarea
                id="followup-draft-internal-notes"
                data-testid="textarea-followup-draft-internal-notes"
                placeholder={t("checkins.internal-placeholder")}
                value={draftInternalNotes}
                onChange={(event) => setDraftInternalNotes(event.target.value)}
                disabled={saveFollowUpNotesMutation.isPending}
                className="min-h-[80px] border-dashed"
              />
              <p className="text-xs text-muted-foreground">{t("checkins.internal-private-notice")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("checkins.photos-title")}</CardTitle>
          <CardDescription>
            {checkin.photos?.length || 0} {t("checkins.photos-count-suffix")} · las fotos registradas quedan ligadas al contacto de su historial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {checkin.photos && checkin.photos.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Fotos Actuales</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {checkin.photos.map((photoEntityId, index) => (
                  <div
                    key={photoEntityId}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted group"
                    data-testid={`image-photo-${index}`}
                  >
                    <img
                      src={`/objects/${photoEntityId}`}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                      Foto {index + 1}
                    </div>
                    {recordedPhotoIds.has(photoEntityId) ? (
                      <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-2 py-1 text-[10px] text-white">En historial</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t("checkins.delete-photo-confirm"))) {
                            deletePhotoMutation.mutate(photoEntityId);
                          }
                        }}
                        disabled={deletePhotoMutation.isPending}
                        data-testid={`button-delete-photo-${index}`}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        aria-label="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {followUpIsOpen && (
            <div>
              <h3 className="mb-1 text-sm font-medium">{t("checkins.add-photos")}</h3>
              <p className="mb-3 text-xs text-muted-foreground">Las fotos nuevas se incorporarán al historial al guardar el siguiente contacto.</p>
              <CheckinPhotoUploader
                checkinId={checkin.id}
                currentPhotoCount={checkin.photos?.length || 0}
              />
            </div>
          )}

          {!followUpIsOpen && (checkin.photos?.length || 0) === 0 && (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <ImageIcon className="w-12 h-12 opacity-20" />
              <p>No se capturaron fotos durante esta visita</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutDialogOpen} onOpenChange={(open) => { setCheckoutDialogOpen(open); if (!open) { setEmailList([]); setEmailInput(""); } }}>
        <DialogContent data-testid="dialog-checkout" className="max-w-lg max-h-[90dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Registrar contacto</DialogTitle>
            <DialogDescription>
              Guarda esta interacción en el historial. El seguimiento seguirá abierto; aquí también puedes generar y enviar la minuta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Leyenda de advertencia */}
            <div className="bg-red-600 text-white p-3 rounded-md text-sm font-medium">
              {t("checkins.pdf-sent-to")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-type">Tipo de contacto</Label>
              <Select value={interactionType} onValueChange={(value) => setInteractionType(value as MeetingTypeType)}>
                <SelectTrigger id="interaction-type" data-testid="select-followup-contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MeetingType.VISITA}>{t("checkins.type.visit")}</SelectItem>
                  <SelectItem value={MeetingType.LLAMADA}>{t("checkins.type.call")}</SelectItem>
                  <SelectItem value={MeetingType.VIDEOLLAMADA}>{t("checkins.type.video")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Destinatarios de la minuta */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Destinatarios de la minuta
              </Label>

              {/* Chips — todos los destinatarios (precargados + extras) */}
              <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[52px]">
                {emailList.length === 0 && (
                  <span className="text-xs text-muted-foreground self-center">{t("checkins.loading-recipients")}</span>
                )}
                {emailList.map((email) => {
                  const defaultRecipient = recipientsData?.recipients?.find(r => r.email === email);
                  return (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border text-sm"
                      data-testid={`chip-email-${email}`}
                    >
                      <span className="flex flex-col leading-tight">
                        <span>{email}</span>
                        {defaultRecipient && (
                          <span className="text-[10px] text-muted-foreground">{defaultRecipient.label}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCheckinEmail(email)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0"
                        data-testid={`remove-email-${email}`}
                        title="Quitar destinatario"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Input + botón agregar correo adicional */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t("checkins.add-email")}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheckinEmail(); } }}
                  disabled={checkoutMutation.isPending}
                  data-testid="input-add-email"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCheckinEmail}
                  disabled={checkoutMutation.isPending || !emailInput.trim()}
                  data-testid="button-add-email"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes quitar destinatarios con la X o agregar otros con el campo de arriba.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="checkout-notes">
                {t("checkins.agreements-for-client")}
              </Label>
              <Textarea
                id="checkout-notes"
                data-testid="textarea-checkout-notes"
                placeholder={t("checkins.notes-ph")}
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs font-medium text-destructive">
                {t("checkins.agreements-hint")}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="internal-notes">
                {t("checkins.internal-title")}
              </Label>
              <Textarea
                id="internal-notes"
                data-testid="textarea-internal-notes"
                placeholder={t("checkins.internal-private-ph")}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="min-h-[80px] border-dashed"
              />
              <p className="text-xs text-muted-foreground">
                {t("checkins.internal-hint")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={checkoutMutation.isPending}
              data-testid="button-cancel-checkout"
            >
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Guardar contacto y generar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent data-testid="dialog-close-followup" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar seguimiento</DialogTitle>
            <DialogDescription>¿Cómo terminó esta oportunidad? El historial de contactos se conservará.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="followup-outcome">Resultado</Label>
              <Select value={followUpOutcome} onValueChange={setFollowUpOutcome}>
                <SelectTrigger id="followup-outcome" data-testid="select-followup-outcome">
                  <SelectValue placeholder="Selecciona el resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FollowUpOutcome.SALE} className="focus:text-white data-[highlighted]:text-white">Venta concretada</SelectItem>
                  <SelectItem value={FollowUpOutcome.RENTAL} className="focus:text-white data-[highlighted]:text-white">Renta concretada</SelectItem>
                  <SelectItem value={FollowUpOutcome.NOT_CONVERTED} className="focus:text-white data-[highlighted]:text-white">No concretada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {followUpOutcome === FollowUpOutcome.NOT_CONVERTED && (
              <div className="space-y-2">
                <Label htmlFor="followup-reason">Motivo por el que no se concretó *</Label>
                <Textarea
                  id="followup-reason"
                  value={followUpReason}
                  onChange={(event) => setFollowUpReason(event.target.value)}
                  placeholder="Describe brevemente el motivo"
                  className="min-h-[90px]"
                  data-testid="textarea-followup-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)} disabled={closeFollowUpMutation.isPending}>
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={() => closeFollowUpMutation.mutate()}
              disabled={
                closeFollowUpMutation.isPending
                || !followUpOutcome
                || (followUpOutcome === FollowUpOutcome.NOT_CONVERTED && !followUpReason.trim())
              }
              data-testid="button-confirm-close-followup"
            >
              {closeFollowUpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
