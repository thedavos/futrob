import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type {
  ActorSubscription,
  OrganizationSubscription,
  PlanChangeAuditEntry,
  Subscription,
} from "../entities/subscription.ts";

export interface SubscriptionRepository {
  findForOrganization(organizationId: OrganizationId): Promise<OrganizationSubscription | null>;
  findForActor(actorId: ActorId): Promise<ActorSubscription | null>;
  /** One subscription per subject; saving replaces it. */
  save(subscription: Subscription): Promise<void>;
}

export interface PlanChangeAuditRepository {
  append(entry: PlanChangeAuditEntry): Promise<void>;
  listForOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly PlanChangeAuditEntry[]>;
}
