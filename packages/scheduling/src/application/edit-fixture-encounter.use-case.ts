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
import type { EncounterMutationLockPort } from "../domain/ports/encounter-mutation-lock.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type {
  FixtureAuditPort,
  FixtureEncounterEditGuardPort,
} from "../domain/ports/fixture-editing.ports.ts";
import type {
  CompetitionFixtureSourcePort,
  FixturePlanRepository,
} from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import {
  encountersEqual,
  findEncounter,
  hasDuplicateMatchup,
  hasTeamCollision,
  teamsInGroup,
} from "../domain/policies/edit-fixture-encounter.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import { projectFixtureEncounter } from "./project-fixture-encounters.ts";

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
      readonly encounters: EncounterScheduleRepository;
      readonly eventPublisher: EventPublisherPort;
      readonly fixtures: FixturePlanRepository;
      readonly matches: OfficialMatchRepository;
      readonly mutationLock: EncounterMutationLockPort;
      readonly source: CompetitionFixtureSourcePort;
      readonly transaction: TransactionPort;
    },
  ) {}

  async execute(
    input: EditFixtureEncounterInput,
  ): Promise<Result<FixturePlan, EditFixtureEncounterError>> {
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

    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runExclusive(input.encounterId, async () => {
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
        if (plan.status === "superseded") {
          return err(
            new FixtureEncounterNotEditable({
              code: "scheduling.fixture_encounter_not_editable",
              message: "A superseded fixture cannot be edited",
              encounterId: input.encounterId,
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
        const prior = await this.deps.audit.findByRequestId(
          input.organizationId,
          input.competitionId,
          input.requestId,
        );
        if (prior) {
          if (
            prior.fixturePlanId !== input.fixturePlanId ||
            prior.encounterId !== input.encounterId
          ) {
            return err(invalid("requestId was already used for a different fixture edit"));
          }
          return ok(plan);
        }
        if (!(await this.deps.editGuard.canEdit(input))) {
          return err(
            new FixtureEncounterNotEditable({
              code: "scheduling.fixture_encounter_not_editable",
              message: "An encounter with a pending selection or official result cannot be edited",
              encounterId: input.encounterId,
            }),
          );
        }

        if (input.homeTeamId && input.awayTeamId) {
          const pairingError = await validatePairingChange(
            this.deps.source,
            plan,
            before,
            input,
            input.homeTeamId,
            input.awayTeamId,
          );
          if (pairingError) return err(pairingError);
        }

        let after: FixtureEncounter = { ...before };
        if (input.scheduledStartAt) {
          after = { ...after, scheduledStartAt: input.scheduledStartAt };
        }
        if (input.homeTeamId && input.awayTeamId) {
          after = {
            ...after,
            home: { kind: "team", teamId: input.homeTeamId },
            away: { kind: "team", teamId: input.awayTeamId },
          };
        }
        if (encountersEqual(before, after)) return ok(plan);
        if (hasTeamCollision(plan, after)) {
          return err(invalid("A Team cannot have two encounters at the same scheduled time"));
        }
        if (hasDuplicateMatchup(plan, after)) {
          return err(invalid("This pairing already exists in the fixture"));
        }

        const updated = await this.deps.fixtures.updateEncounter({
          organizationId: input.organizationId,
          competitionId: input.competitionId,
          fixturePlanId: input.fixturePlanId,
          revision: plan.revision,
          encounter: after,
        });
        if (!updated) {
          return err(
            new FixtureUpdateConflict({
              code: "scheduling.fixture_update_conflict",
              message: "The fixture changed concurrently",
            }),
          );
        }
        await projectFixtureEncounter(this.deps, updated, after);
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
        return ok(updated);
      }),
    );
  }
}

async function validatePairingChange(
  sourcePort: CompetitionFixtureSourcePort,
  plan: FixturePlan,
  before: FixtureEncounter,
  input: EditFixtureEncounterInput,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
): Promise<InvalidFixtureConfiguration | null> {
  if (before.home.kind !== "team" || before.away.kind !== "team") {
    return invalid("Only team-vs-team encounters can change pairing");
  }

  const source = await sourcePort.load(input);
  const approved = new Set(source?.approvedParticipants ?? []);
  if (
    source?.organizationId !== input.organizationId ||
    source?.competitionId !== input.competitionId ||
    !approved.has(homeTeamId) ||
    !approved.has(awayTeamId)
  ) {
    return invalid("Both Teams must be approved participants in this competition");
  }
  if (before.groupId) {
    const groupTeams = teamsInGroup(plan, before.groupId);
    if (!groupTeams.has(homeTeamId) || !groupTeams.has(awayTeamId)) {
      return invalid("Both Teams must belong to this group");
    }
  }
  return null;
}

function invalid(message: string): InvalidFixtureConfiguration {
  return new InvalidFixtureConfiguration({
    code: "scheduling.invalid_fixture_configuration",
    message,
  });
}
