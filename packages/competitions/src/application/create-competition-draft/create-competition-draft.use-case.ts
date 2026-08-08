import {
  asCompetitionId,
  err,
  ok,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
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
  CompetitionCreationKeyConflict,
  InvalidCompetitionGameEdition,
  InvalidCompetitionName,
  InvalidCompetitionTimeZone,
  type CreateCompetitionDraftError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import type { CompetitionMatchRules } from "../../domain/value-objects/resolution-mode.ts";

export interface CreateCompetitionDraftInput {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  readonly name: string;
  readonly gameEdition: string;
  readonly platform: CompetitionPlatform;
  readonly region: CompetitionRegion;
  readonly timeZone: string;
  readonly format: CompetitionFormat;
  readonly creationKey?: string;
}

export class CreateCompetitionDraftUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: CreateCompetitionDraftInput,
  ): Promise<Result<CompetitionDraft, CreateCompetitionDraftError>> {
    const name = input.name.trim();
    const gameEdition = input.gameEdition.trim();
    const timeZone = input.timeZone.trim();
    if (name.length === 0 || name.length > 120) {
      return err(
        new InvalidCompetitionName({
          code: "competitions.invalid_name",
          message: "Invalid competition name",
        }),
      );
    }
    if (gameEdition.length === 0 || gameEdition.length > 40) {
      return err(
        new InvalidCompetitionGameEdition({
          code: "competitions.invalid_game_edition",
          message: "Invalid game edition",
        }),
      );
    }
    if (!isIanaTimeZone(timeZone)) {
      return err(
        new InvalidCompetitionTimeZone({
          code: "competitions.invalid_time_zone",
          message: "Invalid IANA time zone",
        }),
      );
    }

    const existing = input.creationKey
      ? await this.deps.competitions.findByCreationKey(input.creationKey)
      : null;
    if (existing && existing.competition.organizationId !== input.organizationId) {
      return err(
        new CompetitionCreationKeyConflict({
          code: "competitions.creation_key_conflict",
          message: "Creation key belongs to another organization",
        }),
      );
    }
    if (existing && existing.competition.status !== "draft") {
      return ok(existing);
    }

    const now = this.deps.clock.now();
    const competition: Competition = {
      id: existing?.competition.id ?? asCompetitionId(this.deps.ids.generate()),
      organizationId: input.organizationId,
      name,
      status: "draft",
      modality: "fc-clubs",
      gameEdition,
      platform: input.platform,
      region: input.region,
      timeZone,
      format: input.format,
      createdByActorId: existing?.competition.createdByActorId ?? input.actorId,
      creationKey: input.creationKey,
      createdAt: existing?.competition.createdAt ?? now,
      updatedAt: now,
    };
    const rules: CompetitionRules = {
      competitionId: competition.id,
      version: 1,
      ...rulesPreset(input.format),
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: existing?.rules.createdAt ?? now,
    };

    return ok(await this.deps.competitions.saveDraft({ competition, rules }));
  }
}

function rulesPreset(
  format: CompetitionFormat,
): Pick<CompetitionRules, "regularStage" | "knockoutStage"> {
  const regularStage = format === "knockout" ? null : matchRules(1, "independent_matches");
  const knockoutStage = format === "league" ? null : matchRules(2, "aggregate_score");
  return { regularStage, knockoutStage };
}

function matchRules(
  officialMatchesPerEncounter: 1 | 2,
  resolutionMode: CompetitionMatchRules["resolutionMode"],
): CompetitionMatchRules {
  return {
    officialMatchesPerEncounter,
    resolutionMode,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 2,
    minimumRescheduleNoticeHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  };
}

function isIanaTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
