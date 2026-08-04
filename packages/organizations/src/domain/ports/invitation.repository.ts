import type { ActorId } from "@futrob/shared-kernel";
import type { OrganizationInvitation } from "../entities/organization-invitation.ts";

/**
 * Persistence for organization access invitations (1:1 single-use today).
 *
 * `claimPending` is the atomic redemption primitive for single-use tokens and the
 * intended extension point for a future access `redeemPolicy: multi` (counter /
 * per-actor redemption). Roster/plantilla invitations stay in the teams BC.
 */
export interface InvitationRepository {
  create(invitation: OrganizationInvitation): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>;
  update(invitation: OrganizationInvitation): Promise<void>;
  /**
   * Atomically consume a pending, unexpired invitation for `actorId`.
   * Returns the accepted invitation, or `null` when no pending row matched.
   */
  claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<OrganizationInvitation | null>;
}
