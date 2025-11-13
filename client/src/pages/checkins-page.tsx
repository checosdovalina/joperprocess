import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Checkin, Customer, InsertCheckin } from "@shared/schema";
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
import { Plus, MapPin, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CheckinsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertCheckin>>({
    customerId: "",
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
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  required
                >
                  <SelectTrigger id="customer" data-testid="select-checkin-customer">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
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
                  value={formData.notes}
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
                        <div className="font-medium">{checkin.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{checkin.customer.city}</div>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-checkin-${checkin.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver Minuta
                        </Button>
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
