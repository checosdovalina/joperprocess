import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Incident, Customer, User, IncidentType, IncidentStatus, IncidentUrgency, ShipmentProductInstance, Product, UserRole } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Filter,
  X,
  Loader2,
  FileDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User2,
  Building2,
  MessageSquare,
  Link2,
  Copy,
  ExternalLink,
  Barcode,
  Package,
  RefreshCw,
  Check,
  ChevronsUpDown,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type IncidentWithDetails = Incident & {
  customer: Customer;
  assignee: User | null;
  creator: User | null;
};

const incidentFormSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  productInstanceId: z.string().optional(),
  type: z.enum([
    IncidentType.GARANTIA,
    IncidentType.RETRABAJO,
    IncidentType.QUEJA,
    IncidentType.CONSULTA,
    IncidentType.ADMINISTRATIVO,
  ]),
  urgency: z.enum([
    IncidentUrgency.BAJA,
    IncidentUrgency.MEDIA,
    IncidentUrgency.ALTA,
    IncidentUrgency.CRITICA,
  ]),
  subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

type ProductInstanceWithProduct = ShipmentProductInstance & { product: Product };

type IncidentFormData = z.infer<typeof incidentFormSchema>;

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

export default function IncidentsPage() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [incidentToDelete, setIncidentToDelete] = useState<IncidentWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterUrgency, setFilterUrgency] = useState<string>("");
  const [showResolved, setShowResolved] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewIncident, setPreviewIncident] = useState<IncidentWithDetails | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const { toast } = useToast();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      customerId: "",
      productInstanceId: "",
      type: IncidentType.CONSULTA,
      urgency: IncidentUrgency.MEDIA,
      subject: "",
      description: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const selectedCustomerId = form.watch("customerId");

  const { data: customerProductInstances } = useQuery<ProductInstanceWithProduct[]>({
    queryKey: ["/api/product-instances", { customerId: selectedCustomerId }],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const response = await fetch(`/api/product-instances?customerId=${selectedCustomerId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error fetching product instances");
      return response.json();
    },
    enabled: !!selectedCustomerId,
  });

  const { data: incidents, isLoading } = useQuery<IncidentWithDetails[]>({
    queryKey: ["/api/incidents", { status: filterStatus, type: filterType, urgency: filterUrgency, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterType) params.append("type", filterType);
      if (filterUrgency) params.append("urgency", filterUrgency);
      if (searchQuery) params.append("search", searchQuery);
      const response = await fetch(`/api/incidents?${params.toString()}`, {
        credentials: "include",
      });
      return response.json();
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = useMemo(() => {
    const list = customers ?? [];
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const query = normalize(customerSearch);
    if (!query) return list;
    return list.filter((c) => normalize(c.name).includes(query));
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const response = await apiRequest("POST", "/api/incidents", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Incidente creado",
        description: `Se ha creado el incidente ${data.ticketNumber}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el incidente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncidentFormData) => {
    createMutation.mutate(data);
  };

  const copyAccessLink = (incident: IncidentWithDetails) => {
    const url = `${window.location.origin}/public/incidents/${incident.accessToken}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace de acceso se ha copiado al portapapeles.",
    });
  };

  const renewTokenMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const response = await apiRequest("POST", `/api/incidents/${incidentId}/renew-token`, {});
      return response.json();
    },
    onSuccess: (data, incidentId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      const url = `${window.location.origin}/public/incidents/${data.accessToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast({
        title: "Enlace renovado",
        description: "Se generó un nuevo enlace y se copió al portapapeles.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo renovar el enlace.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      await apiRequest("DELETE", `/api/incidents/${incidentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIncidentToDelete(null);
      toast({ title: "Incidencia eliminada", description: "Se eliminó correctamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la incidencia.", variant: "destructive" });
    },
  });

  const ACTIVE_STATUSES = ["nuevo", "asignado", "en_proceso", "esperando_cliente", "esperando_interno"];

  const downloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch("/api/incidents", { credentials: "include" });
      const allIncidents: IncidentWithDetails[] = await response.json();
      const vigentes = allIncidents.filter((i) => ACTIVE_STATUSES.includes(i.status));

      const incidentData = vigentes.map((i) => ({
        ticketNumber: i.ticketNumber,
        customerName: (i as any).customer?.name || "—",
        type: i.type,
        urgency: i.urgency,
        status: i.status,
        subject: i.subject,
        description: i.description,
        assignedArea: i.assignedArea || null,
        assignedUserName: (i as any).assignedUser?.fullName || null,
        contactName: i.contactName || null,
        resolution: i.resolution || null,
        createdAt: i.createdAt,
      }));

      const pdfResp = await fetch("/api/reports/incidents/pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents: incidentData }),
      });

      if (!pdfResp.ok) throw new Error("Error al generar el PDF");
      const blob = await pdfResp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-incidentes-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "No se pudo generar el reporte.", variant: "destructive" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterType("");
    setFilterUrgency("");
    setSearchQuery("");
  };

  const hasActiveFilters = filterStatus || filterType || filterUrgency || searchQuery;

  const CLOSED_STATUSES = ["resuelto", "cerrado", "cancelado"];
  const visibleIncidents = useMemo(() => {
    if (!incidents) return incidents;
    if (showResolved || filterStatus) return incidents;
    return incidents.filter((i) => !CLOSED_STATUSES.includes(i.status));
  }, [incidents, showResolved, filterStatus]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <AlertTriangle className="h-6 w-6" />
            {t("incidents.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("incidents.subtitle")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <Button
            variant="outline"
            onClick={downloadPdf}
            disabled={isDownloadingPdf}
            className="w-full sm:w-auto"
            data-testid="button-download-incidents-pdf"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Reporte Vigentes
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto"
            data-testid="button-create-incident"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("incidents.new")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">{t("incidents.list")}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ticket, asunto..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Button
                variant={showResolved ? "default" : "outline"}
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                data-testid="button-toggle-resolved"
              >
                {showResolved ? "Ocultar resueltas" : "Ver resueltas"}
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="w-48">
                <Select value={filterStatus || "_all"} onValueChange={(v) => setFilterStatus(v === "_all" ? "" : v)}>
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={filterType || "_all"} onValueChange={(v) => setFilterType(v === "_all" ? "" : v)}>
                  <SelectTrigger data-testid="select-filter-type">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={filterUrgency || "_all"} onValueChange={(v) => setFilterUrgency(v === "_all" ? "" : v)}>
                  <SelectTrigger data-testid="select-filter-urgency">
                    <SelectValue placeholder="Urgencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {Object.entries(urgencyLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !visibleIncidents || visibleIncidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {incidents && incidents.length > 0 && !hasActiveFilters && !showResolved
                  ? 'No hay incidencias abiertas. Activa "Ver resueltas" para ver las cerradas.'
                  : hasActiveFilters
                  ? t("incidents.no-results-filter")
                  : t("incidents.no-results")}
              </p>
            </div>
          ) : (
            <>
            {/* Mobile card list */}
            <div className="space-y-3 md:hidden">
              {visibleIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-md border p-3 space-y-2 hover-elevate cursor-pointer"
                  onClick={() => setPreviewIncident(incident)}
                  data-testid={`card-incident-${incident.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium text-sm" data-testid={`text-ticket-mobile-${incident.id}`}>
                      {incident.ticketNumber}
                    </span>
                    {getStatusBadge(incident.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{incident.customer?.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{incident.subject}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {getTypeBadge(incident.type)}
                    {getUrgencyBadge(incident.urgency)}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(incident.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${incident.id}`);
                        }}
                        data-testid={`button-view-mobile-${incident.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyAccessLink(incident);
                        }}
                        title="Copiar enlace"
                        data-testid={`button-copy-link-mobile-${incident.id}`}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIncidentToDelete(incident);
                          }}
                          title="Eliminar"
                          className="text-destructive"
                          data-testid={`button-delete-mobile-${incident.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("label.ticket")}</TableHead>
                    <TableHead>{t("label.client")}</TableHead>
                    <TableHead>{t("label.subject")}</TableHead>
                    <TableHead>{t("label.type")}</TableHead>
                    <TableHead>{t("label.urgency")}</TableHead>
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead>{t("label.assigned-to")}</TableHead>
                    <TableHead>{t("label.date")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleIncidents.map((incident) => (
                    <TableRow
                      key={incident.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => setPreviewIncident(incident)}
                      data-testid={`row-incident-${incident.id}`}
                    >
                      <TableCell className="font-mono font-medium" data-testid={`text-ticket-${incident.id}`}>
                        {incident.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{incident.customer?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{incident.subject}</TableCell>
                      <TableCell>{getTypeBadge(incident.type)}</TableCell>
                      <TableCell>{getUrgencyBadge(incident.urgency)}</TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell>
                        {incident.assignee ? (
                          <div className="flex items-center gap-1">
                            <User2 className="h-3 w-3" />
                            <span className="text-sm">{incident.assignee.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(incident.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/incidents/${incident.id}`);
                            }}
                            data-testid={`button-view-${incident.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyAccessLink(incident);
                            }}
                            title="Copiar enlace"
                            data-testid={`button-copy-link-${incident.id}`}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              renewTokenMutation.mutate(incident.id);
                            }}
                            title="Renovar enlace"
                            disabled={renewTokenMutation.isPending}
                            data-testid={`button-renew-link-${incident.id}`}
                          >
                            {renewTokenMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIncidentToDelete(incident);
                              }}
                              title="Eliminar"
                              className="text-destructive"
                              data-testid={`button-delete-${incident.id}`}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Preview Sheet */}
      <Sheet open={!!previewIncident} onOpenChange={(open) => !open && setPreviewIncident(null)}>
        <SheetContent className="sm:max-w-lg">
          {previewIncident && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono">{previewIncident.ticketNumber}</span>
                  {getStatusBadge(previewIncident.status)}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-2">{t("label.subject")}</h3>
                  <p className="text-muted-foreground">{previewIncident.subject}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Tipo</Label>
                    <div className="mt-1">{getTypeBadge(previewIncident.type)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t("label.urgency")}</Label>
                    <div className="mt-1">{getUrgencyBadge(previewIncident.urgency)}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{previewIncident.customer?.name}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Descripción</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{previewIncident.description}</p>
                </div>

                {previewIncident.contactName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Contacto</Label>
                    <p className="text-sm mt-1">
                      {previewIncident.contactName}
                      {previewIncident.contactEmail && ` - ${previewIncident.contactEmail}`}
                      {previewIncident.contactPhone && ` - ${previewIncident.contactPhone}`}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/incidents/${previewIncident.id}`)}
                    data-testid="button-view-details"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyAccessLink(previewIncident)}
                    data-testid="button-copy-link-preview"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Enlace
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Incident Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setCustomerSearch(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("incidents.new")}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerPopoverOpen}
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="select-customer"
                          >
                            <span className="truncate">
                              {field.value
                                ? customers?.find((c) => c.id === field.value)?.name
                                : "Selecciona un cliente"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Escribe el nombre del cliente..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                            data-testid="input-customer-search"
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                              {filteredCustomers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.id}
                                  onSelect={() => {
                                    field.onChange(customer.id);
                                    form.setValue("productInstanceId", "");
                                    setCustomerPopoverOpen(false);
                                    setCustomerSearch("");
                                  }}
                                  data-testid={`option-customer-${customer.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === customer.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="truncate">{customer.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCustomerId && customerProductInstances && customerProductInstances.length > 0 && (
                <FormField
                  control={form.control}
                  name="productInstanceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Barcode className="h-4 w-4" />
                        Número de Serie (Opcional)
                      </FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v === "_none" ? "" : v)} 
                        value={field.value || "_none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-product-instance">
                            <SelectValue placeholder="Selecciona un número de serie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_none">Sin número de serie</SelectItem>
                          {customerProductInstances.map((instance) => (
                            <SelectItem key={instance.id} value={instance.id}>
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                <span className="font-mono">{instance.serialNumber}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-muted-foreground">{instance.product?.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Tipo de incidente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("label.urgency")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-urgency">
                            <SelectValue placeholder="Nivel de urgencia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(urgencyLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("label.subject")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Breve descripción del problema" data-testid="input-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe el problema en detalle"
                        rows={4}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Información de Contacto (Opcional)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del contacto" data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@ejemplo.com" data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(000) 000-0000" data-testid="input-contact-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crear Incidente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!incidentToDelete} onOpenChange={(open) => !open && setIncidentToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-incident">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta incidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              {incidentToDelete?.ticketNumber} — {incidentToDelete?.subject}
              <br />
              Esta acción no se puede deshacer. Se eliminará la incidencia junto con sus comentarios y archivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => incidentToDelete && deleteMutation.mutate(incidentToDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
