import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail,
  Send,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  RefreshCw,
  Building2,
  Download,
  Link,
  Check,
  MoreVertical,
  CalendarClock,
  Calendar,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { Customer } from "@shared/schema";

interface CustomerBalance {
  customer: {
    id: string;
    name: string;
    email: string | null;
    rfc: string | null;
    phone: string | null;
  };
  totalBalance: number;
  overdueBalance: number;
  invoiceCount: number;
  oldestDueDate: string | null;
  currency?: string; // "MXN" | "USD"
}

interface BulkResult {
  customerId: string;
  name: string;
  success: boolean;
  error?: string;
}

function fmt(n: number, currency = "MXN") {
  return n.toLocaleString("es-MX", { style: "currency", currency, minimumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountStatementsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [singleSendCustomer, setSingleSendCustomer] = useState<CustomerBalance | null>(null);
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);
  const [anySearch, setAnySearch] = useState("");
  const [anySearchOpen, setAnySearchOpen] = useState(false);
  const [downloadingAnyId, setDownloadingAnyId] = useState<string | null>(null);

  // Schedule dialog state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedEnabled, setSchedEnabled] = useState(false);
  const [schedDaysPreset, setSchedDaysPreset] = useState<string>("1,15");
  const [schedHour, setSchedHour] = useState<number>(9);
  const [schedOnlyOverdue, setSchedOnlyOverdue] = useState(false);

  const { data: statements = [], isLoading, refetch, dataUpdatedAt } = useQuery<CustomerBalance[]>({
    queryKey: ["/api/account-statements"],
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // Re-render every 30s so the "última actualización" label stays current.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Manual refresh forces a fresh Firebird read, bypassing the server cache.
  // Uses apiRequest so tenant headers match the normal query fetcher.
  async function handleManualRefresh() {
    setIsForceRefreshing(true);
    try {
      const res = await apiRequest("GET", "/api/account-statements?force=1");
      queryClient.setQueryData(["/api/account-statements"], await res.json());
    } catch {
      await refetch();
    } finally {
      setIsForceRefreshing(false);
    }
  }

  const lastUpdatedLabel = useMemo(() => {
    void nowTick;
    if (!dataUpdatedAt) return null;
    return formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: es });
  }, [dataUpdatedAt, nowTick]);

  const { data: allCustomers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: scheduleConfig, refetch: refetchSchedule } = useQuery<{
    id: string;
    enabled: boolean;
    scheduleDays: number[];
    sendHour: number;
    onlyOverdue: boolean;
    lastRunAt: string | null;
  } | null>({
    queryKey: ["/api/account-statement-schedule"],
  });

  const saveScheduleMutation = useMutation({
    mutationFn: (data: { enabled: boolean; scheduleDays: number[]; sendHour: number; onlyOverdue: boolean }) =>
      apiRequest("PUT", "/api/account-statement-schedule", data),
    onSuccess: () => {
      toast({ title: t("stmts.sched.saved-title"), description: t("stmts.sched.saved-desc") });
      refetchSchedule();
      setScheduleOpen(false);
    },
    onError: (err: any) => {
      toast({ title: t("label.error"), description: err.message ?? t("stmts.sched.save-error"), variant: "destructive" });
    },
  });

  function openScheduleDialog() {
    if (scheduleConfig) {
      setSchedEnabled(scheduleConfig.enabled);
      const days = [...scheduleConfig.scheduleDays].sort((a, b) => a - b).join(",");
      setSchedDaysPreset(days);
      setSchedHour(scheduleConfig.sendHour);
      setSchedOnlyOverdue(scheduleConfig.onlyOverdue);
    }
    setScheduleOpen(true);
  }

  function saveSchedule() {
    const days = schedDaysPreset.split(",").map(Number).filter((d) => d >= 1 && d <= 31);
    saveScheduleMutation.mutate({ enabled: schedEnabled, scheduleDays: days, sendHour: schedHour, onlyOverdue: schedOnlyOverdue });
  }

  const filtered = useMemo(() => {
    let list = statements;
    if (filterOverdue) list = list.filter((s) => s.overdueBalance > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.customer.name.toLowerCase().includes(q) ||
          (s.customer.rfc ?? "").toLowerCase().includes(q) ||
          (s.customer.email ?? "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00");
      list = list.filter((s) => s.oldestDueDate && new Date(s.oldestDueDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      list = list.filter((s) => s.oldestDueDate && new Date(s.oldestDueDate) <= to);
    }
    return list;
  }, [statements, search, filterOverdue, dateFrom, dateTo]);

  const hasDateFilter = dateFrom || dateTo;
  function clearDates() { setDateFrom(""); setDateTo(""); }

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const anyCustomerResults = useMemo(() => {
    if (!anySearch.trim() || anySearch.length < 2) return [];
    const q = normalize(anySearch);
    return allCustomers
      .filter(c =>
        normalize(c.name).includes(q) ||
        normalize(c.rfc ?? "").includes(q) ||
        normalize(c.email ?? "").includes(q)
      )
      .slice(0, 8);
  }, [anySearch, allCustomers]);

  async function handleDownloadAny(customer: Customer) {
    setDownloadingAnyId(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}/account-statement-pdf`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-${customer.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setAnySearch("");
      setAnySearchOpen(false);
    } catch {
      toast({ title: t("label.error"), description: t("stmts.gen-error"), variant: "destructive" });
    } finally {
      setDownloadingAnyId(null);
    }
  }

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.customer.id));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((s) => next.delete(s.customer.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((s) => next.add(s.customer.id));
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // Single send mutation
  const singleSendMutation = useMutation({
    mutationFn: ({ customerId, additionalEmails }: { customerId: string; additionalEmails: string[] }) =>
      apiRequest("POST", `/api/customers/${customerId}/send-account-statement`, { additionalEmails }),
    onSuccess: (_, vars) => {
      toast({ title: t("stmts.sent-title"), description: t("stmts.sent-desc") });
      setSendDialogOpen(false);
      setSingleSendCustomer(null);
      setAdditionalEmail("");
    },
    onError: (err: any) => {
      toast({ title: t("stmts.send-error-title"), description: err.message ?? t("stmts.send-error-desc"), variant: "destructive" });
    },
  });

  // Bulk send mutation
  const bulkSendMutation = useMutation({
    mutationFn: (customerIds: string[]) =>
      apiRequest("POST", `/api/account-statements/send-bulk`, { customerIds }),
    onSuccess: async (res) => {
      const data = await res.json();
      setBulkResults(data.results ?? []);
      setResultsOpen(true);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      toast({
        title: `${t("stmts.bulk.sent-title")} ${data.sent} / ${data.sent + data.failed}`,
        description: data.failed > 0 ? `${data.failed} ${t("stmts.bulk.failed-suffix")}` : t("stmts.bulk.all-sent"),
        variant: data.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: t("stmts.bulk.error-title"), description: err.message ?? t("stmts.unexpected-error"), variant: "destructive" });
      setBulkConfirmOpen(false);
    },
  });

  function openSingleSend(s: CustomerBalance) {
    setSingleSendCustomer(s);
    setAdditionalEmail("");
    setSendDialogOpen(true);
  }

  async function handleDownloadPDF(customerId: string, customerName: string) {
    setDownloadingId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/account-statement-pdf`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estado-cuenta-${customerName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("label.error"), description: t("stmts.pdf-error"), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleCopyLink(customerId: string) {
    setLinkLoadingId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/account-statement-link`);
      if (!res.ok) throw new Error("Error al generar enlace");
      const data = await res.json();
      const url = `${window.location.origin}/estado-cuenta/${data.token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(customerId);
      toast({ title: t("stmts.link-copied"), description: t("stmts.link-valid-7") });
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast({ title: t("label.error"), description: t("stmts.link-error"), variant: "destructive" });
    } finally {
      setLinkLoadingId(null);
    }
  }

  function handleSingleSend() {
    if (!singleSendCustomer) return;
    const extra = additionalEmail
      .split(/[;,]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    singleSendMutation.mutate({ customerId: singleSendCustomer.customer.id, additionalEmails: extra });
  }

  const selectedWithBalance = filtered.filter((s) => selected.has(s.customer.id));
  const selectedWithEmail = selectedWithBalance.filter((s) => s.customer.email);
  const selectedWithoutEmail = selectedWithBalance.filter((s) => !s.customer.email);

  const totalBalanceAll = statements.reduce((sum, s) => sum + s.totalBalance, 0);
  const totalOverdueAll = statements.reduce((sum, s) => sum + s.overdueBalance, 0);
  const customersWithOverdue = statements.filter((s) => s.overdueBalance > 0).length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b flex-wrap">
        <h1 className="text-xl font-semibold">{t("statements.title")}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button
              data-testid="button-bulk-send"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkSendMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {t("stmts.send-selected")} ({selected.size})
            </Button>
          )}
          <Button
            variant={scheduleConfig?.enabled ? "default" : "outline"}
            size="default"
            data-testid="button-schedule"
            onClick={openScheduleDialog}
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            {scheduleConfig?.enabled ? t("stmts.sched.active-btn") : t("stmts.sched.program-btn")}
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              size="default"
              data-testid="button-refresh"
              onClick={handleManualRefresh}
              disabled={isForceRefreshing}
            >
              {isForceRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Actualizar
            </Button>
            {lastUpdatedLabel && (
              <span className="text-xs text-muted-foreground" data-testid="text-last-updated">
                Actualizado {lastUpdatedLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("stmts.total-balance")}</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-balance">{fmt(totalBalanceAll)}</p>
            <p className="text-xs text-muted-foreground mt-1">{statements.length} cliente(s) con saldo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("stmts.overdue-balance")}</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive" data-testid="text-overdue-balance">{fmt(totalOverdueAll)}</p>
            <p className="text-xs text-muted-foreground mt-1">{customersWithOverdue} cliente(s) vencido(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seleccionados</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-selected-count">{selected.size}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedWithEmail.length} {t("stmts.with-email")} / {selectedWithoutEmail.length} {t("stmts.without-email")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 px-6 pb-3">
        {/* Row 1: search + overdue toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder={t("stmts.search-ph")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={filterOverdue ? "default" : "outline"}
            size="default"
            data-testid="button-filter-overdue"
            onClick={() => setFilterOverdue((v) => !v)}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Solo vencidos
          </Button>
        </div>

        {/* Row 2: date range filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Vencimiento:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground shrink-0">Desde</Label>
              <Input
                id="date-from"
                data-testid="input-date-from"
                type="date"
                className="w-[160px] text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground shrink-0">Hasta</Label>
              <Input
                id="date-to"
                data-testid="input-date-to"
                type="date"
                className="w-[160px] text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {hasDateFilter && (
              <Button
                variant="ghost"
                size="default"
                data-testid="button-clear-dates"
                onClick={clearDates}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Row 3: search any customer */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">Estado de cuenta:</span>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="input-any-customer-search"
              placeholder={t("stmts.search-any-ph")}
              className="pl-9"
              value={anySearch}
              onChange={(e) => { setAnySearch(e.target.value); setAnySearchOpen(true); }}
              onFocus={() => setAnySearchOpen(true)}
              onBlur={() => setTimeout(() => setAnySearchOpen(false), 150)}
            />
            {anySearchOpen && anyCustomerResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md overflow-hidden">
                {anyCustomerResults.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`option-any-customer-${c.id}`}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm hover-elevate text-left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleDownloadAny(c)}
                    disabled={downloadingAnyId === c.id}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.rfc ?? ""}{c.rfc && c.email ? " · " : ""}{c.email ?? ""}</div>
                    </div>
                    {downloadingAnyId === c.id
                      ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-muted-foreground" />
                      : <Download className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">— genera PDF aunque no tenga saldo</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">{t("label.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Mail className="w-8 h-8" />
            <p>{statements.length === 0 ? t("stmts.empty-no-balance") : t("stmts.empty-search")}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* ── Mobile list (< sm) ── */}
            <div className="sm:hidden rounded-md border divide-y">
              {filtered.map((s) => {
                const isSelected = selected.has(s.customer.id);
                const isOverdue = s.overdueBalance > 0;
                return (
                  <div
                    key={s.customer.id}
                    data-testid={`row-customer-${s.customer.id}`}
                    className={`flex items-center gap-3 px-3 py-3 ${isSelected ? "bg-muted/30" : ""}`}
                  >
                    <Checkbox
                      data-testid={`checkbox-customer-${s.customer.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(s.customer.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-customer-name-${s.customer.id}`}>
                        {s.customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.customer.rfc ?? ""}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-semibold tabular-nums" data-testid={`text-balance-${s.customer.id}`}>
                          {fmt(s.totalBalance, s.currency)}
                        </span>
                        {s.currency === "USD" && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-blue-600 border-blue-300">USD</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{s.invoiceCount} fact.</span>
                        {isOverdue && (
                          <span className="text-xs text-destructive font-semibold">
                            {fmt(s.overdueBalance, s.currency)} vencido
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-actions-${s.customer.id}`}
                          className="shrink-0"
                          disabled={downloadingId === s.customer.id || linkLoadingId === s.customer.id}
                        >
                          {(downloadingId === s.customer.id || linkLoadingId === s.customer.id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => openSingleSend(s)} className="gap-2">
                          <Mail className="w-4 h-4" /> {t("stmts.send-by-email")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadPDF(s.customer.id, s.customer.name)} className="gap-2">
                          <Download className="w-4 h-4" /> {t("invoices.download-pdf")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(s.customer.id)} className="gap-2">
                          {copiedId === s.customer.id ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
                          {copiedId === s.customer.id ? t("stmts.copied-excl") : t("stmts.copy-link-7")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table (≥ sm) ── */}
            <div className="hidden sm:block rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        data-testid="checkbox-all"
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">{t("label.client")}</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">{t("stmts.col.total-balance")}</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">{t("stmts.col.overdue")}</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">{t("stmts.col.email")}</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const isSelected = selected.has(s.customer.id);
                    const isOverdue = s.overdueBalance > 0;
                    return (
                      <tr
                        key={s.customer.id}
                        data-testid={`row-customer-${s.customer.id}`}
                        className={`border-b last:border-0 transition-colors ${isSelected ? "bg-muted/30" : "hover:bg-muted/20"}`}
                      >
                        <td className="px-3 py-3">
                          <Checkbox
                            data-testid={`checkbox-customer-${s.customer.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(s.customer.id)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium" data-testid={`text-customer-name-${s.customer.id}`}>{s.customer.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.customer.rfc ?? ""}</p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {isOverdue && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
                            {s.currency === "USD" && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">USD</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums" data-testid={`text-balance-${s.customer.id}`}>
                          {fmt(s.totalBalance, s.currency)}
                          <p className="text-xs text-muted-foreground font-normal">{s.invoiceCount} factura(s)</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {s.overdueBalance > 0 ? (
                            <span className="text-destructive font-semibold">{fmt(s.overdueBalance, s.currency)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                          {s.oldestDueDate && (
                            <p className="text-xs text-muted-foreground font-normal">{fmtDate(s.oldestDueDate)}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell max-w-[220px]">
                          {s.customer.email ? (
                            <span className="text-muted-foreground text-xs block truncate" title={s.customer.email}>{s.customer.email}</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs italic">{t("stmts.no-email-short")}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right w-10 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-actions-${s.customer.id}`}
                                disabled={downloadingId === s.customer.id || linkLoadingId === s.customer.id}
                              >
                                {(downloadingId === s.customer.id || linkLoadingId === s.customer.id) ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openSingleSend(s)} className="gap-2">
                                <Mail className="w-4 h-4" /> {t("stmts.send-by-email")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDownloadPDF(s.customer.id, s.customer.name)} className="gap-2">
                                <Download className="w-4 h-4" /> {t("invoices.download-pdf")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(s.customer.id)} className="gap-2">
                                {copiedId === s.customer.id ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
                                {copiedId === s.customer.id ? t("stmts.copied-excl") : t("stmts.copy-link-7")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Single send dialog ── */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">{t("statements.send-title")}</DialogTitle>
            <DialogDescription className="font-medium text-foreground truncate">
              {singleSendCustomer?.customer.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Destinatario */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Destinatario principal
              </p>
              {singleSendCustomer?.customer.email ? (
                <div className="flex items-start gap-2 bg-muted rounded-md px-3 py-2.5 min-w-0">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground break-all min-w-0">
                    {singleSendCustomer.customer.email}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-md px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive">{t("stmts.no-email-registered")}</span>
                </div>
              )}
            </div>

            {/* Correos adicionales */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Correos adicionales <span className="font-normal normal-case">(opcional)</span>
              </p>
              <Input
                data-testid="input-additional-emails"
                placeholder="otro@empresa.com, mas@correo.com"
                value={additionalEmail}
                onChange={(e) => setAdditionalEmail(e.target.value)}
                className="text-sm"
                inputMode="email"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1.5">{t("stmts.emails-comma-hint")}</p>
            </div>

            <Separator />

            {/* Contenido */}
            <div className="bg-muted/50 rounded-md px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("stmts.email-includes")}</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> {t("stmts.includes-1")}</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> {t("stmts.includes-2")}</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> {t("stmts.includes-3")}</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSendDialogOpen(false)}
            >
              {t("btn.cancel")}
            </Button>
            <Button
              data-testid="button-confirm-send"
              className="w-full sm:w-auto"
              onClick={handleSingleSend}
              disabled={
                singleSendMutation.isPending ||
                (!singleSendCustomer?.customer.email &&
                  !additionalEmail.includes("@"))
              }
            >
              {singleSendMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t("stmts.send-email-btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk send confirmation ── */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("stmts.bulk.title")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {t("stmts.bulk.will-send-prefix")} <strong>{selectedWithEmail.length}</strong> {t("stmts.bulk.with-email-suffix")}
                </p>
                {selectedWithoutEmail.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {selectedWithoutEmail.length} {t("stmts.bulk.no-email-suffix")}
                    </p>
                    <ul className="text-sm text-amber-600 dark:text-amber-500 mt-1 list-disc pl-4">
                      {selectedWithoutEmail.slice(0, 5).map((s) => (
                        <li key={s.customer.id}>{s.customer.name}</li>
                      ))}
                      {selectedWithoutEmail.length > 5 && <li>{t("stmts.bulk.and")} {selectedWithoutEmail.length - 5} {t("stmts.bulk.more")}</li>}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-bulk-send"
              onClick={() => bulkSendMutation.mutate(Array.from(selected))}
              disabled={bulkSendMutation.isPending || selectedWithEmail.length === 0}
            >
              {bulkSendMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t("stmts.bulk.confirm")} ({selectedWithEmail.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk results dialog ── */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("stmts.bulk.result-title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(bulkResults ?? []).map((r) => (
              <div
                key={r.customerId}
                data-testid={`result-${r.customerId}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                  r.success ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
                }`}
              >
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className={r.success ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-400"}>
                  {r.name}
                </span>
                {r.error && (
                  <span className="ml-auto text-xs text-red-500">{r.error}</span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setResultsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule config dialog ── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              {t("stmts.sched.title")}
            </DialogTitle>
            <DialogDescription>
              {t("stmts.sched.desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t("stmts.sched.auto-send")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedEnabled ? t("stmts.sched.active-desc") : t("stmts.sched.disabled")}
                </p>
              </div>
              <Switch
                data-testid="switch-schedule-enabled"
                checked={schedEnabled}
                onCheckedChange={setSchedEnabled}
              />
            </div>

            {/* Days preset */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("stmts.sched.days-of-month")}
              </Label>
              <Select value={schedDaysPreset} onValueChange={setSchedDaysPreset}>
                <SelectTrigger data-testid="select-schedule-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5,25">{t("stmts.days.5-25")}</SelectItem>
                  <SelectItem value="1,15">{t("stmts.days.1-15")}</SelectItem>
                  <SelectItem value="1,10,20">{t("stmts.days.1-10-20")}</SelectItem>
                  <SelectItem value="1,8,15,22">{t("stmts.days.1-8-15-22")}</SelectItem>
                  <SelectItem value="1">{t("stmts.days.only-1")}</SelectItem>
                  <SelectItem value="15">{t("stmts.days.only-15")}</SelectItem>
                  <SelectItem value="5">{t("stmts.days.only-5")}</SelectItem>
                  <SelectItem value="25">{t("stmts.days.only-25")}</SelectItem>
                  <SelectItem value="1,10,20,28">{t("stmts.days.1-10-20-28")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("stmts.sched.days-selected")} {schedDaysPreset.split(",").join(", ")}
              </p>
            </div>

            {/* Hour */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("stmts.sched.send-time")}
              </Label>
              <Select value={String(schedHour)} onValueChange={(v) => setSchedHour(Number(v))}>
                <SelectTrigger data-testid="select-schedule-hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h === 12 ? t("stmts.sched.noon") : h < 12 ? `${h}:00 am` : `${h - 12}:00 pm`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Only overdue */}
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t("stmts.only-overdue-label")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedOnlyOverdue
                    ? t("stmts.sched.only-overdue-desc")
                    : t("stmts.sched.all-desc")}
                </p>
              </div>
              <Switch
                data-testid="switch-only-overdue"
                checked={schedOnlyOverdue}
                onCheckedChange={setSchedOnlyOverdue}
              />
            </div>

            {/* Last run info */}
            {scheduleConfig?.lastRunAt && (
              <div className="bg-muted/50 rounded-md px-3 py-2.5 text-xs text-muted-foreground">
                {t("stmts.last-auto-send")} {new Date(scheduleConfig.lastRunAt).toLocaleString("es-MX", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 pt-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setScheduleOpen(false)}>
              {t("btn.cancel")}
            </Button>
            <Button
              data-testid="button-save-schedule"
              className="w-full sm:w-auto"
              onClick={saveSchedule}
              disabled={saveScheduleMutation.isPending}
            >
              {saveScheduleMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {t("stmts.sched.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
