"use client";

import * as stylex from "@stylexjs/stylex";
import { WarningCircleIcon } from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Body,
  Caption,
  Heading,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TextLink,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LEGAL_DOCUMENTS } from "./legal-documents.ts";
import { formatLegalUpdatedOn, legalNavItems, type LegalDocumentId } from "./legal-hrefs.ts";

const styles = stylex.create({
  page: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "80rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlockStart: "3rem",
    paddingBlockEnd: "4rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  icon: {
    width: "1.25rem",
    height: "1.25rem",
    color: "var(--warning)",
  },
  article: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    scrollMarginTop: "6rem",
  },
  related: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "1.25rem",
    rowGap: "0.5rem",
  },
});

export function LegalDocumentPage({ documentId }: { readonly documentId: LegalDocumentId }) {
  const { locale, t } = useI18n();
  const document = LEGAL_DOCUMENTS[documentId];
  const related = legalNavItems(t).filter((item) => item.id !== documentId);
  const icon = applyStyles(styles.icon);

  return (
    <div {...applyStyles(styles.page)}>
      <PageHeader>
        <PageHeaderTitle>{t(document.titleKey)}</PageHeaderTitle>
        <PageHeaderDescription>{t(document.descriptionKey)}</PageHeaderDescription>
      </PageHeader>
      <Caption>{t("legal.updated", { date: formatLegalUpdatedOn(locale) })}</Caption>
      <Alert variant="warning">
        <WarningCircleIcon aria-hidden="true" className={icon.className} style={icon.style} />
        <AlertTitle>{t("legal.draft.title")}</AlertTitle>
        <AlertDescription>{t("legal.draft.body")}</AlertDescription>
      </Alert>
      <article {...applyStyles(styles.article)}>
        {document.sections.map((section) => (
          <section key={section.titleKey} id={section.id} {...applyStyles(styles.section)}>
            <Heading as="h2">{t(section.titleKey)}</Heading>
            {section.bodyKeys.map((key) => (
              <Body key={key} measure size="lg">
                {t(key)}
              </Body>
            ))}
          </section>
        ))}
      </article>
      <nav aria-label={t("legal.related")} {...applyStyles(styles.related)}>
        {related.map((item) => (
          <TextLink key={item.id} render={<Link to={item.href} />} text="caption">
            {item.label}
          </TextLink>
        ))}
      </nav>
    </div>
  );
}
