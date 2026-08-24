export type PdfLanguage = "es" | "en";

export interface PdfLocaleTenant {
  locale?: string | null;
  timezone?: string | null;
}

export function resolvePdfLanguage(tenant?: PdfLocaleTenant | null): PdfLanguage {
  return tenant?.locale?.toLowerCase().startsWith("en") ? "en" : "es";
}

export function resolveIntlLocale(language: PdfLanguage): "es-MX" | "en-US" {
  return language === "en" ? "en-US" : "es-MX";
}

export function pdfText<T>(language: PdfLanguage, values: { es: T; en: T }): T {
  return values[language];
}

export function formatPdfDate(
  value: Date | string | null | undefined,
  language: PdfLanguage,
  timezone?: string | null,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  if (!value) return "—";
  // HTML date inputs send YYYY-MM-DD without a timezone. Parsing that form as
  // midnight UTC and then applying an American timezone moves it to the prior
  // day, so preserve date-only values as calendar dates.
  const dateOnly = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
    : (typeof value === "string" ? new Date(value) : value);
  return date.toLocaleDateString(resolveIntlLocale(language), {
    ...options,
    timeZone: dateOnly ? "UTC" : (timezone || (language === "en" ? "America/Chicago" : "America/Mexico_City")),
  });
}

export function formatPdfDateTime(
  value: Date | string | null | undefined,
  language: PdfLanguage,
  timezone?: string | null,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(resolveIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || (language === "en" ? "America/Chicago" : "America/Mexico_City"),
  });
}

export function formatPdfNumber(value: number, language: PdfLanguage, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(resolveIntlLocale(language), options);
}

export function formatPdfCurrency(value: string | number | null | undefined, currency: string, language: PdfLanguage): string {
  const number = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat(resolveIntlLocale(language), {
    style: "currency",
    currency: currency || "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}