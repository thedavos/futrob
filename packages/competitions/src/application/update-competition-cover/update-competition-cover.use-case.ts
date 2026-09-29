import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
  InvalidCompetitionCover,
  type UpdateCompetitionCoverError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import {
  parseCompetitionCover,
  type CompetitionCoverInput,
} from "../../domain/value-objects/competition-cover.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface UpdateCompetitionCoverInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly cover: CompetitionCoverInput;
}

/** The cover is presentation, not structure: it stays editable after publication. */
export class UpdateCompetitionCoverUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: UpdateCompetitionCoverInput,
  ): Promise<Result<CompetitionDraft, UpdateCompetitionCoverError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    const current = await this.deps.competitions.findById(
      input.organizationId,
      input.competitionId,
    );
    if (!current)
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    if (current.competition.status === "archived")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Archived competitions are read-only",
        }),
      );
    const cover = parseCompetitionCover(input.cover, input.organizationId);
    if (!cover)
      return err(
        new InvalidCompetitionCover({
          code: "competitions.invalid_cover",
          message: "Cover must be a preset or an upload owned by this organization",
        }),
      );
    const next: CompetitionDraft = {
      ...current,
      competition: {
        ...current.competition,
        cover,
        updatedAt: this.deps.clock.now(),
      },
    };
    return ok(await this.deps.competitions.saveCover(next));
  }
}
