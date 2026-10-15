import { readFile } from "node:fs/promises";
import path from "node:path";
import { localStorageService } from "./localStorage";
import { isAgroesaQuotation, quotationLogoSlots, quotationLogoUrl, type QuotationCompanyIdentity } from "@shared/quotation-branding";
export { isAgroesaQuotation } from "@shared/quotation-branding";

export async function loadQuotationPartnerLogos(identity?: QuotationCompanyIdentity | null): Promise<(Buffer | null)[]> {
  if (!identity || !isAgroesaQuotation(identity)) return [];
  // Vite copies these assets into dist/public for production builds.
  const publicDir = process.env.NODE_ENV === "production" ? "dist/public" : "client/public";
  return Promise.all((Object.keys(quotationLogoSlots) as (keyof typeof quotationLogoSlots)[]).map(async slot => {
    const url = quotationLogoUrl(identity, slot);
    if (!url) return null;
    if (url === quotationLogoSlots[slot].defaultUrl) return readFile(path.resolve(publicDir, url.slice(1)));
    if (!/^\/api\/logos\/[a-zA-Z0-9._-]+\.png$/.test(url)) throw new Error("Invalid quotation brand logo path");
    const buffer = await localStorageService.getFile(`logos/${url.split("/").pop()}`);
    if (!buffer) throw new Error("Quotation brand logo file not found");
    return buffer;
  }));
}
