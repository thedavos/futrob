import { createServerFn } from "@tanstack/react-start";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { resolveProductApiBaseUrl } from "@/context/product-api-client.ts";
import { loadPublicPlans } from "@/modules/billing/server/load-public-plans.ts";

/** Plan catalog for the landing and `/pricing`; `null` when the API fails or stalls. */
export const getPublicPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly OrganizationPlan[] | null> =>
    loadPublicPlans({ baseUrl: resolveProductApiBaseUrl() }),
);
