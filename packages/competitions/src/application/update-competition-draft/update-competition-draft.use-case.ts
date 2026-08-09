import {
  err,
  ok,
  type ClockPort,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type {
  Competition,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
} from "../../domain/entities/competition.ts";
import type { CompetitionRules } from "../../domain/entities/competition-rules.ts";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
  InvalidCompetitionGameEdition,
  InvalidCompetitionName,
  InvalidCompetitionRules,
  InvalidCompetitionTimeZone,
  type UpdateCompetitionDraftError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { isValidCompetitionRules } from "../competition-draft-validation.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface UpdateCompetitionDraftInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly name: string;
  readonly gameEdition: string;
  readonly platform: CompetitionPlatform;
  readonly region: CompetitionRegion;
  readonly timeZone: string;
  readonly format: CompetitionFormat;
  readonly rules: Pick<CompetitionRules, "regularStage" | "knockoutStage" | "maxRosterSize">;
}

export class UpdateCompetitionDraftUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: UpdateCompetitionDraftInput,
  ): Promise<Result<CompetitionDraft, UpdateCompetitionDraftError>> {
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
    if (current.competition.status !== "draft")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Published competition structure cannot be edited",
        }),
      );
    const name = input.name.trim();
    const gameEdition = input.gameEdition.trim();
    const timeZone = input.timeZone.trim();
    if (!name || name.length > 120)
      return err(
        new InvalidCompetitionName({
          code: "competitions.invalid_name",
          message: "Invalid competition name",
        }),
      );
    if (!gameEdition || gameEdition.length > 40)
      return err(
        new InvalidCompetitionGameEdition({
          code: "competitions.invalid_game_edition",
          message: "Invalid game edition",
        }),
      );
    if (!isIanaTimeZone(timeZone))
      return err(
        new InvalidCompetitionTimeZone({
          code: "competitions.invalid_time_zone",
          message: "Invalid IANA time zone",
        }),
      );
    const competition: Competition = {
      ...current.competition,
      name,
      gameEdition,
      platform: input.platform,
      region: input.region,
      timeZone,
      format: input.format,
      updatedAt: this.deps.clock.now(),
    };
    const rules: CompetitionRules = { ...current.rules, ...input.rules, awayGoalsEnabled: false };
    if (!isValidCompetitionRules(competition.format, rules))
      return err(
        new InvalidCompetitionRules({
          code: "competitions.invalid_rules",
          message: "Rules are incompatible with the competition format",
        }),
      );
    return ok(await this.deps.competitions.saveDraft({ competition, rules }));
  }
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}
