// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildTenantSettingsPayload } from "./tenant-settings-form";

const values = { name: "Empresa", quotationFolioPrefix: "" };

describe("buildTenantSettingsPayload", () => {
  it("sets MEX for a new company when the prefix is left empty", () => {
    expect(buildTenantSettingsPayload(values, {
      isEditing: false,
      originalPrefix: undefined,
      prefixTouched: false,
    }).quotationFolioPrefix).toBe("MEX");
  });

  it("omits an untouched legacy null prefix during unrelated edits", () => {
    expect(buildTenantSettingsPayload(values, {
      isEditing: true,
      originalPrefix: null,
      prefixTouched: false,
    })).not.toHaveProperty("quotationFolioPrefix");
  });

  it("normalizes an explicitly cleared prefix to MEX", () => {
    expect(buildTenantSettingsPayload(values, {
      isEditing: true,
      originalPrefix: null,
      prefixTouched: true,
    }).quotationFolioPrefix).toBe("MEX");
  });

  it("keeps a configured prefix unchanged when it was not touched", () => {
    expect(buildTenantSettingsPayload({ ...values, quotationFolioPrefix: "AGR1" }, {
      isEditing: true,
      originalPrefix: "AGR1",
      prefixTouched: false,
    }).quotationFolioPrefix).toBe("AGR1");
  });
});