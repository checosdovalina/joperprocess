import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Checkin, Customer, InsertCheckin, ScheduledVisit, MeetingType } from "@shared/schema";
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
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertCheckin>>({
    customerId: "",
    meetingType: MeetingType.VISITA,
    latitude: "",
    longitude: "",
    topics: [],
    notes: "",
    photos: [],
  });
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: checkins, isLoading } = useQuery<(Checkin & { customer: Customer })[]>({
    queryKey: ["/api/checkins"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: todayVisits } = useQuery<(ScheduledVisit & { customer: Customer })[]>({
    queryKey: ["/api/scheduled-visits/today"],
  });

  const convertVisitMutation = useMutation({
    mutationFn: async ({ id, lat, lng }: { id: string; lat: number; lng: number }) => {
      const res = await apiRequest("POST", `/api/scheduled-visits/${id}/convert`, {
        latitude: lat.toString(),
        longitude: lng.toString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
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
          const { latitude, longitude } = position.coords;
          convertVisitMutation.mutate({ id: visitId, lat: latitude, lng: longitude });
          setGettingLocation(false);
        },
        (error) => {
          setGettingLocation(false);
          toast({
            title: t("checkins.toast-location-error"),
            description: t("checkins.toast-location-error-desc"),
            variant: "destructive",
          });
        }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      setIsDialogOpen(false);
      setFormData({
        customerId: "",
        meetingType: MeetingType.VISITA,
        latitude: "",
        longitude: "",
        topics: [],
        notes: "",
        photos: [],
      });
      setLocation(null);
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
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setFormData({
            ...formData,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
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
        }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertCheckin);
  };

  const hasActiveFilters = searchText !== "" || filterStatus !== "all" || filterType !== "all" || filterDateFrom !== "" || filterDateTo !== "";

  const filteredCheckins = (checkins ?? []).filter(c => {
    if (filterStatus === "active" && c.checkoutAt) return false;
    if (filterStatus === "done" && !c.checkoutAt) return false;
    if (filterType !== "all" && c.meetingType !== filterType) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!c.customer?.name?.toLowerCase().includes(s)) return false;
    }
    if (filterDateFrom) {
      const from = startOfDay(parseISO(filterDateFrom));
      if (new Date(c.checkinAt) < from) return false;
    }
    if (filterDateTo) {
      const to = endOfDay(parseISO(filterDateTo));
      if (new Date(c.checkinAt) > to) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setSearchText("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
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
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl max-h-[min(760px,calc(100dvh-1.5rem))] gap-0 overflow-hidden rounded-xl p-0">
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
                  <Label htmlFor="customer" className="text-sm font-medium">{t("label.client")} *</Label>
                  <CustomerCombobox
                    customers={customers || []}
                    value={formData.customerId || ""}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                    placeholder={t("checkins.search-customer")}
                    data-testid="select-checkin-customer"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
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

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  className="sm:min-w-24"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" className="sm:min-w-32" disabled={createMutation.isPending} data-testid="button-save-checkin">
                  {createMutation.isPending ? (
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
            <div className="flex-1 min-w-[180px]">
              <Input
                placeholder={t("checkins.search-customer")}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                data-testid="input-search-checkin"
              />
            </div>
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
