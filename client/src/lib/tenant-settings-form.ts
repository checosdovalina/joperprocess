export function buildTenantSettingsPayload<T extends { quotationFolioPrefix: string }>(
  values: T,
  options: {
    isEditing: boolean;
    originalPrefix: string | null | undefined;
    prefixTouched: boolean;
  },
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };

  if (!options.isEditing || options.prefixTouched) {
    payload.quotationFolioPrefix = values.quotationFolioPrefix.trim() || "MEX";
  } else if (options.originalPrefix == null) {
    // Preserve legacy MEX/EXT behavior when an unrelated field is edited.
    delete payload.quotationFolioPrefix;
  }

  return payload;
}