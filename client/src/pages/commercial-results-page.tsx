import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Download, FileSpreadsheet, FileText, Filter, RefreshCw, TrendingUp, Users, UserRound, Activity, ChevronRight } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Results = {
  summary: { totalContacts: number; prospectVisits: number; customerVisits: number; completed: number; active: number; uniqueCustomers: number };
  daily: { date: string; contacts: number; prospects: number; customers: number }[];
  bySeller: { id: string; name: string; contacts: number; prospects: number; followUps: number; completed: number }[];
  byCustomer: { id: string; name: string; contacts: number; prospects: number; lastContactAt: string | null }[];
  byMeetingType: { type: string; count: number }[];
  comparison?: {
    totals: { visits: number; sales: number; rentals: number; notConverted: number };
    bySeller: { id: string; name: string; visits: number; sales: number; rentals: number; notConverted: number }[];
    byMonth: { month: string; visits: number; sales: number; rentals: number; notConverted: number }[];
  };
};
type Person = { id: string; fullName?: string; username?: string };
type Customer = { id: string; name: string };

const isoLocal = (value: string, end = false) => {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (end) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

export default function CommercialResultsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("all");
  const [meetingType, setMeetingType] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [audience, setAudience] = useState("all");
  const [exportError, setExportError] = useState(false);
  const { data: sellers = [] } = useQuery<Person[]>({ queryKey: ["/api/sellers"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const params = useMemo(() => {
    const p = new URLSearchParams({ from: isoLocal(from), to: isoLocal(to, true), audience, timezoneOffsetMinutes: String(new Date().getTimezoneOffset()) });
    if (customerId !== "all") p.set("customerId", customerId);
    if (meetingType !== "all") p.set("meetingType", meetingType);
    if (sellerId !== "all" && admin) p.set("sellerId", sellerId);
    return p;
  }, [from, to, customerId, meetingType, sellerId, audience, admin]);
  const query = useQuery<Results>({
    queryKey: ["/api/commercial-results", params.toString()],
    queryFn: async () => (await apiRequest("GET", `/api/commercial-results?${params}`)).json(),
  });
  const download = async (format: "pdf" | "xlsx") => {
    setExportError(false);
    try {
      const response = await fetch(`/api/commercial-results/export/${format}?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `nexxo-resultados-comerciales-${from}-${to}.${format}`; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(true);
    }
  };
  const clear = () => { const d = new Date(); d.setDate(d.getDate() - 29); setFrom(d.toISOString().slice(0, 10)); setTo(new Date().toISOString().slice(0, 10)); setCustomerId("all"); setMeetingType("all"); setSellerId("all"); setAudience("all"); };
  const r = query.data;
  const hasFilters = customerId !== "all" || meetingType !== "all" || sellerId !== "all" || audience !== "all";
  const meetingLabel = (type: string) => type === "visita" ? t("commercial-results.type.visit") : type === "llamada" ? t("commercial-results.type.call") : type === "videollamada" ? t("commercial-results.type.video") : type;
  const number = (n: number) => n.toLocaleString();
  const chartConfig = { contacts: { label: t("commercial-results.contacts"), color: "#0f766e" }, prospects: { label: t("commercial-results.prospects"), color: "#e09f3e" }, customers: { label: t("commercial-results.customers"), color: "#315c9b" } };
  const comparisonConfig = {
    visits: { label: t("commercial-results.visits"), color: "#315c9b" },
    sales: { label: t("commercial-results.sales"), color: "#16816a" },
    rentals: { label: t("commercial-results.rentals"), color: "#77679b" },
    notConverted: { label: t("commercial-results.not-converted"), color: "#c17b35" },
  };
  const comparisonSellers = r?.comparison?.bySeller ?? [];
  const comparisonMonths = r?.comparison?.byMonth ?? [];
  const monthLabel = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
  };
  const comparisonTotals = r?.comparison?.totals;
  const hasComparisonActivity = (comparisonTotals?.visits ?? 0) > 0 ||
    (comparisonTotals?.sales ?? 0) > 0 ||
    (comparisonTotals?.rentals ?? 0) > 0 ||
    (comparisonTotals?.notConverted ?? 0) > 0;
  const stats: [string, number, string, ElementType][] = [
    [t("commercial-results.total"), r?.summary.totalContacts ?? 0, "text-primary", Activity],
    [t("commercial-results.prospect-visits"), r?.summary.prospectVisits ?? 0, "text-amber-600", TrendingUp],
    [t("commercial-results.customer-visits"), r?.summary.customerVisits ?? 0, "text-blue-700", Users],
    [t("commercial-results.completed"), r?.summary.completed ?? 0, "text-emerald-600", ChevronRight],
    [t("commercial-results.active"), r?.summary.active ?? 0, "text-orange-600", RefreshCw],
    [t("commercial-results.unique"), r?.summary.uniqueCustomers ?? 0, "text-violet-600", UserRound],
  ];

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Activity className="h-4 w-4" />{t("commercial-results.eyebrow")}</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("commercial-results.title")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("commercial-results.subtitle")}</p></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => download("pdf")} disabled={!r}><FileText className="mr-2 h-4 w-4" />PDF</Button><Button variant="outline" size="sm" onClick={() => download("xlsx")} disabled={!r}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button></div>
    </div>
    {exportError && <p role="alert" className="text-sm text-destructive">{t("commercial-results.export-error")}</p>}
    <Card className="border-primary/15 bg-card/80 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4 text-primary" />{t("commercial-results.filters")}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div><Label className="text-xs">{t("label.from")}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><Label className="text-xs">{t("label.to")}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      <div><Label className="text-xs">{t("label.client")}</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label className="text-xs">{t("commercial-results.meeting-type")}</Label><Select value={meetingType} onValueChange={setMeetingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem><SelectItem value="visita">{meetingLabel("visita")}</SelectItem><SelectItem value="llamada">{meetingLabel("llamada")}</SelectItem><SelectItem value="videollamada">{meetingLabel("videollamada")}</SelectItem></SelectContent></Select></div>
      {admin && <div><Label className="text-xs">{t("label.seller")}</Label><Select value={sellerId} onValueChange={setSellerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName || s.username}</SelectItem>)}</SelectContent></Select></div>}
      <div><Label className="text-xs">{t("commercial-results.audience")}</Label><Select value={audience} onValueChange={setAudience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem><SelectItem value="prospects">{t("commercial-results.prospects")}</SelectItem><SelectItem value="customers">{t("commercial-results.customers")}</SelectItem></SelectContent></Select></div>
    </div><div className="mt-3 flex justify-end">{hasFilters && <Button variant="ghost" size="sm" onClick={clear}>{t("btn.clear-filters")}</Button>}</div></CardContent></Card>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">{Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div> : query.isError ? <Card className="border-destructive/30"><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><p className="font-medium">{t("commercial-results.error")}</p><Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{t("btn.refresh")}</Button></CardContent></Card> : !r ? null : <>
       {!hasComparisonActivity && r.summary.totalContacts === 0 && <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"><TrendingUp className="h-10 w-10 opacity-40" /><p>{t("commercial-results.empty")}</p></CardContent></Card>}
      {r.summary.totalContacts > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{stats.map(([label, value, color, Icon]) => <Card key={label} className="overflow-hidden"><CardContent className="relative p-4"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${color}`}><Icon className="h-4 w-4" /></div><p className="text-2xl font-semibold tabular-nums">{number(value)}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>}

      <section aria-labelledby="commercial-comparison-heading" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 id="commercial-comparison-heading" className="text-lg font-semibold">{t("commercial-results.comparison-title")}</h2><p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground">{t("commercial-results.comparison-method")}</p></div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm" aria-label={t("commercial-results.comparison-legend")}>
            {Object.entries(comparisonConfig).map(([key, series]) => <span key={key} className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />{series.label}</span>)}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("commercial-results.filter-scope-note")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("commercial-results.comparison-totals")}>
          {([
            ["visits", t("commercial-results.visits"), comparisonTotals?.visits ?? 0],
            ["sales", t("commercial-results.sales"), comparisonTotals?.sales ?? 0],
            ["rentals", t("commercial-results.rentals"), comparisonTotals?.rentals ?? 0],
            ["notConverted", t("commercial-results.not-converted"), comparisonTotals?.notConverted ?? 0],
          ] as const).map(([key, label, value]) => <div key={key} className="rounded-lg border bg-card px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ backgroundColor: comparisonConfig[key].color }} />{label}</div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{number(value)}</p>
          </div>)}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("commercial-results.comparison-seller-title")}</CardTitle><CardDescription>{t("commercial-results.comparison-seller-desc")}</CardDescription></CardHeader>
            <CardContent>
              {comparisonSellers.length ? <>
                <ChartContainer config={comparisonConfig} className="w-full" style={{ height: Math.max(180, comparisonSellers.length * 52 + 36) }} aria-label={t("commercial-results.comparison-seller-title")}><BarChart data={comparisonSellers} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }} barCategoryGap="24%"><CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="visits" fill="var(--color-visits)" radius={[0, 4, 4, 0]} /><Bar dataKey="sales" fill="var(--color-sales)" radius={[0, 4, 4, 0]} /><Bar dataKey="rentals" fill="var(--color-rentals)" radius={[0, 4, 4, 0]} /><Bar dataKey="notConverted" fill="var(--color-notConverted)" radius={[0, 4, 4, 0]} /></BarChart></ChartContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">{t("commercial-results.comparison-seller-table-caption")}</caption>
                    <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">{t("label.seller")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.visits")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.sales")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.rentals")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.not-converted")}</th></tr></thead>
                    <tbody className="divide-y">{comparisonSellers.map(s => <tr key={s.id}><th scope="row" className="py-2 text-left font-medium">{s.name}</th><td className="py-2 text-right tabular-nums">{number(s.visits)}</td><td className="py-2 text-right tabular-nums">{number(s.sales)}</td><td className="py-2 text-right tabular-nums">{number(s.rentals ?? 0)}</td><td className="py-2 text-right tabular-nums">{number(s.notConverted ?? 0)}</td></tr>)}</tbody>
                  </table>
                </div>
              </> : <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t("commercial-results.comparison-no-sellers")}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("commercial-results.comparison-month-title")}</CardTitle><CardDescription>{t("commercial-results.comparison-month-desc")}</CardDescription></CardHeader>
            <CardContent>
              {comparisonMonths.length ? <>
                <ChartContainer config={comparisonConfig} className="h-[300px] w-full" aria-label={t("commercial-results.comparison-month-title")}><BarChart data={comparisonMonths} margin={{ left: -16, right: 8, top: 8, bottom: 8 }} barCategoryGap="24%"><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} minTickGap={16} /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? monthLabel(payload[0].payload.month) : ""} />} /><Bar dataKey="visits" fill="var(--color-visits)" radius={[4, 4, 0, 0]} /><Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} /><Bar dataKey="rentals" fill="var(--color-rentals)" radius={[4, 4, 0, 0]} /><Bar dataKey="notConverted" fill="var(--color-notConverted)" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">{t("commercial-results.comparison-month-table-caption")}</caption>
                    <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">{t("label.month")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.visits")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.sales")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.rentals")}</th><th scope="col" className="pb-2 text-right font-medium">{t("commercial-results.not-converted")}</th></tr></thead>
                    <tbody className="divide-y">{comparisonMonths.map(row => <tr key={row.month}><th scope="row" className="py-2 text-left font-medium">{monthLabel(row.month)}</th><td className="py-2 text-right tabular-nums">{number(row.visits)}</td><td className="py-2 text-right tabular-nums">{number(row.sales)}</td><td className="py-2 text-right tabular-nums">{number(row.rentals ?? 0)}</td><td className="py-2 text-right tabular-nums">{number(row.notConverted ?? 0)}</td></tr>)}</tbody>
                  </table>
                </div>
              </> : <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t("commercial-results.comparison-no-months")}</p>}
            </CardContent>
          </Card>
        </div>
      </section>
      {r.summary.totalContacts > 0 && <>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><Card><CardHeader><CardTitle>{t("commercial-results.daily-title")}</CardTitle><CardDescription>{t("commercial-results.daily-desc")}</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[280px] w-full"><LineChart data={r.daily} margin={{left: -18, right: 8, top: 8}}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={v => v.slice(5)} /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="customers" stroke="var(--color-customers)" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="prospects" stroke="var(--color-prospects)" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="contacts" stroke="var(--color-contacts)" strokeWidth={2.5} dot={false} /></LineChart></ChartContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("commercial-results.types-title")}</CardTitle><CardDescription>{t("commercial-results.types-desc")}</CardDescription></CardHeader><CardContent><ChartContainer config={{count: {label: t("commercial-results.contacts"), color: "#0f766e"}}} className="h-[280px] w-full"><BarChart data={r.byMeetingType} layout="vertical" margin={{left: 8, right: 16}}><CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="type" width={96} tickFormatter={meetingLabel} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} /></BarChart></ChartContainer></CardContent></Card></div>
      <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("commercial-results.sellers-title")}</CardTitle><CardDescription>{t("commercial-results.sellers-desc")}</CardDescription></CardHeader><CardContent><div className="space-y-3">{r.bySeller.map(s => <div key={s.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.name}</span><span className="tabular-nums text-muted-foreground">{number(s.contacts)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{width: `${Math.min(100, s.contacts / Math.max(1, r.summary.totalContacts) * 100)}%`}} /></div></div>)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("commercial-results.customers-title")}</CardTitle><CardDescription>{t("commercial-results.customers-desc")}</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">{t("label.client")}</th><th className="pb-2 text-right font-medium">{t("commercial-results.contacts")}</th><th className="pb-2 text-right font-medium">{t("commercial-results.last-contact")}</th></tr></thead><tbody className="divide-y">{r.byCustomer.slice(0, 8).map(c => <tr key={c.id} className="hover:bg-muted/40"><td className="py-3 font-medium">{c.name}</td><td className="py-3 text-right tabular-nums">{number(c.contacts)}</td><td className="py-3 text-right text-xs text-muted-foreground">{c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div></CardContent></Card></div>
      </>}
    </>}
  </div>;
}