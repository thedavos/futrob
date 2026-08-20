import type { Locale, ParameterlessMessageKey } from "./catalogs.ts";
import { DEFAULT_LOCALE } from "./locale.ts";
import { createTranslator } from "./translate.ts";

export function onboardingHead(locale: Locale | undefined, titleKey: ParameterlessMessageKey) {
  const t = createTranslator(locale ?? DEFAULT_LOCALE);
  return { meta: [{ title: `${t(titleKey)} | Futrob` }] } satisfies {
    meta: Array<{ title: string }>;
  };
}
