import { useTenant } from "./use-tenant";
import { translate, type Locale } from "@/lib/i18n";

export function useI18n() {
  const { tenant } = useTenant();
  const locale = (tenant?.locale ?? "es") as Locale;

  function t(key: string): string {
    return translate(locale, key);
  }

  return { t, locale };
}
