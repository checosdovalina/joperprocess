import { readFile } from "node:fs/promises";
import path from "node:path";

interface QuotationCompanyIdentity {
  name?: string | null;
  legalName?: string | null;
  subdomain?: string | null;
}

export function isAgroesaQuotation(identity?: QuotationCompanyIdentity | null): boolean {
  if (!identity) return false;
  const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
  return normalize(identity.subdomain) === "agroesa" ||
    [identity.name, identity.legalName].some(value => /^agroesa(?:$|[\s,.])/.test(normalize(value)));
}

export async function loadQuotationPartnerLogos(identity?: QuotationCompanyIdentity | null): Promise<Buffer[]> {
  if (!isAgroesaQuotation(identity)) return [];
  // Vite copies these assets into dist/public for production builds.
  const publicDir = process.env.NODE_ENV === "production" ? "dist/public" : "client/public";
  return Promise.all(["mccormick", "faresin"].map(name =>
    readFile(path.resolve(publicDir, "branding/agroesa", `${name}.png`)),
  ));
}
