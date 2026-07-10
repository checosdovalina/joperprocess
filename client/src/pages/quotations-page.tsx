import { useState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useTenant } from "@/hooks/use-tenant";
import { Quotation, Customer, QuotationStatus, InsertQuotation, InsertQuotationItem, QuotationItem, Product, User, type Empresa } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import { Plus, FileText, Clock, CheckCircle, AlertTriangle, XCircle, Send, ShoppingCart, Download, Mail, Loader2, Eye, Pencil, MoreHorizontal, Copy, Truck, Check, X, UserPlus, Lock, Trash2, EyeOff, Filter, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useEntityQuery, useEntityMutation } from "@/hooks/use-entity-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QuotationForm } from "@/components/quotation-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type QuotationWithDetails = Quotation & { 
  customer: Customer; 
  items?: QuotationItem[];
};

export default function QuotationsPage() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const companyName = tenant?.name || t("quotations.the-company");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [shippingRejectDialogOpen, setShippingRejectDialogOpen] = useState(false);
  const [shippingRejectReason, setShippingRejectReason] = useState("");
  const [isProcessingShipping, setIsProcessingShipping] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<QuotationWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [quotationForPDF, setQuotationForPDF] = useState<QuotationWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [hideConverted, setHideConverted] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeller, setFilterSeller] = useState("all");
  const [filterEmpresa, setFilterEmpresa] = useState("all");

  // Pre-apply filter from URL param (e.g. navigating from dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status) setFilterStatus(status);
  }, []);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: quotations, isLoading, dataUpdatedAt } = useEntityQuery<QuotationWithDetails[]>(
    "/api/quotations",
    { refetchInterval: 20000 }
  );

  const { data: customers } = useEntityQuery<Customer[]>("/api/customers");
  const { data: products } = useEntityQuery<Product[]>("/api/products");
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: empresas } = useQuery<Empresa[]>({ queryKey: ["/api/empresas"] });

  const createQuotationMutation = useMutation<Quotation, Error, InsertQuotation & { items: InsertQuotationItem[]; _sendEmail: boolean }>({
    mutationFn: async (data) => {
      const { _sendEmail, ...payload } = data;
      const res = await apiRequest("POST", "/api/quotations", payload);
      const quotation = await res.json();
      if (_sendEmail) {
        try {
          await apiRequest("POST", `/api/quotations/${quotation.id}/send-email`, {});
        } catch {
          // Email error handled below via flag on quotation
          (quotation as any)._emailFailed = true;
        }
      }
      (quotation as any)._sendEmail = _sendEmail;
      return quotation;
    },
    onSuccess: (quotation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      if (quotation._sendEmail) {
        if (quotation._emailFailed) {
          toast({ title: t("quotations.saved-title"), description: t("quotations.saved-email-failed"), variant: "destructive" });
        } else {
          toast({ title: t("quotations.sent-title"), description: t("quotations.sent-created-desc") });
        }
      } else {
        toast({ title: t("quotations.draft-saved-title"), description: t("quotations.draft-saved-desc") });
      }
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: t("label.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateQuotationMutation = useMutation<Quotation, Error, Partial<InsertQuotation> & { items?: InsertQuotationItem[]; _sendEmail: boolean }>({
    mutationFn: async (data) => {
      const { _sendEmail, ...payload } = data;
      const endpoint = selectedQuotation ? `/api/quotations/${selectedQuotation.id}` : "/api/quotations";
      const res = await apiRequest("PATCH", endpoint, payload);
      const quotation = await res.json();
      if (_sendEmail) {
        try {
          await apiRequest("POST", `/api/quotations/${quotation.id}/send-email`, {});
        } catch {
          (quotation as any)._emailFailed = true;
        }
      }
      (quotation as any)._sendEmail = _sendEmail;
      return quotation;
    },
    onSuccess: (quotation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      if (quotation._sendEmail) {
        if (quotation._emailFailed) {
          toast({ title: t("quotations.saved-title"), description: t("quotations.saved-email-failed"), variant: "destructive" });
        } else {
          toast({ title: t("quotations.sent-title"), description: t("quotations.sent-updated-desc") });
        }
      } else {
        toast({ title: t("quotations.updated-title"), description: quotation._sendEmail === false ? t("quotations.draft-saved-desc") : t("quotations.updated-desc") });
      }
      setEditDialogOpen(false);
      setSelectedQuotation(null);
    },
    onError: (error: Error) => {
      toast({ title: t("label.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleViewDetails = async (quotation: QuotationWithDetails) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedQuotation(data);
      setDetailsDialogOpen(true);
    } catch (error) {
      toast({
        title: t("label.error"),
        description: t("quotations.load-details-error"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const EDITABLE_STATUSES = [
    QuotationStatus.DRAFT,
    QuotationStatus.PENDING_APPROVAL,
    QuotationStatus.SENT,
  ];

  const handleEdit = async (quotation: QuotationWithDetails) => {
    if (!EDITABLE_STATUSES.includes(quotation.status as any)) {
      toast({
        title: t("quotations.cannot-edit-title"),
        description: t("quotations.cannot-edit-desc"),
        variant: "destructive",
      });
      return;
    }
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/quotations/${quotation.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar detalles");
      const data = await response.json();
      setSelectedQuotation(data);
      setEditDialogOpen(true);
    } catch (error) {
      toast({
        title: t("label.error"),
        description: t("quotations.load-edit-error"),
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDeleteQuotation = async () => {
    if (!quotationToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/quotations/${quotationToDelete.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: t("quotations.deleted-title"), description: t("quotations.deleted-desc").replace("{folio}", quotationToDelete.folio) });
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    } catch (error: any) {
      const msg = error?.message || t("quotations.delete-error");
      toast({ title: t("quotations.cannot-delete-title"), description: msg, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = (quotation: QuotationWithDetails) => {
    setQuotationForPDF(quotation);
    setPdfDialogOpen(true);
  };

  const performDownloadPDF = async (quotation: QuotationWithDetails, hideDiscount: boolean) => {
    setPdfDialogOpen(false);
    setIsDownloading(quotation.id);
    try {
      const url = `/api/quotations/${quotation.id}/pdf${hideDiscount ? "?hideDiscount=1" : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Error al generar PDF");
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `cotizacion-${quotation.folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
      
      toast({
        title: t("quotations.pdf-downloaded-title"),
        description: t("quotations.pdf-downloaded-desc").replace("{folio}", quotation.folio),
      });
    } catch (error) {
      toast({
        title: t("label.error"),
        description: t("quotations.pdf-error"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const [approvalLinkDialogOpen, setApprovalLinkDialogOpen] = useState(false);
  const [approvalLink, setApprovalLink] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    if (emailList.includes(email)) { setEmailInput(""); return; }
    setEmailList(prev => [...prev, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setEmailList(prev => prev.filter(e => e !== email));
  };

  const handleSendEmail = async () => {
    if (!selectedQuotation) return;
    if (emailList.length === 0) return;
    setIsSending(true);
    try {
      const response = await apiRequest("POST", `/api/quotations/${selectedQuotation.id}/send-email`, {
        emails: emailList,
      });
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-authorizations"] });
      setSendEmailDialogOpen(false);
      setSelectedQuotation(null);

      // If email failed but we have approval URL, show the link dialog
      if (data.warning && data.approvalUrl) {
        setApprovalLink(data.approvalUrl);
        setApprovalLinkDialogOpen(true);
        toast({
          title: t("quotations.link-generated-title"),
          description: t("quotations.link-generated-desc"),
        });
      } else {
        toast({
          title: t("quotations.sent-title"),
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        title: t("label.error"),
        description: t("quotations.email-error"),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyApprovalLink = () => {
    navigator.clipboard.writeText(approvalLink);
    toast({
      title: t("quotations.link-copied-title"),
      description: t("quotations.link-copied-desc"),
    });
  };

  const handleApproveShipping = async (quotation: QuotationWithDetails) => {
    setIsProcessingShipping(quotation.id);
    try {
      const response = await apiRequest("POST", `/api/quotations/${quotation.id}/approve-shipping`);
      const result = await response.json();
      
      toast({
        title: t("quotations.shipping-approved-title"),
        description: result.message || t("quotations.shipping-approved-desc"),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
    } catch (error: any) {
      toast({
        title: t("label.error"),
        description: error.message || t("quotations.shipping-approve-error"),
        variant: "destructive",
      });
    } finally {
      setIsProcessingShipping(null);
    }
  };

  const handleResendShippingNotification = async (quotation: QuotationWithDetails) => {
    try {
      const response = await apiRequest("POST", `/api/quotations/${quotation.id}/resend-shipping-notification`, {});
      const result = await response.json();
      toast({
        title: t("quotations.notification-sent-title"),
        description: t("quotations.notification-sent-desc").replace("{recipients}", result.sentTo?.join(", ") || "admins"),
      });
    } catch (error: any) {
      toast({
        title: t("quotations.resend-error-title"),
        description: error.message || t("quotations.notification-error"),
        variant: "destructive",
      });
    }
  };

  const handleRejectShipping = async () => {
    if (!selectedQuotation) return;
    
    setIsProcessingShipping(selectedQuotation.id);
    try {
      const response = await apiRequest("POST", `/api/quotations/${selectedQuotation.id}/reject-shipping`, {
        reason: shippingRejectReason,
      });
      const result = await response.json();
      
      toast({
        title: t("quotations.shipping-rejected-title"),
        description: result.message || t("quotations.shipping-rejected-desc"),
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setShippingRejectDialogOpen(false);
      setShippingRejectReason("");
      setSelectedQuotation(null);
    } catch (error: any) {
      toast({
        title: t("label.error"),
        description: error.message || t("quotations.shipping-reject-error"),
        variant: "destructive",
      });
    } finally {
      setIsProcessingShipping(null);
    }
  };

  const openShippingRejectDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    setShippingRejectDialogOpen(true);
  };

  const openSendEmailDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    const initialEmails: string[] = [];
    if (quotation.customer?.email) initialEmails.push(quotation.customer.email.toLowerCase());
    setEmailList(initialEmails);
    setEmailInput("");
    setSendEmailDialogOpen(true);
  };

  const handleCopyApprovalLink = (quotation: QuotationWithDetails) => {
    const token = (quotation as any).approvalToken;
    if (!token) {
      toast({ title: t("quotations.no-link-title"), description: t("quotations.no-link-desc"), variant: "destructive" });
      return;
    }
    const link = `${window.location.origin}/aprobar-cotizacion/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: t("quotations.link-copied-title"), description: t("quotations.link-copied-desc2") });
    }).catch(() => {
      toast({ title: t("label.error"), description: t("quotations.copy-error-link").replace("{link}", link), variant: "destructive" });
    });
  };

  const formatCurrency = (value: string | number, currency: string = "MXN") => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    const safeCurrency = currency === "AMBAS" ? "MXN" : currency;
    return num.toLocaleString("es-MX", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
      [QuotationStatus.DRAFT]: { label: t("status.draft"), variant: "secondary", icon: FileText },
      [QuotationStatus.SENT]: { label: t("status.sent"), variant: "outline", icon: Send },
      [QuotationStatus.PENDING_APPROVAL]: { label: t("status.pending-approval"), variant: "default", icon: Clock },
      [QuotationStatus.PENDING_AUTHORIZATION]: { label: t("status.in-auth"), variant: "default", icon: Clock },
      [QuotationStatus.AUTHORIZED]: { label: t("status.authorized"), variant: "default", icon: CheckCircle },
      [QuotationStatus.CONVERTED]: { label: t("status.converted"), variant: "default", icon: ShoppingCart },
      [QuotationStatus.REJECTED]: { label: t("status.rejected"), variant: "destructive", icon: XCircle },
      [QuotationStatus.EXPIRED]: { label: t("status.expired"), variant: "secondary", icon: AlertTriangle },
    };
    const config = statusConfig[status] || statusConfig[QuotationStatus.DRAFT];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} data-testid={`status-${status}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const PAYMENT_TERMS_LABELS: Record<string, string> = {
    contado: t("quotations.payment.cash"),
    "15_dias": t("quotations.payment.15"),
    "30_dias": t("quotations.payment.30"),
    "90_dias": t("quotations.payment.90"),
    "120_dias": t("quotations.payment.120"),
    "150_dias": t("quotations.payment.150"),
    "45_dias": t("quotations.payment.45"),
    "60_dias": t("quotations.payment.60"),
  };

  const DELIVERY_TIME_LABELS: Record<string, string> = {
    inmediato: t("quotations.delivery.immediate"),
    "1_semana": t("quotations.delivery.1week"),
    "2_semanas": t("quotations.delivery.2weeks"),
    "3_semanas": t("quotations.delivery.3weeks"),
    "1_mes": t("quotations.delivery.1month"),
    por_confirmar: t("quotations.delivery.tbc"),
  };

  const convertedCount = quotations?.filter(q => q.status === QuotationStatus.CONVERTED).length ?? 0;

  const INACTIVE_STATUSES = [QuotationStatus.SENT, QuotationStatus.REJECTED, QuotationStatus.EXPIRED];

  const inactiveCount = quotations?.filter(q => INACTIVE_STATUSES.includes(q.status as any)).length ?? 0;

  const hasActiveFilters = filterStatus !== "all" || filterSeller !== "all" || filterEmpresa !== "all" || filterDateFrom !== "" || filterDateTo !== "" || searchText !== "";

  const filteredQuotations = (quotations ?? []).filter(q => {
    // Tab split
    const isInactive = INACTIVE_STATUSES.includes(q.status as any);
    if (activeTab === "active" && isInactive) return false;
    if (activeTab === "inactive" && !isInactive) return false;

    if (activeTab === "active" && hideConverted && q.status === QuotationStatus.CONVERTED) return false;
    if (filterStatus !== "all" && q.status !== filterStatus) return false;
    if (filterSeller !== "all" && q.userId !== filterSeller) return false;
    if (filterEmpresa !== "all" && q.empresaId !== filterEmpresa) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      const matchFolio = q.folio?.toLowerCase().includes(search);
      const matchCustomer = q.customer?.name?.toLowerCase().includes(search);
      if (!matchFolio && !matchCustomer) return false;
    }
    if (filterDateFrom) {
      const from = startOfDay(parseISO(filterDateFrom));
      if (new Date(q.createdAt) < from) return false;
    }
    if (filterDateTo) {
      const to = endOfDay(parseISO(filterDateTo));
      if (new Date(q.createdAt) > to) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setFilterStatus("all");
    setFilterSeller("all");
    setFilterEmpresa("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("quotations.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("quotations.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-quotation">
          <Plus className="h-4 w-4 mr-2" />
          {t("quotations.new")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("quotations.title")}
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title={t("quotations.auto-refresh")} />
              </CardTitle>
              <CardDescription>
                {t("quotations.count-summary").replace("{shown}", String(filteredQuotations.length)).replace("{total}", String(quotations?.length || 0))}
                {activeTab === "active" && hideConverted && convertedCount > 0 && (
                  <span className="ml-1">
                    {(convertedCount !== 1 ? t("quotations.converted-hidden-many") : t("quotations.converted-hidden-one")).replace("{count}", String(convertedCount))}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === "active" && convertedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHideConverted(v => !v)}
                  data-testid="button-toggle-converted"
                >
                  {hideConverted ? (
                    <><Eye className="h-4 w-4 mr-2" />{t("quotations.show-converted")} ({convertedCount})</>
                  ) : (
                    <><EyeOff className="h-4 w-4 mr-2" />{t("quotations.hide-converted")} ({convertedCount})</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex gap-1 border-b mt-2">
            <button
              onClick={() => { setActiveTab("active"); setFilterStatus("all"); }}
              data-testid="tab-active"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "active"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("quotations.tab-active")}
              <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {(quotations ?? []).filter(q =>
                  !INACTIVE_STATUSES.includes(q.status as any) &&
                  !(hideConverted && q.status === QuotationStatus.CONVERTED)
                ).length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab("inactive"); setFilterStatus("all"); }}
              data-testid="tab-inactive"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "inactive"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("quotations.tab-inactive")}
              {inactiveCount > 0 && (
                <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {inactiveCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
            <div className="relative flex-1 min-w-[180px]">
              <Input
                placeholder={t("search.folio-client")}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-3"
                data-testid="input-search-quotation"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="select-filter-status">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("label.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("quotations.all-statuses")}</SelectItem>
                <SelectItem value={QuotationStatus.DRAFT}>{t("status.draft")}</SelectItem>
                <SelectItem value={QuotationStatus.SENT}>{t("status.sent")}</SelectItem>
                <SelectItem value={QuotationStatus.PENDING_APPROVAL}>{t("status.pending-approval")}</SelectItem>
                <SelectItem value={QuotationStatus.PENDING_AUTHORIZATION}>{t("status.in-auth")}</SelectItem>
                <SelectItem value={QuotationStatus.AUTHORIZED}>{t("status.authorized")}</SelectItem>
                <SelectItem value={QuotationStatus.CONVERTED}>{t("status.converted")}</SelectItem>
                <SelectItem value={QuotationStatus.REJECTED}>{t("status.rejected")}</SelectItem>
                <SelectItem value={QuotationStatus.EXPIRED}>{t("status.expired")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeller} onValueChange={setFilterSeller} data-testid="select-filter-seller">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("label.seller")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("quotations.all-sellers")}</SelectItem>
                {users?.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName || u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {empresas && empresas.length > 0 && !(user?.role === 'vendedor' && user?.empresaId) && (
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa} data-testid="select-filter-empresa">
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          ) : filteredQuotations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("label.folio")}</TableHead>
                    <TableHead>{t("label.client")}</TableHead>
                    <TableHead>{t("label.date")}</TableHead>
                    <TableHead className="text-right">{t("label.total")}</TableHead>
                    <TableHead>{t("label.status")}</TableHead>
                    <TableHead>{t("label.items")}</TableHead>
                    <TableHead className="text-right">{t("label.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id} className="hover-elevate" data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{quotation.folio}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{quotation.customer?.name || t("quotations.no-customer")}</div>
                        <div className="text-xs text-muted-foreground">{quotation.customer?.rfc || "-"}</div>
                        {quotation.empresaId && empresas && empresas.length > 0 && (
                          <Badge variant="secondary" className="mt-1" data-testid={`badge-empresa-${quotation.id}`}>
                            {empresas.find(e => e.id === quotation.empresaId)?.name ?? ""}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(quotation.createdAt), "PPP", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium font-mono">
                          {formatCurrency(quotation.total, quotation.currency || "MXN")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {quotation.currency || "MXN"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(quotation.status)}
                          {(quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending" && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                              <Truck className="h-3 w-3 mr-1" />
                              {t("quotations.shipping-pending")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {t("quotations.items-count").replace("{count}", String(quotation.items?.length || 0))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(quotation)}
                            disabled={isLoadingDetails}
                            title={t("btn.view-details")}
                            data-testid={`button-view-quotation-${quotation.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {EDITABLE_STATUSES.includes(quotation.status as any) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(quotation)}
                              disabled={isLoadingDetails}
                              title={t("btn.edit")}
                              data-testid={`button-edit-quotation-${quotation.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-menu-quotation-${quotation.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(quotation)}
                                data-testid={`menu-pdf-quotation-${quotation.id}`}
                              >
                                {isDownloading === quotation.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                {t("btn.download-pdf")}
                              </DropdownMenuItem>
                              {quotation.status !== QuotationStatus.CONVERTED && (() => {
                                const shippingPending = (quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending";
                                return (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={shippingPending ? undefined : () => openSendEmailDialog(quotation)}
                                      disabled={shippingPending}
                                      data-testid={`menu-email-quotation-${quotation.id}`}
                                      title={shippingPending ? t("quotations.shipping-locked-email") : undefined}
                                      className={shippingPending ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {shippingPending ? <Lock className="h-4 w-4 mr-2 text-amber-500" /> : <Mail className="h-4 w-4 mr-2" />}
                                      <span>{t("btn.send-email")}</span>
                                      {shippingPending && <span className="ml-auto text-xs text-amber-500">{t("status.pending")}</span>}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={shippingPending ? undefined : () => handleCopyApprovalLink(quotation)}
                                      disabled={shippingPending}
                                      data-testid={`menu-copy-link-quotation-${quotation.id}`}
                                      title={shippingPending ? t("quotations.shipping-locked-link") : undefined}
                                      className={shippingPending ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {shippingPending ? <Lock className="h-4 w-4 mr-2 text-amber-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                      <span>{t("quotations.copy-approval-link")}</span>
                                      {shippingPending && <span className="ml-auto text-xs text-amber-500">{t("status.pending")}</span>}
                                    </DropdownMenuItem>
                                  </>
                                );
                              })()}
                              {isAdmin && (quotation as any).shippingHandledByJoper && (quotation as any).shippingApprovalStatus === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleApproveShipping(quotation)}
                                    disabled={isProcessingShipping === quotation.id}
                                    data-testid={`menu-approve-shipping-${quotation.id}`}
                                    className="text-green-600"
                                  >
                                    {isProcessingShipping === quotation.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-2" />
                                    )}
                                    {t("quotations.approve-free-shipping")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openShippingRejectDialog(quotation)}
                                    disabled={isProcessingShipping === quotation.id}
                                    data-testid={`menu-reject-shipping-${quotation.id}`}
                                    className="text-destructive"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    {t("quotations.reject-free-shipping")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleResendShippingNotification(quotation)}
                                    data-testid={`menu-resend-shipping-notification-${quotation.id}`}
                                  >
                                    <Mail className="h-4 w-4 mr-2 text-blue-500" />
                                    {t("quotations.resend-notification")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => { setQuotationToDelete(quotation); setDeleteDialogOpen(true); }}
                                    data-testid={`menu-delete-quotation-${quotation.id}`}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("quotations.delete")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hideConverted && convertedCount > 0 ? (
            <div className="text-center py-12">
              <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("quotations.all-converted")}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setHideConverted(false)}
                data-testid="button-show-converted-empty"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("quotations.show-converted")} ({convertedCount})
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("quotations.no-results")}</p>
              <Button
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-add-first-quotation"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("quotations.create-first")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <QuotationForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createQuotationMutation.mutate}
        isPending={createQuotationMutation.isPending}
        customers={customers || []}
        userId={user?.id}
      />

      {/* Edit Quotation Dialog */}
      {selectedQuotation && (
        <QuotationForm
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedQuotation(null);
          }}
          onSubmit={(data) => updateQuotationMutation.mutate(data)}
          isPending={updateQuotationMutation.isPending}
          customers={customers || []}
          userId={user?.id}
          initialData={selectedQuotation}
          isEditing
        />
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("quotations.detail-title").replace("{folio}", selectedQuotation?.folio || "")}
            </DialogTitle>
            <DialogDescription>
              {t("quotations.detail-desc")}
            </DialogDescription>
          </DialogHeader>

          {selectedQuotation && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.client")}</h4>
                    <p className="font-medium">{selectedQuotation.customer?.name || t("quotations.no-customer")}</p>
                    {selectedQuotation.customer?.rfc && (
                      <p className="text-sm text-muted-foreground">{selectedQuotation.customer.rfc}</p>
                    )}
                    {selectedQuotation.customer?.email && (
                      <p className="text-sm text-muted-foreground">{selectedQuotation.customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.status")}</h4>
                    {getStatusBadge(selectedQuotation.status)}
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("quotations.created-on").replace("{date}", format(new Date(selectedQuotation.createdAt), "PPP", { locale: es }))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedQuotation.validUntil
                        ? t("quotations.valid-until-date").replace("{date}", format(new Date(selectedQuotation.validUntil), "PPP", { locale: es }))
                        : t("quotations.no-expiry")}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Commercial Conditions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.currency")}</h4>
                    <p>{selectedQuotation.currency || "MXN"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.payment-terms")}</h4>
                    <p>{selectedQuotation.paymentTerms ? PAYMENT_TERMS_LABELS[selectedQuotation.paymentTerms] || selectedQuotation.paymentTerms : t("quotations.not-specified")}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.delivery-time")}</h4>
                    <p>{selectedQuotation.deliveryTime ? DELIVERY_TIME_LABELS[selectedQuotation.deliveryTime] || selectedQuotation.deliveryTime : t("quotations.not-specified")}</p>
                  </div>
                </div>

                {/* Shipping Info */}
                {(selectedQuotation as any).shippingHandledByJoper && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                    <Truck className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-medium">{t("quotations.shipping-by").replace("{company}", companyName)}</p>
                      {(selectedQuotation as any).shippingApprovalStatus === "pending" && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600 mt-1">
                          {t("quotations.pending-approval-badge")}
                        </Badge>
                      )}
                      {(selectedQuotation as any).shippingApprovalStatus === "approved" && (
                        <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
                          {t("quotations.shipping-approved-badge")}
                        </Badge>
                      )}
                      {(selectedQuotation as any).shippingApprovalStatus === "rejected" && (
                        <Badge variant="destructive" className="mt-1">
                          {t("quotations.shipping-rejected-badge")}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Products Table */}
                {(() => {
                  const FOREIGN_RFC = "XEXX010101000";
                  const isCustomerForeign = selectedQuotation.customer?.rfc === FOREIGN_RFC;
                  const items = selectedQuotation.items ?? [];
                  const mxnItems = items.filter(i => (i.currency || "MXN") === "MXN");
                  const usdItems = items.filter(i => i.currency === "USD");
                  const hasMixed = mxnItems.length > 0 && usdItems.length > 0;
                  const discPct = parseFloat(selectedQuotation.globalDiscount || "0");

                  const calcT = (its: typeof items) => {
                    const sub = its.reduce((s, i) => s + parseFloat(i.subtotal), 0);
                    const disc = discPct > 0 ? sub * (discPct / 100) : 0;
                    const after = sub - disc;
                    const baseTax = isCustomerForeign
                      ? 0
                      : its.reduce((s, i) => s + parseFloat(i.taxAmount || "0"), 0);
                    const tax = baseTax * (1 - discPct / 100);
                    return { sub, disc, tax, total: after + tax };
                  };
                  const mxnT = calcT(mxnItems);
                  const usdT = calcT(usdItems);

                  const fmtMXN2 = (v: number | string) => formatCurrency(v, "MXN");
                  const fmtUSD2 = (v: number | string) => formatCurrency(v, "USD");

                  return (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">{t("quotations.products")}</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("label.code")}</TableHead>
                                <TableHead>{t("label.product")}</TableHead>
                                <TableHead className="text-center">{t("label.quantity")}</TableHead>
                                <TableHead className="text-right">{t("quotations.unit-price")}</TableHead>
                                <TableHead className="text-center">{t("quotations.disc-pct")}</TableHead>
                                {hasMixed && <TableHead className="text-center">{t("quotations.currency-short")}</TableHead>}
                                <TableHead className="text-right">{t("label.subtotal")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item) => {
                                const cur = item.currency || "MXN";
                                const fmt = cur === "USD" ? fmtUSD2 : fmtMXN2;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.productCode || "-"}</TableCell>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell className="text-center">{parseFloat(item.quantity)}</TableCell>
                                    <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                                    <TableCell className="text-center">{parseFloat(item.discountPercent || "0").toFixed(1)}%</TableCell>
                                    {hasMixed && (
                                      <TableCell className="text-center">
                                        <Badge variant={cur === "USD" ? "secondary" : "outline"} className="text-xs">
                                          {cur}
                                        </Badge>
                                      </TableCell>
                                    )}
                                    <TableCell className="text-right font-medium">{fmt(item.subtotal)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Totals */}
                      {hasMixed ? (
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                          {/* MXN box */}
                          <div className="w-full sm:w-64 rounded-md border overflow-hidden">
                            <div className="bg-primary px-3 py-1.5">
                              <p className="text-xs font-semibold text-primary-foreground uppercase tracking-wide">{t("quotations.pesos-mxn")}</p>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("label.subtotal")}:</span><span>{fmtMXN2(mxnT.sub)}</span></div>
                              {mxnT.disc > 0 && <div className="flex justify-between text-sm text-red-600"><span>{t("quotations.disc-label").replace("{pct}", String(discPct))}:</span><span>-{fmtMXN2(mxnT.disc)}</span></div>}
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("label.tax")}:</span><span>{fmtMXN2(mxnT.tax)}</span></div>
                              <Separator />
                              <div className="flex justify-between font-bold"><span>{t("quotations.total-mxn")}:</span><span>{fmtMXN2(mxnT.total)}</span></div>
                            </div>
                          </div>
                          {/* USD box */}
                          <div className="w-full sm:w-64 rounded-md border overflow-hidden">
                            <div className="bg-emerald-700 px-3 py-1.5">
                              <p className="text-xs font-semibold text-white uppercase tracking-wide">{t("quotations.dollars-usd")}</p>
                            </div>
                            <div className="p-3 space-y-1.5">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("label.subtotal")}:</span><span>{fmtUSD2(usdT.sub)}</span></div>
                              {usdT.disc > 0 && <div className="flex justify-between text-sm text-red-600"><span>{t("quotations.disc-label").replace("{pct}", String(discPct))}:</span><span>-{fmtUSD2(usdT.disc)}</span></div>}
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("label.tax")}:</span><span>{fmtUSD2(usdT.tax)}</span></div>
                              <Separator />
                              <div className="flex justify-between font-bold"><span>{t("quotations.total-usd")}:</span><span>{fmtUSD2(usdT.total)}</span></div>
                            </div>
                            <div className="px-3 pb-2">
                              <p className="text-xs text-muted-foreground">{t("quotations.exchange-rate-note")}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t("label.subtotal")}:</span>
                              <span>{formatCurrency(selectedQuotation.subtotal, selectedQuotation.currency || "MXN")}</span>
                            </div>
                            {parseFloat(selectedQuotation.globalDiscount || "0") > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>{t("quotations.global-discount-label").replace("{pct}", String(selectedQuotation.globalDiscount))}:</span>
                                <span>-{formatCurrency(parseFloat(selectedQuotation.subtotal) * (parseFloat(selectedQuotation.globalDiscount || "0") / 100), selectedQuotation.currency || "MXN")}</span>
                              </div>
                            )}
                            {!isCustomerForeign && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t("label.tax")}:</span>
                                <span>{formatCurrency(selectedQuotation.tax, selectedQuotation.currency || "MXN")}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>{t("label.total")}:</span>
                              <span>{formatCurrency(
                                isCustomerForeign
                                  ? parseFloat(selectedQuotation.subtotal) * (1 - parseFloat(selectedQuotation.globalDiscount || "0") / 100)
                                  : selectedQuotation.total,
                                selectedQuotation.currency || "MXN"
                              )}</span>
                            </div>
                            {parseFloat(selectedQuotation.totalSavings || "0") > 0 && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span>{t("quotations.total-savings")}:</span>
                                <span>{formatCurrency(selectedQuotation.totalSavings || "0", selectedQuotation.currency || "MXN")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Notes */}
                {(selectedQuotation.notes || selectedQuotation.conditions) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {selectedQuotation.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("label.notes")}</h4>
                          <p className="text-sm">{selectedQuotation.notes}</p>
                        </div>
                      )}
                      {selectedQuotation.conditions && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("quotations.form.conditions")}</h4>
                          <p className="text-sm">{selectedQuotation.conditions}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              {t("btn.close")}
            </Button>
            <Button 
              onClick={() => selectedQuotation && handleDownloadPDF(selectedQuotation)}
              disabled={isDownloading === selectedQuotation?.id}
            >
              {isDownloading === selectedQuotation?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t("btn.download-pdf")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={sendEmailDialogOpen} onOpenChange={(open) => {
        if (!isSending) setSendEmailDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("quotations.send-email-title")}
            </DialogTitle>
            <DialogDescription>
              {t("quotations.detail-title").replace("{folio}", selectedQuotation?.folio || "")} —{" "}
              {selectedQuotation?.customer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Recipients list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("quotations.recipients")}</Label>
              {emailList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("quotations.add-recipient-hint")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[48px]">
                  {emailList.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border text-sm"
                      data-testid={`chip-email-${email}`}
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                        data-testid={`remove-email-${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add email input */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("quotations.add-email")}</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t("quotations.email-placeholder")}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  disabled={isSending}
                  data-testid="input-add-email"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmail}
                  disabled={isSending || !emailInput.trim()}
                  data-testid="button-add-email"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("quotations.add-email-hint")}
              </p>
            </div>

            {/* Info box */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {t("quotations.send-email-info")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendEmailDialogOpen(false)}
              disabled={isSending}
              data-testid="button-cancel-send-email"
            >
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending || emailList.length === 0}
              data-testid="button-confirm-send-email"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("quotations.sending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("quotations.send-request-auth")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Link Dialog - shown when email fails */}
      <Dialog open={approvalLinkDialogOpen} onOpenChange={setApprovalLinkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("quotations.approval-link-title")}</DialogTitle>
            <DialogDescription>
              {t("quotations.approval-link-desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input 
                value={approvalLink} 
                readOnly 
                className="flex-1 text-sm"
                data-testid="input-approval-link"
              />
              <Button onClick={copyApprovalLink} variant="outline" data-testid="button-copy-link">
                <Copy className="h-4 w-4 mr-2" />
                {t("quotations.copy")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("quotations.approval-link-note")}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setApprovalLinkDialogOpen(false)} data-testid="button-close-link-dialog">
              {t("btn.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Rejection Dialog */}
      <AlertDialog open={shippingRejectDialogOpen} onOpenChange={setShippingRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {t("quotations.reject-free-shipping-title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {t("quotations.reject-shipping-confirm-prefix")}{" "}
                  <strong>{selectedQuotation?.folio}</strong>?
                </p>
                <div>
                  <label className="text-sm font-medium">{t("quotations.reject-reason-label")}</label>
                  <Input
                    value={shippingRejectReason}
                    onChange={(e) => setShippingRejectReason(e.target.value)}
                    placeholder={t("quotations.reject-reason-placeholder")}
                    className="mt-2"
                    data-testid="input-shipping-reject-reason"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("quotations.reject-shipping-note-prefix")}<strong>{t("status.draft")}</strong>{t("quotations.reject-shipping-note-suffix")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShippingRejectReason("");
                setSelectedQuotation(null);
              }}
              disabled={isProcessingShipping !== null}
            >
              {t("btn.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectShipping} 
              disabled={isProcessingShipping !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessingShipping !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("quotations.rejecting")}
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {t("quotations.reject-free-shipping")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Download Options Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t("btn.download-pdf")}
            </DialogTitle>
            <DialogDescription>
              {t("quotations.pdf-desc").replace("{folio}", quotationForPDF?.folio || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 whitespace-normal text-left"
              onClick={() => quotationForPDF && performDownloadPDF(quotationForPDF, false)}
              data-testid="button-pdf-with-discount"
            >
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="font-medium">{t("quotations.pdf-with-discount")}</span>
                <span className="text-xs text-muted-foreground">{t("quotations.pdf-with-discount-desc")}</span>
              </div>
            </Button>
            <Button
              className="justify-start gap-3 h-auto py-3 whitespace-normal text-left"
              onClick={() => quotationForPDF && performDownloadPDF(quotationForPDF, true)}
              data-testid="button-pdf-no-discount"
            >
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="font-medium">{t("quotations.pdf-no-discount")}</span>
                <span className="text-xs text-primary-foreground/80">{t("quotations.pdf-no-discount-desc")}</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t("quotations.delete")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {t("quotations.delete-confirm-prefix")}{" "}
                  <strong>{quotationToDelete?.folio}</strong>? {t("customers.delete-confirm")}
                </p>
                {quotationToDelete?.status === QuotationStatus.CONVERTED && (
                  <p className="text-destructive font-medium">
                    {t("quotations.delete-converted-warning")}
                  </p>
                )}
                {quotationToDelete?.status !== QuotationStatus.CONVERTED && (
                  <p>{t("quotations.delete-items-note")}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuotation}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-quotation"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("quotations.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("btn.delete")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
