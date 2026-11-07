import {
  err,
  ok,
  type AuthorizationPort,
  type ClockPort,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { FixturePlan } from "../../domain/entities/fixture-plan.ts";
import {
  FixturePlanNotFound,
  FixtureUpdateConflict,
  SwissTeamAlreadyWithdrawn,
  SwissTeamNotParticipant,
  type WithdrawSwissTeamError,
} from "../../domain/errors/fixture.errors.ts";
import type { FixturePlanRepository } from "../../domain/ports/fixture-plan.repository.ts";
import type { SwissRoundActionLogPort } from "../../domain/ports/swiss-round-action-log.port.ts";
import type { ReconcileSwissRoundsUseCase } from "./reconcile-swiss-rounds.use-case.ts";
import { startSwissCommand, type SwissCommandInput } from "./swiss-command-support.ts";

export interface WithdrawSwissTeamInput extends SwissCommandInput {
  readonly teamId: TeamId;
}

/**
 * Takes a Team out of later pairings (ADR-0027, section 3). The caller holds the competition lock
 * and the Team's encounter locks in a transaction, and rolls back on `err`.
 */
export class WithdrawSwissTeamUseCase {
  constructor(
    private readonly deps: {
      readonly actions: SwissRoundActionLogPort;
      readonly authorization: AuthorizationPort;
      readonly clock: ClockPort;
      readonly fixtures: FixturePlanRepository;
      readonly reconcile: Pick<ReconcileSwissRoundsUseCase, "execute">;
    },
  ) {}

  async execute(
    input: WithdrawSwissTeamInput,
  ): Promise<Result<FixturePlan, WithdrawSwissTeamError>> {
    const started = await startSwissCommand(
      this.deps,
      input,
      (prior) => prior.kind === "withdraw" && prior.teamId === input.teamId,
    );
    if (started.isErr()) return err(started.error);
    if (started.value.kind === "replay") return ok(started.value.plan);
    const { plan, reason } = started.value;

    if (!plan.seed.includes(input.teamId)) {
      return err(
        new SwissTeamNotParticipant({
          code: "scheduling.swiss_team_not_participant",
          message: "The Team does not play this fixture",
          teamId: input.teamId,
        }),
      );
    }
    const withdrawn = plan.withdrawnTeamIds ?? [];
    if (withdrawn.includes(input.teamId)) {
      return err(
        new SwissTeamAlreadyWithdrawn({
          code: "scheduling.swiss_team_already_withdrawn",
          message: "The Team has already withdrawn",
          teamId: input.teamId,
        }),
      );
    }

    const scope = { organizationId: plan.organizationId, competitionId: plan.competitionId };
    const updated = await this.deps.fixtures.setWithdrawnTeams({
      ...scope,
      fixturePlanId: plan.id,
      revision: plan.revision,
      teamIds: [...withdrawn, input.teamId],
    });
    if (!updated) {
      return err(
        new FixtureUpdateConflict({
          code: "scheduling.fixture_update_conflict",
          message: "The fixture changed concurrently",
        }),
      );
    }
    await this.deps.actions.append({
      ...scope,
      kind: "withdraw",
      fixturePlanId: plan.id,
      teamId: input.teamId,
      actorId: input.actorId,
      reason,
      requestId: input.requestId,
      occurredAt: this.deps.clock.now(),
    });

    const reconciled = await this.deps.reconcile.execute({
      ...scope,
      withdrawal: { teamId: input.teamId, actorId: input.actorId, reason },
      correlationId: input.requestId,
      heldEncounterIds: input.heldEncounterIds,
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
