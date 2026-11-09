import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type {
  ActorSubscription,
  OrganizationSubscription,
  PlanChangeAuditEntry,
  Subscription,
} from "../entities/subscription.ts";

export interface SubscriptionRepository {
  /** Serializes the entire assignment, including the first read for an absent subscription. */
  withOrganizationLock<T>(organizationId: OrganizationId, operation: () => Promise<T>): Promise<T>;
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
