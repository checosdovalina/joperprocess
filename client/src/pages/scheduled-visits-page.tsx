import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScheduledVisit, Customer, InsertScheduledVisit, MeetingType } from "@shared/schema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, Trash2, Edit2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { CustomerCombobox } from "@/components/customer-combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ScheduledVisitsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ScheduledVisit | null>(null);
  const [formData, setFormData] = useState<Partial<InsertScheduledVisit>>({
    customerId: "",
    meetingType: MeetingType.VISITA,
    scheduledDate: new Date(),
    topics: [],
    notes: "",
    reminderMinutes: 0,
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [topicsInput, setTopicsInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: visits, isLoading } = useQuery<(ScheduledVisit & { customer: Customer })[]>({
    queryKey: ["/api/scheduled-visits"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertScheduledVisit) => {
      const res = await apiRequest("POST", "/api/scheduled-visits", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-visits"] });
      queryClient.resetQueries({ queryKey: ["/api/scheduled-visits/today"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t("visits.toast-scheduled"),
        description: t("visits.toast-scheduled-desc"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("visits.toast-schedule-error"),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertScheduledVisit> }) => {
      const res = await apiRequest("PATCH", `/api/scheduled-visits/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-visits"] });
      queryClient.resetQueries({ queryKey: ["/api/scheduled-visits/today"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t("visits.toast-updated"),
        description: t("visits.toast-updated-desc"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("visits.toast-update-error"),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/scheduled-visits/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-visits"] });
      queryClient.resetQueries({ queryKey: ["/api/scheduled-visits/today"] });
      toast({
        title: t("visits.toast-cancelled"),
        description: t("visits.toast-cancelled-desc"),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: error.message || t("visits.toast-cancel-error"),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customerId: "",
      meetingType: MeetingType.VISITA,
      scheduledDate: new Date(),
      topics: [],
      notes: "",
      reminderMinutes: 0,
    });
    setSelectedDate(undefined);
    setSelectedTime("09:00");
    setTopicsInput("");
    setEditingVisit(null);
  };

  const handleSubmit = () => {
    if (!formData.customerId || !selectedDate) {
      toast({
        variant: "destructive",
        title: t("label.error"),
        description: t("visits.complete-required"),
      });
      return;
    }

    const topics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const scheduledDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    scheduledDate.setHours(hours || 0, minutes || 0, 0, 0);

    const data = {
      customerId: formData.customerId,
      meetingType: formData.meetingType || MeetingType.VISITA,
      scheduledDate,
      topics: topics,
      notes: formData.notes ?? "",
      reminderMinutes: formData.reminderMinutes ?? 0,
    };

    if (editingVisit) {
      updateMutation.mutate({ id: editingVisit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (visit: ScheduledVisit & { customer: Customer }) => {
    setEditingVisit(visit);
    setFormData({
      customerId: visit.customerId,
      meetingType: visit.meetingType || MeetingType.VISITA,
      scheduledDate: new Date(visit.scheduledDate),
      topics: visit.topics,
      notes: visit.notes || "",
      reminderMinutes: visit.reminderMinutes || 0,
    });
    setSelectedDate(new Date(visit.scheduledDate));
    setSelectedTime(format(new Date(visit.scheduledDate), "HH:mm"));
    setTopicsInput(visit.topics.join(", "));
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("visits.confirm-cancel"))) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="default" data-testid={`badge-status-scheduled`}>{t("visits.status-scheduled")}</Badge>;
      case "completed":
        return <Badge variant="secondary" data-testid={`badge-status-completed`}>{t("visits.status-completed")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>{t("visits.status-cancelled")}</Badge>;
      default:
        return <Badge data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  // Summary counts (always from full list)
  const scheduledVisits = visits?.filter(v => v.status === "scheduled") || [];
  const completedVisits = visits?.filter(v => v.status === "completed") || [];
  const cancelledVisits = visits?.filter(v => v.status === "cancelled") || [];

  const hasActiveFilters = searchText !== "" || filterStatus !== "all" || filterType !== "all" || filterDateFrom !== "" || filterDateTo !== "";

  const filteredVisits = (visits ?? []).filter(v => {
    if (filterStatus !== "all" && v.status !== filterStatus) return false;
    if (filterType !== "all" && v.meetingType !== filterType) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!v.customer?.name?.toLowerCase().includes(s)) return false;
    }
    if (filterDateFrom) {
      const from = startOfDay(parseISO(filterDateFrom));
      if (new Date(v.scheduledDate) < from) return false;
    }
    if (filterDateTo) {
      const to = endOfDay(parseISO(filterDateTo));
      if (new Date(v.scheduledDate) > to) return false;
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-xl md:text-3xl font-bold" data-testid="title-scheduled-visits">{t("visits.title")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="default" data-testid="button-create-visit" className="shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t("visits.new")}</span>
              <span className="sm:hidden ml-1">{t("visits.new-short")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-visit">
            <DialogHeader>
              <DialogTitle data-testid="title-dialog">
                {editingVisit ? t("visits.edit-title") : t("visits.new-title")}
              </DialogTitle>
              <DialogDescription>
                {editingVisit ? t("visits.edit-desc") : t("visits.new-desc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer" data-testid="label-customer">{t("label.client")}</Label>
                <CustomerCombobox
                  customers={customers || []}
                  value={formData.customerId || ""}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  placeholder={t("visits.search-customer")}
                  data-testid="select-customer"
                />
              </div>

              <div>
                <Label htmlFor="meetingType" data-testid="label-meeting-type">{t("checkins.meeting-type")}</Label>
                <Select
                  value={formData.meetingType}
                  onValueChange={(value) => setFormData({ ...formData, meetingType: value })}
                >
                  <SelectTrigger data-testid="select-meeting-type">
                    <SelectValue placeholder={t("checkins.select-type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MeetingType.VISITA}>{t("checkins.type.visit")}</SelectItem>
                    <SelectItem value={MeetingType.LLAMADA}>{t("checkins.type.call")}</SelectItem>
                    <SelectItem value={MeetingType.VIDEOLLAMADA}>{t("checkins.type.video")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label data-testid="label-date">{t("visits.scheduled-date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>{t("visits.select-date")}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="visit-time" data-testid="label-time">{t("visits.scheduled-time")}</Label>
                <Input
                  id="visit-time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  data-testid="input-visit-time"
                />
              </div>

              <div>
                <Label htmlFor="visit-reminder" data-testid="label-reminder">{t("visits.reminder-label")}</Label>
                <Select
                  value={String(formData.reminderMinutes ?? 0)}
                  onValueChange={(value) => setFormData({ ...formData, reminderMinutes: Number(value) })}
                >
                  <SelectTrigger data-testid="select-visit-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("visits.reminder-none")}</SelectItem>
                    <SelectItem value="60">{t("visits.reminder-one-hour")}</SelectItem>
                    <SelectItem value="1440">{t("visits.reminder-one-day")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">{t("visits.reminder-help")}</p>
              </div>

              <div>
                <Label htmlFor="topics" data-testid="label-topics">{t("visits.topics-label")}</Label>
                <Input
                  id="topics"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder={t("visits.topics-placeholder")}
                  data-testid="input-topics"
                />
              </div>

              <div>
                <Label htmlFor="notes" data-testid="label-notes">{t("visits.additional-notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t("visits.notes-placeholder")}
                  data-testid="textarea-notes"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
                data-testid="button-submit"
              >
                {editingVisit ? t("visits.update-btn") : t("visits.schedule-btn")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-scheduled">{t("visits.card-scheduled")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-scheduled">{scheduledVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-completed">{t("visits.card-completed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-completed">{completedVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-cancelled">{t("visits.card-cancelled")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-cancelled">{cancelledVisits.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Visits Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle data-testid="card-title-visits">{t("visits.all")}</CardTitle>
              <CardDescription data-testid="card-description-visits">
                {filteredVisits.length} {t("visits.of")} {visits?.length || 0} {t("visits.count-suffix")}
              </CardDescription>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
            <div className="flex-1 min-w-[180px]">
              <Input
                placeholder={t("visits.search-customer")}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                data-testid="input-search-visit"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder={t("label.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("visits.all-statuses")}</SelectItem>
                <SelectItem value="scheduled">{t("visits.status-scheduled")}</SelectItem>
                <SelectItem value="completed">{t("visits.status-completed")}</SelectItem>
                <SelectItem value="cancelled">{t("visits.status-cancelled")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
                <SelectValue placeholder={t("label.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("visits.all-types")}</SelectItem>
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
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredVisits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-customer">{t("label.client")}</TableHead>
                  <TableHead data-testid="header-date">{t("label.date")}</TableHead>
                  <TableHead data-testid="header-reminder">{t("visits.reminder-label")}</TableHead>
                  <TableHead>{t("label.type")}</TableHead>
                  <TableHead data-testid="header-topics">{t("visits.topics")}</TableHead>
                  <TableHead data-testid="header-status">{t("label.status")}</TableHead>
                  <TableHead data-testid="header-actions">{t("label.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((visit) => (
                  <TableRow key={visit.id} className="hover-elevate" data-testid={`row-visit-${visit.id}`}>
                    <TableCell data-testid={`cell-customer-${visit.id}`}>{visit.customer.name}</TableCell>
                    <TableCell data-testid={`cell-date-${visit.id}`}>
                      {format(new Date(visit.scheduledDate), "PPP p", { locale: es })}
                    </TableCell>
                    <TableCell data-testid={`cell-reminder-${visit.id}`}>
                      {visit.reminderMinutes === 60
                        ? t("visits.reminder-one-hour")
                        : visit.reminderMinutes === 1440
                          ? t("visits.reminder-one-day")
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{visit.meetingType || MeetingType.VISITA}</Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-topics-${visit.id}`}>
                      <div className="flex flex-wrap gap-1">
                        {visit.topics.map((topic, index) => (
                          <Badge key={index} variant="outline" data-testid={`badge-topic-${index}`}>
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`cell-status-${visit.id}`}>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell data-testid={`cell-actions-${visit.id}`}>
                      {visit.status === "scheduled" && (
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEdit(visit)}
                            data-testid={`button-edit-${visit.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDelete(visit.id)}
                            data-testid={`button-delete-${visit.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : visits && visits.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
              {t("visits.no-match")}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-visits">
              {t("visits.no-results")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
