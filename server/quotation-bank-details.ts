import { isAgroesaQuotation, type QuotationCompanyIdentity } from "@shared/quotation-branding";

// Supplied bank references for Agroesa. Keep account identifiers as strings.
const AGROESA_BANK_DETAILS = {
  beneficiary: "AGROEQUIPOS PRODUCTIVOS, S.A. DE C.V.",
  rfc: "APR180813JV4",
  accounts: [
    { bank: "BBVA BANCOMER", account: "0112431238", clabe: "012060001124312384" },
    { bank: "BANORTE", account: "1119702001", clabe: "072060011197020015" },
  ],
} as const;

export function getQuotationBankDetails(identity?: QuotationCompanyIdentity | null) {
  return isAgroesaQuotation(identity) ? AGROESA_BANK_DETAILS : null;
}

export function drawQuotationBankDetails(
  doc: PDFKit.PDFDocument,
  details: NonNullable<ReturnType<typeof getQuotationBankDetails>>,
  y: number,
  options: { language: "es" | "en"; primaryColor: string; lightColor: string; borderColor: string },
): number {
  const { language, primaryColor, lightColor, borderColor } = options;
  const label = (es: string, en: string) => language === "en" ? en : es;
  const margin = 40;
  const width = doc.page.width - margin * 2;
  const height = 126;
  // Keep the beneficiary and both accounts together, above the footer.
  if (y + height > doc.page.height - 60) {
    doc.addPage({ size: "LETTER", margin: 0 });
    y = 40;
  }
  doc.rect(margin, y, width, 15).fill(borderColor);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor)
    .text(label("DATOS BANCARIOS", "BANK DETAILS"), margin + 6, y + 4, { width: width - 12, lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor("#333333")
    .text(`${label("Beneficiario", "Beneficiary")}: ${details.beneficiary}`, margin + 6, y + 22, { width: width - 12, lineBreak: false })
    .text(`RFC: ${details.rfc}`, margin + 6, y + 35, { width: width - 12, lineBreak: false });
  const gap = 12;
  const cardWidth = (width - gap) / 2;
  details.accounts.forEach((account, index) => {
    const x = margin + index * (cardWidth + gap);
    const top = y + 52;
    doc.roundedRect(x, top, cardWidth, 64, 3).fillAndStroke(lightColor, borderColor);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor)
      .text(account.bank, x + 9, top + 9, { width: cardWidth - 18, lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor("#333333")
      .text(`${label("Cuenta", "Account")}: ${account.account}`, x + 9, top + 26, { width: cardWidth - 18, lineBreak: false })
      .text(`CLABE: ${account.clabe}`, x + 9, top + 42, { width: cardWidth - 18, lineBreak: false });
  });
  return y + height;
}
