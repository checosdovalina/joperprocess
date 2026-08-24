import { describe, expect, it } from "vitest";
import { calculateQuotationTotals } from "@shared/quotation-calculations";

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
});