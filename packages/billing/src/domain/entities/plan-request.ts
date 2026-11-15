import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { OrganizationPlanKey } from "../value-objects/plan-key.ts";

export type PlanRequestStatus = "pending" | "fulfilled" | "canceled";

/**
 * An organizer's ask to move to a paid plan. Billing happens outside the product (Phase 0),
 * so the request only tells a platform superuser which plan to assign. It never changes
 * entitlements by itself.
 */
export interface PlanRequest {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly planKey: OrganizationPlanKey;
  readonly requestedByActorId: ActorId;
  readonly status: PlanRequestStatus;
  readonly createdAt: Date;
  /** Set when the request stops being pending. */
  readonly resolvedAt: Date | null;
}
