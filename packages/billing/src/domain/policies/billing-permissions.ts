import type { Permission } from "@futrob/shared-kernel";

/**
 * Capabilities over billing data (ADR-0017). They decide who may act; entitlements
 * decide what the plan includes. `plansAssign` belongs to the platform layer only; `plansRequest` belongs to organizers.
 */
export const BILLING_PERMISSION = {
  read: "billing.read",
  entitlementsRead: "billing.entitlements.read",
  plansAssign: "billing.plans.assign",
  /** Ask for a paid plan; the organizer bundle carries it, staff do not. */
  plansRequest: "billing.plans.request",
} as const satisfies Record<string, Permission>;

export const BILLING_PERMISSIONS = Object.values(BILLING_PERMISSION);
