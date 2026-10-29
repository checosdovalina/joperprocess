import { describe, expect, it, vi } from "vitest";
import { resolveCheckinPdf } from "./checkin-pdf";
import type { Checkin, Customer, Tenant, User } from "@shared/schema";

const visit = {
  id: "visit", tenantId: "company", customerId: "client", userId: "creator",
  salesPersonId: "seller", minutePdfPath: null, checkinAt: new Date("2026-10-02T15:00:00Z"),
  checkoutAt: null, followUpStatus: "open", checkoutNotes: "Acuerdos actuales", photos: [],
} as unknown as Checkin;
function sources() {
  return {
    latestMinute: vi.fn().mockResolvedValue(undefined),
    customer: vi.fn().mockResolvedValue({ id: "client", tenantId: "company", name: "Cliente" } as Customer),
    seller: vi.fn().mockResolvedValue({ id: "seller", tenantId: "company", fullName: "Vendedor" } as User),
    tenant: vi.fn().mockResolvedValue({ id: "company", name: "Agroesa", locale: "es", timezone: "America/Mexico_City" } as Tenant),
  };
}
describe("check-in PDF resolution", () => {
  it("preserves a saved historical minute without regenerating it from changed data", async () => {
    const deps = sources();
    expect(await resolveCheckinPdf({ ...visit, minutePdfPath: "minutes/original.pdf" }, deps))
      .toEqual({ path: "minutes/original.pdf" });
    expect(deps.latestMinute).not.toHaveBeenCalled();
    expect(deps.customer).not.toHaveBeenCalled();
  });
  it("finds an existing contact minute when the parent has no saved PDF path", async () => {
    const deps = sources();
    deps.latestMinute.mockResolvedValue({ minutePdfPath: "minutes/contact.pdf" });
    expect(await resolveCheckinPdf(visit, deps)).toEqual({ path: "minutes/contact.pdf" });
    expect(deps.latestMinute).toHaveBeenCalledWith(visit);
    expect(deps.customer).not.toHaveBeenCalled();
  });
  it("prepares an open visit snapshot without changing dates, status, photos, or contact history", async () => {
    const deps = sources();
    const before = structuredClone(visit);
    const result = await resolveCheckinPdf(visit, deps);
    expect(result.data).toMatchObject({ checkin: visit, checkoutNotes: visit.checkoutNotes, tenant: { id: "company", locale: "es" } });
    expect(deps.seller).toHaveBeenCalledWith("seller");
    expect(visit).toEqual(before);
    expect(visit.checkoutAt).toBeNull();
  });
  it("also allows a closed legacy visit that never generated a minute", async () => {
    const closed = { ...visit, followUpStatus: "closed", checkoutAt: new Date() };
    expect((await resolveCheckinPdf(closed, sources())).data?.checkin).toEqual(closed);
  });
  it("uses the creator when no separate seller is assigned and supports a parent-company administrator", async () => {
    const deps = sources();
    deps.seller.mockResolvedValue({ id: "creator", tenantId: "parent-company" });
    expect((await resolveCheckinPdf({ ...visit, salesPersonId: null }, deps)).data?.user.id).toBe("creator");
    expect(deps.seller).toHaveBeenCalledWith("creator");
  });
  it("refuses a missing participant or customer outside the visit's company", async () => {
    const deps = sources();
    deps.customer.mockResolvedValue(undefined);
    await expect(resolveCheckinPdf(visit, deps)).rejects.toThrow("CHECKIN_PDF_MISSING_PARTICIPANT");
    deps.customer.mockResolvedValue({ id: "client", tenantId: "other-company" });
    await expect(resolveCheckinPdf(visit, deps)).rejects.toThrow("CHECKIN_PDF_MISSING_PARTICIPANT");
  });
  it("renders a valid PDF for a visit without any stored minute", async () => {
    const result = await resolveCheckinPdf(visit, sources());
    expect(result.data).toBeDefined();
    const { generateMinutePDFStream } = await import("./pdf-generator");
    const stream = await generateMinutePDFStream(result.data!);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdf = Buffer.concat(chunks);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.subarray(-6).toString()).toContain("%%EOF");
    expect(visit.followUpStatus).toBe("open");
    expect(visit.checkoutAt).toBeNull();
  });
});
