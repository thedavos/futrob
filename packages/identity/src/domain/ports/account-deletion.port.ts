import type { ActorId } from "@futrob/shared-kernel";
import type {
  AccountDeletionBlocker,
  AccountDeletionState,
} from "../value-objects/account-deletion.ts";

export interface AccountDeletionRepository {
  /** An actor this repository has never seen is `active`. */
  findState(actorId: ActorId): Promise<AccountDeletionState>;
  schedule(input: {
    readonly actorId: ActorId;
    readonly requestedAt: Date;
    readonly scheduledFor: Date;
  }): Promise<void>;
  /** Clears a schedule that has not run yet; a no-op for any other state. */
  cancel(actorId: ActorId): Promise<void>;
  listDue(input: { readonly now: Date; readonly limit: number }): Promise<readonly ActorId[]>;
  /**
   * Removes the credentials, sessions and identity data the identity context owns, and marks
   * the actor deleted. Other contexts react to `identity.actor-deleted`.
   * Returns `false`, changing nothing, when the account is no longer due (cancelled meanwhile).
   */
  anonymize(input: { readonly actorId: ActorId; readonly deletedAt: Date }): Promise<boolean>;
}

/** Signs the actor out everywhere: cookie and bearer sessions stop working at once. */
export interface ActorSessionsPort {
  revokeAll(actorId: ActorId): Promise<void>;
}

export interface CredentialVerifierPort {
  verifyPassword(input: { readonly actorId: ActorId; readonly password: string }): Promise<boolean>;
}

/** Answered by the contexts that own organizers and captains, bridged in the product API. */
export interface AccountDeletionBlockersPort {
  listBlockers(actorId: ActorId): Promise<readonly AccountDeletionBlocker[]>;
}
