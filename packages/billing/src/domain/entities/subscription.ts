import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { ActorAddOnKey, OrganizationPlanKey } from "../value-objects/plan-key.ts";

export type SubscriptionSubject =
  | { readonly type: "organization"; readonly organizationId: OrganizationId }
  | { readonly type: "actor"; readonly actorId: ActorId };

export type SubscriptionState =
  | { readonly status: "trialing"; readonly trialEndsAt: Date }
  | { readonly status: "active" }
  | { readonly status: "past_due"; readonly pastDueSince: Date }
  | { readonly status: "canceled"; readonly canceledAt: Date };

export type SubscriptionStatus = SubscriptionState["status"];

interface SubscriptionBase {
  readonly id: string;
  readonly state: SubscriptionState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrganizationSubscription extends SubscriptionBase {
  readonly subject: Extract<SubscriptionSubject, { type: "organization" }>;
  readonly planKey: OrganizationPlanKey;
}

export interface ActorSubscription extends SubscriptionBase {
  readonly subject: Extract<SubscriptionSubject, { type: "actor" }>;
  readonly planKey: ActorAddOnKey;
}

export type Subscription = OrganizationSubscription | ActorSubscription;

/** Append-only record of a plan or state change (NFR-05). */
export interface PlanChangeAuditEntry {
  readonly id: string;
  readonly subject: SubscriptionSubject;
  readonly changedByActorId: ActorId;
  readonly before: PlanChangeSnapshot | null;
  readonly after: PlanChangeSnapshot;
  readonly reason: string;
  readonly occurredAt: Date;
}

export interface PlanChangeSnapshot {
  readonly planKey: OrganizationPlanKey | ActorAddOnKey;
  readonly state: SubscriptionState;
}

export function isOrganizationSubscription(
  subscription: Subscription,
): subscription is OrganizationSubscription {
  return subscription.subject.type === "organization";
}
