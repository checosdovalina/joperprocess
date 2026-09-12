import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Checkin, Customer, InsertCheckin, ScheduledVisit, MeetingType, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, MapPin, Loader2, FileText, Calendar, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { CustomerCombobox } from "@/components/customer-combobox";
import { useAuth } from "@/hooks/use-auth";

export default function CheckinsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checkinToDelete, setCheckinToDelete] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isProspectMode, setIsProspectMode] = useState(false);
  const [creatingProspect, setCreatingProspect] = useState(false);
  const [prospectData, setProspectData] = useState({ name: "", address: "", phone: "" });
  const [formData, setFormData] = useState<Partial<InsertCheckin>>({
    customerId: "",
    meetingType: MeetingType.VISITA,
    latitude: "",
    longitude: "",
    topics: [],
    notes: "",
    photos: [],
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCustomerId, setFilterCustomerId] = useState("all");
  const [filterSellerId, setFilterSellerId] = useState("all");

  type CheckinWithRelations = Checkin & { customer: Customer; user?: User; salesPerson?: User | null };
  type VisitWithRelations = ScheduledVisit & { customer: Customer; salesPerson?: User | null };
  type ActivityResponse = {
    items: CheckinWithRelations[];
    dailySummary: { date: string; count: number; prospectCount: number }[];
    total: number;
    prospectVisits: number;
  };
  const activityParams = new URLSearchParams();
  if (filterDateFrom) activityParams.set("from", new Date(`${filterDateFrom}T00:00:00`).toISOString());
  if (filterDateTo) {
    const exclusiveEnd = new Date(`${filterDateTo}T00:00:00`);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    activityParams.set("to", exclusiveEnd.toISOString());
  }
  if (filterCustomerId !== "all") activityParams.set("customerId", filterCustomerId);
  if (filterType !== "all") activityParams.set("meetingType", filterType);
  if (filterStatus !== "all") activityParams.set("status", filterStatus);
  if (isAdmin && filterSellerId !== "all") activityParams.set("sellerId", filterSellerId);
  activityParams.set("timezoneOffsetMinutes", String(new Date().getTimezoneOffset()));
  const activityQuery = activityParams.toString();
  const { data: activity, isLoading } = useQuery<ActivityResponse>({
    queryKey: ["/api/checkins/activity", activityQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/checkins/activity${activityQuery ? `?${activityQuery}` : ""}`);
      return res.json();
    },
  });
  const checkins = activity?.items;

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
  const { data: sellers = [] } = useQuery<Pick<User, "id" | "fullName" | "username" | "role">[]>({
    queryKey: ["/api/sellers"],
  });
  const mayAssignOthers = user?.role === "admin" || user?.role === "credito_cobranza";
  const assignableSellers = mayAssignOthers ? sellers : sellers.filter((seller) => seller.id === user?.id);

  const localDayStart = new Date();
  localDayStart.setHours(0, 0, 0, 0);
  const localDayEnd = new Date(localDayStart);
  localDayEnd.setDate(localDayEnd.getDate() + 1);
  const todayStartIso = localDayStart.toISOString();
  const todayEndIso = localDayEnd.toISOString();

  const { data: todayVisits } = useQuery<VisitWithRelations[]>({
    queryKey: ["/api/scheduled-visits/today", todayStartIso, todayEndIso],
    queryFn: async () => {
      const params = new URLSearchParams({ start: todayStartIso, end: todayEndIso });
      const res = await apiRequest("GET", `/api/scheduled-visits/today?${params}`);
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const convertVisitMutation = useMutation({
    mutationFn: async ({ id, lat, lng, accuracy }: { id: string; lat: number; lng: number; accuracy: number }) => {
      const res = await apiRequest("POST", `/api/scheduled-visits/${id}/convert`, {
        latitude: lat.toString(),
        longitude: lng.toString(),
        locationAccuracyMeters: accuracy.toFixed(2),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-visits/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-visits"] });
      toast({
        title: t("checkins.toast-visit-started"),
        description: t("checkins.toast-visit-started-desc"),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("checkins.toast-convert-error"),
      });
    },
  });

  const handleConvertVisit = (visitId: string) => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          convertVisitMutation.mutate({ id: visitId, lat: latitude, lng: longitude, accuracy });
          setGettingLocation(false);
        },
        (error) => {
          setGettingLocation(false);
          toast({
            title: t("checkins.toast-location-error"),
            description: t("checkins.toast-location-error-desc"),
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } else {
      setGettingLocation(false);
      toast({
        title: t("checkins.toast-gps-unavailable"),
        description: t("checkins.toast-gps-unavailable-desc"),
        variant: "destructive",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertCheckin) => {
      const res = await apiRequest("POST", "/api/checkins", data);
      return await res.json();
    },
    onSuccess: async (createdCheckin: CheckinWithRelations) => {
      // Add the new row immediately. The query uses an infinite stale time,
      // so relying only on invalidation can leave the visible list unchanged
      // until the user refreshes the page.
      queryClient.setQueryData<CheckinWithRelations[]>(
        ["/api/checkins"],
        (current) => {
          const next = current ? current.filter(item => item.id !== createdCheckin.id) : [];
          return [{ ...createdCheckin, customer: createdCheckin.customer as Customer }, ...next];
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      setIsDialogOpen(false);
      setFormData({
        customerId: "",
        meetingType: MeetingType.VISITA,
        latitude: "",
        longitude: "",
        topics: [],
        notes: "",
        photos: [],
        salesPersonId: user?.id,
      });
      setLocation(null);
      setIsProspectMode(false);
      setProspectData({ name: "", address: "", phone: "" });
      toast({
        title: t("checkins.toast-registered"),
        description: t("checkins.toast-registered-desc"),
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/checkins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      setCheckinToDelete(null);
      toast({ title: t("checkins.toast-deleted") });
    },
    onError: () => {
      toast({ title: t("label.error"), description: t("checkins.toast-delete-error"), variant: "destructive" });
    },
  });

  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ lat: latitude, lng: longitude, accuracy });
          setFormData({
            ...formData,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            locationAccuracyMeters: accuracy.toFixed(2),
          });
          setGettingLocation(false);
          toast({
            title: t("checkins.toast-location-obtained"),
            description: t("checkins.toast-location-obtained-desc"),
          });
        },
        (error) => {
          setGettingLocation(false);
          toast({
            title: t("checkins.toast-location-error"),
            description: t("checkins.toast-location-error-desc"),
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } else {
      setGettingLocation(false);
      toast({
        title: t("checkins.toast-gps-unavailable"),
        description: t("checkins.toast-gps-unavailable-desc"),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProspectMode) {
      createMutation.mutate(formData as InsertCheckin);
      return;
    }
    if (!prospectData.name.trim()) {
      toast({ title: "Nombre requerido", description: "Captura el nombre del prospecto.", variant: "destructive" });
      return;
    }
    try {
      setCreatingProspect(true);
      const response = await apiRequest("POST", "/api/checkins/prospect", {
        prospect: prospectData,
        checkin: formData,
      });
      const createdCheckin = await response.json() as CheckinWithRelations;
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      createMutation.reset();
      queryClient.setQueryData<CheckinWithRelations[]>(
        ["/api/checkins"],
        (current) => [createdCheckin, ...(current ?? []).filter(item => item.id !== createdCheckin.id)],
      );
      await queryClient.invalidateQueries({ queryKey: ["/api/checkins/activity"] });
      setIsDialogOpen(false);
      setFormData({
        customerId: "",
        meetingType: MeetingType.VISITA,
        latitude: "",
        longitude: "",
        topics: [],
        notes: "",
        photos: [],
        salesPersonId: user?.id,
      });
      setLocation(null);
      setIsProspectMode(false);
      setProspectData({ name: "", address: "", phone: "" });
      toast({ title: "Prospecto y check-in registrados" });
    } catch (error) {
      toast({
        title: "No se pudo registrar el prospecto",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setCreatingProspect(false);
    }
  };

  const hasActiveFilters = filterStatus !== "all" || filterType !== "all" || filterDateFrom !== "" || filterDateTo !== "" || filterCustomerId !== "all" || filterSellerId !== "all";

  const filteredCheckins = (checkins ?? []).filter(c => {
    return true;
  });

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterCustomerId("all");
    setFilterSellerId("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("checkins.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("checkins.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-checkin">
              <Plus className="h-4 w-4 mr-2" />
              {t("checkins.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-auto sm:max-h-[min(760px,calc(100dvh-1.5rem))] sm:w-[calc(100%-1.5rem)]">
            <DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-5 pr-12 text-left sm:px-6">
              <DialogTitle className="flex items-center gap-2.5 text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                {t("checkins.new")}
              </DialogTitle>
              <DialogDescription className="pl-[3rem]">
                {t("checkins.dialog-desc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="customer" className="text-sm font-medium">
                      {isProspectMode ? "Prospecto" : t("label.client")} *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto border-0 p-0 text-primary hover:bg-transparent hover:underline"
                      onClick={() => setIsProspectMode(current => !current)}
                      data-testid="button-toggle-prospect"
                    >
                      {isProspectMode ? "Seleccionar cliente existente" : "Registrar prospecto"}
                    </Button>
                  </div>
                  {isProspectMode ? (
                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
                      <Input
                        value={prospectData.name}
                        onChange={(e) => setProspectData({ ...prospectData, name: e.target.value })}
                        placeholder="Nombre del prospecto *"
                        data-testid="input-prospect-name"
                      />
                      <Input
                        value={prospectData.address}
                        onChange={(e) => setProspectData({ ...prospectData, address: e.target.value })}
                        placeholder="Dirección"
                        data-testid="input-prospect-address"
                      />
                      <Input
                        type="tel"
                        value={prospectData.phone}
                        onChange={(e) => setProspectData({ ...prospectData, phone: e.target.value })}
                        placeholder="Teléfono"
                        data-testid="input-prospect-phone"
                      />
                    </div>
                  ) : (
                    <CustomerCombobox
                      customers={customers || []}
                      value={formData.customerId || ""}
                      onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                      placeholder={t("checkins.search-customer")}
                      data-testid="select-checkin-customer"
                    />
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkin-sales-person" className="text-sm font-medium">Vendedor asignado</Label>
                    <Select
                      value={formData.salesPersonId || user?.id || ""}
                      onValueChange={(value) => setFormData({ ...formData, salesPersonId: value })}
                    >
                      <SelectTrigger id="checkin-sales-person" data-testid="select-checkin-sales-person">
                        <SelectValue placeholder="Selecciona un vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableSellers.map((seller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.fullName || seller.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meetingType" className="text-sm font-medium">{t("checkins.meeting-type")} *</Label>
                    <Select
                      value={formData.meetingType}
                      onValueChange={(value) => setFormData({ ...formData, meetingType: value })}
                    >
                      <SelectTrigger id="meetingType" className="h-10" data-testid="select-meeting-type">
                        <SelectValue placeholder={t("checkins.select-type")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MeetingType.VISITA}>{t("checkins.type.visit")}</SelectItem>
                        <SelectItem value={MeetingType.LLAMADA}>{t("checkins.type.call")}</SelectItem>
                        <SelectItem value={MeetingType.VIDEOLLAMADA}>{t("checkins.type.video")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("label.gps")}</Label>
                    <Button
                      type="button"
                      variant={location ? "secondary" : "outline"}
                      className="h-10 w-full justify-start"
                      onClick={getLocation}
                      disabled={gettingLocation}
                      data-testid="button-get-location"
                    >
                      {gettingLocation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("checkins.getting-location")}
                        </>
                      ) : location ? (
                        <>
                          <MapPin className="mr-2 h-4 w-4 text-green-600" />
                          {t("checkins.location-captured")}
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          {t("checkins.capture-location")}
                        </>
                      )}
                    </Button>
                    {location && (
                      <p className="text-xs text-muted-foreground">
                        Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">{t("checkins.visit-notes")}</Label>
                  <Textarea
                    id="notes"
                    className="min-h-[120px] resize-y"
                    data-testid="textarea-checkin-notes"
                    value={formData.notes ?? ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t("checkins.notes-placeholder")}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:min-w-24"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" className="sm:min-w-32" disabled={createMutation.isPending || creatingProspect} data-testid="button-save-checkin">
                  {createMutation.isPending || creatingProspect ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("btn.saving")}
                    </>
                  ) : (
                    t("checkins.register")
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Scheduled Visits */}
      {todayVisits && todayVisits.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {t("checkins.scheduled-today")}
              </CardTitle>
              <CardDescription>
                {todayVisits.length} {todayVisits.length === 1 ? t("checkins.visit-scheduled-singular") : t("checkins.visits-scheduled-plural")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todayVisits.map((visit) => (
                <Card key={visit.id} className="hover-elevate" data-testid={`card-scheduled-visit-${visit.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{visit.customer?.name || t("checkins.no-customer")}</CardTitle>
                    <CardDescription className="text-xs">
                      {format(new Date(visit.scheduledDate), "PPP", { locale: es })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visit.topics && visit.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {visit.topics.map((topic, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {visit.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{visit.notes}</p>
                    )}
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleConvertVisit(visit.id)}
                      disabled={gettingLocation || convertVisitMutation.isPending}
                      data-testid={`button-convert-visit-${visit.id}`}
                    >
                      {convertVisitMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("checkins.starting")}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("checkins.start")}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t("checkins.history")}</CardTitle>
              <CardDescription>
                {filteredCheckins.length} {t("checkins.of")} {checkins?.length || 0} {t("checkins.visits-registered")}
              </CardDescription>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder={t("label.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("label.all")}</SelectItem>
                <SelectItem value="active">{t("status.in-progress")}</SelectItem>
                <SelectItem value="done">{t("status.done")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
                <SelectValue placeholder={t("label.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("checkins.all-types")}</SelectItem>
                <SelectItem value={MeetingType.VISITA}>{t("checkins.type.visit")}</SelectItem>
                <SelectItem value={MeetingType.LLAMADA}>{t("checkins.type.call")}</SelectItem>
                <SelectItem value={MeetingType.VIDEOLLAMADA}>{t("checkins.type.video")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
              <SelectTrigger className="w-[190px]" data-testid="select-filter-customer">
                <SelectValue placeholder={t("label.client")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("label.all")}</SelectItem>
                {(customers ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={filterSellerId} onValueChange={setFilterSellerId}>
                <SelectTrigger className="w-[190px]" data-testid="select-filter-seller">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>{seller.fullName || seller.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
                title={t("label.from")}
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
                title={t("label.to")}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("btn.clear")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isLoading && activity && activity.dailySummary.length > 0 && (
            <div className="mb-5 space-y-3" data-testid="daily-activity-summary">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Contactos registrados</div>
                  <div className="text-3xl font-bold">{activity.total}</div>
                </div>
                <div className="rounded-lg border bg-amber-50/50 p-4 dark:bg-amber-950/20">
                  <div className="text-sm text-muted-foreground">Visitas a nuevos prospectos</div>
                  <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{activity.prospectVisits}</div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-semibold">Actividad por día</div>
                <div className="space-y-3">
                  {activity.dailySummary.map((day) => (
                    <div key={day.date} className="grid gap-1 sm:grid-cols-[180px_1fr_55px] sm:items-center">
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(day.date), "PPP", { locale: es })}
                      </div>
                      <div className="h-5 overflow-hidden rounded bg-muted">
                        <div
                          className="flex h-full items-center bg-primary px-2 text-[10px] text-primary-foreground"
                          style={{ width: `${Math.max(10, (day.count / Math.max(...activity.dailySummary.map(item => item.count))) * 100)}%` }}
                        >
                          {day.prospectCount > 0 ? `${day.prospectCount} prospecto${day.prospectCount === 1 ? "" : "s"}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold">{day.count}</div>
                    </div>
                  ))}
                  </div>
                </div>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCheckins.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("checkins.col.datetime")}</TableHead>
                    <TableHead>{t("label.client")}</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>{t("label.type")}</TableHead>
                    <TableHead>{t("checkins.col.location")}</TableHead>
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckins.map((checkin) => (
                    <TableRow key={checkin.id} className="hover-elevate" data-testid={`row-checkin-${checkin.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(checkin.checkinAt), "PPP", { locale: es })}
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(checkin.checkinAt), "p", { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{checkin.customer?.name || t("checkins.no-customer")}</div>
                        <div className="text-xs text-muted-foreground">{checkin.customer?.city || "-"}</div>
                      </TableCell>
                      <TableCell>{checkin.salesPerson?.fullName || checkin.user?.fullName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{checkin.meetingType || MeetingType.VISITA}</Badge>
                      </TableCell>
                      <TableCell>
                        {checkin.latitude && checkin.longitude ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {t("checkins.gps-captured")}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("checkins.no-location")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {checkin.checkoutAt ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {t("status.done")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {t("status.ongoing")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/checkins/${checkin.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-checkin-${checkin.id}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {t("checkins.view-detail")}
                            </Button>
                          </Link>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setCheckinToDelete(checkin.id)}
                              data-testid={`button-delete-checkin-${checkin.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : checkins && checkins.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
              {t("checkins.no-match")}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("checkins.no-results")}</p>
              <Button
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-add-first-checkin"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("checkins.register-first")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!checkinToDelete} onOpenChange={(open) => { if (!open) setCheckinToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("checkins.delete-title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("checkins.delete-desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => checkinToDelete && deleteMutation.mutate(checkinToDelete)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("btn.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
