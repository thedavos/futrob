import {
  catalogs,
  type Locale,
  type Message,
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

function renderMessage(message: Message, params: TranslationParams): string {
  if (message instanceof Function) {
    return message(params);
  }
  return interpolate(message, params);
}

export function createTranslator(locale: Locale): Translator {
  const catalog = catalogs[locale];
  const translateMessage = (key: MessageKey, params: TranslationParams = {}): string => {
    const message = catalog[key] ?? catalogs.es[key];
    return renderMessage(message, params);
  };
  const error = (code: string): string => {
    const key = `errors.${code}`;
    return hasMessageKey(catalog, key)
      ? translateMessage(key)
      : translateMessage("errors.fallback");
  };
  return Object.assign(translateMessage, { locale, error }) satisfies Translator;
}

function hasMessageKey(catalog: (typeof catalogs)[Locale], key: string): key is MessageKey {
  return Object.hasOwn(catalog, key);
}

function interpolate(message: string, params: TranslationParams): string {
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}
