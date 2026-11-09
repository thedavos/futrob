import { useQuery } from "@tanstack/react-query";
import type { GetOrganizationPlanResponse, OrganizationPlan } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { readKeepingRefusal, type StoredRead } from "@/shared/presentation/query/stored-refusal.ts";
import { BillingClientError, billingBrowserClient } from "./billing-browser-client.ts";

/** A refusal is stored as data so a cached plan never reappears after a 403 and a 500. */
export type OrganizationPlanRead = StoredRead<GetOrganizationPlanResponse>;

export function loadOrganizationPlan(organizationId: string): Promise<OrganizationPlanRead> {
  return readKeepingRefusal(
    () => billingBrowserClient.getPlan(organizationId),
    (error) => (error instanceof BillingClientError ? error.status : undefined),
  );
}

export function useOrganizationPlanQuery(organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.billing.plan(organizationId),
    queryFn: () => loadOrganizationPlan(organizationId),
    enabled,
  });
}

/**
 * The public plan catalog. `load` resolves `null` when the catalog is unavailable; callers
 * then show every option and rely on the API's 402.
 */
export function usePublicPlansQuery(load: () => Promise<readonly OrganizationPlan[] | null>) {
  return useQuery({
    queryKey: queryKeys.billing.publicPlans(),
    queryFn: load,
    staleTime: 5 * 60_000,
  });
}
