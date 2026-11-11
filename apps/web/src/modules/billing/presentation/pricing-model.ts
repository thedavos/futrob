import type { OrganizationPlan } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PLAN_FORMAT_LABEL } from "./plan-copy.ts";

/**
 * `soon` is an entitlement the catalog grants but no product flow consumes yet, so `/pricing`
 * must not sell it as delivered (BILL-01b).
 */
export type PlanFeatureStatus = "included" | "excluded" | "soon";

export interface PlanFeatureRow {
  readonly label: string;
  readonly status: PlanFeatureStatus;
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

function included(granted: boolean): PlanFeatureStatus {
  return granted ? "included" : "excluded";
}

/**
 * Entitlements with no consumer today (automatic and priority sync, custom portal branding,
 * email and announcement channels) show as `soon` where a plan grants them. Make a row
 * `included` in the same change that ships its consumer.
 */
function undelivered(granted: boolean): PlanFeatureStatus {
  return granted ? "soon" : "excluded";
}

/** Every plan lists the same rows in the same order, so the cards compare line by line. */
export function planFeatureRows(plan: OrganizationPlan, t: Translator): readonly PlanFeatureRow[] {
  const { limits, quotas, features } = plan.entitlements;
  const sync = quotas.provider_sync_jobs;
  return [
    {
      status: "included",
      label:
        limits.activeCompetitions === null
          ? t("pricing.competitionsUnlimited")
          : limits.activeCompetitions === 1
            ? t("pricing.competitionsOne")
            : t("pricing.competitions", { count: limits.activeCompetitions }),
    },
    {
      status: "included",
      label:
        limits.teamsPerCompetition === null
          ? t("billing.features.teamsUnlimited")
          : t("billing.features.teamsPerCompetition", { count: limits.teamsPerCompetition }),
    },
    {
      status: "included",
      label:
        limits.staffMembers === null
          ? t("pricing.staffUnlimited")
          : t("pricing.staff", { count: limits.staffMembers }),
    },
    {
      status: "included",
      label:
        sync.amount === null
          ? t("billing.usage.fairUse")
          : sync.fairUse
            ? t("pricing.fairUse", { count: sync.amount })
            : t("pricing.perMonth", { count: sync.amount }),
    },
    // Every format the product offers, so a plan shows the ones it leaves out.
    ...[...PLAN_FORMAT_LABEL].map(([format, key]) => ({
      status: included(features.competitionFormats.includes(format)),
      label: t("pricing.format", { format: t(key) }),
    })),
    {
      status: undelivered(features.automaticProviderSync),
      label: t("billing.features.automaticProviderSync"),
    },
    {
      status: included(features.performanceRanking),
      label: t("billing.features.performanceRanking"),
    },
    {
      status: included(features.premiumAnalytics),
      label: t("billing.features.premiumAnalytics"),
    },
    {
      status: included(features.organizerAnalytics !== "none"),
      label: t(`billing.features.organizerAnalytics.${features.organizerAnalytics}`),
    },
    {
      // The default Futrob-branded portal exists; logo, colors and advanced branding do not.
      status: features.portalBranding === "futrob" ? "included" : "soon",
      label: t(`billing.features.portalBranding.${features.portalBranding}`),
    },
  ];
}
