import type {
  ExpireConfirmationWindowInput,
  ExpireConfirmationWindowOutput,
  SelectionVersionConflict,
  ConfirmOfficialSelectionError,
  ConfirmOfficialSelectionInput,
  EncounterReaderPort,
  GetOfficialSelectionError,
  GetOfficialSelectionInput,
  OfficialSelectionCommandOutput,
  OfficialSelectionView,
  OpenMatchDisputeError,
  OpenMatchDisputeInput,
  ProposeAlternativeOfficialSelectionError,
  ProposeAlternativeOfficialSelectionInput,
  ProposeOfficialSelectionError,
  RejectOfficialSelectionError,
  RejectOfficialSelectionInput,
  ResolveMatchDisputeError,
  ResolveMatchDisputeInput,
  ReviewMatchDisputeError,
  ReviewMatchDisputeInput,
  SelectOfficialMatchesInput,
  VoidOfficialResultInput,
} from "@futrob/results";
import type { EncounterMutationLockPort } from "@futrob/scheduling";
import type {
  ActorId,
  ClockPort,
  EncounterId,
  Result,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { SelectionActivityProjector } from "@/application/notifications/selection-activity.ts";
import type { ResultsModule } from "./results.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";

interface SelectionCommand<Input, Output, Failure> {
  execute(input: Input): Promise<Result<Output, Failure>>;
}

type Command<Input, Failure> = SelectionCommand<Input, OfficialSelectionCommandOutput, Failure>;

/** Every selection command composed with its transaction, Encounter lock and projections. */
export interface OfficialSelectionCommands {
  readonly expire: SelectionCommand<
    ExpireConfirmationWindowInput,
    ExpireConfirmationWindowOutput,
    SelectionVersionConflict
  >;
  readonly propose: Command<SelectOfficialMatchesInput, ProposeOfficialSelectionError>;
  readonly confirm: Command<ConfirmOfficialSelectionInput, ConfirmOfficialSelectionError>;
  readonly reject: Command<RejectOfficialSelectionInput, RejectOfficialSelectionError>;
  readonly proposeAlternative: Command<
    ProposeAlternativeOfficialSelectionInput,
    ProposeAlternativeOfficialSelectionError
  >;
  readonly openDispute: Command<OpenMatchDisputeInput, OpenMatchDisputeError>;
  readonly reviewDispute: Command<ReviewMatchDisputeInput, ReviewMatchDisputeError>;
  readonly resolveDispute: Command<ResolveMatchDisputeInput, ResolveMatchDisputeError>;
  readonly get: SelectionCommand<
    GetOfficialSelectionInput,
    OfficialSelectionView,
    GetOfficialSelectionError
  >;
}

/**
 * Runs each command in the ADR-0016 shape: transaction, Encounter lock, command, then
 * the statistics projection only when the command really approved a result. A projection
 * failure throws so every write of the command rolls back. A replay never projects again:
 * its approval was projected when it first ran. The activity feed is projected last, in
 * the same transaction; it is idempotent, so replays reconcile it instead of skipping.
 * Commands that can approve acquire the competition lock before the Encounter lock,
 * so concurrent approvals and ranking rebuilds see the complete comparable set.
 */
export function createOfficialSelectionCommands(deps: {
  readonly results: ResultsModule;
  readonly statistics: StatisticsModule;
  readonly transaction: TransactionPort;
  readonly encounterLock: EncounterMutationLockPort;
  readonly encounterReader: EncounterReaderPort;
  readonly activity: SelectionActivityProjector;
  readonly clock: ClockPort;
}): OfficialSelectionCommands {
  function composed<
    Input extends { readonly encounterId: EncounterId; readonly actorId: ActorId },
    Failure,
  >(
    execute: (input: Input) => Promise<Result<OfficialSelectionCommandOutput, Failure>>,
    canApprove = false,
  ): Command<Input, Failure> {
    return {
      execute: (input) =>
        deps.transaction.runInTransaction(async () => {
          const run = () =>
            deps.encounterLock.runExclusive(input.encounterId, async () => {
              const outcome = await execute(input);
              if (!outcome.isOk()) return outcome;
              const approved = outcome.value.approvedResult;
              if (approved && !outcome.value.replayed) {
                const projected = await deps.statistics.useCases.projectOfficialResult.execute({
                  officialResultId: approved.id,
                });
                if (!projected.isOk()) throw projected.error;
              }
              await deps.activity.project(outcome.value, input.actorId);
              return outcome;
            });
          if (!canApprove) return run();
          const encounter = await deps.encounterReader.getById(input.encounterId);
          return encounter
            ? deps.statistics.ports.teamPerformanceLock.runExclusive(encounter.competitionId, run)
            : run();
        }),
    };
  }

  const { results } = deps;
  return {
    expire: {
      execute: (input) =>
        deps.transaction.runInTransaction(() =>
          deps.encounterLock.runExclusive(input.encounterId, async () => {
            const outcome = await results.expireConfirmationWindow.execute(input);
            if (outcome.isOk() && outcome.value.status === "expired") {
              await deps.activity.expired(input, deps.clock.now());
            }
            return outcome;
          }),
        ),
    },
    propose: composed((input) => results.selectOfficialMatches.execute(input)),
    confirm: composed((input) => results.confirmOfficialSelection.execute(input), true),
    reject: composed((input) => results.rejectOfficialSelection.execute(input)),
    proposeAlternative: composed(
      (input) => results.proposeAlternativeOfficialSelection.execute(input),
      true,
    ),
    openDispute: composed((input) => results.openMatchDispute.execute(input)),
    reviewDispute: composed((input) => results.reviewMatchDispute.execute(input)),
    resolveDispute: composed((input) => results.resolveMatchDispute.execute(input), true),
    get: { execute: (input) => results.getOfficialSelection.execute(input) },
  };
}

export interface VoidOfficialResultAndUnproject {
  execute(
    input: VoidOfficialResultInput,
  ): ReturnType<ResultsModule["voidOfficialResult"]["execute"]>;
}

/** Voids an official result and removes it from statistics in one transaction. */
export function createVoidOfficialResultAndUnproject(deps: {
  readonly results: ResultsModule;
  readonly statistics: StatisticsModule;
  readonly transaction: TransactionPort;
  readonly encounterLock: EncounterMutationLockPort;
}): VoidOfficialResultAndUnproject {
  const { results, statistics } = deps;
  return {
    async execute(input) {
      const existing =
        "encounterId" in input
          ? await results.results.findLatestByEncounter(input.encounterId)
          : await results.results.findById(input.officialResultId);
      if (!existing) return results.voidOfficialResult.execute(input);

      return deps.transaction.runInTransaction(() =>
        statistics.ports.teamPerformanceLock.runExclusive(existing.competitionId, async () => {
          return deps.encounterLock.runExclusive(existing.encounterId, async () => {
            const voided = await results.voidOfficialResult.execute(input);
            if (!voided.isOk()) return voided;
            const projected = await statistics.useCases.projectOfficialResult.execute({
              officialResultId: voided.value.id,
            });
            if (!projected.isOk()) throw projected.error;
            return voided;
          });
        }),
      );
    },
  };
}
