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

/** The only place where quotation totals are calculated server-side and client-side. */
export function calculateQuotationTotals(input: QuotationCalculationInput): QuotationCalculation {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);
  const discountRate = Math.min(100, Math.max(0, Number(input.globalDiscount) || 0));
  const discount = subtotal * discountRate / 100;
  const taxableSubtotal = subtotal - discount;
  const taxRate = input.manualTaxRate != null
    ? Math.min(100, Math.max(0, Number(input.manualTaxRate) || 0))
    : Math.max(0, Number(input.automaticTaxRate) || 0);
  const tax = taxableSubtotal * taxRate / 100;
  const shipping = Math.max(0, Number(input.shippingCost) || 0);
  return { subtotal, discount, taxableSubtotal, taxRate, tax, shipping, total: taxableSubtotal + tax + shipping };
}