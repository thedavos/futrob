import { compareByTime, TIME_SORT_DIRECTION, type ActorId } from "@futrob/shared-kernel";
import type { RosterInvitation } from "../../domain/entities/roster-invitation.ts";
import type { RosterInvitationRepository } from "../../domain/ports/roster-invitation.repository.ts";

export interface ListMyRosterInvitationsInput {
  readonly actorId: ActorId;
}

export class ListMyRosterInvitationsUseCase {
  constructor(
    private readonly deps: {
      readonly invitations: RosterInvitationRepository;
    },
  ) {}

  async execute(input: ListMyRosterInvitationsInput): Promise<RosterInvitation[]> {
    const invitations = await this.deps.invitations.listByInvitee(input.actorId);
    return [...invitations].sort(compareByTime((item) => item.createdAt, TIME_SORT_DIRECTION.desc));
  }
}
