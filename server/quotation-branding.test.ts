import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { localStorageService } from "./localStorage";
import { isAgroesaQuotation, loadQuotationPartnerLogos } from "./quotation-branding";
import { generateQuotationPDFStream } from "./quotation-pdf-generator";

const item = {
  productCode: "EQ-01", productName: "Equipo agrícola", description: "Especificaciones completas del equipo.",
  quantity: "1", unitOfMeasure: "PZA", listPrice: "100", unitPrice: "100",
  discountPercent: "0", discountAmount: "0", subtotal: "100", taxRate: "16",
  taxAmount: "16", total: "116", position: 0, currency: "MXN",
};

async function render(tenant: any, items = [item]) {
  const stream = await generateQuotationPDFStream({
    tenant,
    quotation: {
      folio: "MEX-TEST", createdAt: new Date("2026-10-15T12:00:00Z"),
      currency: "MXN", subtotal: "100", globalDiscount: "0", tax: "16", taxRate: "16", total: "116",
    } as any,
    customer: { name: "Cliente de prueba", country: "MX" } as any,
    user: { fullName: "Asesor comercial" } as any,
    items: items as any,
  });
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
}

afterEach(() => vi.restoreAllMocks());

describe("Agroesa quotation letterhead", () => {
  it("recognizes only the intended company, not partial or unrelated names", () => {
    expect(isAgroesaQuotation({ name: "AGROESA" })).toBe(true);
    expect(isAgroesaQuotation({ name: "Company", subdomain: " agroesa " })).toBe(true);
    expect(isAgroesaQuotation({ legalName: "Agroesa, S.A. de C.V." })).toBe(true);
    for (const name of ["Joper", "Otra Agroesa", "Agroesagroup", "Tipo"]) {
      expect(isAgroesaQuotation({ name, subdomain: "other" })).toBe(false);
    }
    expect(isAgroesaQuotation(null)).toBe(false);
  });

  it("loads both packaged brand assets only for Agroesa", async () => {
    expect(await loadQuotationPartnerLogos({ name: "Joper" })).toEqual([]);
    const logos = await loadQuotationPartnerLogos({ name: "Agroesa" });
    expect(logos).toHaveLength(2);
    for (const buffer of logos) expect((await sharp(buffer).metadata()).format).toBe("png");
  });

  it("renders the company logo and two brand logos in a single aligned row", async () => {
    const companyLogo = await sharp({
      create: { width: 120, height: 40, channels: 3, background: "#008743" },
    }).png().toBuffer();
    vi.spyOn(localStorageService, "getFile").mockResolvedValue(companyLogo);
    const image = vi.spyOn(PDFDocument.prototype, "image");
    await render({ name: "Agroesa", logoUrl: "/api/logos/company.png" });
    expect(image).toHaveBeenCalledTimes(3);
    expect(image.mock.calls[0][0]).toEqual(companyLogo);
    expect(image.mock.calls.map(call => call[1])).toEqual([40, 288, 444]);
    expect(image.mock.calls[1][3]).toMatchObject({ fit: [112, 38], valign: "center" });
    expect(image.mock.calls[2][3]).toMatchObject({ fit: [128, 38], valign: "center" });
  });

  it("preserves the original single-logo header for other companies", async () => {
    const logo = (await loadQuotationPartnerLogos({ name: "Agroesa" }))[0];
    vi.spyOn(localStorageService, "getFile").mockResolvedValue(logo);
    const image = vi.spyOn(PDFDocument.prototype, "image");
    const rect = vi.spyOn(PDFDocument.prototype, "rect");
    await render({ name: "Joper", logoUrl: "/api/logos/company.png" });
    expect(image).toHaveBeenCalledTimes(1);
    expect(rect).toHaveBeenCalledWith(0, 0, 612, 112);
  });

  it("retains the company name without a configured logo and supports multiple pages", async () => {
    const image = vi.spyOn(PDFDocument.prototype, "image");
    const text = vi.spyOn(PDFDocument.prototype, "text");
    const addPage = vi.spyOn(PDFDocument.prototype, "addPage");
    await render({ name: "Agroesa", locale: "en" }, Array.from({ length: 60 }, (_, position) => ({ ...item, position })));
    expect(image).toHaveBeenCalledTimes(2);
    expect(text.mock.calls.some(([value]) => value === "Agroesa")).toBe(true);
    expect(text.mock.calls.some(([value]) => value === "QUOTATION")).toBe(true);
    expect(addPage.mock.calls.length).toBeGreaterThan(1);
  });
});
