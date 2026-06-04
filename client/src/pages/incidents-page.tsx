import { useState, useMemo } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Incident, Customer, User, IncidentType, IncidentStatus, IncidentUrgency, ShipmentProductInstance, Product } from "@shared/schema";
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
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Filter,
  X,
  Loader2,
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
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterUrgency, setFilterUrgency] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewIncident, setPreviewIncident] = useState<IncidentWithDetails | null>(null);
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

  const clearFilters = () => {
    setFilterStatus("");
    setFilterType("");
    setFilterUrgency("");
    setSearchQuery("");
  };

  const hasActiveFilters = filterStatus || filterType || filterUrgency || searchQuery;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <AlertTriangle className="h-6 w-6" />
            {t("incidents.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("incidents.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-incident">
          <Plus className="h-4 w-4 mr-2" />
          {t("incidents.new")}
        </Button>
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
          ) : !incidents || incidents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{hasActiveFilters ? t("incidents.no-results-filter") : t("incidents.no-results")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {incidents.map((incident) => (
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("productInstanceId", "");
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
    </div>
  );
}
