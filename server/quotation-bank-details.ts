import { isAgroesaQuotation, type QuotationCompanyIdentity } from "@shared/quotation-branding";
import type { QuotationBankDetails } from "@shared/quotation-bank-settings";

// Supplied bank references for Agroesa. Keep account identifiers as strings.
const AGROESA_BANK_DETAILS = {
  beneficiary: "AGROEQUIPOS PRODUCTIVOS, S.A. DE C.V.",
  rfc: "APR180813JV4",
  accounts: [
    { bank: "BBVA BANCOMER", account: "0112431238", clabe: "012060001124312384" },
    { bank: "BANORTE", account: "1119702001", clabe: "072060011197020015" },
  ],
} as const;

export function getQuotationBankDetails(
  identity?: (QuotationCompanyIdentity & { quotationBankDetails?: QuotationBankDetails | null }) | null,
): QuotationBankDetails | null {
  if (identity?.quotationBankDetails != null) {
    return identity.quotationBankDetails.accounts.length ? identity.quotationBankDetails : null;
  }
  return isAgroesaQuotation(identity) ? {
    ...AGROESA_BANK_DETAILS, accounts: AGROESA_BANK_DETAILS.accounts.map(account => ({ ...account })),
  } : null;
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
  const gap = 12;
  const cardWidth = (width - gap) / 2;
  const beneficiaryText = `${label("Beneficiario", "Beneficiary")}: ${details.beneficiary}`;
  doc.font("Helvetica").fontSize(8);
  const beneficiaryHeight = doc.heightOfString(beneficiaryText, { width: width - 12 });
  const rfcOffset = Math.max(35, 22 + beneficiaryHeight + 4);
  const headerHeight = Math.max(52, rfcOffset + 17);
  const drawHeader = () => {
    doc.rect(margin, y, width, 15).fill(borderColor);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor)
      .text(label("DATOS BANCARIOS", "BANK DETAILS"), margin + 6, y + 4, { width: width - 12, lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor("#333333")
      .text(beneficiaryText, margin + 6, y + 22, { width: width - 12 })
      .text(`RFC: ${details.rfc}`, margin + 6, y + rfcOffset, { width: width - 12, lineBreak: false });
    y += headerHeight;
  };
  const newPage = () => {
    doc.addPage({ size: "LETTER", margin: 0 });
    y = 40;
  };
  if (y + headerHeight + 74 > doc.page.height - 60) newPage();
  drawHeader();
  for (let index = 0; index < details.accounts.length; index += 2) {
    const row = details.accounts.slice(index, index + 2);
    const sizes = row.map(account => {
      doc.font("Helvetica-Bold").fontSize(8);
      const bankHeight = doc.heightOfString(account.bank, { width: cardWidth - 18 });
      return { bankHeight, height: Math.max(64, bankHeight + 52) };
    });
    const rowHeight = Math.max(...sizes.map(size => size.height));
    if (y + rowHeight + 10 > doc.page.height - 60) {
      newPage();
      drawHeader();
    }
    row.forEach((account, column) => {
      const x = margin + column * (cardWidth + gap);
      doc.roundedRect(x, y, cardWidth, rowHeight, 3).fillAndStroke(lightColor, borderColor);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(primaryColor)
        .text(account.bank, x + 9, y + 9, { width: cardWidth - 18 });
      const accountY = y + Math.max(26, sizes[column].bankHeight + 14);
      doc.font("Helvetica").fontSize(8).fillColor("#333333")
        .text(`${label("Cuenta", "Account")}: ${account.account}`, x + 9, accountY, { width: cardWidth - 18, lineBreak: false })
        .text(`CLABE: ${account.clabe}`, x + 9, accountY + 16, { width: cardWidth - 18, lineBreak: false });
    });
    y += rowHeight + 10;
  }
  return y;
}
