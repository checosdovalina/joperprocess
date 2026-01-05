import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Loader2, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { CustomerCombobox } from "@/components/customer-combobox";

export default function CheckinsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
        title: "Visita iniciada",
        description: "El check-in ha sido creado desde la visita programada",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo convertir la visita",
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
            title: "Error de ubicación",
            description: "No se pudo obtener la ubicación GPS. Verifica los permisos.",
            variant: "destructive",
          });
        }
      );
    } else {
      setGettingLocation(false);
      toast({
        title: "GPS no disponible",
        description: "Tu navegador no soporta geolocalización",
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
        title: "Check-in registrado",
        description: "El check-in ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
            title: "Ubicación obtenida",
            description: "La ubicación GPS ha sido capturada correctamente",
          });
        },
        (error) => {
          setGettingLocation(false);
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener la ubicación GPS. Verifica los permisos.",
            variant: "destructive",
          });
        }
      );
    } else {
      setGettingLocation(false);
      toast({
        title: "GPS no disponible",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertCheckin);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
          <p className="text-muted-foreground mt-1">
            Registra visitas a clientes con ubicación GPS
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-checkin">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Check-in
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Check-in</DialogTitle>
              <DialogDescription>
                Registra una visita al cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente *</Label>
                <CustomerCombobox
                  customers={customers || []}
                  value={formData.customerId || ""}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  placeholder="Buscar cliente..."
                  data-testid="select-checkin-customer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingType">Tipo de Reunión *</Label>
                <Select
                  value={formData.meetingType}
                  onValueChange={(value) => setFormData({ ...formData, meetingType: value })}
                >
                  <SelectTrigger id="meetingType" data-testid="select-meeting-type">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MeetingType.VISITA}>Visita</SelectItem>
                    <SelectItem value={MeetingType.LLAMADA}>Llamada</SelectItem>
                    <SelectItem value={MeetingType.VIDEOLLAMADA}>Videollamada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación GPS</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={getLocation}
                  disabled={gettingLocation}
                  data-testid="button-get-location"
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : location ? (
                    <>
                      <MapPin className="mr-2 h-4 w-4 text-green-600" />
                      Ubicación capturada
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Capturar Ubicación
                    </>
                  )}
                </Button>
                {location && (
                  <p className="text-xs text-muted-foreground">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas de la Visita</Label>
                <Textarea
                  id="notes"
                  data-testid="textarea-checkin-notes"
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Describe los temas tratados en la visita..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-checkin">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Check-in"
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
                Visitas Programadas Hoy
              </CardTitle>
              <CardDescription>
                {todayVisits.length} {todayVisits.length === 1 ? "visita programada" : "visitas programadas"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {todayVisits.map((visit) => (
                <Card key={visit.id} className="hover-elevate" data-testid={`card-scheduled-visit-${visit.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{visit.customer?.name || "Sin cliente"}</CardTitle>
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
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Iniciar Check-in
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
          <CardTitle>Historial de Check-ins</CardTitle>
          <CardDescription>
            {checkins?.length || 0} visitas registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : checkins && checkins.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkins.map((checkin) => (
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
                        <div className="font-medium">{checkin.customer?.name || "Sin cliente"}</div>
                        <div className="text-xs text-muted-foreground">{checkin.customer?.city || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {checkin.latitude && checkin.longitude ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            GPS Capturado
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin ubicación</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {checkin.checkoutAt ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Finalizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            En curso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/checkins/${checkin.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-view-checkin-${checkin.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Detalle
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay check-ins registrados</p>
              <Button
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
                data-testid="button-add-first-checkin"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Check-in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
