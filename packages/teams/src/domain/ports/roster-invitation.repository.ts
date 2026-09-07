import type { ActorId } from "@futrob/shared-kernel";
import type { RosterInvitation } from "../entities/roster-invitation.ts";

export interface ClaimPendingOptions {
  /** Precheck hint; multi policy re-validates roster capacity atomically in adapters. */
  readonly hasFreeSlot: boolean;
  readonly maxRosterSize: number;
}

/**
 * Persistence for roster invitations.
 *
 * `claimPending` is the atomic redemption primitive: single-use CAS on status, or
 * multi-use per-actor redemption rows while the invitation stays pending.
 */
export interface RosterInvitationRepository {
  create(invitation: RosterInvitation): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RosterInvitation | null>;
  findById(invitationId: string): Promise<RosterInvitation | null>;
  /** Invitations directed at `inviteeActorId`, newest first. */
  listByInvitee(inviteeActorId: ActorId): Promise<RosterInvitation[]>;
  findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null>;
  deleteRedemption(invitationId: string, actorId: ActorId): Promise<void>;
  /**
   * Atomically redeem a pending, unexpired invitation for `actorId`.
   * Single policy: marks accepted. Multi policy: inserts redemption, keeps pending.
   * Returns the invitation, or `null` when redemption could not proceed.
   */
  claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null>;
  /**
   * CAS pending → declined for the directed invitee.
   * Returns the declined invitation, or `null` when it was not pending for that invitee.
   */
  declinePending(
    invitationId: string,
    inviteeActorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null>;
  /**
   * CAS pending → accepted by invitation id (directed accept path).
   * Returns the accepted invitation, or `null` when it was no longer pending.
   */
  acceptPendingById(
    invitationId: string,
    actorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null>;
}
