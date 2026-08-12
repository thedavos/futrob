import type { Locale, ParameterlessMessageKey } from "./catalogs.ts";
import { DEFAULT_LOCALE } from "./locale.ts";
import { createTranslator } from "./translate.ts";

export function onboardingHead(
  locale: Locale | undefined,
  titleKey: ParameterlessMessageKey,
): { meta: Array<{ title: string }> } {
  const t = createTranslator(locale ?? DEFAULT_LOCALE);
  return { meta: [{ title: `${t(titleKey)} | Futrob` }] };
}
