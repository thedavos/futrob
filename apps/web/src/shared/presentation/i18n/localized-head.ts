import { z } from "zod";
import { SUPPORTED_LOCALES, type ParameterlessMessageKey } from "./catalogs.ts";
import { DEFAULT_LOCALE } from "./locale.ts";
import { createTranslator } from "./translate.ts";

const rootLocaleSchema = z.enum(SUPPORTED_LOCALES).catch(DEFAULT_LOCALE);

interface HeadMatches {
  readonly matches: readonly { readonly loaderData?: unknown }[];
}

/** Route `head` that titles the page in the locale the root route already loaded. */
export function localizedHead(titleKey: ParameterlessMessageKey) {
  return ({ matches }: HeadMatches) => {
    const t = createTranslator(rootLocaleSchema.parse(matches[0]?.loaderData));
    return { meta: [{ title: `${t(titleKey)} | Futrob` }] };
  };
}
