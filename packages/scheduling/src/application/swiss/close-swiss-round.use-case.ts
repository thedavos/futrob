import {
  err,
  ok,
  type AuthorizationPort,
  type ClockPort,
  type Result,
} from "@futrob/shared-kernel";
import type { FixturePlan } from "../../domain/entities/fixture-plan.ts";
import {
  FixturePlanNotFound,
  FixtureUpdateConflict,
  SwissRoundNotCurrent,
  type CloseSwissRoundError,
} from "../../domain/errors/fixture.errors.ts";
import type { EncounterOpenSelectionPort } from "../../domain/ports/encounter-open-selection.port.ts";
import type { EncounterParticipantsChangePort } from "../../domain/ports/encounter-participants-change.port.ts";
import type { EncounterScheduleRepository } from "../../domain/ports/encounter-schedule.repository.ts";
import type { FixturePlanRepository } from "../../domain/ports/fixture-plan.repository.ts";
import type { OfficialEncounterScoreReaderPort } from "../../domain/ports/official-encounter-score-reader.port.ts";
import type { SwissRoundActionLogPort } from "../../domain/ports/swiss-round-action-log.port.ts";
import {
  isSwissEncounterSettled,
  swissRoundProgress,
  swissRounds,
} from "../../domain/policies/swiss-standing-points.ts";
import type { ReconcileSwissRoundsUseCase } from "./reconcile-swiss-rounds.use-case.ts";
import { startSwissCommand, type SwissCommandInput } from "./swiss-command-support.ts";

export interface CloseSwissRoundInput extends SwissCommandInput {
  readonly roundNumber: number;
}

/**
 * Closes the unplayed encounters of the current round so the competition can go on: nobody scores
 * and the pairs count as met (ADR-0027, section 3). The caller holds the competition lock and the
 * round's encounter locks in a transaction, and rolls back on `err`.
 */
export class CloseSwissRoundUseCase {
  constructor(
    private readonly deps: {
      readonly actions: SwissRoundActionLogPort;
      readonly authorization: AuthorizationPort;
      readonly clock: ClockPort;
      readonly encounters: EncounterScheduleRepository;
      readonly fixtures: FixturePlanRepository;
      readonly openSelections: EncounterOpenSelectionPort;
      readonly participants: EncounterParticipantsChangePort;
      readonly reconcile: Pick<ReconcileSwissRoundsUseCase, "execute">;
      readonly scores: OfficialEncounterScoreReaderPort;
    },
  ) {}

  async execute(input: CloseSwissRoundInput): Promise<Result<FixturePlan, CloseSwissRoundError>> {
    const started = await startSwissCommand(
      this.deps,
      input,
      (prior) => prior.kind === "close_round" && prior.roundNumber === input.roundNumber,
    );
    if (started.isErr()) return err(started.error);
    if (started.value.kind === "replay") return ok(started.value.plan);
    const { plan, reason } = started.value;
    const scope = { organizationId: plan.organizationId, competitionId: plan.competitionId };

    const scores = await this.deps.scores.listApproved(scope);
    const hasResult = (id: Parameters<typeof scores.has>[0]) => scores.has(id);
    if (swissRoundProgress(plan, hasResult).currentRound !== input.roundNumber) {
      return err(
        new SwissRoundNotCurrent({
          code: "scheduling.swiss_round_not_current",
          message: "Only the round being played can be closed",
          roundNumber: input.roundNumber,
        }),
      );
    }
    const round = swissRounds(plan).find((candidate) => candidate.number === input.roundNumber);
    const unplayed = (round?.encounters ?? []).filter(
      (encounter) => !isSwissEncounterSettled(encounter, hasResult),
    );

    let revision = plan.revision;
    for (const encounter of unplayed) {
      await this.deps.openSelections.cancelOpen({
        ...scope,
        encounterId: encounter.id,
        actorId: input.actorId,
        reason,
      });
      const updated = await this.deps.fixtures.updateEncounter({
        ...scope,
        fixturePlanId: plan.id,
        revision,
        encounter: { ...encounter, series: null, closedWithoutResult: true },
      });
      if (!updated) {
        return err(
          new FixtureUpdateConflict({
            code: "scheduling.fixture_update_conflict",
            message: "The fixture changed concurrently",
          }),
        );
      }
      revision = updated.revision;
      await this.deps.encounters.deleteByEncounterIds([encounter.id]);
      await this.deps.participants.participantsChanged({ ...scope, encounterId: encounter.id });
    }
    await this.deps.actions.append({
      ...scope,
      kind: "close_round",
      fixturePlanId: plan.id,
      roundNumber: input.roundNumber,
      actorId: input.actorId,
      reason,
      requestId: input.requestId,
      occurredAt: this.deps.clock.now(),
    });

    const reconciled = await this.deps.reconcile.execute({
      ...scope,
      actorId: input.actorId,
      reason,
      correlationId: input.requestId,
      ...(input.heldEncounterIds ? { heldEncounterIds: input.heldEncounterIds } : {}),
    });
    if (reconciled.isErr()) return err(reconciled.error);
    const current = await this.deps.fixtures.findById(
      scope.organizationId,
      scope.competitionId,
      plan.id,
    );
    if (!current) {
      return err(
        new FixturePlanNotFound({
          code: "scheduling.fixture_plan_not_found",
          message: "Fixture plan not found",
          competitionId: plan.competitionId,
        }),
      );
    }
    return ok(current);
  }
}
