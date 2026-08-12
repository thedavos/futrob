import { SUPPORTED_LOCALES, type Locale } from "./catalogs.ts";

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "futrob_locale";

export function resolveLocale(value: string | null | undefined): Locale {
  const normalized = value?.trim().toLowerCase().split(/[-_]/, 1)[0];
  return SUPPORTED_LOCALES.find((locale) => locale === normalized) ?? DEFAULT_LOCALE;
}

export function localeOpenGraphCode(locale: Locale): "es_ES" | "en_US" {
  return locale === "en" ? "en_US" : "es_ES";
}
