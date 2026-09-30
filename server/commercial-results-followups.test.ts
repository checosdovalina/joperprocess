import { describe, expect, it } from "vitest";
import { summarizeCommercialActivity, type CommercialActivityRow } from "./commercial-results";

describe("commercial activity with follow-up history", () => {
  it("counts every contact but counts each open or closed opportunity once", () => {
    const items: CommercialActivityRow[] = [
      {
        id: "follow-up-1",
        followUpId: "follow-up-1",
        followUpStatus: "closed",
        followUpOutcome: "sale",
        checkinAt: "2026-09-01T10:00:00.000Z",
        checkoutAt: "2026-09-05T10:00:00.000Z",
        meetingType: "visita",
        wasProspect: true,
        customer: { id: "company-1", name: "Empresa Uno" },
        seller: { id: "seller-1", name: "Vendedor Uno" },
      },
      {
        id: "contact-2",
        followUpId: "follow-up-1",
        followUpStatus: "closed",
        followUpOutcome: "sale",
        checkinAt: "2026-09-03T10:00:00.000Z",
        checkoutAt: "2026-09-05T10:00:00.000Z",
        meetingType: "llamada",
        wasProspect: true,
        customer: { id: "company-1", name: "Empresa Uno" },
        seller: { id: "seller-1", name: "Vendedor Uno" },
      },
      {
        id: "follow-up-2",
        followUpId: "follow-up-2",
        followUpStatus: "open",
        followUpOutcome: null,
        checkinAt: "2026-09-04T10:00:00.000Z",
        checkoutAt: null,
        meetingType: "visita",
        wasProspect: false,
        customer: { id: "company-2", name: "Empresa Dos" },
        seller: { id: "seller-1", name: "Vendedor Uno" },
      },
    ];

    const results = summarizeCommercialActivity(items, 0);

    expect(results.summary.totalContacts).toBe(3);
    expect(results.summary.prospectVisits).toBe(2);
    expect(results.summary.completed).toBe(1);
    expect(results.summary.active).toBe(1);
    expect(results.bySeller[0]).toMatchObject({ contacts: 3, completed: 1 });
    expect(results.daily.reduce((total, day) => total + day.contacts, 0)).toBe(3);
  });
});