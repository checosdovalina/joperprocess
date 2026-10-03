import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import { generateQuotationPDFStream } from "./quotation-pdf-generator";
import { formatPdfCurrency } from "./pdf-locale";

afterEach(() => vi.restoreAllMocks());

async function renderTaxPdf(
  rates: number[],
  options: { discount?: number; foreign?: boolean; currencies?: string[]; english?: boolean } = {},
) {
  const spy = vi.spyOn(PDFDocument.prototype, "text");
  const pdf = await generateQuotationPDFStream({
    quotation: {
      folio: "IVA-TEST", createdAt: new Date("2026-10-02T12:00:00Z"),
      currency: options.currencies ? "AMBAS" : "MXN", exchangeRate: "18",
      subtotal: String(100 * rates.length), taxRate: options.english ? "7.25" : "16",
      globalDiscount: String(options.discount ?? 0), tax: "16", total: "116",
    } as any,
    items: rates.map((rate, index) => ({
      productName: `Product ${index}`, productCode: `P-${index}`, quantity: "1",
      unitPrice: "100", listPrice: "100", subtotal: "100", total: String(100 + rate),
      discountPercent: "0", discountAmount: "0", taxRate: String(rate), taxAmount: String(rate),
      currency: options.currencies?.[index] ?? "MXN", unitOfMeasure: "PZA", position: index,
    })) as any,
    customer: { name: "Customer", country: "MX", rfc: options.foreign ? "XEXX010101000" : "DOMESTIC" } as any,
    user: { fullName: "Salesperson" } as any,
    tenant: { name: "Company", locale: options.english ? "en-US" : "es-MX" },
  });
  for await (const _chunk of pdf) { /* Drain the generated PDF. */ }
  return spy.mock.calls.map(([text]) => String(text));
}

describe("quotation PDF catalog IVA", () => {
  it.each([0, 8, 16])("uses product IVA %s instead of a fixed 16 percent", async rate => {
    const text = await renderTaxPdf([rate]);
    expect(text).toContain(formatPdfCurrency(100 + rate, "MXN", "es"));
    if (rate > 0) expect(text).toContain(`IVA (${rate}%):`);
    else expect(text.some(value => value.startsWith("IVA"))).toBe(false);
    if (rate !== 16) expect(text).not.toContain("IVA (16%):");
  });

  it("sums different IVA rates without incorrectly labeling them as 16 percent", async () => {
    const text = await renderTaxPdf([0, 8, 16]);
    expect(text).toContain("IVA:");
    expect(text).not.toContain("IVA (16%):");
    expect(text).toContain(formatPdfCurrency(24, "MXN", "es"));
    expect(text).toContain(formatPdfCurrency(324, "MXN", "es"));
  });

  it("applies global discounts before calculating IVA", async () => {
    const text = await renderTaxPdf([8], { discount: 10 });
    expect(text).toContain(formatPdfCurrency(7.2, "MXN", "es"));
    expect(text).toContain(formatPdfCurrency(97.2, "MXN", "es"));
  });

  it("keeps foreign RFC quotations exempt", async () => {
    const text = await renderTaxPdf([16], { foreign: true });
    expect(text.some(value => value.startsWith("IVA"))).toBe(false);
    expect(text).toContain(formatPdfCurrency(100, "MXN", "es"));
  });

  it("calculates IVA in each currency for mixed-currency quotations", async () => {
    const text = await renderTaxPdf([8, 16], { currencies: ["MXN", "USD"] });
    expect(text).toContain("IVA (8%):");
    expect(text).toContain("IVA (16%):");
    expect(text).toContain(formatPdfCurrency(108, "MXN", "es"));
    expect(text).toContain(formatPdfCurrency(116, "USD", "es"));
  });

  it("preserves manual USA sales tax", async () => {
    const text = await renderTaxPdf([16], { english: true });
    expect(text).toContain("Sales tax (7.25%):");
    expect(text).toContain(formatPdfCurrency(107.25, "MXN", "en"));
  });
});