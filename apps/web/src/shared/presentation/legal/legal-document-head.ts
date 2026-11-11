import { DEFAULT_LOCALE } from "@/shared/presentation/i18n/locale.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { LEGAL_DOCUMENTS } from "./legal-documents.ts";
import type { LegalDocumentId } from "./legal-hrefs.ts";

export function legalDocumentHead(documentId: LegalDocumentId, locale: Locale | undefined) {
  const t = createTranslator(locale ?? DEFAULT_LOCALE);
  const document = LEGAL_DOCUMENTS[documentId];
  return {
    meta: [
      { title: t(document.metaTitleKey) },
      { name: "description", content: t(document.metaDescriptionKey) },
    ],
  };
}
