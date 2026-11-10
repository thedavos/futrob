import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { LEGAL_DOCUMENT_ID, type LegalDocumentId } from "./legal-hrefs.ts";

export type LegalSection = {
  readonly id?: string;
  readonly titleKey: ParameterlessMessageKey;
  readonly bodyKeys: readonly ParameterlessMessageKey[];
};

export type LegalDocumentDefinition = {
  readonly titleKey: ParameterlessMessageKey;
  readonly descriptionKey: ParameterlessMessageKey;
  readonly metaTitleKey: ParameterlessMessageKey;
  readonly metaDescriptionKey: ParameterlessMessageKey;
  readonly sections: readonly LegalSection[];
};

function defineLegalDocument(document: LegalDocumentDefinition): LegalDocumentDefinition {
  return document;
}

export const LEGAL_DOCUMENTS = {
  [LEGAL_DOCUMENT_ID.terms]: defineLegalDocument({
    titleKey: "legal.terms.title",
    descriptionKey: "legal.terms.description",
    metaTitleKey: "legal.terms.meta.title",
    metaDescriptionKey: "legal.terms.meta.description",
    sections: [
      {
        titleKey: "legal.terms.service.title",
        bodyKeys: ["legal.terms.service.body"],
      },
      {
        titleKey: "legal.terms.accounts.title",
        bodyKeys: ["legal.terms.accounts.body"],
      },
      {
        titleKey: "legal.terms.results.title",
        bodyKeys: ["legal.terms.results.body"],
      },
      {
        titleKey: "legal.terms.use.title",
        bodyKeys: ["legal.terms.use.body"],
      },
      {
        titleKey: "legal.terms.ea.title",
        bodyKeys: ["legal.terms.ea.body"],
      },
      {
        titleKey: "legal.terms.liability.title",
        bodyKeys: ["legal.terms.liability.body"],
      },
      {
        titleKey: "legal.terms.changes.title",
        bodyKeys: ["legal.terms.changes.body"],
      },
    ],
  }),
  [LEGAL_DOCUMENT_ID.privacy]: defineLegalDocument({
    titleKey: "legal.privacy.title",
    descriptionKey: "legal.privacy.description",
    metaTitleKey: "legal.privacy.meta.title",
    metaDescriptionKey: "legal.privacy.meta.description",
    sections: [
      {
        titleKey: "legal.privacy.who.title",
        bodyKeys: ["legal.privacy.who.body"],
      },
      {
        titleKey: "legal.privacy.data.title",
        bodyKeys: ["legal.privacy.data.body", "legal.privacy.data.body2"],
      },
      {
        titleKey: "legal.privacy.ea.title",
        bodyKeys: ["legal.privacy.ea.body"],
      },
      {
        titleKey: "legal.privacy.providers.title",
        bodyKeys: ["legal.privacy.providers.body"],
      },
      {
        titleKey: "legal.privacy.retention.title",
        bodyKeys: ["legal.privacy.retention.body"],
      },
      {
        id: "account-deletion",
        titleKey: "legal.privacy.deletion.title",
        bodyKeys: ["legal.privacy.deletion.body", "legal.privacy.deletion.body2"],
      },
      {
        titleKey: "legal.privacy.contact.title",
        bodyKeys: ["legal.privacy.contact.body"],
      },
    ],
  }),
  [LEGAL_DOCUMENT_ID.refunds]: defineLegalDocument({
    titleKey: "legal.refunds.title",
    descriptionKey: "legal.refunds.description",
    metaTitleKey: "legal.refunds.meta.title",
    metaDescriptionKey: "legal.refunds.meta.description",
    sections: [
      {
        titleKey: "legal.refunds.current.title",
        bodyKeys: ["legal.refunds.current.body"],
      },
      {
        titleKey: "legal.refunds.charges.title",
        bodyKeys: ["legal.refunds.charges.body"],
      },
      {
        titleKey: "legal.refunds.ask.title",
        bodyKeys: ["legal.refunds.ask.body"],
      },
    ],
  }),
} satisfies Record<LegalDocumentId, LegalDocumentDefinition>;
