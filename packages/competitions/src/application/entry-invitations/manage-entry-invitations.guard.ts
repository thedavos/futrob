import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
} from "../../domain/errors/competition.errors.ts";
import type { ManageEntryInvitationsError } from "../../domain/errors/entry-invitation.errors.ts";
import { canEditParticipants } from "../../domain/policies/competition-lifecycle.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface EntryInvitationScope {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

/** Inviting needs the capability and a competition whose participants may still change. */
export async function requireInvitableCompetition(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly competitions: CompetitionRepository;
  },
  scope: EntryInvitationScope,
): Promise<Result<CompetitionDraft, ManageEntryInvitationsError>> {
  const forbidden = await competitionPermissionError({
    authorization: deps.authorization,
    actorId: scope.actorId,
    permission: COMPETITION_PERMISSION.invitationsManage,
    scope: { organizationId: scope.organizationId, competitionId: scope.competitionId },
  });
  if (forbidden) return err(forbidden);
  const draft = await deps.competitions.findById(scope.organizationId, scope.competitionId);
  if (!draft) {
    return err(
      new CompetitionNotFound({ code: "competitions.not_found", message: "Competition not found" }),
    );
  }
  if (!canEditParticipants(draft.competition.status)) {
    return err(
      new CompetitionNotEditable({
        code: "competitions.not_editable",
        message: "Teams can only be invited in draft or registration",
      }),
    );
  }
  return ok(draft);
}
