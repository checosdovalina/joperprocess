import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
} from "lucide-react";

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
}

interface BulkResult {
  customerId: string;
  name: string;
  success: boolean;
  error?: string;
}

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountStatementsPage() {
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);

  const { data: statements = [], isLoading, refetch } = useQuery<CustomerBalance[]>({
    queryKey: ["/api/account-statements"],
  });

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
    return list;
  }, [statements, search, filterOverdue]);

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
      toast({ title: "Estado de cuenta enviado", description: `Correo enviado exitosamente.` });
      setSendDialogOpen(false);
      setSingleSendCustomer(null);
      setAdditionalEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Error al enviar", description: err.message ?? "No se pudo enviar el correo.", variant: "destructive" });
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
        title: `Enviados: ${data.sent} / ${data.sent + data.failed}`,
        description: data.failed > 0 ? `${data.failed} no se pudieron enviar.` : "Todos enviados correctamente.",
        variant: data.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error en envío masivo", description: err.message ?? "Error inesperado.", variant: "destructive" });
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
      toast({ title: "Error", description: "No se pudo descargar el PDF.", variant: "destructive" });
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
      toast({ title: "Enlace copiado", description: "Válido por 7 días." });
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast({ title: "Error", description: "No se pudo generar el enlace.", variant: "destructive" });
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
        <h1 className="text-xl font-semibold">Estados de Cuenta</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button
              data-testid="button-bulk-send"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkSendMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar a seleccionados ({selected.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="default"
            data-testid="button-refresh"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total por Cobrar</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-balance">{fmt(totalBalanceAll)}</p>
            <p className="text-xs text-muted-foreground mt-1">{statements.length} cliente(s) con saldo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Vencido</CardTitle>
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
              {selectedWithEmail.length} con correo / {selectedWithoutEmail.length} sin correo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 pb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Buscar cliente, RFC o correo..."
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

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Mail className="w-8 h-8" />
            <p>{statements.length === 0 ? "No hay clientes con saldo pendiente." : "Sin resultados para la búsqueda."}</p>
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
                          {fmt(s.totalBalance)}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.invoiceCount} fact.</span>
                        {isOverdue && (
                          <span className="text-xs text-destructive font-semibold">
                            {fmt(s.overdueBalance)} vencido
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
                          <Mail className="w-4 h-4" /> Enviar por correo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDownloadPDF(s.customer.id, s.customer.name)} className="gap-2">
                          <Download className="w-4 h-4" /> Descargar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(s.customer.id)} className="gap-2">
                          {copiedId === s.customer.id ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
                          {copiedId === s.customer.id ? "¡Enlace copiado!" : "Copiar enlace (7 días)"}
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
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Cliente</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Saldo Total</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Vencido</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Correo</th>
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
                          {isOverdue && <Badge variant="destructive" className="mt-1 text-xs">Vencido</Badge>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums" data-testid={`text-balance-${s.customer.id}`}>
                          {fmt(s.totalBalance)}
                          <p className="text-xs text-muted-foreground font-normal">{s.invoiceCount} factura(s)</p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {s.overdueBalance > 0 ? (
                            <span className="text-destructive font-semibold">{fmt(s.overdueBalance)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                          {s.oldestDueDate && (
                            <p className="text-xs text-muted-foreground font-normal">{fmtDate(s.oldestDueDate)}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          {s.customer.email ? (
                            <span className="text-muted-foreground text-xs">{s.customer.email}</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs italic">Sin correo</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
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
                                <Mail className="w-4 h-4" /> Enviar por correo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDownloadPDF(s.customer.id, s.customer.name)} className="gap-2">
                                <Download className="w-4 h-4" /> Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(s.customer.id)} className="gap-2">
                                {copiedId === s.customer.id ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
                                {copiedId === s.customer.id ? "¡Enlace copiado!" : "Copiar enlace (7 días)"}
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
            <DialogTitle className="text-base">Enviar Estado de Cuenta</DialogTitle>
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
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {singleSendCustomer.customer.email}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-destructive/10 rounded-md px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive">Sin correo registrado</span>
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
              <p className="text-xs text-muted-foreground mt-1.5">Separa múltiples correos con coma</p>
            </div>

            <Separator />

            {/* Contenido */}
            <div className="bg-muted/50 rounded-md px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">El correo incluirá</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> Facturas pendientes y con pago parcial</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> Saldo total y saldo vencido</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-500" /> Historial de pagos recientes</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSendDialogOpen(false)}
            >
              Cancelar
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
              Enviar Correo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk send confirmation ── */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envío masivo de estados de cuenta</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se enviarán estados de cuenta a <strong>{selectedWithEmail.length}</strong> cliente(s) con correo registrado.
                </p>
                {selectedWithoutEmail.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {selectedWithoutEmail.length} cliente(s) sin correo serán omitidos:
                    </p>
                    <ul className="text-sm text-amber-600 dark:text-amber-500 mt-1 list-disc pl-4">
                      {selectedWithoutEmail.slice(0, 5).map((s) => (
                        <li key={s.customer.id}>{s.customer.name}</li>
                      ))}
                      {selectedWithoutEmail.length > 5 && <li>y {selectedWithoutEmail.length - 5} más...</li>}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
              Confirmar envío ({selectedWithEmail.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk results dialog ── */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado del envío masivo</DialogTitle>
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
    </div>
  );
}
