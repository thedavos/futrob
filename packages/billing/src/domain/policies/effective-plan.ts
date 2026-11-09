import type { Subscription } from "../entities/subscription.ts";

/**
 * Whether a subscription still grants its plan at `now`. `past_due` keeps the plan in
 * Phase 0; grace periods arrive with the payment provider (ADR-0025).
 */
export function subscriptionGrantsPlan(subscription: Subscription, now: Date): boolean {
  switch (subscription.state.status) {
    case "active":
    case "past_due":
      return true;
    case "trialing":
      return subscription.state.trialEndsAt.getTime() > now.getTime();
    case "canceled":
      return false;
  }
}
