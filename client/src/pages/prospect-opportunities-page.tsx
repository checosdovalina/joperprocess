import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity, ArrowDownRight, ArrowUpRight, Building2, CalendarClock,
  FileText, Filter, Search, Target, TrendingUp, Users,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Customer = { id: string; name: string; isProspect: boolean; contactName?: string | null; email?: string | null; phone?: string | null; createdAt: string };
type Person = { id: string; fullName?: string | null; username?: string };
type Checkin = {
  id: string; customerId: string; wasProspect: boolean; checkinAt: string; checkoutAt?: string | null;
  followUpStatus: string; followUpOutcome?: string | null; followUpClosedAt?: string | null;
  followUpReason?: string | null; checkoutNotes?: string | null; notes?: string | null;
  meetingType: string; salesPersonId?: string | null; userId: string;
  customer?: { id: string; name: string }; user?: Person; salesPerson?: Person;
};
type Quotation = { id: string; customerId: string; folio: string; status: string; total: string; currency: string; createdAt: string; validUntil?: string | null; userId: string; customer?: { id: string; name: string } };

const dateValue = (value: string) => new Date(`${value}T00:00:00`);
const currency = (amount: number, code: string) => {
  const normalizedCode = (code || "MXN").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: normalizedCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Some mixed-currency quotations use labels such as "AMBAS", not ISO codes.
    return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(amount)} ${normalizedCode}`;
  }
};
const activeQuoteStatuses = new Set(["draft", "sent", "pending_approval", "pending_authorization", "authorized"]);

function Metric({ title, value, hint, icon: Icon, color = "text-primary" }: { title: string; value: string | number; hint?: string; icon: typeof Users; color?: string }) {
  return <Card className="shadow-sm"><CardContent className="flex items-start justify-between gap-3 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div><div className={`rounded-lg bg-muted p-2.5 ${color}`}><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

export default function ProspectOpportunitiesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "ventas_logistica";
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 89); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sellerId, setSellerId] = useState("all");
  const [kind, setKind] = useState("opportunities");
  const [search, setSearch] = useState("");

  const customersQuery = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const checkinsQuery = useQuery<Checkin[]>({ queryKey: ["/api/checkins"] });
  const quotationsQuery = useQuery<Quotation[]>({ queryKey: ["/api/quotations"] });
  const sellersQuery = useQuery<Person[]>({ queryKey: ["/api/sellers"], enabled: isAdmin });
  const loading = customersQuery.isLoading || checkinsQuery.isLoading || quotationsQuery.isLoading;
  const error = customersQuery.isError || checkinsQuery.isError || quotationsQuery.isError;
  const customers = customersQuery.data ?? [];
  const allCheckins = checkinsQuery.data ?? [];
  const allQuotes = quotationsQuery.data ?? [];
  const fromDate = dateValue(from).getTime();
  const toDate = dateValue(to).getTime() + 24 * 60 * 60 * 1000;

  const report = useMemo(() => {
    const inPeriod = (value: string) => {
      const time = new Date(value).getTime();
      return time >= fromDate && time < toDate;
    };
    const scopedCheckins = allCheckins.filter(c => sellerId === "all" || (c.salesPersonId ?? c.userId) === sellerId);
    const checkins = scopedCheckins.filter(c => inPeriod(c.checkinAt));
    const scopedQuotes = allQuotes.filter(q => sellerId === "all" || q.userId === sellerId);
    const activeQuotesAll = scopedQuotes.filter(q => activeQuoteStatuses.has(q.status));
    const prospects = customers.filter(c => c.isProspect);
    const customerById = new Map(customers.map(c => [c.id, c]));
    const recentByCustomer = new Map<string, Checkin>();
    for (const item of [...scopedCheckins].sort((a, b) => +new Date(b.checkinAt) - +new Date(a.checkinAt))) {
      if (!recentByCustomer.has(item.customerId)) recentByCustomer.set(item.customerId, item);
    }
    const quoteGroups = new Map<string, Quotation[]>();
    for (const quote of scopedQuotes) quoteGroups.set(quote.customerId, [...(quoteGroups.get(quote.customerId) ?? []), quote]);
    const activeFollowups = scopedCheckins.filter(c => c.followUpStatus === "open");
    const outcomes = checkins.filter(c => c.followUpStatus === "closed");
    const won = outcomes.filter(c => c.followUpOutcome === "sale" || c.followUpOutcome === "rental").length;
    const lost = outcomes.filter(c => c.followUpOutcome === "not_converted").length;
    const prospectRowsScoped = prospects.map(customer => {
      const last = recentByCustomer.get(customer.id);
      return { customer, last, quoteCount: quoteGroups.get(customer.id)?.length ?? 0 };
    }).filter(row => sellerId === "all" || (row.last && (row.last.salesPersonId ?? row.last.userId) === sellerId));
    const opportunityCustomerIds = new Set([
      ...activeFollowups.map(c => c.customerId),
      ...activeQuotesAll.map(q => q.customerId),
    ]);
    const opportunitiesAll = [...opportunityCustomerIds].map(customerId => {
      const customer = customerById.get(customerId);
      const followup = activeFollowups.find(c => c.customerId === customerId);
      const customerQuotes = (quoteGroups.get(customerId) ?? []).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const activeQuotes = customerQuotes.filter(q => activeQuoteStatuses.has(q.status));
      const last = recentByCustomer.get(customerId);
      return { customer, customerId, followup: followup ?? last, activeQuotes, quoteCount: customerQuotes.length };
    }).filter(row => row.customer);
    const q = search.trim().toLocaleLowerCase("es-MX");
    const filterRow = (name: string) => !q || name.toLocaleLowerCase("es-MX").includes(q);
    const visibleProspects = prospectRowsScoped.filter(row => filterRow(row.customer.name));
    const visibleOpportunities = opportunitiesAll.filter(row => filterRow(row.customer!.name));
    const quoteTotals = activeQuotesAll.reduce((totals, quote) => {
      const code = quote.currency || "MXN";
      totals[code] = (totals[code] ?? 0) + Number(quote.total || 0);
      return totals;
    }, {} as Record<string, number>);
    const staleCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stale = opportunitiesAll.filter(row => !row.followup || +new Date(row.followup.checkinAt) < staleCutoff).length;
    return { prospects: visibleProspects, opportunities: visibleOpportunities, prospectCount: prospectRowsScoped.length, openOpportunityCount: opportunitiesAll.length, openFollowups: activeFollowups.length, openQuoteCount: activeQuotesAll.length, quoteTotals, won, lost, stale };
  }, [allCheckins, allQuotes, customers, fromDate, toDate, sellerId, search]);

  const selectedRows = kind === "prospects" ? report.prospects : report.opportunities;
  const sellerName = (id?: string | null) => {
    const person = (sellersQuery.data ?? []).find(s => s.id === id);
    return person?.fullName || person?.username || "—";
  };
  const downloadCsv = () => {
    const rows = kind === "prospects" ? report.prospects.map(({ customer, last, quoteCount }) => [customer.name, "Prospecto", sellerName(last?.salesPersonId ?? last?.userId), last?.checkinAt ?? "", last?.checkoutNotes ?? last?.notes ?? "", quoteCount]) : report.opportunities.map(({ customer, followup, activeQuotes }) => [customer?.name ?? "", "Oportunidad abierta", sellerName(followup?.salesPersonId ?? followup?.userId), followup?.checkinAt ?? "", activeQuotes.map(q => q.folio).join(" | "), activeQuotes.length]);
    const csv = [["Cliente", "Tipo", "Vendedor", "Último contacto", "Acuerdo / cotizaciones", "Cotizaciones"], ...rows].map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `prospectos-oportunidades-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Target className="h-4 w-4" />{t("prospects.eyebrow")}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("prospects.title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("prospects.subtitle")}</p></div>
      <Button variant="outline" onClick={downloadCsv} disabled={loading}><FileText className="mr-2 h-4 w-4" />{t("prospects.export")}</Button>
    </div>

    <Card className="border-primary/15 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4 text-primary" />{t("prospects.filters")}</CardTitle><CardDescription>{t("prospects.filter-desc")}</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div><Label className="text-xs">{t("label.from")}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div><Label className="text-xs">{t("label.to")}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      {isAdmin && <div><Label className="text-xs">{t("label.seller")}</Label><Select value={sellerId} onValueChange={setSellerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem>{(sellersQuery.data ?? []).map(person => <SelectItem key={person.id} value={person.id}>{person.fullName || person.username}</SelectItem>)}</SelectContent></Select></div>}
      <div><Label className="text-xs">{t("prospects.type")}</Label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="prospects">{t("prospects.prospects")}</SelectItem><SelectItem value="opportunities">{t("prospects.opportunities")}</SelectItem></SelectContent></Select></div>
      <div><Label className="text-xs">{t("label.search")}</Label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={t("prospects.search-placeholder")} value={search} onChange={e => setSearch(e.target.value)} /></div></div>
    </div></CardContent></Card>

    {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div> : error ? <Card><CardContent className="p-8 text-center text-destructive">{t("prospects.load-error")}</CardContent></Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title={t("prospects.total-prospects")} value={report.prospectCount} hint={t("prospects.prospects-hint")} icon={Users} color="text-amber-600" />
        <Metric title={t("prospects.open-opportunities")} value={report.openOpportunityCount} hint={`${report.openFollowups} ${t("prospects.open-followups")}`} icon={Target} color="text-blue-600" />
        <Metric title={t("prospects.open-quotes")} value={report.openQuoteCount} hint={Object.entries(report.quoteTotals).map(([code, amount]) => currency(amount, code)).join(" · ") || t("prospects.no-quote-value")} icon={FileText} color="text-violet-600" />
        <Metric title={t("prospects.outcomes")} value={`${report.won} / ${report.lost}`} hint={t("prospects.won-lost")} icon={TrendingUp} color="text-emerald-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />{t("prospects.pipeline-title")}</CardTitle><CardDescription>{t("prospects.pipeline-desc")}</CardDescription></CardHeader><CardContent className="space-y-4">
          {[
            { label: t("prospects.prospects"), value: report.prospectCount, max: Math.max(1, report.prospectCount, report.opportunities.length), color: "bg-amber-500" },
            { label: t("prospects.open-followups"), value: report.openFollowups, max: Math.max(1, report.prospectCount, report.openFollowups), color: "bg-blue-500" },
            { label: t("prospects.open-quotes"), value: report.openQuoteCount, max: Math.max(1, report.prospectCount, report.openQuoteCount), color: "bg-violet-500" },
            { label: t("prospects.won"), value: report.won, max: Math.max(1, report.prospectCount, report.won), color: "bg-emerald-500" },
          ].map(step => <div key={step.label}><div className="mb-1 flex justify-between text-sm"><span>{step.label}</span><span className="font-medium tabular-nums">{step.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${step.color}`} style={{ width: `${Math.min(100, step.value / step.max * 100)}%` }} /></div></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-orange-600" />{t("prospects.attention-title")}</CardTitle><CardDescription>{t("prospects.attention-desc")}</CardDescription></CardHeader><CardContent className="flex items-center gap-4"><div className="rounded-xl bg-orange-500/10 p-4 text-orange-600"><ArrowDownRight className="h-7 w-7" /></div><div><p className="text-3xl font-semibold">{report.stale}</p><p className="text-sm text-muted-foreground">{t("prospects.stale-desc")}</p></div><ArrowUpRight className="ml-auto h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </div>

      <Card><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0"><div><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{kind === "prospects" ? t("prospects.prospect-list") : t("prospects.opportunity-list")}</CardTitle><CardDescription>{t("prospects.table-desc")}</CardDescription></div><Badge variant="secondary">{selectedRows.length} {t("prospects.records")}</Badge></CardHeader><CardContent><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>{t("label.client")}</TableHead><TableHead>{t("label.seller")}</TableHead><TableHead>{t("prospects.last-activity")}</TableHead><TableHead>{t("prospects.activity-status")}</TableHead><TableHead>{t("prospects.quotes")}</TableHead><TableHead>{t("prospects.next-step")}</TableHead></TableRow></TableHeader>
        <TableBody>
          {selectedRows.map((row: any) => {
            const customer = kind === "prospects" ? row.customer : row.customer;
            const last = kind === "prospects" ? row.last : row.followup;
            const activeQuotes = kind === "opportunities" ? row.activeQuotes : [];
            const lastDate = last?.checkinAt ? new Date(last.checkinAt) : null;
            return <TableRow key={`${kind}-${customer.id}`}>
              <TableCell><div className="font-medium">{customer.name}</div><div className="text-xs text-muted-foreground">{customer.contactName || customer.email || customer.phone || "—"}</div></TableCell>
              <TableCell>{sellerName(last?.salesPersonId ?? last?.userId)}</TableCell>
              <TableCell>{lastDate ? <><div>{lastDate.toLocaleDateString()}</div><div className="text-xs text-muted-foreground">{last.meetingType}</div></> : "—"}</TableCell>
              <TableCell>{last?.followUpStatus === "open" ? <Badge className="bg-blue-600">{t("prospects.followup-open")}</Badge> : last?.followUpOutcome === "sale" || last?.followUpOutcome === "rental" ? <Badge className="bg-emerald-600">{t("prospects.won")}</Badge> : last?.followUpOutcome === "not_converted" ? <Badge variant="destructive">{t("prospects.not-converted")}</Badge> : <Badge variant="outline">{t("prospects.no-recent-activity")}</Badge>}</TableCell>
              <TableCell>{kind === "prospects" ? row.quoteCount : activeQuotes.length}{activeQuotes.length > 0 && <div className="text-xs text-muted-foreground">{activeQuotes.slice(0, 2).map((quote: Quotation) => `${quote.folio} (${currency(Number(quote.total || 0), quote.currency)})`).join(", ")}</div>}</TableCell>
              <TableCell>{last ? <Link className="text-primary underline-offset-4 hover:underline" href={`/checkins/${last.id}`}>{t("prospects.open-followup-link")}</Link> : <Link className="text-primary underline-offset-4 hover:underline" href="/checkins">{t("prospects.create-contact")}</Link>}</TableCell>
            </TableRow>;
          })}
          {selectedRows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{t("prospects.no-results")}</TableCell></TableRow>}
        </TableBody>
      </Table></div></CardContent></Card>
      <p className="text-xs text-muted-foreground">{t("prospects.definition-note")}</p>
    </>}
  </div>;
}
