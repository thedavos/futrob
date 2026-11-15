import { createFileRoute } from "@tanstack/react-router";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { legalDocumentHead } from "@/shared/presentation/legal/legal-document-head.ts";
import { LEGAL_DOCUMENT_ID } from "@/shared/presentation/legal/legal-hrefs.ts";
import { LegalPublicShell } from "@/shared/presentation/legal/legal-public-shell.tsx";

export const Route = createFileRoute("/terms")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => legalDocumentHead(LEGAL_DOCUMENT_ID.terms, loaderData),
  component: TermsRoute,
});

function TermsRoute() {
  return <LegalPublicShell documentId={LEGAL_DOCUMENT_ID.terms} />;
}
