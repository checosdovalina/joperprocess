export interface QuotationCalculationInput {
  subtotal: number;
  globalDiscount?: number;
  automaticTaxRate?: number;
  manualTaxRate?: number | null;
  shippingCost?: number;
}

export interface QuotationCalculation {
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  taxRate: number;
  tax: number;
  shipping: number;
  total: number;
}

export class ManualTaxRateValidationError extends Error {
  constructor() {
    super("Sales tax rate must be between 0 and 100 with at most two decimal places");
    this.name = "ManualTaxRateValidationError";
  }
}

const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const toCents = (amount: number) => Math.round(roundCurrency(amount) * 100);

/** Validates a user-entered manual sales-tax percentage at the API boundary. */
export function validateManualTaxRate(value: unknown): number {
  const rawRate = typeof value === "string" ? value.trim() : String(value);
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(rawRate)) {
    throw new ManualTaxRateValidationError();
  }
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new ManualTaxRateValidationError();
  return rate;
}

/** The only place where quotation totals are calculated server-side and client-side. */
export function calculateQuotationTotals(input: QuotationCalculationInput): QuotationCalculation {
  const subtotal = roundCurrency(Math.max(0, Number(input.subtotal) || 0));
  const discountRate = Math.min(100, Math.max(0, Number(input.globalDiscount) || 0));
  const discount = roundCurrency(subtotal * discountRate / 100);
  const taxableSubtotal = roundCurrency(subtotal - discount);
  const taxRate = input.manualTaxRate != null
    ? Math.min(100, Math.max(0, Number(input.manualTaxRate) || 0))
    : Math.max(0, Number(input.automaticTaxRate) || 0);
  const tax = roundCurrency(taxableSubtotal * taxRate / 100);
  const shipping = roundCurrency(Math.max(0, Number(input.shippingCost) || 0));
  return { subtotal, discount, taxableSubtotal, taxRate, tax, shipping, total: roundCurrency(taxableSubtotal + tax + shipping) };
}

export interface ManualTaxLineAllocation {
  taxAmount: number;
  total: number;
}

/**
 * Splits a USA quote's discounted taxable value and sales tax across its lines.
 * Rounding happens at quote level first; remaining cents go to the last line.
 * Thus line totals plus shipping always equal the quotation total.
 */
export function allocateManualTaxToLines(
  subtotals: number[],
  manualTaxRate: number,
  globalDiscount = 0,
): { totals: QuotationCalculation; lines: ManualTaxLineAllocation[] } {
  const normalizedSubtotals = subtotals.map((subtotal) => roundCurrency(Math.max(0, Number(subtotal) || 0)));
  const totals = calculateQuotationTotals({
    subtotal: normalizedSubtotals.reduce((sum, subtotal) => sum + subtotal, 0),
    globalDiscount,
    manualTaxRate,
  });
  const subtotalCents = normalizedSubtotals.map(toCents);
  const totalSubtotalCents = subtotalCents.reduce((sum, cents) => sum + cents, 0);
  let remainingTaxableCents = toCents(totals.taxableSubtotal);
  let remainingTaxCents = toCents(totals.tax);

  const lines = subtotalCents.map((lineSubtotalCents, index) => {
    const isLast = index === subtotalCents.length - 1;
    const proportionalTaxableCents = totalSubtotalCents > 0
      ? Math.round(lineSubtotalCents / totalSubtotalCents * toCents(totals.taxableSubtotal))
      : 0;
    const taxableCents = isLast
      ? remainingTaxableCents
      : Math.min(remainingTaxableCents, proportionalTaxableCents);
    remainingTaxableCents -= taxableCents;
    const taxCents = isLast
      ? remainingTaxCents
      : taxableCents + remainingTaxableCents > 0
        ? Math.round(taxableCents / (taxableCents + remainingTaxableCents) * remainingTaxCents)
        : 0;
    remainingTaxCents -= taxCents;
    return { taxAmount: taxCents / 100, total: (taxableCents + taxCents) / 100 };
  });

  return { totals, lines };
}