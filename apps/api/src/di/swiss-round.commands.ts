import {
  swissRoundEncounterIds,
  swissTeamEncounterIds,
  type CloseSwissRoundError,
  type CloseSwissRoundInput,
  type EncounterMutationLockPort,
  type FixturePlan,
  type WithdrawSwissTeamError,
  type WithdrawSwissTeamInput,
} from "@futrob/scheduling";
import {
  err,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";

export interface SwissRoundCommands {
  readonly withdraw: {
    execute(input: WithdrawSwissTeamInput): Promise<Result<FixturePlan, WithdrawSwissTeamError>>;
  };
  readonly closeRound: {
    execute(input: CloseSwissRoundInput): Promise<Result<FixturePlan, CloseSwissRoundError>>;
  };
}

/** Carries an expected failure out of the transaction, which commits when its callback returns. */
class RollbackWithFailure<Failure> extends Error {
  constructor(readonly failure: Failure) {
    super("Swiss command rolled back");
  }
}

/**
 * Both commands in the ADR-0027 shape: transaction, competition lock, then the lock of each
 * Encounter they may change in id order. Any failure rolls back, since a command can fail in its
 * reconciliation after having written.
 */
export function createSwissRoundCommands(deps: {
  readonly scheduling: Pick<
    SchedulingModule,
    "fixturePlans" | "withdrawSwissTeam" | "closeSwissRound"
  >;
  readonly statistics: Pick<StatisticsModule, "ports">;
  readonly transaction: TransactionPort;
  readonly encounterLock: EncounterMutationLockPort;
}): SwissRoundCommands {
  async function composed<
    Input extends {
      readonly organizationId: OrganizationId;
      readonly competitionId: CompetitionId;
      readonly fixturePlanId: string;
    },
    Failure,
  >(
    input: Input,
    affected: (plan: FixturePlan) => readonly EncounterId[],
    execute: (
      input: Input & { readonly heldEncounterIds: readonly EncounterId[] },
    ) => Promise<Result<FixturePlan, Failure>>,
  ): Promise<Result<FixturePlan, Failure>> {
    try {
      return await deps.transaction.runInTransaction(() =>
        deps.statistics.ports.teamPerformanceLock.runExclusive(input.competitionId, async () => {
          const plan = await deps.scheduling.fixturePlans.findById(
            input.organizationId,
            input.competitionId,
            input.fixturePlanId,
          );
          const heldEncounterIds = plan?.format === "swiss" ? [...affected(plan)].sort() : [];
          const lockFrom = (index: number): Promise<Result<FixturePlan, Failure>> => {
            const encounterId = heldEncounterIds[index];
            return encounterId === undefined
              ? execute({ ...input, heldEncounterIds })
              : deps.encounterLock.runExclusive(encounterId, () => lockFrom(index + 1));
          };
          const outcome = await lockFrom(0);
          if (outcome.isErr()) throw new RollbackWithFailure(outcome.error);
          return outcome;
        }),
      );
    } catch (error) {
      if (error instanceof RollbackWithFailure) return err(error.failure as Failure);
      throw error;
    }
  }

  return {
    withdraw: {
      execute: (input) =>
        composed(
          input,
          (plan) => swissTeamEncounterIds(plan, input.teamId),
          (held) => deps.scheduling.withdrawSwissTeam.execute(held),
        ),
    },
    closeRound: {
      execute: (input) =>
        composed(
          input,
          (plan) => swissRoundEncounterIds(plan, input.roundNumber),
          (held) => deps.scheduling.closeSwissRound.execute(held),
        ),
    },
  };
}
