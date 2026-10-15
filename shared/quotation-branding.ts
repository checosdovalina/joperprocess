export interface QuotationCompanyIdentity {
  name?: string | null;
  legalName?: string | null;
  subdomain?: string | null;
  quotationBrandLogo1Url?: string | null;
  quotationBrandLogo2Url?: string | null;
}

export function isAgroesaQuotation(identity?: QuotationCompanyIdentity | null): boolean {
  if (!identity) return false;
  const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
  return normalize(identity.subdomain) === "agroesa" ||
    [identity.name, identity.legalName].some(value => /^agroesa(?:$|[\s,.])/.test(normalize(value)));
}

export const quotationLogoSlots = {
  mccormick: { field: "quotationBrandLogo1Url", defaultUrl: "/branding/agroesa/mccormick.png" },
  faresin: { field: "quotationBrandLogo2Url", defaultUrl: "/branding/agroesa/faresin.png" },
} as const;

// NULL preserves the supplied brand; an empty string explicitly hides a removed logo.
export function quotationLogoUrl(identity: QuotationCompanyIdentity, slot: keyof typeof quotationLogoSlots) {
  return identity[quotationLogoSlots[slot].field] ?? quotationLogoSlots[slot].defaultUrl;
}
