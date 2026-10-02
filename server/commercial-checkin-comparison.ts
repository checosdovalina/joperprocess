import type { CommercialActivityRow } from "./commercial-results";

export interface CommercialClosureRow {
  id: string;
  closedAt: Date | string;
  outcome: string | null;
  wasProspect: boolean;
  customer: { id: string; name: string };
  seller: { id: string; name: string };
}

type Counts = { visits: number; sales: number; rentals: number; notConverted: number };
export interface CheckinComparison {
  totals: Counts;
  bySeller: Array<Counts & { id: string; name: string }>;
  byMonth: Array<Counts & { month: string }>;
}

export interface ComparisonPeriod {
  from: Date;
  to: Date;
}

const emptyCounts = (): Counts => ({ visits: 0, sales: 0, rentals: 0, notConverted: 0 });

export function commercialDateKey(value: Date | string, offset: number, timezone?: string): string {
  const date = new Date(value);
  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Independent event counts, not a visit-to-sale cohort conversion rate. */
export function summarizeCheckinComparison(
  contacts: CommercialActivityRow[],
  closures: CommercialClosureRow[],
  offset = 0,
  timezone?: string,
  period?: ComparisonPeriod,
): CheckinComparison {
  const totals = emptyCounts();
  const sellers = new Map<string, Counts & { id: string; name: string }>();
  const months = new Map<string, Counts & { month: string }>();
  const inPeriod = (value: Date | string) => !period ||
    (new Date(value) >= period.from && new Date(value) < period.to);
  const monthKey = (value: Date | string) => commercialDateKey(value, offset, timezone).slice(0, 7);
  if (period && period.from < period.to) {
    const first = monthKey(period.from);
    const last = monthKey(new Date(period.to.getTime() - 1));
    let cursor = new Date(`${first}-01T00:00:00.000Z`);
    while (cursor.toISOString().slice(0, 7) <= last) {
      const month = cursor.toISOString().slice(0, 7);
      months.set(month, { month, ...emptyCounts() });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  const increment = (seller: { id: string; name: string }, date: Date | string, metric: keyof Counts) => {
    const sellerCounts = sellers.get(seller.id) ?? { ...seller, ...emptyCounts() };
    const month = monthKey(date);
    const monthCounts = months.get(month) ?? { month, ...emptyCounts() };
    totals[metric]++;
    sellerCounts[metric]++;
    monthCounts[metric]++;
    sellers.set(seller.id, sellerCounts);
    months.set(month, monthCounts);
  };
  const contactIds = new Set<string>();
  for (const contact of contacts) {
    if (contact.meetingType !== "visita" || !inPeriod(contact.checkinAt) || contactIds.has(contact.id)) continue;
    contactIds.add(contact.id);
    increment(contact.seller, contact.checkinAt, "visits");
  }
  const closureIds = new Set<string>();
  for (const closure of closures) {
    const metric = closure.outcome === "sale" ? "sales"
      : closure.outcome === "rental" ? "rentals"
        : closure.outcome === "not_converted" ? "notConverted" : null;
    if (!metric || !inPeriod(closure.closedAt) || closureIds.has(closure.id)) continue;
    closureIds.add(closure.id);
    increment(closure.seller, closure.closedAt, metric);
  }
  return {
    totals,
    bySeller: Array.from(sellers.values()).sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name)),
    byMonth: Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month)),
  };
}