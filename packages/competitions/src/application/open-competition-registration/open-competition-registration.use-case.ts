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
  InvalidCompetitionRules,
  type OpenCompetitionRegistrationError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { isValidCompetitionRules } from "../competition-draft-validation.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";
import { transitionCompetitionStatus } from "../transition-competition-status.ts";

export interface OpenCompetitionRegistrationInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

/** `draft → registration`. Structure (format, rules) freezes while registration is open. */
export class OpenCompetitionRegistrationUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: OpenCompetitionRegistrationInput,
  ): Promise<Result<CompetitionDraft, OpenCompetitionRegistrationError>> {
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
    if (current.competition.status === "registration") return ok(current);
    if (current.competition.status !== "draft")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Registration can only open from draft",
        }),
      );
    if (!isValidCompetitionRules(current.competition.format, current.rules))
      return err(
        new InvalidCompetitionRules({
          code: "competitions.invalid_rules",
          message: "Competition rules are invalid",
        }),
      );
    const opened = await transitionCompetitionStatus(this.deps, current, "registration");
    if (!opened)
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition status changed concurrently",
        }),
      );
    return ok(opened);
  }
}
