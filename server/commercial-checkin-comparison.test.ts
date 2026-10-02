import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { summarizeCheckinComparison, type CommercialClosureRow } from "./commercial-checkin-comparison";
import { generateCommercialResultsExcel, summarizeCommercialActivity, type CommercialActivityRow } from "./commercial-results";

const seller = { id: "seller-1", name: "Vendedor Uno" };
const customer = { id: "customer-1", name: "Cliente Uno" };
const contact = (id: string, date: string, type = "visita"): CommercialActivityRow => ({
  id, followUpId: "follow-up-1", followUpStatus: "closed", followUpOutcome: "sale",
  checkinAt: date, checkoutAt: "2026-03-10T18:00:00Z", meetingType: type,
  wasProspect: true, seller, customer,
});
const closure = (id: string, outcome: string | null, date = "2026-03-10T18:00:00Z"): CommercialClosureRow => ({
  id, outcome, closedAt: date, seller, customer, wasProspect: true,
});
const period = { from: new Date("2026-02-01T06:00:00Z"), to: new Date("2026-04-01T06:00:00Z") };

describe("Check-in visit/outcome comparisons", () => {
  it("counts physical contacts and each of the three closure outcomes once, independently", () => {
    const first = contact("contact-1", "2026-02-10T18:00:00Z");
    const sale = closure("follow-up-1", "sale");
    const result = summarizeCheckinComparison([
      first, first, contact("contact-2", "2026-02-12T18:00:00Z"),
      contact("call-1", "2026-02-13T18:00:00Z", "llamada"),
      contact("video-1", "2026-02-14T18:00:00Z", "videollamada"),
    ], [sale, sale, closure("rental", "rental"), closure("lost", "not_converted")],
    0, "America/Mexico_City", period);
    expect(result.totals).toEqual({ visits: 2, sales: 1, rentals: 1, notConverted: 1 });
    expect(result.bySeller).toEqual([{ ...seller, ...result.totals }]);
    expect(result.byMonth).toEqual([
      { month: "2026-02", visits: 2, sales: 0, rentals: 0, notConverted: 0 },
      { month: "2026-03", visits: 0, sales: 1, rentals: 1, notConverted: 1 },
    ]);
  });

  it("does not infer a sale from the outcome repeated on contact records", () => {
    expect(summarizeCheckinComparison([contact("contact", "2026-02-10T18:00:00Z")], []).totals)
      .toEqual({ visits: 1, sales: 0, rentals: 0, notConverted: 0 });
  });

  it("preserves sellers with closures but no visits and leaves unknown outcomes unclassified", () => {
    const otherSeller = { id: "seller-2", name: "Vendedor Dos" };
    const result = summarizeCheckinComparison([], [
      { ...closure("sale", "sale"), seller: otherSeller },
      closure("unknown", null), closure("invalid", "legacy"),
    ]);
    expect(result.bySeller).toEqual([{ ...otherSeller, visits: 0, sales: 1, rentals: 0, notConverted: 0 }]);
    expect(result.totals).toEqual({ visits: 0, sales: 1, rentals: 0, notConverted: 0 });
  });

  it("uses tenant timezone at month boundaries and an exclusive interval end", () => {
    const result = summarizeCheckinComparison([
      contact("at-start", period.from.toISOString()),
      contact("at-end", period.to.toISOString()),
    ], [
      closure("sale", "sale", "2026-03-01T04:30:00Z"),
      closure("excluded", "rental", period.to.toISOString()),
      closure("before", "not_converted", "2026-02-01T05:59:59Z"),
    ], 0, "America/Mexico_City", period);
    expect(result.byMonth).toEqual([
      { month: "2026-02", visits: 1, sales: 1, rentals: 0, notConverted: 0 },
      { month: "2026-03", visits: 0, sales: 0, rentals: 0, notConverted: 0 },
    ]);
  });

  it("fills empty months across a year boundary and supports offset-only grouping", () => {
    expect(summarizeCheckinComparison([], [], 0, "UTC", {
      from: new Date("2025-12-01T00:00:00Z"), to: new Date("2026-03-01T00:00:00Z"),
    }).byMonth.map(row => row.month)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(summarizeCheckinComparison([], [closure("sale", "sale", "2026-03-01T04:30:00Z")], 360)
      .byMonth[0].month).toBe("2026-02");
    expect(summarizeCheckinComparison([], [], 0, "UTC", { from: period.from, to: period.from }).byMonth).toEqual([]);
  });

  it("exports identical seller/month counts, numeric zeros and closure audit rows", async () => {
    const contacts = [contact("visit", "2026-02-10T18:00:00Z")];
    const closures = [closure("sale", "sale"), closure("rental", "rental"), closure("lost", "not_converted"), closure("legacy", null)];
    const results = summarizeCommercialActivity(contacts, 0, "America/Mexico_City", closures, period);
    const buffer = await generateCommercialResultsExcel(results, {
      companyName: "Prueba", filtersLabel: "Periodo de prueba",
      tenantBranding: { name: "Prueba", locale: "es", timezone: "America/Mexico_City" },
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.getWorksheet("Visitas y resultados vendedor")!.getRow(2).values)
      .toEqual([undefined, seller.name, 1, 1, 1, 1]);
    expect(workbook.getWorksheet("Visitas y resultados mes")!.getRow(2).values)
      .toEqual([undefined, "2026-02", 1, 0, 0, 0]);
    expect(workbook.getWorksheet("Visitas y resultados mes")!.getRow(3).values)
      .toEqual([undefined, "2026-03", 0, 1, 1, 1]);
    const audit = workbook.getWorksheet("Cierres de seguimiento")!;
    expect(audit.rowCount).toBe(5);
    expect(audit.getCell("E2").value).toBe("Venta concretada");
    expect(audit.getCell("E3").value).toBe("Renta concretada");
    expect(audit.getCell("E4").value).toBe("No concretada");
    expect(audit.getCell("E5").value).toBe("Sin resultado registrado");
    expect(workbook.getWorksheet("Detalle")!.rowCount).toBe(2);
    expect(workbook.getWorksheet("Definiciones")).toBeDefined();
  });
});