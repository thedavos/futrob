"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "./catalogs.ts";
import { setUiLocale } from "./locale.functions.ts";
import { localeOpenGraphCode } from "./locale.ts";
import { createTranslator, type Translator } from "./translate.ts";

interface I18nValue {
  readonly locale: Locale;
  readonly t: Translator;
  setLocale(locale: Locale): Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  persistLocale = persistLocaleOnServer,
}: Readonly<{
  children: ReactNode;
  initialLocale: Locale;
  persistLocale?: (locale: Locale) => Promise<void>;
}>) {
  const [locale, setLocaleState] = useState(initialLocale);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      await persistLocale(next);
      setLocaleState(next);
    },
    [locale, persistLocale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document
      .querySelector<HTMLMetaElement>('meta[property="og:locale"]')
      ?.setAttribute("content", localeOpenGraphCode(locale));
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}

async function persistLocaleOnServer(locale: Locale): Promise<void> {
  await setUiLocale({ data: { locale } });
}
