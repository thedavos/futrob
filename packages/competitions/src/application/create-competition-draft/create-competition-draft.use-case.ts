import {
  asCompetitionId,
  err,
  isIanaTimeZone,
  ok,
  type ActorId,
  type AuthorizationPort,
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
  CompetitionFormatNotInPlan,
  CompetitionPlanLimitReached,
  InvalidCompetitionGameEdition,
  InvalidCompetitionName,
  InvalidCompetitionTimeZone,
  type CreateCompetitionDraftError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import type { CompetitionPlanLimitsPort } from "../../domain/ports/competition-plan-limits.port.ts";
import type { CompetitionMatchRules } from "../../domain/value-objects/resolution-mode.ts";
import { isActiveCompetitionStatus } from "../../domain/policies/competition-lifecycle.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { DEFAULT_COMPETITION_COVER } from "../../domain/value-objects/competition-cover.ts";
import { EMPTY_SCHEDULE } from "../../domain/value-objects/competition-schedule.ts";
import { DEFAULT_TEAM_RANGE } from "../../domain/value-objects/team-range.ts";
import {
  resolveCompetitionProfile,
  type CompetitionProfile,
  type CompetitionProfileInput,
} from "../competition-profile.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

const DEFAULT_PROFILE: CompetitionProfile = {
  teams: DEFAULT_TEAM_RANGE,
  schedule: EMPTY_SCHEDULE,
  cover: DEFAULT_COMPETITION_COVER,
};

export interface CreateCompetitionDraftInput extends CompetitionProfileInput {
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
      readonly planLimits: CompetitionPlanLimitsPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: CreateCompetitionDraftInput,
  ): Promise<Result<CompetitionDraft, CreateCompetitionDraftError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.update,
      scope: { organizationId: input.organizationId },
    });
    if (forbidden) return err(forbidden);
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

    const planError = await this.planError(input, existing?.competition ?? null);
    if (planError) return err(planError);

    const profile = resolveCompetitionProfile(
      existing?.competition ?? DEFAULT_PROFILE,
      input,
      input.organizationId,
    );
    if (!profile.isOk()) return err(profile.error);

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
      ...profile.value,
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
      rankingEligibility: null,
      createdAt: existing?.rules.createdAt ?? now,
    };

    return ok(await this.deps.competitions.saveDraft({ competition, rules }));
  }

  /** A replayed creation key edits its own draft, so it never counts as a new competition. */
  private async planError(
    input: CreateCompetitionDraftInput,
    existing: Competition | null,
  ): Promise<CompetitionPlanLimitReached | CompetitionFormatNotInPlan | null> {
    const limits = await this.deps.planLimits.limitsFor(input.organizationId);
    if (existing?.format !== input.format && !limits.allowedFormats.includes(input.format)) {
      return new CompetitionFormatNotInPlan({
        code: "competitions.format_not_in_plan",
        message: `The organization's plan does not include the ${input.format} format`,
        format: input.format,
        allowedFormats: limits.allowedFormats,
      });
    }
    if (existing || limits.maxActiveCompetitions === null) return null;
    const active = (await this.deps.competitions.listByOrganization(input.organizationId)).filter(
      (competition) => isActiveCompetitionStatus(competition.status),
    ).length;
    if (active < limits.maxActiveCompetitions) return null;
    return new CompetitionPlanLimitReached({
      code: "competitions.plan_limit_reached",
      message: `The organization's plan allows ${limits.maxActiveCompetitions} active competitions`,
      limit: "active_competitions",
      max: limits.maxActiveCompetitions,
    });
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
    rescheduleProposalExpiryHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  };
}
