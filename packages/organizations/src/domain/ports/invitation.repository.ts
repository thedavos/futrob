import type { ActorId } from "@futrob/shared-kernel";
import type { OrganizationInvitation } from "../entities/organization-invitation.ts";

/**
 * Outcome of an atomic `multi` redemption attempt via `claimRedemption`.
 * `already-redeemed` is the idempotent path: `actorId` had already consumed
 * a cupo slot on a previous call, so no additional slot is taken.
 */
export interface MultiRedemptionClaim {
  readonly invitation: OrganizationInvitation;
  readonly outcome: "claimed" | "already-redeemed";
}

/**
 * Persistence for organization access invitations. Supports both `single`
 * (1:1, unchanged) and `multi` (1:N, cupo-bounded) redemption policies.
 * Roster/plantilla invitations stay in the teams BC.
 */
export interface InvitationRepository {
  create(invitation: OrganizationInvitation): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>;
  hasRedemption(invitationId: string, actorId: ActorId): Promise<boolean>;
  update(invitation: OrganizationInvitation): Promise<void>;
  /**
   * Atomically consume a pending, unexpired `single`-policy invitation for `actorId`.
   * Returns the accepted invitation, or `null` when no pending row matched.
   */
  claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<OrganizationInvitation | null>;
  /**
   * Atomically claim a cupo slot on a pending, unexpired `multi`-policy invitation
   * for `actorId`. Never lets concurrent callers exceed `maxRedemptions` distinct
   * actors. Returns `null` when the invitation is not an eligible pending `multi`
   * row (not found, wrong policy, expired, revoked) or when the cupo is exhausted
   * and `actorId` never redeemed it.
   */
  claimRedemption(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<MultiRedemptionClaim | null>;
}
