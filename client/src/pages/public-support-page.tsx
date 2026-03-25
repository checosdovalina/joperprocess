import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  HeadphonesIcon,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  Building2,
  AlertTriangle,
  HelpCircle,
  Wrench,
  MessageSquare,
  FileText,
  ExternalLink,
  Copy,
  Upload,
  X,
  File,
  Image,
  Video,
} from "lucide-react";
import { IncidentType, IncidentUrgency } from "@shared/schema";

const incidentFormSchema = z.object({
  customerId: z.string().min(1, "Seleccione su empresa"),
  type: z.string().min(1, "Seleccione el tipo de incidente"),
  urgency: z.string().default(IncidentUrgency.MEDIA),
  subject: z.string().min(5, "El asunto debe tener al menos 5 caracteres"),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  contactName: z.string().min(2, "Ingrese su nombre"),
  contactEmail: z.string().email("Ingrese un correo válido"),
  contactPhone: z.string().optional(),
  warrantySerialNumber: z.string().optional(),
}).refine((data) => {
  if (data.type === IncidentType.GARANTIA && (!data.warrantySerialNumber || data.warrantySerialNumber.trim().length < 3)) {
    return false;
  }
  return true;
}, {
  message: "Ingrese el número de serie del producto (mínimo 3 caracteres)",
  path: ["warrantySerialNumber"],
});

type IncidentFormData = z.infer<typeof incidentFormSchema>;

const lookupSchema = z.object({
  ticketNumber: z.string().min(1, "Ingrese el número de ticket"),
  email: z.string().email("Ingrese un correo válido"),
});

type LookupFormData = z.infer<typeof lookupSchema>;

type CustomerSearchResult = {
  id: string;
  name: string;
  rfc?: string | null;
  city?: string | null;
};

type UploadedFile = {
  entityId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
};

const typeLabels: Record<string, { label: string; icon: typeof AlertTriangle; description: string }> = {
  [IncidentType.GARANTIA]: { 
    label: "Garantía", 
    icon: AlertTriangle,
    description: "Problemas cubiertos por garantía del producto"
  },
  [IncidentType.RETRABAJO]: { 
    label: "Retrabajo", 
    icon: Wrench,
    description: "Solicitud de retrabajo o reparación"
  },
  [IncidentType.QUEJA]: { 
    label: "Queja", 
    icon: MessageSquare,
    description: "Quejas sobre servicio o productos"
  },
  [IncidentType.CONSULTA]: { 
    label: "Consulta", 
    icon: HelpCircle,
    description: "Preguntas generales o solicitudes de información"
  },
  [IncidentType.ADMINISTRATIVO]: { 
    label: "Administrativo", 
    icon: FileText,
    description: "Asuntos administrativos o de facturación"
  },
};

const urgencyLabels: Record<string, string> = {
  [IncidentUrgency.BAJA]: "Baja - Puede esperar",
  [IncidentUrgency.MEDIA]: "Media - Atención normal",
  [IncidentUrgency.ALTA]: "Alta - Requiere atención pronto",
  [IncidentUrgency.CRITICA]: "Crítica - Urgente",
};

