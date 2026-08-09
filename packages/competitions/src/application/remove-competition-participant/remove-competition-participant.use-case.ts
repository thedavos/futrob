import {
  err,
  ok,
  type CompetitionId,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
  EntryNotFound,
  type RemoveCompetitionParticipantError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export class RemoveCompetitionParticipantUseCase {
  constructor(
    private readonly deps: {
      competitions: CompetitionRepository;
      entries: CompetitionEntryRepository;
      authorization: AuthorizationPort;
    },
  ) {}
  async execute(input: {
    actorId: ActorId;
    organizationId: OrganizationId;
    competitionId: CompetitionId;
    entryId: string;
  }): Promise<Result<void, RemoveCompetitionParticipantError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.participantsManage,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft)
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    if (draft.competition.status !== "draft")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition is not editable",
        }),
      );
    const entry = await this.deps.entries.findById(input.organizationId, input.entryId);
    if (!entry || entry.competitionId !== input.competitionId)
      return err(
        new EntryNotFound({
          code: "competitions.entry_not_found",
          message: "Participant not found",
        }),
      );
    await this.deps.entries.remove?.(input.organizationId, input.entryId);
    return ok(undefined);
  }
}
