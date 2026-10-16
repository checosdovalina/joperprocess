import { z } from "zod";

export function isValidClabe(value: string): boolean {
  if (!/^\d{18}$/.test(value)) return false;
  const sum = [...value.slice(0, 17)].reduce(
    (total, digit, index) => total + (Number(digit) * [3, 7, 1][index % 3]) % 10, 0,
  );
  return Number(value[17]) === (10 - sum % 10) % 10;
}

export const quotationBankDetailsSchema = z.object({
  beneficiary: z.string().trim().max(180),
  rfc: z.string().trim().max(20),
  accounts: z.array(z.object({
    bank: z.string().trim().min(1, "Indica el banco").max(80),
    account: z.string().regex(/^\d{1,30}$/, "La cuenta debe contener de 1 a 30 dígitos"),
    clabe: z.string().refine(isValidClabe, "La CLABE debe tener 18 dígitos y un dígito verificador válido"),
  }).strict()).max(10),
}).strict().superRefine((details, ctx) => {
  if (details.accounts.length) {
    for (const field of ["beneficiary", "rfc"] as const) {
      if (!details[field]) ctx.addIssue({
        code: z.ZodIssueCode.custom, path: [field], message: "Este campo es obligatorio",
      });
    }
  }
});

export type QuotationBankDetails = z.infer<typeof quotationBankDetailsSchema>;

export function emptyQuotationBankDetails(): QuotationBankDetails {
  return { beneficiary: "", rfc: "", accounts: [] };
}
