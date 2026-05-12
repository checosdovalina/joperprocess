import { useState } from "react";
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
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ScheduledVisit | null>(null);
  const [formData, setFormData] = useState<Partial<InsertScheduledVisit>>({
    customerId: "",
    meetingType: MeetingType.VISITA,
    scheduledDate: new Date(),
    topics: [],
    notes: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
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
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Visita programada",
        description: "La visita se programó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo programar la visita",
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
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Visita actualizada",
        description: "La visita se actualizó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la visita",
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
      toast({
        title: "Visita cancelada",
        description: "La visita se canceló correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo cancelar la visita",
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
    });
    setSelectedDate(undefined);
    setTopicsInput("");
    setEditingVisit(null);
  };

  const handleSubmit = () => {
    if (!formData.customerId || !selectedDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa los campos requeridos",
      });
      return;
    }

    const topics = topicsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const data = {
      customerId: formData.customerId,
      meetingType: formData.meetingType || MeetingType.VISITA,
      scheduledDate: selectedDate,
      topics: topics,
      notes: formData.notes ?? "",
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
    });
    setSelectedDate(new Date(visit.scheduledDate));
    setTopicsInput(visit.topics.join(", "));
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de cancelar esta visita?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="default" data-testid={`badge-status-scheduled`}>Programada</Badge>;
      case "completed":
        return <Badge variant="secondary" data-testid={`badge-status-completed`}>Completada</Badge>;
      case "cancelled":
        return <Badge variant="destructive" data-testid={`badge-status-cancelled`}>Cancelada</Badge>;
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
        <h1 className="text-xl md:text-3xl font-bold" data-testid="title-scheduled-visits">Visitas Programadas</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="default" data-testid="button-create-visit" className="shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Nueva Visita</span>
              <span className="sm:hidden ml-1">Nueva</span>
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-visit">
            <DialogHeader>
              <DialogTitle data-testid="title-dialog">
                {editingVisit ? "Editar Visita" : "Programar Nueva Visita"}
              </DialogTitle>
              <DialogDescription>
                {editingVisit ? "Modifica los detalles de la visita" : "Programa una nueva visita a cliente"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer" data-testid="label-customer">Cliente</Label>
                <CustomerCombobox
                  customers={customers || []}
                  value={formData.customerId || ""}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  placeholder="Buscar cliente..."
                  data-testid="select-customer"
                />
              </div>

              <div>
                <Label htmlFor="meetingType" data-testid="label-meeting-type">Tipo de Reunión</Label>
                <Select
                  value={formData.meetingType}
                  onValueChange={(value) => setFormData({ ...formData, meetingType: value })}
                >
                  <SelectTrigger data-testid="select-meeting-type">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MeetingType.VISITA}>Visita</SelectItem>
                    <SelectItem value={MeetingType.LLAMADA}>Llamada</SelectItem>
                    <SelectItem value={MeetingType.VIDEOLLAMADA}>Videollamada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label data-testid="label-date">Fecha programada</Label>
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
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
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
                <Label htmlFor="topics" data-testid="label-topics">Temas a tratar (separados por coma)</Label>
                <Input
                  id="topics"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder="Cotización, Cobranza, Nuevos productos"
                  data-testid="input-topics"
                />
              </div>

              <div>
                <Label htmlFor="notes" data-testid="label-notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional sobre la visita"
                  data-testid="textarea-notes"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
                data-testid="button-submit"
              >
                {editingVisit ? "Actualizar Visita" : "Programar Visita"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-scheduled">Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-scheduled">{scheduledVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-completed">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-count-completed">{completedVisits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-cancelled">Canceladas</CardTitle>
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
              <CardTitle data-testid="card-title-visits">Todas las Visitas</CardTitle>
              <CardDescription data-testid="card-description-visits">
                {filteredVisits.length} de {visits?.length || 0} visitas
              </CardDescription>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
            <div className="flex-1 min-w-[180px]">
              <Input
                placeholder="Buscar cliente..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                data-testid="input-search-visit"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="scheduled">Programada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value={MeetingType.VISITA}>Visita</SelectItem>
                <SelectItem value={MeetingType.LLAMADA}>Llamada</SelectItem>
                <SelectItem value={MeetingType.VIDEOLLAMADA}>Videollamada</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
                title="Desde"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
                title="Hasta"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
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
                  <TableHead data-testid="header-customer">Cliente</TableHead>
                  <TableHead data-testid="header-date">Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead data-testid="header-topics">Temas</TableHead>
                  <TableHead data-testid="header-status">Estado</TableHead>
                  <TableHead data-testid="header-actions">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((visit) => (
                  <TableRow key={visit.id} className="hover-elevate" data-testid={`row-visit-${visit.id}`}>
                    <TableCell data-testid={`cell-customer-${visit.id}`}>{visit.customer.name}</TableCell>
                    <TableCell data-testid={`cell-date-${visit.id}`}>
                      {format(new Date(visit.scheduledDate), "PPP", { locale: es })}
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
              Ninguna visita coincide con los filtros aplicados
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-visits">
              No hay visitas programadas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
