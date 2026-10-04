import { describe, expect, it } from "vitest";
import { insertTenantSchema } from "@shared/schema";
import { quotationFolioPrefixSchema } from "@shared/tenant-settings";

describe("company settings validation", () => {
  it.each([
    [undefined, "MEX"], ["", "MEX"], ["  ", "MEX"], ["MEX-", "MEX"],
    [" agr1- ", "AGR1"], ["AGR-1", "AGR-1"],
  ])("normalizes prefix %s to %s", (input, expected) => {
    expect(quotationFolioPrefixSchema.parse(input)).toBe(expected);
  });

  it.each(["AGR/1", "AGR%1", "AGR 1", "-AGR", "A".repeat(21)])("rejects unsafe prefix %s", input => {
    expect(quotationFolioPrefixSchema.safeParse(input).success).toBe(false);
  });

  it("uses MEX and disabled seller access for newly created companies", () => {
    const settings = insertTenantSchema.parse({ name: "Company", subdomain: "test-settings" });
    expect(settings.quotationFolioPrefix).toBe("MEX");
    expect(settings.sellerCanDownloadStatements ?? false).toBe(false);
  });

  it("does not override company settings on unrelated partial edits", () => {
    const settings = insertTenantSchema.partial().parse({ active: true });
    expect(settings).not.toHaveProperty("quotationFolioPrefix");
    expect(settings).not.toHaveProperty("sellerCanDownloadStatements");
  });

  it("requires a boolean instead of truthy text for seller access", () => {
    expect(insertTenantSchema.partial().safeParse({ sellerCanDownloadStatements: "false" }).success).toBe(false);
  });
});