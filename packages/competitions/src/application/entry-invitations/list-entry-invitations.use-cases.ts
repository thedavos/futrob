import { err, ok, type ActorId, type AuthorizationPort, type Result } from "@futrob/shared-kernel";
import type { EntryInvitation } from "../../domain/entities/entry-invitation.ts";
import type { CompetitionAuthorizationForbidden } from "../../domain/errors/competition.errors.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";
import type { EntryInvitationScope } from "./manage-entry-invitations.guard.ts";

/** Directed invitations the organizer sent for a competition, newest first. */
export class ListCompetitionEntryInvitationsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly invitations: EntryInvitationRepository;
    },
  ) {}

  async execute(
    input: EntryInvitationScope,
  ): Promise<Result<readonly EntryInvitation[], CompetitionAuthorizationForbidden>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.invitationsManage,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    return ok(
      await this.deps.invitations.listDirectedByCompetition(
        input.organizationId,
        input.competitionId,
      ),
    );
  }
}

/** Invitations addressed to the actor, newest first. */
export class ListMyEntryInvitationsUseCase {
  constructor(private readonly invitations: EntryInvitationRepository) {}

  execute(input: { readonly actorId: ActorId }): Promise<readonly EntryInvitation[]> {
    return this.invitations.listByInvitee(input.actorId);
  }
}
