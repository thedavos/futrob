import type { GetOrganizationEntitlementsResponse } from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";

/**
 * What the native app may show for the organization's plan (ADR-0025). Mobile only reads
 * entitlements to hide what does not apply; it never offers a purchase (store IAP rules).
 */
export type NativePlanFeatures = {
  readonly performanceRanking: boolean;
  readonly premiumAnalytics: boolean;
};

/** Hidden until the plan is known: a failed read never reveals a premium section. */
export const HIDDEN_PLAN_FEATURES: NativePlanFeatures = {
  performanceRanking: false,
  premiumAnalytics: false,
};

export function nativePlanFeatures(
  response: GetOrganizationEntitlementsResponse,
): NativePlanFeatures {
  return {
    performanceRanking: response.entitlements.features.performanceRanking,
    premiumAnalytics: response.entitlements.features.premiumAnalytics,
  };
}

export async function loadNativePlanFeatures(
  client: Pick<FutrobClient, "billing">,
  organizationId: string | undefined,
): Promise<NativePlanFeatures> {
  if (!organizationId) return HIDDEN_PLAN_FEATURES;
  try {
    return nativePlanFeatures(await client.billing.getOrganizationEntitlements(organizationId));
  } catch {
    return HIDDEN_PLAN_FEATURES;
  }
}
