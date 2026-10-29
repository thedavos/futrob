import { organizationPlanKeySchema, type OrganizationPlanKey } from "@futrob/api-contracts";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";

export function planNameKey(key: OrganizationPlanKey): MessageKey {
  switch (key) {
    case "free":
      return "billing.plan.name.free";
    case "pro":
      return "billing.plan.name.pro";
    case "league":
      return "billing.plan.name.league";
  }
}

/** Upsell copy for a 402 code; unknown codes fall back to the generic message. */
export function planUpsellKey(code: string): MessageKey {
  switch (code) {
    case "competitions.plan_limit_reached":
      return "billing.upsell.competitions.plan_limit_reached";
    case "competitions.format_not_in_plan":
      return "billing.upsell.competitions.format_not_in_plan";
    case "organizations.staff_limit_reached":
      return "billing.upsell.organizations.staff_limit_reached";
    case "game_data.sync_quota_exhausted":
      return "billing.upsell.game_data.sync_quota_exhausted";
    case "statistics.performance_ranking_not_in_plan":
      return "billing.upsell.statistics.performance_ranking_not_in_plan";
    default:
      return "billing.upsell.generic";
  }
}

export function formatPlanDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export function isOrganizationPlanKey(value: string): value is OrganizationPlanKey {
  return organizationPlanKeySchema.safeParse(value).success;
}
