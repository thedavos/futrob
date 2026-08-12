import { catalogs, type Locale, type MessageKey, type TranslationParams } from "./catalogs.ts";

export interface Translator {
  (key: MessageKey, params?: TranslationParams): string;
  readonly locale: Locale;
  error(code: string): string;
}

export function createTranslator(locale: Locale): Translator {
  const catalog = catalogs[locale];
  const translate = (key: MessageKey, params: TranslationParams = {}): string => {
    const message = catalog[key] ?? catalogs.es[key];
    return typeof message === "function" ? message(params) : interpolate(message, params);
  };
  return Object.assign(translate, {
    locale,
    error(code: string): string {
      const key = `errors.${code}`;
      return hasMessageKey(catalog, key) ? translate(key) : translate("errors.fallback");
    },
  });
}

function hasMessageKey(catalog: (typeof catalogs)[Locale], key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(catalog, key);
}

function interpolate(message: string, params: TranslationParams): string {
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}
