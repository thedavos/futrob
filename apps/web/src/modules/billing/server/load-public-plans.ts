import type { OrganizationPlan } from "@futrob/api-contracts";
import { createFutrobClient } from "@futrob/sdk";

/**
 * The landing waits on the catalog before it renders, so a stalled API must not hold back the
 * hero and the sign-up CTA. Past this limit the pricing grid shows its "plans unavailable" alert.
 */
export const PUBLIC_PLANS_TIMEOUT_MS = 2_500;

interface LoadPublicPlansOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * Anonymous read of the plan catalog. It sends no service secret or actor: `/public/plans` is
 * public. Any failure, including the timeout, returns `null` so the page renders without numbers.
 */
export async function loadPublicPlans({
  baseUrl,
  fetchImpl,
  timeoutMs = PUBLIC_PLANS_TIMEOUT_MS,
}: LoadPublicPlansOptions): Promise<readonly OrganizationPlan[] | null> {
  try {
    const client = createFutrobClient({ baseUrl, fetchImpl, timeoutMs });
    return (await client.billing.listPublicPlans()).plans;
  } catch {
    return null;
  }
}
