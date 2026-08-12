import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type EventPublisherPort,
  type OrganizationId,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { FixtureGenerationSpec, FixturePlan } from "../domain/entities/fixture-plan.ts";
import {
  FixtureAuthorizationForbidden,
  FixtureGenerationConflict,
  FixtureSourceNotFound,
  FixtureSourceNotPublished,
  FixtureSupersedeConflict,
  InvalidFixtureConfiguration,
  type GenerateCompetitionFixtureError,
} from "../domain/errors/fixture.errors.ts";
import type { EncounterCreatedEvent } from "../domain/events/encounter-created.event.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { FixtureOccupancyGuardPort } from "../domain/ports/fixture-editing.ports.ts";
import type {
  CompetitionFixtureSourcePort,
  CompetitionFixtureSourceSnapshot,
  FixturePlanRepository,
} from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { planEncounters } from "../domain/policies/edit-fixture-encounter.ts";
import { generateFixturePlan } from "../domain/policies/generate-fixture-plan.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import { projectFixturePlan, unprojectFixturePlan } from "./project-fixture-encounters.ts";

export interface GenerateCompetitionFixtureInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly generationVersion: number;
  readonly startsAt: Date;
  readonly roundIntervalDays: number;
  readonly homeAndAway: boolean;
  readonly seed?: readonly TeamId[];
  readonly groups?: {
    readonly count: number;
    readonly qualifiersPerGroup: number;
  };
  readonly playoffs?: {
    readonly teamCount: number;
  };
  readonly requestId?: string;
}

export class GenerateCompetitionFixtureUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly clock: ClockPort;
      readonly encounters: EncounterScheduleRepository;
      readonly eventPublisher: EventPublisherPort;
      readonly fixtures: FixturePlanRepository;
      readonly matches: OfficialMatchRepository;
      readonly occupancy: FixtureOccupancyGuardPort;
      readonly source: CompetitionFixtureSourcePort;
      readonly transaction: TransactionPort;
    },
  ) {}

  async execute(
    input: GenerateCompetitionFixtureInput,
  ): Promise<Result<FixturePlan, GenerateCompetitionFixtureError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
      },
    });
    if (!decision.allowed) {
      return err(
        new FixtureAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot generate this competition fixture",
          permission: ENCOUNTER_PERMISSION.scheduleManage,
        }),
      );
    }
    const source = await this.deps.source.load(input);
    if (
      !source ||
      source.organizationId !== input.organizationId ||
      source.competitionId !== input.competitionId
    ) {
      return err(
        new FixtureSourceNotFound({
          code: "scheduling.fixture_source_not_found",
          message: "Competition fixture source not found",
          competitionId: input.competitionId,
        }),
      );
    }
    if (source.status !== "published") {
      return err(
        new FixtureSourceNotPublished({
          code: "scheduling.fixture_source_not_published",
          message: "Only a published competition can generate a fixture",
          competitionId: input.competitionId,
        }),
      );
    }

    const spec = buildSpec(input, source);
    if (spec instanceof InvalidFixtureConfiguration) return err(spec);
    const candidate = generateFixturePlan(spec);

    return this.deps.transaction.runInTransaction(async () => {
      const existing = await this.deps.fixtures.findByGenerationVersion(
        input.organizationId,
        input.competitionId,
        input.generationVersion,
      );
      if (existing) {
        return existing.generationFingerprint === candidate.generationFingerprint
          ? ok(existing)
          : generationConflict();
      }

      const previous = await this.deps.fixtures.listActive(
        input.organizationId,
        input.competitionId,
      );
      const previousEncounterIds = previous.flatMap((plan) =>
        [...planEncounters(plan)].map((encounter) => encounter.id),
      );
      if (
        previousEncounterIds.length > 0 &&
        (await this.deps.occupancy.hasApprovedOfficialResult(previousEncounterIds))
      ) {
        return err(
          new FixtureSupersedeConflict({
            code: "scheduling.fixture_supersede_conflict",
            message: "A fixture with approved official results cannot be replaced",
          }),
        );
      }

      const saved = await this.deps.fixtures.save(candidate);
      if (!saved.created && saved.plan.generationFingerprint !== candidate.generationFingerprint) {
        return generationConflict();
      }
      if (saved.created) {
        await this.deps.fixtures.markSuperseded(
          input.organizationId,
          input.competitionId,
          saved.plan.id,
        );
        await Promise.all(previous.map((plan) => unprojectFixturePlan(this.deps, plan)));
        await projectFixturePlan(this.deps, saved.plan);
        await this.deps.eventPublisher.publishMany(
          encounterCreatedEvents(saved.plan, this.deps.clock.now(), input.requestId),
        );
      }
      return ok(saved.plan);
    });
  }
}

