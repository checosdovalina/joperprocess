import { useParams, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Checkin, Customer } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, FileText, Loader2, ImageIcon, Download, Phone, Video, Users, Mail, X, UserPlus, Trash2, NotebookPen, Lock, Save, EyeOff } from "lucide-react";
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
  }>;
}

function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

export default function CheckinDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useI18n();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
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

  const { data: checkin, isLoading: checkinLoading } = useQuery<Checkin & { customer: Customer }>({
    queryKey: [`/api/checkins/${id}`],
    enabled: !!id,
  });

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
    }
  }, [checkin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/checkins/${id}`, {
        checkoutNotes: checkoutNotes,
        internalNotes: internalNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      toast({ title: t("checkins.toast-notes-saved"), description: t("checkins.toast-notes-saved-desc") });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: t("label.error"), description: error.message || t("label.error-save") });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/checkins/${id}/checkout`, {
        checkoutNotes: checkoutNotes || undefined,
        internalNotes: internalNotes || undefined,
        recipients: emailList.length > 0 ? emailList : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkins/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      setCheckoutDialogOpen(false);
      setEmailList([]);
      setEmailInput("");
      toast({
        title: t("checkins.toast-visit-finished"),
        description: t("checkins.toast-visit-finished-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("checkins.toast-finish-error"),
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
          {!checkin.checkoutAt && (
            <Button 
              data-testid="button-checkout"
              onClick={() => setCheckoutDialogOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("checkins.finish-visit")}
            </Button>
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
                {checkin.checkoutAt ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    {t("status.done")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    {t("status.ongoing")}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("checkins.meeting-type")}</div>
              <div className="mt-1">
                {!checkin.checkoutAt ? (
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

            {checkin.checkoutAt && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("checkins.checkout-label")}</div>
                <div className="mt-1 text-sm">
                  {format(new Date(checkin.checkoutAt), "PPP 'a las' p", { locale: es })}
                </div>
              </div>
            )}

            {checkin.latitude && checkin.longitude && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("label.gps")}</div>
                <div className="mt-1 text-xs font-mono bg-muted p-2 rounded">
                  Lat: {parseFloat(checkin.latitude).toFixed(6)}<br />
                  Lng: {parseFloat(checkin.longitude).toFixed(6)}
                </div>
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

      {/* ── Acuerdos y Comentarios ── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-blue-600" />
              {t("checkins.agreements")}
            </CardTitle>
            <CardDescription className="mt-1">
              {checkin.checkoutAt
                ? t("checkins.notes-registered")
                : t("checkins.add-agreements")}
            </CardDescription>
          </div>
          {!checkin.checkoutAt && (
            <Button
              data-testid="button-save-notes"
              onClick={() => saveNotesMutation.mutate()}
              disabled={saveNotesMutation.isPending}
              size="default"
            >
              {saveNotesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar notas
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Acuerdos para el cliente */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              {t("checkins.agreements")}
              <span className="text-xs font-normal text-muted-foreground ml-1">{t("checkins.go-in-minute")}</span>
            </Label>
            {checkin.checkoutAt ? (
              checkin.checkoutNotes ? (
                <div className="text-sm rounded-md bg-muted/50 px-3 py-3 whitespace-pre-wrap leading-relaxed">
                  {checkin.checkoutNotes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin acuerdos registrados.</p>
              )
            ) : (
              <>
                <Textarea
                  data-testid="textarea-notes-agreements"
                  placeholder={t("checkins.agreements-ph")}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  className="min-h-[110px] text-sm"
                />
                <p className="text-xs font-medium text-destructive">
                  {t("checkins.agreements-hint")}
                </p>
              </>
            )}
          </div>

          {/* Notas internas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              {t("checkins.internal-notes")}
              <span className="text-xs font-normal text-muted-foreground ml-1">{t("checkins.internal-not-sent")}</span>
            </Label>
            {checkin.checkoutAt ? (
              checkin.internalNotes ? (
                <div className="text-sm rounded-md bg-muted/30 border border-dashed px-3 py-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                    <Lock className="h-3 w-3" /> Solo visible internamente
                  </div>
                  {checkin.internalNotes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t("checkins.no-internal-notes")}</p>
              )
            ) : (
              <>
                <Textarea
                  data-testid="textarea-notes-internal"
                  placeholder={t("checkins.internal-ph")}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="min-h-[80px] text-sm border-dashed"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> {t("checkins.private-notes-hint")}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("checkins.photos-title")}</CardTitle>
          <CardDescription>
            {checkin.photos?.length || 0} {t("checkins.photos-count-suffix")}
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {!checkin.checkoutAt && (
            <div>
              <h3 className="text-sm font-medium mb-3">{t("checkins.add-photos")}</h3>
              <CheckinPhotoUploader
                checkinId={checkin.id}
                currentPhotoCount={checkin.photos?.length || 0}
              />
            </div>
          )}

          {checkin.checkoutAt && (checkin.photos?.length || 0) === 0 && (
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
            <DialogTitle>{t("checkins.finish-visit")}</DialogTitle>
            <DialogDescription>
              {t("checkins.pdf-will-generate")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Leyenda de advertencia */}
            <div className="bg-red-600 text-white p-3 rounded-md text-sm font-medium">
              {t("checkins.pdf-sent-to")}
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
                  Finalizar y Generar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
