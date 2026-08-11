import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type EventPublisherPort,
  type OrganizationId,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { FixtureEncounter, FixturePlan } from "../domain/entities/fixture-plan.ts";
import {
  FixtureAuthorizationForbidden,
  FixtureEncounterNotEditable,
  FixtureEncounterNotFound,
  FixturePlanNotFound,
  FixtureUpdateConflict,
  InvalidFixtureConfiguration,
  type EditFixtureEncounterError,
} from "../domain/errors/fixture.errors.ts";
import type { EncounterRescheduledEvent } from "../domain/events/encounter-rescheduled.event.ts";
import type {
  EditableFixturePlanRepository,
  FixtureAuditPort,
  FixtureEncounterEditGuardPort,
} from "../domain/ports/fixture-editing.ports.ts";
import type { CompetitionFixtureSourcePort } from "../domain/ports/fixture-plan.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

export interface EditFixtureEncounterInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly fixturePlanId: string;
  readonly encounterId: EncounterId;
  readonly scheduledStartAt?: Date;
  readonly homeTeamId?: TeamId;
  readonly awayTeamId?: TeamId;
  readonly reason: string;
  readonly requestId: string;
}

export class EditFixtureEncounterUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly audit: FixtureAuditPort;
      readonly clock: ClockPort;
      readonly editGuard: FixtureEncounterEditGuardPort;
      readonly eventPublisher: EventPublisherPort;
      readonly fixtures: EditableFixturePlanRepository;
      readonly source: CompetitionFixtureSourcePort;
      readonly transaction: TransactionPort;
    },
  ) {}

  async execute(
    input: EditFixtureEncounterInput,
  ): Promise<Result<FixtureEncounter, EditFixtureEncounterError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        encounterId: input.encounterId,
      },
    });
    if (!decision.allowed) {
      return err(
        new FixtureAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot edit this fixture encounter",
          permission: ENCOUNTER_PERMISSION.scheduleManage,
        }),
      );
    }

    const reason = input.reason.trim();
    if (
      !reason ||
      !input.requestId.trim() ||
      (input.scheduledStartAt && !Number.isFinite(input.scheduledStartAt.getTime())) ||
      (input.homeTeamId === undefined) !== (input.awayTeamId === undefined) ||
      (input.homeTeamId !== undefined && input.homeTeamId === input.awayTeamId)
    ) {
      return err(invalid("The edit requires a reason, request ID, and valid schedule or pairing"));
    }

    return this.deps.transaction.runInTransaction(async () => {
      const plan = await this.deps.fixtures.findById(
        input.organizationId,
        input.competitionId,
        input.fixturePlanId,
      );
      if (!plan) {
        return err(
          new FixturePlanNotFound({
            code: "scheduling.fixture_plan_not_found",
            message: "Fixture plan not found",
            competitionId: input.competitionId,
          }),
        );
      }
      const before = findEncounter(plan, input.encounterId);
      if (!before) {
        return err(
          new FixtureEncounterNotFound({
            code: "scheduling.fixture_encounter_not_found",
            message: "Fixture encounter not found",
            encounterId: input.encounterId,
          }),
        );
      }
      if (!(await this.deps.editGuard.canEdit(input))) {
        return err(
          new FixtureEncounterNotEditable({
            code: "scheduling.fixture_encounter_not_editable",
            message: "An encounter with an approved or final result cannot be edited",
            encounterId: input.encounterId,
          }),
        );
      }

      if (input.homeTeamId && input.awayTeamId) {
        const source = await this.deps.source.load(input);
        const approved = new Set(source?.approvedParticipants ?? []);
        if (
          source?.organizationId !== input.organizationId ||
          source.competitionId !== input.competitionId ||
          !approved.has(input.homeTeamId) ||
          !approved.has(input.awayTeamId)
        ) {
          return err(invalid("Both Teams must be approved participants in this competition"));
        }
      }

      const after: FixtureEncounter = {
        ...before,
        ...(input.scheduledStartAt ? { scheduledStartAt: input.scheduledStartAt } : {}),
        ...(input.homeTeamId && input.awayTeamId
          ? {
              home: { kind: "team" as const, teamId: input.homeTeamId },
              away: { kind: "team" as const, teamId: input.awayTeamId },
            }
          : {}),
      };
      if (encountersEqual(before, after)) return ok(before);
      if (hasTeamCollision(plan, after)) {
        return err(invalid("A Team cannot have two encounters at the same scheduled time"));
      }

      const updated = await this.deps.fixtures.update(replaceEncounter(plan, after));
      if (!updated) {
        return err(
          new FixtureUpdateConflict({
            code: "scheduling.fixture_update_conflict",
            message: "The fixture changed concurrently",
          }),
        );
      }
      const occurredAt = this.deps.clock.now();
      await this.deps.audit.append({
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        fixturePlanId: input.fixturePlanId,
        encounterId: input.encounterId,
        actorId: input.actorId,
        requestId: input.requestId,
        reason,
        occurredAt,
        before,
        after,
      });
      if (before.scheduledStartAt.getTime() !== after.scheduledStartAt.getTime()) {
        const event: EncounterRescheduledEvent = {
          eventName: "scheduling.encounter-rescheduled",
          occurredAt: occurredAt.toISOString(),
          correlationId: input.requestId,
          payload: {
            encounterId: input.encounterId,
            previousStartAt: before.scheduledStartAt.toISOString(),
            newStartAt: after.scheduledStartAt.toISOString(),
            scope: { type: "entire_encounter" },
            approvedBy: input.actorId,
          },
        };
        await this.deps.eventPublisher.publish(event);
      }
      return ok(after);
    });
  }
}

function findEncounter(plan: FixturePlan, encounterId: EncounterId): FixtureEncounter | null {
  for (const stage of plan.stages) {
    for (const round of stage.rounds) {
      const encounter = round.encounters.find((item) => item.id === encounterId);
      if (encounter) return encounter;
    }
  }
  return null;
}

function replaceEncounter(plan: FixturePlan, replacement: FixtureEncounter): FixturePlan {
  return {
    ...plan,
    stages: plan.stages.map((stage) => ({
      ...stage,
      rounds: stage.rounds.map((round) => ({
        ...round,
        encounters: round.encounters.map((encounter) =>
          encounter.id === replacement.id ? replacement : encounter,
        ),
      })),
    })),
  };
}

function hasTeamCollision(plan: FixturePlan, candidate: FixtureEncounter): boolean {
  if (candidate.home.kind !== "team" || candidate.away.kind !== "team") return false;
  const teams = new Set([candidate.home.teamId, candidate.away.teamId]);
  return plan.stages.some((stage) =>
    stage.rounds.some((round) =>
      round.encounters.some(
        (encounter) =>
          encounter.id !== candidate.id &&
          encounter.scheduledStartAt.getTime() === candidate.scheduledStartAt.getTime() &&
          ((encounter.home.kind === "team" && teams.has(encounter.home.teamId)) ||
            (encounter.away.kind === "team" && teams.has(encounter.away.teamId))),
      ),
    ),
  );
}

function encountersEqual(left: FixtureEncounter, right: FixtureEncounter): boolean {
  return (
    left.scheduledStartAt.getTime() === right.scheduledStartAt.getTime() &&
    JSON.stringify(left.home) === JSON.stringify(right.home) &&
    JSON.stringify(left.away) === JSON.stringify(right.away)
  );
}

function invalid(message: string): InvalidFixtureConfiguration {
  return new InvalidFixtureConfiguration({
    code: "scheduling.invalid_fixture_configuration",
    message,
  });
}
