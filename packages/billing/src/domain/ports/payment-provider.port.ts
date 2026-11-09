import type { Result } from "@futrob/shared-kernel";
import type { SubscriptionSubject } from "../entities/subscription.ts";
import type { PaymentProviderUnavailable } from "../errors/billing.errors.ts";
import type { PlanKey } from "../value-objects/plan-key.ts";

/**
 * Phase 1 seam (ADR-0025). No adapter exists: in Phase 0 a superuser assigns plans.
 * Provider webhooks will become Subscription changes with the same audit trail.
 */
export interface PaymentProviderPort {
  readonly key: string;
  createCheckoutSession(input: {
    readonly subject: SubscriptionSubject;
    readonly planKey: PlanKey;
    readonly successUrl: string;
    readonly cancelUrl: string;
  }): Promise<Result<{ readonly url: string }, PaymentProviderUnavailable>>;
  createCustomerPortalSession(input: {
    readonly subject: SubscriptionSubject;
    readonly returnUrl: string;
  }): Promise<Result<{ readonly url: string }, PaymentProviderUnavailable>>;
}
