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
import { Plus, Calendar as CalendarIcon, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
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

  // Filter visits by status
  const scheduledVisits = visits?.filter(v => v.status === "scheduled") || [];
  const completedVisits = visits?.filter(v => v.status === "completed") || [];
  const cancelledVisits = visits?.filter(v => v.status === "cancelled") || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="title-scheduled-visits">Visitas Programadas</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-visit">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Visita
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
          <CardTitle data-testid="card-title-visits">Todas las Visitas</CardTitle>
          <CardDescription data-testid="card-description-visits">
            Gestiona y revisa tus visitas programadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : visits && visits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-customer">Cliente</TableHead>
                  <TableHead data-testid="header-date">Fecha</TableHead>
                  <TableHead data-testid="header-topics">Temas</TableHead>
                  <TableHead data-testid="header-status">Estado</TableHead>
                  <TableHead data-testid="header-actions">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                    <TableCell data-testid={`cell-customer-${visit.id}`}>{visit.customer.name}</TableCell>
                    <TableCell data-testid={`cell-date-${visit.id}`}>
                      {format(new Date(visit.scheduledDate), "PPP", { locale: es })}
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
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(visit)}
                            data-testid={`button-edit-${visit.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
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
