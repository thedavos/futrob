import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export const LEGAL_DOCUMENT_ID = {
  terms: "terms",
  privacy: "privacy",
  refunds: "refunds",
} as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_ID)[keyof typeof LEGAL_DOCUMENT_ID];

export const LEGAL_HREFS = {
  terms: "/terms",
  privacy: "/privacy",
  refunds: "/refunds",
  accountDeletion: "/privacy#account-deletion",
} as const;

export const LEGAL_PUBLIC_ORIGIN = "https://futrob.app";

export const LEGAL_UPDATED_ON = "2026-11-10";

export type LegalNavItem = {
  readonly id: LegalDocumentId;
  readonly href: (typeof LEGAL_HREFS)[LegalDocumentId];
  readonly label: string;
};

export function legalNavItems(t: Translator): readonly LegalNavItem[] {
  return [
    { id: LEGAL_DOCUMENT_ID.terms, href: LEGAL_HREFS.terms, label: t("legal.nav.terms") },
    { id: LEGAL_DOCUMENT_ID.privacy, href: LEGAL_HREFS.privacy, label: t("legal.nav.privacy") },
    { id: LEGAL_DOCUMENT_ID.refunds, href: LEGAL_HREFS.refunds, label: t("legal.nav.refunds") },
  ];
}

export function formatLegalUpdatedOn(locale: Locale, isoDate: string = LEGAL_UPDATED_ON): string {
  const tag = locale === "en" ? "en-US" : "es-ES";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00.000Z`));
}

export function publicLegalUrl(path: (typeof LEGAL_HREFS)[LegalDocumentId]): string {
  return `${LEGAL_PUBLIC_ORIGIN}${path}`;
}
