import {
  compareByTime,
  TIME_SORT_DIRECTION,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import {
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
} from "../../domain/entities/entry-invitation.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";

const newestFirst = compareByTime<EntryInvitation>(
  (invitation) => invitation.createdAt,
  TIME_SORT_DIRECTION.desc,
);

export class FakeEntryInvitationRepository implements EntryInvitationRepository {
  readonly rows = new Map<string, EntryInvitation>();

  async create(invitation: EntryInvitation) {
    this.rows.set(invitation.id, invitation);
    return invitation;
  }

  async findById(invitationId: string) {
    return this.rows.get(invitationId) ?? null;
  }

  async findLinkByCode(code: string) {
    return [...this.rows.values()].find((row) => row.code === code) ?? null;
  }

  async findActiveLink(organizationId: OrganizationId, competitionId: CompetitionId) {
    return (
      [...this.rows.values()].find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.channel === ENTRY_INVITATION_CHANNEL.link &&
          row.status === ENTRY_INVITATION_STATUS.pending,
      ) ?? null
    );
  }

  async findPendingDirected(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    inviteeActorId: ActorId,
  ) {
    return (
      [...this.rows.values()].find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.inviteeActorId === inviteeActorId &&
          row.status === ENTRY_INVITATION_STATUS.pending,
      ) ?? null
    );
  }

  async listDirectedByCompetition(organizationId: OrganizationId, competitionId: CompetitionId) {
    return [...this.rows.values()]
      .filter(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.channel === ENTRY_INVITATION_CHANNEL.directed,
      )
      .sort(newestFirst);
  }

  async listByInvitee(inviteeActorId: ActorId) {
    return [...this.rows.values()]
      .filter((row) => row.inviteeActorId === inviteeActorId)
      .sort(newestFirst);
  }

  async updatePending(next: EntryInvitation) {
    const current = this.rows.get(next.id);
    if (current?.status !== ENTRY_INVITATION_STATUS.pending) return null;
    this.rows.set(next.id, next);
    return next;
  }
}
