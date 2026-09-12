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
  bySeller: { id: string; name: string; contacts: number; prospects: number; completed: number }[];
  byCustomer: { id: string; name: string; contacts: number; prospects: number; lastContactAt: string | null }[];
  byMeetingType: { type: string; count: number }[];
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
    const response = await fetch(`/api/commercial-results/export/${format}?${params}`, { credentials: "include" });
    if (!response.ok) throw new Error("download");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `nexxo-resultados-comerciales-${from}-${to}.${format}`; a.click(); URL.revokeObjectURL(url);
  };
  const clear = () => { const d = new Date(); d.setDate(d.getDate() - 29); setFrom(d.toISOString().slice(0, 10)); setTo(new Date().toISOString().slice(0, 10)); setCustomerId("all"); setMeetingType("all"); setSellerId("all"); setAudience("all"); };
  const r = query.data;
  const hasFilters = customerId !== "all" || meetingType !== "all" || sellerId !== "all" || audience !== "all";
  const meetingLabel = (type: string) => type === "visita" ? t("commercial-results.type.visit") : type === "llamada" ? t("commercial-results.type.call") : type === "videollamada" ? t("commercial-results.type.video") : type;
  const number = (n: number) => n.toLocaleString();
  const chartConfig = { contacts: { label: t("commercial-results.contacts"), color: "#0f766e" }, prospects: { label: t("commercial-results.prospects"), color: "#e09f3e" }, customers: { label: t("commercial-results.customers"), color: "#315c9b" } };
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
    <Card className="border-primary/15 bg-card/80 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4 text-primary" />{t("commercial-results.filters")}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div><Label className="text-xs">{t("label.from")}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><Label className="text-xs">{t("label.to")}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      <div><Label className="text-xs">{t("label.client")}</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label className="text-xs">{t("commercial-results.meeting-type")}</Label><Select value={meetingType} onValueChange={setMeetingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem><SelectItem value="visita">{meetingLabel("visita")}</SelectItem><SelectItem value="llamada">{meetingLabel("llamada")}</SelectItem><SelectItem value="videollamada">{meetingLabel("videollamada")}</SelectItem></SelectContent></Select></div>
      {admin && <div><Label className="text-xs">{t("label.seller")}</Label><Select value={sellerId} onValueChange={setSellerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName || s.username}</SelectItem>)}</SelectContent></Select></div>}
      <div><Label className="text-xs">{t("commercial-results.audience")}</Label><Select value={audience} onValueChange={setAudience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("label.all")}</SelectItem><SelectItem value="prospects">{t("commercial-results.prospects")}</SelectItem><SelectItem value="customers">{t("commercial-results.customers")}</SelectItem></SelectContent></Select></div>
    </div><div className="mt-3 flex justify-end">{hasFilters && <Button variant="ghost" size="sm" onClick={clear}>{t("btn.clear-filters")}</Button>}</div></CardContent></Card>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">{Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div> : query.isError ? <Card className="border-destructive/30"><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><p className="font-medium">{t("commercial-results.error")}</p><Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{t("btn.refresh")}</Button></CardContent></Card> : !r || r.summary.totalContacts === 0 ? <Card><CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground"><TrendingUp className="h-10 w-10 opacity-40" /><p>{t("commercial-results.empty")}</p></CardContent></Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{stats.map(([label, value, color, Icon]) => <Card key={label} className="overflow-hidden"><CardContent className="relative p-4"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${color}`}><Icon className="h-4 w-4" /></div><p className="text-2xl font-semibold tabular-nums">{number(value)}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><Card><CardHeader><CardTitle>{t("commercial-results.daily-title")}</CardTitle><CardDescription>{t("commercial-results.daily-desc")}</CardDescription></CardHeader><CardContent><ChartContainer config={chartConfig} className="h-[280px] w-full"><LineChart data={r.daily} margin={{left: -18, right: 8, top: 8}}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={v => v.slice(5)} /><YAxis allowDecimals={false} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="customers" stroke="var(--color-customers)" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="prospects" stroke="var(--color-prospects)" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="contacts" stroke="var(--color-contacts)" strokeWidth={2.5} dot={false} /></LineChart></ChartContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("commercial-results.types-title")}</CardTitle><CardDescription>{t("commercial-results.types-desc")}</CardDescription></CardHeader><CardContent><ChartContainer config={{count: {label: t("commercial-results.contacts"), color: "#0f766e"}}} className="h-[280px] w-full"><BarChart data={r.byMeetingType} layout="vertical" margin={{left: 8, right: 16}}><CartesianGrid horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="type" width={96} tickFormatter={meetingLabel} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} /></BarChart></ChartContainer></CardContent></Card></div>
      <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><CardTitle>{t("commercial-results.sellers-title")}</CardTitle><CardDescription>{t("commercial-results.sellers-desc")}</CardDescription></CardHeader><CardContent><div className="space-y-3">{r.bySeller.slice(0, 8).map(s => <div key={s.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.name}</span><span className="tabular-nums text-muted-foreground">{number(s.contacts)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{width: `${Math.min(100, s.contacts / Math.max(1, r.summary.totalContacts) * 100)}%`}} /></div></div>)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("commercial-results.customers-title")}</CardTitle><CardDescription>{t("commercial-results.customers-desc")}</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">{t("label.client")}</th><th className="pb-2 text-right font-medium">{t("commercial-results.contacts")}</th><th className="pb-2 text-right font-medium">{t("commercial-results.last-contact")}</th></tr></thead><tbody className="divide-y">{r.byCustomer.slice(0, 8).map(c => <tr key={c.id} className="hover:bg-muted/40"><td className="py-3 font-medium">{c.name}</td><td className="py-3 text-right tabular-nums">{number(c.contacts)}</td><td className="py-3 text-right text-xs text-muted-foreground">{c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div></CardContent></Card></div>
    </>}
  </div>;
}