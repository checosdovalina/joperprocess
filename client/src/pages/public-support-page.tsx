import { useState, useMemo } from "react";
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
import { useI18n } from "@/hooks/use-i18n";

const makeIncidentFormSchema = (t: (key: string) => string) => z.object({
  customerId: z.string().min(1, t("public.support.company-required")),
  type: z.string().min(1, t("public.support.type-required")),
  urgency: z.string().default(IncidentUrgency.MEDIA),
  subject: z.string().min(5, t("incidents.subject-min")),
  description: z.string().min(20, t("public.support.description-min")),
  contactName: z.string().min(2, t("public.support.name-required")),
  contactEmail: z.string().email(t("public.support.email-invalid")),
  contactPhone: z.string().optional(),
  warrantySerialNumber: z.string().optional(),
}).refine((data) => {
  if (data.type === IncidentType.GARANTIA && (!data.warrantySerialNumber || data.warrantySerialNumber.trim().length < 3)) {
    return false;
  }
  return true;
}, {
  message: t("public.support.serial-required"),
  path: ["warrantySerialNumber"],
});

type IncidentFormData = z.infer<ReturnType<typeof makeIncidentFormSchema>>;

const makeLookupSchema = (t: (key: string) => string) => z.object({
  ticketNumber: z.string().min(1, t("public.support.ticket-required")),
  email: z.string().email(t("public.support.email-invalid")),
});

type LookupFormData = z.infer<ReturnType<typeof makeLookupSchema>>;

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

const typeLabels: Record<string, { labelKey: string; icon: typeof AlertTriangle; descKey: string }> = {
  [IncidentType.GARANTIA]: { 
    labelKey: "public.support.type.garantia", 
    icon: AlertTriangle,
    descKey: "public.support.type.garantia-desc"
  },
  [IncidentType.RETRABAJO]: { 
    labelKey: "public.support.type.retrabajo", 
    icon: Wrench,
    descKey: "public.support.type.retrabajo-desc"
  },
  [IncidentType.QUEJA]: { 
    labelKey: "public.support.type.queja", 
    icon: MessageSquare,
    descKey: "public.support.type.queja-desc"
  },
  [IncidentType.CONSULTA]: { 
    labelKey: "public.support.type.consulta", 
    icon: HelpCircle,
    descKey: "public.support.type.consulta-desc"
  },
  [IncidentType.ADMINISTRATIVO]: { 
    labelKey: "public.support.type.administrativo", 
    icon: FileText,
    descKey: "public.support.type.administrativo-desc"
  },
};

const urgencyLabels: Record<string, string> = {
  [IncidentUrgency.BAJA]: "public.support.urgency.baja",
  [IncidentUrgency.MEDIA]: "public.support.urgency.media",
  [IncidentUrgency.ALTA]: "public.support.urgency.alta",
  [IncidentUrgency.CRITICA]: "public.support.urgency.critica",
};

export default function PublicSupportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const incidentFormSchema = useMemo(() => makeIncidentFormSchema(t), [t]);
  const lookupSchema = useMemo(() => makeLookupSchema(t), [t]);
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
        title: t("public.support.ticket-created"),
        description: `${t("public.support.ticket-created-desc")} ${data.ticketNumber}`,
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
            <CardTitle className="text-2xl">{t("public.support.created-title")}</CardTitle>
            <CardDescription>
              {t("public.support.created-desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("public.support.ticket-number")}</p>
              <p className="text-2xl font-bold" data-testid="text-ticket-number">
                {createdTicket.ticketNumber}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("public.support.tracking-link")}</Label>
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
                {t("public.support.tracking-hint")}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate(`/soporte/ticket/${createdTicket.accessToken}`)}
                className="w-full"
                data-testid="button-view-ticket"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("public.support.view-ticket")}
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
                {t("public.support.create-another")}
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
            <h1 className="text-3xl font-bold">{t("public.support.title")}</h1>
          </div>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">
            {t("public.support.subtitle")}
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
                <CardTitle>{t("public.support.new-ticket")}</CardTitle>
                <CardDescription>
                  {t("public.support.new-ticket-desc")}
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
                <CardTitle>{t("public.support.lookup-ticket")}</CardTitle>
                <CardDescription>
                  {t("public.support.lookup-ticket-desc")}
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
                  ← {t("public.back")}
                </Button>
              </div>
              <CardTitle>{t("public.support.lookup-ticket")}</CardTitle>
              <CardDescription>
                {t("public.support.lookup-desc")}
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
                        <FormLabel>{t("public.support.ticket-number")}</FormLabel>
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
                        <FormLabel>{t("public.support.email-label")}</FormLabel>
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
                        {t("public.support.searching")}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        {t("public.support.search-ticket")}
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
                  ← {t("public.back")}
                </Button>
              </div>
              <CardTitle>{t("public.support.create-title")}</CardTitle>
              <CardDescription>
                {t("public.support.create-desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitIncident)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>{t("public.support.search-company")}</Label>
                      <div className="relative mt-1.5">
                        <Input
                          placeholder={t("public.support.search-company-ph")}
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
                          <p className="text-sm">{t("public.support.no-companies")}</p>
                          <p className="text-xs">{t("public.support.no-companies-hint")}</p>
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
                            {t("public.support.change")}
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
                          <FormLabel>{t("public.support.request-type")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder={t("public.support.request-type-ph")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(typeLabels).map(([value, { labelKey, icon: Icon, descKey }]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <div>
                                      <span>{t(labelKey)}</span>
                                      <p className="text-xs text-muted-foreground">{t(descKey)}</p>
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
                            <FormLabel>{t("public.support.serial-number")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("public.support.serial-ph")}
                                {...field}
                                data-testid="input-warranty-serial"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {t("public.support.serial-hint")}
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
                          <FormLabel>{t("label.urgency")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-urgency">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(urgencyLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {t(label)}
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
                          <FormLabel>{t("label.subject")}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t("public.support.subject-ph")} 
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
                          <FormLabel>{t("public.support.description-detailed")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("public.support.description-ph")}
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
                      <Label>{t("public.support.evidence")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("public.support.evidence-hint")}
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
                            {isUploading ? t("public.support.uploading") : t("public.support.click-select-files")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("public.support.file-types")}
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
                    <h3 className="font-medium mb-4">{t("public.support.contact-info")}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("label.full-name")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("public.support.your-name")} 
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
                            <FormLabel>{t("public.support.email-label")}</FormLabel>
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
                            <FormLabel>{t("public.support.phone-optional")}</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t("public.support.phone-ph")} 
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
                        {t("public.support.creating-ticket")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("public.support.create-ticket-btn")}
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
