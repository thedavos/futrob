import type { CompetitionFormatDto, OrganizationPlan } from "@futrob/api-contracts";
import { FALLBACK_ORGANIZATION_PLAN } from "@futrob/billing";

/**
 * Plan a new organization starts on. Billing resolves an organization without a live
 * subscription to this plan, so onboarding reads its entitlements from the public catalog.
 */
export const STARTING_ORGANIZATION_PLAN = FALLBACK_ORGANIZATION_PLAN;

/**
 * Formats a plan does not include, according to the published catalog. An unknown catalog
 * (not loaded, failed, or plan missing) gates nothing: the product API still enforces the
 * plan and answers `competitions.format_not_in_plan`.
 */
export function competitionFormatsOutsidePlan(
  plans: readonly OrganizationPlan[] | null | undefined,
  planKey: OrganizationPlan["key"],
  formats: readonly CompetitionFormatDto[],
): ReadonlySet<CompetitionFormatDto> {
  const included = plans?.find((plan) => plan.key === planKey)?.entitlements.features
    .competitionFormats;
  if (!included) return new Set();
  return new Set(formats.filter((format) => !included.includes(format)));
}
