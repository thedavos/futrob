import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/** Days between requesting deletion and executing it, unless a deployment configures another. */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

/**
 * Lifecycle of an account. Deleting anonymizes: the actor row stays as a tombstone so
 * official results and audit keep their foreign keys (ADR-0030).
 */
export type AccountDeletionState =
  | { readonly kind: "active" }
  | { readonly kind: "scheduled"; readonly requestedAt: Date; readonly scheduledFor: Date }
  | { readonly kind: "deleted"; readonly deletedAt: Date };

/** Something the account holder must resolve before the account can be deleted. */
export type AccountDeletionBlocker =
  | {
      readonly kind: "sole-organizer";
      readonly organizationId: OrganizationId;
      readonly organizationName: string;
    }
  | {
      readonly kind: "active-captain";
      readonly competitionId: CompetitionId;
      readonly competitionName: string;
      readonly teamId: TeamId;
      readonly teamName: string;
    };

/** What every read shows in place of a deleted account's name (ADR-0030). */
export const DELETED_ACCOUNT_DISPLAY_NAME = "Cuenta eliminada";

export const ACTOR_DELETED_EVENT = "identity.actor-deleted";

export interface ActorDeletedEvent {
  readonly eventName: typeof ACTOR_DELETED_EVENT;
  readonly occurredAt: string;
  readonly payload: { readonly actorId: ActorId };
}
