import {
  err,
  ok,
  type ActorId,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type EventPublisherPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { FixtureEncounter, FixturePlan } from "../../domain/entities/fixture-plan.ts";
import {
  AdvancementNotReversible,
  FixtureSourceNotFound,
  FixtureUpdateConflict,
  type ReconcileSwissRoundsError,
} from "../../domain/errors/fixture.errors.ts";
import type { EncounterMutationLockPort } from "../../domain/ports/encounter-mutation-lock.port.ts";
import type { EncounterOpenSelectionPort } from "../../domain/ports/encounter-open-selection.port.ts";
import type { EncounterParticipantsChangePort } from "../../domain/ports/encounter-participants-change.port.ts";
import type { EncounterScheduleRepository } from "../../domain/ports/encounter-schedule.repository.ts";
import type { FixtureEncounterEditGuardPort } from "../../domain/ports/fixture-editing.ports.ts";
import type {
  CompetitionFixtureSourcePort,
  FixturePlanRepository,
} from "../../domain/ports/fixture-plan.repository.ts";
import type { OfficialEncounterScoreReaderPort } from "../../domain/ports/official-encounter-score-reader.port.ts";
import type { OfficialMatchRepository } from "../../domain/ports/official-match.repository.ts";
import {
  reconcileSwissRounds,
  type SwissRoundChange,
} from "../../domain/policies/reconcile-swiss-rounds.ts";
import { encounterCreatedEvents } from "../encounter-created-events.ts";
import { projectFixtureEncounter } from "../project-fixture-encounters.ts";

export interface ReconcileSwissRoundsInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  /** Encounter locks the caller already holds; they are not taken again. */
  readonly heldEncounterIds?: readonly EncounterId[];
  /** Organizer behind the change. Approvals and voids have none: the owner records a system actor. */
  readonly actorId?: ActorId;
  readonly reason?: string;
  readonly correlationId?: string;
}

export interface ReconcileSwissRoundsOutput {
  readonly changedEncounterIds: readonly EncounterId[];
}

const DEFAULT_CANCEL_REASON = "The Encounter no longer applies after a Swiss team withdrawal";

export interface ReconcileSwissRoundsDependencies {
  readonly clock: ClockPort;
  readonly editGuard: FixtureEncounterEditGuardPort;
  readonly encounters: EncounterScheduleRepository;
  readonly eventPublisher: EventPublisherPort;
  readonly fixtures: FixturePlanRepository;
  readonly matches: OfficialMatchRepository;
  readonly mutationLock: EncounterMutationLockPort;
  readonly openSelections: EncounterOpenSelectionPort;
  readonly participants: EncounterParticipantsChangePort;
  readonly scores: OfficialEncounterScoreReaderPort;
  readonly source: CompetitionFixtureSourcePort;
}

/**
 * Applies changes until `reconcileSwissRounds` finds none (ADR-0027). The caller holds the
 * competition lock in a transaction and must roll back on `err`: earlier changes may be written.
 */
export class ReconcileSwissRoundsUseCase {
  constructor(private readonly deps: ReconcileSwissRoundsDependencies) {}

  async execute(
    input: ReconcileSwissRoundsInput,
  ): Promise<Result<ReconcileSwissRoundsOutput, ReconcileSwissRoundsError>> {
    const plans = await this.deps.fixtures.listActive(input.organizationId, input.competitionId);
    let plan = plans.find((candidate) => candidate.format === "swiss");
    if (!plan) return ok({ changedEncounterIds: [] });

    const source = await this.deps.source.load(input);
    if (!source) {
      return err(
        new FixtureSourceNotFound({
          code: "scheduling.fixture_source_not_found",
          message: "Competition rules for Swiss pairing were not found",
          competitionId: input.competitionId,
        }),
      );
    }
    const scores = await this.deps.scores.listApproved(input);
    const changedEncounterIds: EncounterId[] = [];

    for (;;) {
      const change = reconcileSwissRounds({
        plan,
        scores,
        standingPoints: source.standingPoints,
        officialMatchCount: source.officialMatchCounts.regular,
        resolutionMode: source.resolutionModes.regular,
        now: this.deps.clock.now(),
      });
      if (change.kind === "none") return ok({ changedEncounterIds });
      const applied = await this.apply(input, plan, change);
      if (applied.isErr()) return err(applied.error);
      plan = applied.value.plan;
      changedEncounterIds.push(...applied.value.changed);
    }
  }

