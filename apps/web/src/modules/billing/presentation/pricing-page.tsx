"use client";

import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { OrganizationPlan } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Body,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Display,
  Heading,
  Subtitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { planNameKey } from "./plan-copy.ts";

const styles = stylex.create({
  section: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "80rem",
    paddingInline: { default: "1.25rem", [media.sm]: "2rem" },
    paddingBlock: "3rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  intro: { display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "48rem" },
  muted: { color: colors.mutedForeground },
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", [media.md]: "repeat(3, minmax(0, 1fr))" },
    gap: "1rem",
  },
  card: { display: "flex", flexDirection: "column" },
  header: { padding: "1.25rem", gap: "0.25rem" },
  content: { paddingInline: "1.25rem", paddingBottom: "1.25rem" },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.625rem",
  },
  item: { display: "flex", gap: "0.5rem", alignItems: "flex-start" },
  icon: { flexShrink: 0, width: "1.25rem", height: "1.25rem", color: colors.primary },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" },
});

function planLines(plan: OrganizationPlan, t: Translator): readonly string[] {
  const { limits, quotas, features } = plan.entitlements;
  const sync = quotas.provider_sync_jobs;
  return [
    limits.activeCompetitions === null
      ? t("pricing.competitionsUnlimited")
      : limits.activeCompetitions === 1
        ? t("pricing.competitionsOne")
        : t("pricing.competitions", { count: limits.activeCompetitions }),
    limits.teamsPerCompetition === null
      ? t("billing.features.teamsUnlimited")
      : t("billing.features.teamsPerCompetition", { count: limits.teamsPerCompetition }),
    limits.staffMembers === null
      ? t("pricing.staffUnlimited")
      : t("pricing.staff", { count: limits.staffMembers }),
    sync.amount === null
      ? t("billing.usage.fairUse")
      : sync.fairUse
        ? t("pricing.fairUse", { count: sync.amount })
        : t("pricing.perMonth", { count: sync.amount }),
    ...(features.automaticProviderSync ? [t("billing.features.automaticProviderSync")] : []),
    ...(features.performanceRanking ? [t("billing.features.performanceRanking")] : []),
    ...(features.premiumAnalytics ? [t("billing.features.premiumAnalytics")] : []),
    ...(features.organizerAnalytics === "none"
      ? []
      : [t(`billing.features.organizerAnalytics.${features.organizerAnalytics}`)]),
    t(`billing.features.portalBranding.${features.portalBranding}`),
    t("pricing.integrity"),
  ];
}

/** Public pricing from the catalog data; no purchase until payments exist (ADR-0025). */
export function PricingPage({ plans }: { readonly plans: readonly OrganizationPlan[] | null }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="pricing-title" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.intro)}>
        <Display id="pricing-title">{t("pricing.title")}</Display>
        <Subtitle {...applyStyles(styles.muted)}>{t("pricing.subtitle")}</Subtitle>
      </div>
      {plans === null ? (
        <Alert variant="warning">
          <AlertDescription>{t("pricing.unavailable")}</AlertDescription>
        </Alert>
      ) : (
        <ul aria-label={t("pricing.title")} {...applyStyles(styles.grid, styles.list)}>
          {plans.map((plan) => (
            <li key={plan.key} {...applyStyles(styles.card)}>
              <Card aria-labelledby={`plan-${plan.key}`} {...applyStyles(styles.card)}>
                <CardHeader className={styles.header}>
                  <Heading id={`plan-${plan.key}`}>{t(planNameKey(plan.key))}</Heading>
                </CardHeader>
                <CardContent className={styles.content}>
                  <ul {...applyStyles(styles.list)}>
                    {planLines(plan, t).map((line) => (
                      <li key={line} {...applyStyles(styles.item)}>
                        <CheckCircleIcon aria-hidden weight="fill" {...applyStyles(styles.icon)} />
                        <Body as="span">{line}</Body>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div {...applyStyles(styles.actions)}>
        <Button render={<Link to="/signup" />}>{t("pricing.start")}</Button>
        <Caption {...applyStyles(styles.muted)}>{t("pricing.contact")}</Caption>
      </div>
    </section>
  );
}