export default function PublicSupportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"select" | "create" | "lookup">("select");
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [createdTicket, setCreatedTicket] = useState<{ ticketNumber: string; accessToken: string } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      customerId: "",
      type: "",
      urgency: IncidentUrgency.MEDIA,
      subject: "",
      description: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      warrantySerialNumber: "",
    },
  });

  const lookupForm = useForm<LookupFormData>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      ticketNumber: "",
      email: "",
    },
  });

  const searchCustomers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/public/customers/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        const urlResponse = await fetch("/api/public/incidents/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mimeType: file.type }),
        });

        if (!urlResponse.ok) {
          const error = await urlResponse.json();
          throw new Error(error.error || "Error al obtener URL de subida");
        }

        const { uploadURL, entityId, useDirectUpload } = await urlResponse.json();

        let uploadResponse;
        if (useDirectUpload) {
          uploadResponse = await fetch(uploadURL, {
            method: "POST",
            body: file,
            headers: { 
              "Content-Type": file.type,
              "X-Entity-Id": entityId,
            },
          });
        } else {
          uploadResponse = await fetch(uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }

        if (!uploadResponse.ok) {
          throw new Error("Error al subir el archivo");
        }

        setUploadedFiles(prev => [...prev, {
          entityId,
          filename: entityId.split('/').pop() || file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        }]);

        toast({
          title: "Archivo subido",
          description: file.name,
        });
      } catch (error) {
        toast({
          title: "Error al subir archivo",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    event.target.value = "";
  };

  const removeFile = (entityId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.entityId !== entityId));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const createMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const response = await fetch("/api/public/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          attachments: uploadedFiles,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear el incidente");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedTicket({
        ticketNumber: data.ticketNumber,
        accessToken: data.accessToken,
      });
      setUploadedFiles([]);
      toast({
        title: "Ticket creado exitosamente",
        description: `Su número de ticket es: ${data.ticketNumber}`,
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

  const lookupMutation = useMutation({
    mutationFn: async (data: LookupFormData) => {
      const response = await fetch(
        `/api/public/incidents/lookup/${encodeURIComponent(data.ticketNumber)}?email=${encodeURIComponent(data.email)}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al buscar el ticket");
      }
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/soporte/ticket/${data.accessToken}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.id);
    setSearchResults([]);
    setCustomerSearch(customer.name);
  };

  const onSubmitIncident = (data: IncidentFormData) => {
    createMutation.mutate(data);
  };

  const onSubmitLookup = (data: LookupFormData) => {
    lookupMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Enlace copiado al portapapeles",
    });
  };

  const getTrackingUrl = () => {
    if (!createdTicket) return "";
    return `${window.location.origin}/soporte/ticket/${createdTicket.accessToken}`;
  };

  if (createdTicket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Ticket Creado Exitosamente</CardTitle>
            <CardDescription>
              Su solicitud ha sido registrada y será atendida por nuestro equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Número de Ticket</p>
              <p className="text-2xl font-bold" data-testid="text-ticket-number">
                {createdTicket.ticketNumber}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Enlace de seguimiento</Label>
              <div className="flex gap-2">
                <Input 
                  value={getTrackingUrl()} 
                  readOnly 
                  className="text-sm"
                  data-testid="input-tracking-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(getTrackingUrl())}
                  data-testid="button-copy-url"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Guarde este enlace para dar seguimiento a su ticket
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate(`/soporte/ticket/${createdTicket.accessToken}`)}
                className="w-full"
                data-testid="button-view-ticket"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Mi Ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreatedTicket(null);
                  setMode("select");
                  form.reset();
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                }}
                className="w-full"
                data-testid="button-create-another"
              >
                Crear Otro Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HeadphonesIcon className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Centro de Soporte</h1>
          </div>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">
            GRUPO JOPER - Sistema de atención al cliente. Cree tickets de soporte o consulte el estado de sus solicitudes existentes.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {mode === "select" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => setMode("create")}
              data-testid="card-new-ticket"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Crear Nuevo Ticket</CardTitle>
                <CardDescription>
                  Reporte un problema, solicite garantía, realice una consulta o levante una queja
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-all"
              onClick={() => setMode("lookup")}
              data-testid="card-lookup-ticket"
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Consultar Ticket Existente</CardTitle>
                <CardDescription>
                  Vea el estado y agregue comentarios a un ticket que ya haya creado
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {mode === "lookup" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("select")}
                  data-testid="button-back"
                >
                  ← Volver
                </Button>
              </div>
              <CardTitle>Consultar Ticket Existente</CardTitle>
              <CardDescription>
                Ingrese su número de ticket y el correo electrónico con el que lo creó
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...lookupForm}>
                <form onSubmit={lookupForm.handleSubmit(onSubmitLookup)} className="space-y-4">
                  <FormField
                    control={lookupForm.control}
                    name="ticketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Ticket</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: INC-001234" 
                            {...field} 
                            data-testid="input-ticket-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lookupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="correo@ejemplo.com" 
                            {...field} 
                            data-testid="input-lookup-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={lookupMutation.isPending}
                    data-testid="button-lookup-submit"
                  >
                    {lookupMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Ticket
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {mode === "create" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("select")}
                  data-testid="button-back-create"
                >
                  ← Volver
                </Button>
              </div>
              <CardTitle>Crear Nuevo Ticket de Soporte</CardTitle>
              <CardDescription>
                Complete el formulario para registrar su solicitud
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitIncident)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Buscar su Empresa</Label>
                      <div className="relative mt-1.5">
                        <Input
                          placeholder="Escriba el nombre o RFC de su empresa..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            searchCustomers(e.target.value);
                          }}
                          data-testid="input-customer-search"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      
                      {customerSearch.length >= 3 && searchResults.length > 0 && (
                        <div className="mt-2 border rounded-md divide-y max-h-56 overflow-auto">
                          {searchResults.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className="w-full px-3 py-2.5 text-left hover:bg-muted flex items-start gap-2"
                              onClick={() => handleSelectCustomer(customer)}
                              data-testid={`customer-option-${customer.id}`}
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-snug">{customer.name}</p>
                                {(customer.rfc || customer.city) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {[customer.rfc, customer.city].filter(Boolean).join(" • ")}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {customerSearch.length >= 3 && !isSearching && searchResults.length === 0 && !selectedCustomer && (
                        <div className="mt-2 p-3 border rounded-md text-center text-muted-foreground">
                          <p className="text-sm">No se encontraron empresas</p>
                          <p className="text-xs">Intente buscar por nombre, RFC o clave</p>
                        </div>
                      )}

                      {selectedCustomer && (
                        <div className="mt-2 p-3 bg-muted rounded-md flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <p className="font-medium flex-1">{selectedCustomer.name}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(null);
                              form.setValue("customerId", "");
                              setCustomerSearch("");
                            }}
                            data-testid="button-clear-customer"
                          >
                            Cambiar
                          </Button>
                        </div>
                      )}
                      {form.formState.errors.customerId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.customerId.message}
                        </p>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Solicitud</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Seleccione el tipo de solicitud" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(typeLabels).map(([value, { label, icon: Icon, description }]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <div>
                                      <span>{label}</span>
                                      <p className="text-xs text-muted-foreground">{description}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("type") === IncidentType.GARANTIA && (
                      <FormField
                        control={form.control}
                        name="warrantySerialNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Serie del Producto</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: SN-2024-001234"
                                {...field}
                                data-testid="input-warranty-serial"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              El número de serie se encuentra en la placa del producto o en su factura
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgencia</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-urgency">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(urgencyLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asunto</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Resumen breve de su solicitud" 
                              {...field}
                              data-testid="input-subject"
                            />
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
                          <FormLabel>Descripción Detallada</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describa el problema o solicitud con el mayor detalle posible..."
                              rows={5}
                              {...field}
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <Label>Evidencia (Opcional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Puede adjuntar fotos, videos o documentos que ayuden a describir el problema
                      </p>
                      
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          multiple
                          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          data-testid="input-file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {isUploading ? "Subiendo..." : "Haga clic para seleccionar archivos"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Imágenes, videos, PDF, Word, Excel
                          </span>
                        </label>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => {
                            const FileIcon = getFileIcon(file.mimeType);
                            return (
                              <div
                                key={file.entityId}
                                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                                data-testid={`file-item-${file.entityId}`}
                              >
                                <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFile(file.entityId)}
                                  data-testid={`button-remove-file-${file.entityId}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-4">Información de Contacto</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Su nombre" 
                                {...field}
                                data-testid="input-contact-name"
                              />
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
                            <FormLabel>Correo Electrónico</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="correo@ejemplo.com" 
                                {...field}
                                data-testid="input-contact-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Teléfono (Opcional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Número de teléfono" 
                                {...field}
                                data-testid="input-contact-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-incident"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando Ticket...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Ticket de Soporte
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
