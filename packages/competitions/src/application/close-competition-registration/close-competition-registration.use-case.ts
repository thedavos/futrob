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
  type CloseCompetitionRegistrationError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";
import { transitionCompetitionStatus } from "../transition-competition-status.ts";

export interface CloseCompetitionRegistrationInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

/** `registration → draft`. Entries are kept; the structure becomes editable again. */
export class CloseCompetitionRegistrationUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: CloseCompetitionRegistrationInput,
  ): Promise<Result<CompetitionDraft, CloseCompetitionRegistrationError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.publish,
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
    if (current.competition.status === "draft") return ok(current);
    if (current.competition.status !== "registration")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Registration is not open",
        }),
      );
    const closed = await transitionCompetitionStatus(this.deps, current, "draft");
    if (!closed)
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition status changed concurrently",
        }),
      );
    return ok(closed);
  }
}
