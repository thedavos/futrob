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
import type {
  FixtureEncounter,
  FixtureParticipantSlot,
  FixturePlan,
} from "../domain/entities/fixture-plan.ts";
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
        return ok(prior.after);
      }

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

function findEncounter(plan: FixturePlan, encounterId: EncounterId): FixtureEncounter | null {
  for (const encounter of planEncounters(plan)) {
    if (encounter.id === encounterId) return encounter;
  }
  return null;
}

function replaceEncounter(plan: FixturePlan, replacement: FixtureEncounter): FixturePlan {
  return {
    ...plan,
    revision: plan.revision + 1,
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
  const teams = teamIdsFromSlots(candidate.home, candidate.away);
  if (teams.size === 0) return false;
  const at = candidate.scheduledStartAt.getTime();
  for (const encounter of planEncounters(plan)) {
    if (encounter.id === candidate.id) continue;
    if (encounter.scheduledStartAt.getTime() !== at) continue;
    for (const teamId of teamIdsFromSlots(encounter.home, encounter.away)) {
      if (teams.has(teamId)) return true;
    }
  }
  return false;
}

function teamsInGroup(plan: FixturePlan, groupId: string): Set<TeamId> {
  const teams = new Set<TeamId>();
  for (const encounter of planEncounters(plan)) {
    if (encounter.groupId !== groupId) continue;
    for (const teamId of teamIdsFromSlots(encounter.home, encounter.away)) {
      teams.add(teamId);
    }
  }
  return teams;
}

function* planEncounters(plan: FixturePlan): Generator<FixtureEncounter> {
  for (const stage of plan.stages) {
    for (const round of stage.rounds) {
      yield* round.encounters;
    }
  }
}

function teamIdsFromSlots(...slots: FixtureParticipantSlot[]): Set<TeamId> {
  const teams = new Set<TeamId>();
  for (const slot of slots) {
    if (slot.kind === "team") teams.add(slot.teamId);
  }
  return teams;
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
