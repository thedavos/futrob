import type { OrganizationPlan } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PLAN_FORMAT_LABEL } from "./plan-copy.ts";

export interface PlanFeatureRow {
  readonly label: string;
  readonly included: boolean;
}

/**
 * List prices in USD. They are display-only and live here, not in the catalog: billing has no
 * payment provider yet (ADR-0025), and `product/pricing-plans.md` records them as a hypothesis.
 */
const MONTHLY_PRICE_USD = { free: 0, pro: 9, league: 29 } as const satisfies Record<
  OrganizationPlan["key"],
  number
>;

export function planPrice(plan: OrganizationPlan): string {
  return `$${MONTHLY_PRICE_USD[plan.key]}`;
}

/** Every plan lists the same rows in the same order, so the cards compare line by line. */
export function planFeatureRows(plan: OrganizationPlan, t: Translator): readonly PlanFeatureRow[] {
  const { limits, quotas, features } = plan.entitlements;
  const sync = quotas.provider_sync_jobs;
  return [
    {
      included: true,
      label:
        limits.activeCompetitions === null
          ? t("pricing.competitionsUnlimited")
          : limits.activeCompetitions === 1
            ? t("pricing.competitionsOne")
            : t("pricing.competitions", { count: limits.activeCompetitions }),
    },
    {
      included: true,
      label:
        limits.teamsPerCompetition === null
          ? t("billing.features.teamsUnlimited")
          : t("billing.features.teamsPerCompetition", { count: limits.teamsPerCompetition }),
    },
    {
      included: true,
      label:
        limits.staffMembers === null
          ? t("pricing.staffUnlimited")
          : t("pricing.staff", { count: limits.staffMembers }),
    },
    {
      included: true,
      label:
        sync.amount === null
          ? t("billing.usage.fairUse")
          : sync.fairUse
            ? t("pricing.fairUse", { count: sync.amount })
            : t("pricing.perMonth", { count: sync.amount }),
    },
    // Every format the product offers, so a plan shows the ones it leaves out.
    ...[...PLAN_FORMAT_LABEL].map(([format, key]) => ({
      included: features.competitionFormats.includes(format),
      label: t("pricing.format", { format: t(key) }),
    })),
    // Announced, not built: no domain format or catalog entry yet (WONT-04 in the MVP scope).
    {
      included: plan.key !== "free",
      label: t("pricing.format", { format: t("pricing.formatSwiss") }),
    },
    {
      included: features.automaticProviderSync,
      label: t("billing.features.automaticProviderSync"),
    },
    { included: features.performanceRanking, label: t("billing.features.performanceRanking") },
    { included: features.premiumAnalytics, label: t("billing.features.premiumAnalytics") },
    {
      included: features.organizerAnalytics !== "none",
      label: t(`billing.features.organizerAnalytics.${features.organizerAnalytics}`),
    },
    { included: true, label: t(`billing.features.portalBranding.${features.portalBranding}`) },
  ];
}
