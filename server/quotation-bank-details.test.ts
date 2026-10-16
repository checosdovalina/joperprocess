import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import { getQuotationBankDetails } from "./quotation-bank-details";
import { generateQuotationPDFStream } from "./quotation-pdf-generator";

afterEach(() => vi.restoreAllMocks());

async function generate(tenant: any, quantity = 1, conditions = "") {
  const stream = await generateQuotationPDFStream({
    tenant,
    quotation: {
      folio: "MEX-BANK-TEST", createdAt: new Date("2026-10-16T12:00:00Z"),
      currency: "MXN", subtotal: "100", globalDiscount: "0", tax: "16", total: "116", conditions,
    } as any,
    customer: { name: "Cliente de prueba", country: "MX" } as any,
    user: { fullName: "Asesor de prueba" } as any,
    items: Array.from({ length: quantity }, (_, position) => ({
      productCode: "EQ-01", productName: "Equipo agrícola", description: "Especificaciones completas.",
      quantity: "1", unitPrice: "100", discountPercent: "0", subtotal: "100", taxRate: "16",
      currency: "MXN", position,
    })) as any,
  });
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
}

describe("quotation bank details", () => {
  it("preserves the supplied beneficiary, RFC, account numbers, and complete CLABE values", () => {
    const details = getQuotationBankDetails({ name: "Agroesa" })!;
    expect(details.beneficiary).toBe("AGROEQUIPOS PRODUCTIVOS, S.A. DE C.V.");
    expect(details.rfc).toBe("APR180813JV4");
    expect(details.accounts).toEqual([
      { bank: "BBVA BANCOMER", account: "0112431238", clabe: "012060001124312384" },
      { bank: "BANORTE", account: "1119702001", clabe: "072060011197020015" },
    ]);
    for (const { clabe } of details.accounts) {
      expect(clabe).toMatch(/^\d{18}$/);
      const sum = [...clabe.slice(0, 17)].reduce((s, digit, i) => s + (Number(digit) * [3, 7, 1][i % 3]) % 10, 0);
      expect((10 - sum % 10) % 10).toBe(Number(clabe[17]));
    }
  });

  it("does not return Agroesa accounts for other companies or an absent company", () => {
    for (const identity of [null, undefined, { name: "Joper" }, { name: "Tipo" }, { name: "Otra Agroesa" }]) {
      expect(getQuotationBankDetails(identity)).toBeNull();
    }
  });

  it("adds both accounts as selectable PDF text only for Agroesa", async () => {
    const text = vi.spyOn(PDFDocument.prototype, "text");
    await generate({ name: "Agroesa" });
    const written = text.mock.calls.map(([value]) => value as string);
    expect(written).toContain("DATOS BANCARIOS");
    expect(written).toContain("Beneficiario: AGROEQUIPOS PRODUCTIVOS, S.A. DE C.V.");
    for (const { bank, account, clabe } of getQuotationBankDetails({ name: "Agroesa" })!.accounts) {
      expect(written).toContain(bank);
      expect(written).toContain(`Cuenta: ${account}`);
      expect(written).toContain(`CLABE: ${clabe}`);
    }
    text.mockClear();
    await generate({ name: "Joper", quotationBrandLogo1Url: "", quotationBrandLogo2Url: "" });
    expect(text.mock.calls.some(([value]) => String(value).includes("DATOS BANCARIOS"))).toBe(false);
    expect(text.mock.calls.some(([value]) => String(value).includes("012060001124312384"))).toBe(false);
  });

  it("keeps both accounts together on the last page and localizes the labels", async () => {
    const text = vi.spyOn(PDFDocument.prototype, "text");
    const addPage = vi.spyOn(PDFDocument.prototype, "addPage");
    await generate({ name: "Agroesa", locale: "en" }, 40, "Payment terms.\n".repeat(10));
    const calls = text.mock.calls;
    expect(calls.filter(([value]) => value === "BANK DETAILS")).toHaveLength(1);
    const start = calls.findIndex(([value]) => value === "BANK DETAILS");
    const end = calls.findIndex(([value]) => value === "CLABE: 072060011197020015");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const firstOrder = text.mock.invocationCallOrder[start];
    const lastOrder = text.mock.invocationCallOrder[end];
    expect(addPage.mock.invocationCallOrder.some(order => order > firstOrder && order < lastOrder)).toBe(false);
    for (const call of calls.slice(start, end + 1)) {
      expect(Number(call[2])).toBeLessThan(732);
    }
    expect(calls.some(([value]) => value === "Account: 0112431238")).toBe(true);
    expect(addPage.mock.calls.length).toBeGreaterThan(1);
  });
});
