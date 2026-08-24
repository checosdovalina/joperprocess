import { describe, expect, it } from "vitest";
import { allocateManualTaxToLines, calculateQuotationTotals, validateManualTaxRate } from "@shared/quotation-calculations";

describe("calculateQuotationTotals", () => {
  it("calculates automatic Mexican tax and discount", () => {
    expect(calculateQuotationTotals({
      subtotal: 1000,
      globalDiscount: 10,
      automaticTaxRate: 16,
    })).toMatchObject({
      subtotal: 1000, discount: 100, taxableSubtotal: 900,
      taxRate: 16, tax: 144, total: 1044,
    });
  });

  it("uses the USA manual tax rate and shipping", () => {
    expect(calculateQuotationTotals({
      subtotal: 1000,
      globalDiscount: 10,
      manualTaxRate: 7.25,
      shippingCost: 25,
    })).toMatchObject({
      taxableSubtotal: 900, taxRate: 7.25, tax: 65.25,
      shipping: 25, total: 990.25,
    });
  });

  it("clamps invalid rates instead of producing inconsistent totals", () => {
    expect(calculateQuotationTotals({
      subtotal: 100,
      manualTaxRate: 150,
      globalDiscount: -5,
    }).total).toBe(200);
  });

  it("allocates rounding cents across USA lines so they equal the quote tax and total", () => {
    const allocation = allocateManualTaxToLines([0.05, 0.05], 7.25);
    expect(allocation.totals).toMatchObject({ subtotal: 0.1, tax: 0.01, total: 0.11 });
    expect(allocation.lines.reduce((sum, line) => sum + line.taxAmount, 0)).toBe(0.01);
    expect(allocation.lines.reduce((sum, line) => sum + line.total, 0)).toBe(0.11);
  });

  it("allocates global discounts before USA line taxes", () => {
    const allocation = allocateManualTaxToLines([10, 10], 10, 50);
    expect(allocation.totals).toMatchObject({ discount: 10, taxableSubtotal: 10, tax: 1, total: 11 });
    expect(allocation.lines.reduce((sum, line) => sum + line.total, 0)).toBe(11);
  });

  it("rejects manual tax rates that cannot be stored at two decimal precision", () => {
    expect(() => validateManualTaxRate("7.255")).toThrow("at most two decimal places");
    expect(() => validateManualTaxRate("-1")).toThrow("at most two decimal places");
  });
});