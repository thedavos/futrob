import {
  catalogs,
  type Locale,
  type MessageKey,
  type MessageParamsByKey,
  type ParameterizedMessageKey,
  type ParameterlessMessageKey,
  type TranslationParams,
} from "./catalogs.ts";

export interface Translator {
  <K extends ParameterizedMessageKey>(key: K, params: MessageParamsByKey[K]): string;
  (key: ParameterlessMessageKey): string;
  readonly locale: Locale;
  error(code: string): string;
}

export function createTranslator(locale: Locale): Translator {
  const catalog = catalogs[locale];
  const translateMessage = (key: MessageKey, params: TranslationParams = {}): string => {
    const message = catalog[key] ?? catalogs.es[key];
    return typeof message === "function" ? message(params) : interpolate(message, params);
  };
  return Object.assign(translateMessage, {
    locale,
    error(code: string): string {
      const key = `errors.${code}`;
      return hasMessageKey(catalog, key)
        ? translateMessage(key)
        : translateMessage("errors.fallback");
    },
  }) as Translator;
}

function hasMessageKey(catalog: (typeof catalogs)[Locale], key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(catalog, key);
}

function interpolate(message: string, params: TranslationParams): string {
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}
