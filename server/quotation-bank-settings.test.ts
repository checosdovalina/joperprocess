import { describe, expect, it } from "vitest";
import { emptyQuotationBankDetails, isValidClabe, quotationBankDetailsSchema } from "@shared/quotation-bank-settings";
import { getQuotationBankDetails } from "./quotation-bank-details";

// Synthetic identifiers, not real payment instructions.
const valid = {
  beneficiary: "Empresa de prueba",
  rfc: "AAA010101AAA",
  accounts: [{ bank: "Banco de prueba", account: "00001234", clabe: "000000000000000013" }],
};

describe("quotation bank settings validation", () => {
  it("keeps leading zeros in both identifiers", () => {
    expect(quotationBankDetailsSchema.parse(valid)).toEqual(valid);
    expect(isValidClabe(valid.accounts[0].clabe)).toBe(true);
  });

  it.each(["", "123", "000000000000000019", "00000000000000001x", "0000000000000000180", " 000000000000000018"])(
    "rejects malformed CLABE %s", clabe => {
      expect(quotationBankDetailsSchema.safeParse({
        ...valid, accounts: [{ ...valid.accounts[0], clabe }],
      }).success).toBe(false);
    },
  );

  it("rejects numeric identifiers, missing data, extra fields and oversized lists", () => {
    for (const data of [
      { ...valid, beneficiary: " " }, { ...valid, rfc: "" },
      { ...valid, tenantId: "another-company" },
      { ...valid, accounts: [{ ...valid.accounts[0], account: 1234 }] },
      { ...valid, accounts: [{ ...valid.accounts[0], clabe: 18 }] },
      { ...valid, accounts: [{ ...valid.accounts[0], account: "abc" }] },
      { ...valid, accounts: Array(11).fill(valid.accounts[0]) },
    ]) expect(quotationBankDetailsSchema.safeParse(data).success).toBe(false);
  });

  it("supports an explicit empty configuration without restoring Agroesa defaults", () => {
    const empty = quotationBankDetailsSchema.parse(emptyQuotationBankDetails());
    expect(getQuotationBankDetails({ name: "Agroesa", quotationBankDetails: empty })).toBeNull();
  });

  it("uses persisted company data rather than the Agroesa legacy values", () => {
    for (const name of ["Agroesa", "Otra compañía"]) {
      expect(getQuotationBankDetails({ name, quotationBankDetails: valid })).toEqual(valid);
    }
    expect(getQuotationBankDetails({ name: "Otra compañía", quotationBankDetails: null })).toBeNull();
    expect(getQuotationBankDetails({ name: "Agroesa", quotationBankDetails: null })?.accounts).toHaveLength(2);
  });
});
