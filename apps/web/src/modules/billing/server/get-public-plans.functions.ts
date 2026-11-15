import { createServerFn } from "@tanstack/react-start";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { createFutrobClient } from "@futrob/sdk";
import { resolveProductApiBaseUrl } from "@/context/product-api-client.ts";

/**
 * Anonymous read of the plan catalog for the pricing page. It sends no service secret or
 * actor: `/public/plans` is public. A failure renders the page without numbers.
 */
export const getPublicPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<readonly OrganizationPlan[] | null> => {
    try {
      const client = createFutrobClient({ baseUrl: resolveProductApiBaseUrl() });
      return (await client.billing.listPublicPlans()).plans;
    } catch {
      return null;
    }
  },
);