function generationConflict(): Result<never, FixtureGenerationConflict> {
  return err(
    new FixtureGenerationConflict({
      code: "scheduling.fixture_generation_conflict",
      message: "This generation version was already used with a different fixture spec",
    }),
  );
}

function buildSpec(
  input: GenerateCompetitionFixtureInput,
  source: CompetitionFixtureSourceSnapshot,
): FixtureGenerationSpec | InvalidFixtureConfiguration {
  const participants = source.approvedParticipants;
  const participantSet = new Set(participants);
  const seed = input.seed ? [...input.seed] : [...participants];
  const validSeed =
    seed.length === participants.length &&
    new Set(seed).size === seed.length &&
    seed.every((teamId) => participantSet.has(teamId));
  const commonIsValid =
    participants.length >= 2 &&
    participantSet.size === participants.length &&
    validSeed &&
    Number.isInteger(input.generationVersion) &&
    input.generationVersion > 0 &&
    Number.isInteger(input.roundIntervalDays) &&
    input.roundIntervalDays > 0 &&
    Number.isFinite(input.startsAt.getTime()) &&
    isIanaTimeZone(source.timeZone);
  if (!commonIsValid)
    return invalid("Fixture participants, seed, version, cadence, or time zone are invalid");

  if (source.format === "groups-knockout") {
    const count = input.groups?.count ?? 0;
    const qualifiers = input.groups?.qualifiersPerGroup ?? 0;
    const smallestGroup = Math.floor(participants.length / count);
    if (
      !Number.isInteger(count) ||
      count < 2 ||
      count > Math.floor(participants.length / 2) ||
      !Number.isInteger(qualifiers) ||
      qualifiers < 1 ||
      qualifiers > smallestGroup
    ) {
      return invalid("Groups require at least two Teams each and a valid qualifier count");
    }
  }

  if (source.format === "league-playoffs") {
    const teamCount = input.playoffs?.teamCount ?? 0;
    if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > participants.length) {
      return invalid("Playoffs require between two Teams and the competition participant count");
    }
  }

  return {
    organizationId: source.organizationId,
    competitionId: source.competitionId,
    generationVersion: input.generationVersion,
    rulesVersion: source.rulesVersion,
    format: source.format,
    timeZone: source.timeZone,
    startsAt: input.startsAt,
    roundIntervalDays: input.roundIntervalDays,
    officialMatchCounts: source.officialMatchCounts,
    resolutionModes: source.resolutionModes,
    seed,
    homeAndAway: input.homeAndAway,
    ...(input.groups ? { groups: input.groups } : {}),
    ...(input.playoffs ? { playoffs: input.playoffs } : {}),
  };
}

function invalid(message: string): InvalidFixtureConfiguration {
  return new InvalidFixtureConfiguration({
    code: "scheduling.invalid_fixture_configuration",
    message,
  });
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function encounterCreatedEvents(
  plan: FixturePlan,
  occurredAt: Date,
  correlationId?: string,
): EncounterCreatedEvent[] {
  return plan.stages.flatMap((stage) =>
    stage.rounds.flatMap((round) =>
      round.encounters.flatMap((encounter) => {
        if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return [];
        return [
          {
            eventName: "scheduling.encounter-created",
            occurredAt: occurredAt.toISOString(),
            ...(correlationId ? { correlationId } : {}),
            payload: {
              encounterId: encounter.id,
              organizationId: plan.organizationId,
              competitionId: plan.competitionId,
              stageId: stage.id,
              roundId: round.id,
              homeTeamId: encounter.home.teamId,
              awayTeamId: encounter.away.teamId,
              scheduledStartAt: encounter.scheduledStartAt.toISOString(),
            },
          },
        ];
      }),
    ),
  );
}
