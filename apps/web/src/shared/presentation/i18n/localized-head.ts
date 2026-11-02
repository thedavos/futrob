import type { ParameterlessMessageKey } from "./catalogs.ts";
import { resolveLocale } from "./locale.ts";
import { createTranslator } from "./translate.ts";

interface HeadMatches {
  readonly matches: readonly { readonly loaderData?: unknown }[];
}

/** Route `head` that titles the page in the locale the root route already loaded. */
export function localizedHead(titleKey: ParameterlessMessageKey) {
  return ({ matches }: HeadMatches) => {
    const rootLocale = matches[0]?.loaderData;
    const t = createTranslator(resolveLocale(typeof rootLocale === "string" ? rootLocale : null));
    return { meta: [{ title: `${t(titleKey)} | Futrob` }] };
  };
}