  private async apply(
    input: ReconcileSwissRoundsInput,
    plan: FixturePlan,
    change: Exclude<SwissRoundChange, { kind: "none" }>,
  ): Promise<
    Result<
      { readonly plan: FixturePlan; readonly changed: readonly EncounterId[] },
      AdvancementNotReversible | FixtureUpdateConflict
    >
  > {
    const scope = {
      organizationId: plan.organizationId,
      competitionId: plan.competitionId,
      fixturePlanId: plan.id,
      revision: plan.revision,
    };
    switch (change.kind) {
      case "forfeit":
        return this.withLocks(input, [change.before], async () => {
          const { before, after, round } = change;
          if (before.series) {
            await this.deps.openSelections.cancelOpen({
              organizationId: plan.organizationId,
              competitionId: plan.competitionId,
              encounterId: before.id,
              reason: input.reason ?? DEFAULT_CANCEL_REASON,
              actorId: input.actorId,
            });
          }
          const updated = after
            ? await this.deps.fixtures.updateEncounter({ ...scope, encounter: after })
            : await this.deps.fixtures.replaceRoundEncounters({
                ...scope,
                roundId: round.id,
                encounters: round.encounters.filter((encounter) => encounter.id !== before.id),
              });
          if (!updated) return err(updateConflict());
          await this.dropPlayable(plan, [before]);
          return ok({ plan: updated, changed: [before.id] });
        });
      case "unpair": {
        const encounters = change.rounds.flatMap((round) => [...round.encounters]);
        return this.withLocks(input, encounters, async () => {
          for (const { id, series } of encounters) {
            if (
              series &&
              !(await this.deps.editGuard.canEdit({
                organizationId: plan.organizationId,
                competitionId: plan.competitionId,
                encounterId: id,
              }))
            ) {
              return err(
                new AdvancementNotReversible({
                  code: "scheduling.advancement_not_reversible",
                  message: "A later round already has a selection or official result",
                  encounterId: id,
                }),
              );
            }
          }
          let current = plan;
          for (const round of change.rounds) {
            const updated = await this.deps.fixtures.replaceRoundEncounters({
              ...scope,
              revision: current.revision,
              roundId: round.id,
              encounters: [],
            });
            if (!updated) return err(updateConflict());
            current = updated;
          }
          await this.dropPlayable(plan, encounters);
          return ok({ plan: current, changed: encounters.map(({ id }) => id) });
        });
      }
      case "pair": {
        const { encounters } = change.round;
        const updated = await this.deps.fixtures.replaceRoundEncounters({
          ...scope,
          roundId: change.round.id,
          encounters,
        });
        if (!updated) return err(updateConflict());
        for (const encounter of encounters) {
          await projectFixtureEncounter(this.deps, updated, encounter);
          if (encounter.series) {
            await this.deps.participants.participantsChanged({
              organizationId: plan.organizationId,
              competitionId: plan.competitionId,
              encounterId: encounter.id,
            });
          }
        }
        await this.deps.eventPublisher.publishMany(
          encounterCreatedEvents(plan, encounters, this.deps.clock.now(), input.correlationId),
        );
        return ok({ plan: updated, changed: encounters.map(({ id }) => id) });
      }
      case "truncate": {
        const updated = await this.deps.fixtures.removeRounds({
          ...scope,
          roundIds: change.roundIds,
        });
        return updated ? ok({ plan: updated, changed: [] }) : err(updateConflict());
      }
    }
  }

  /** Deleting the snapshot cascades to its official matches and schedule change requests. */
  private async dropPlayable(
    plan: FixturePlan,
    encounters: readonly FixtureEncounter[],
  ): Promise<void> {
    const playable = encounters.filter((encounter) => encounter.series);
    await this.deps.encounters.deleteByEncounterIds(playable.map(({ id }) => id));
    for (const { id } of playable) {
      await this.deps.participants.participantsChanged({
        organizationId: plan.organizationId,
        competitionId: plan.competitionId,
        encounterId: id,
      });
    }
  }

  private withLocks<T>(
    input: ReconcileSwissRoundsInput,
    encounters: readonly FixtureEncounter[],
    run: () => Promise<T>,
  ): Promise<T> {
    const held = new Set(input.heldEncounterIds ?? []);
    const pending = encounters
      .filter((encounter) => encounter.series && !held.has(encounter.id))
      .map(({ id }) => id)
      .sort();
    const lockFrom = (index: number): Promise<T> => {
      const encounterId = pending[index];
      return encounterId === undefined
        ? run()
        : this.deps.mutationLock.runExclusive(encounterId, () => lockFrom(index + 1));
    };
    return lockFrom(0);
  }
}

function updateConflict(): FixtureUpdateConflict {
  return new FixtureUpdateConflict({
    code: "scheduling.fixture_update_conflict",
    message: "The fixture changed concurrently",
  });
}
