import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import { generateQuotationPDFStream } from "./quotation-pdf-generator";

describe("quotation PDF product descriptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the saved line-item description under the product name", async () => {
    const description = "Heavy-duty replacement filter, 20 microns";
    const textSpy = vi.spyOn(PDFDocument.prototype, "text");
    const pdf = await generateQuotationPDFStream({
      quotation: {
        folio: "COT-TEST",
        createdAt: new Date("2026-10-02T12:00:00Z"),
        currency: "MXN",
        subtotal: "100",
        globalDiscount: "0",
        tax: "16",
        taxRate: "16",
        total: "116",
      } as any,
      items: [{
        productCode: "FLT-20",
        productName: "Replacement filter",
        description,
        quantity: "1",
        unitOfMeasure: "PZA",
        listPrice: "100",
        unitPrice: "100",
        discountPercent: "0",
        discountAmount: "0",
        subtotal: "100",
        taxRate: "16",
        taxAmount: "16",
        total: "116",
        position: 0,
        currency: "MXN",
      } as any],
      customer: { name: "Customer", country: "MX" } as any,
      user: { fullName: "Salesperson" } as any,
    });

    const chunks: Buffer[] = [];
    for await (const chunk of pdf) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
    expect(textSpy.mock.calls.some(([text]) => text === description)).toBe(true);
  });
});