import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { EntryInvitation } from "../entities/entry-invitation.ts";

export interface EntryInvitationRepository {
  create(invitation: EntryInvitation): Promise<EntryInvitation>;
  findById(invitationId: string): Promise<EntryInvitation | null>;
  /** Any link with this code, whatever its status, so a revoked code can say so. */
  findLinkByCode(code: string): Promise<EntryInvitation | null>;
  findActiveLink(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<EntryInvitation | null>;
  findPendingDirected(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    inviteeActorId: ActorId,
  ): Promise<EntryInvitation | null>;
  /** Directed invitations of a competition, newest first. */
  listDirectedByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly EntryInvitation[]>;
  /** Directed invitations addressed to an actor, newest first. */
  listByInvitee(inviteeActorId: ActorId): Promise<readonly EntryInvitation[]>;
  /**
   * Compare-and-set from `pending`: writes `next` only while the stored row is still
   * pending. Returns the stored row, or `null` when it was no longer pending.
   */
  updatePending(next: EntryInvitation): Promise<EntryInvitation | null>;
}
