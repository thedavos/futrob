import type {
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
} from "@futrob/results";
import type { EncounterMutationLockPort } from "@futrob/scheduling";
import type { EncounterId, Result, TransactionPort } from "@futrob/shared-kernel";
import type { ResultsModule } from "./results.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";

interface SelectionCommand<Input, Output, Failure> {
  execute(input: Input): Promise<Result<Output, Failure>>;
}

type Command<Input, Failure> = SelectionCommand<Input, OfficialSelectionCommandOutput, Failure>;

/** Every selection command composed with its transaction, Encounter lock and projection. */
export interface OfficialSelectionCommands {
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
 * its approval was projected when it first ran.
 * Commands that can approve acquire the competition lock before the Encounter lock,
 * so concurrent approvals and ranking rebuilds see the complete comparable set.
 */
export function createOfficialSelectionCommands(deps: {
  readonly results: ResultsModule;
  readonly statistics: StatisticsModule;
  readonly transaction: TransactionPort;
  readonly encounterLock: EncounterMutationLockPort;
  readonly encounterReader: EncounterReaderPort;
}): OfficialSelectionCommands {
  function composed<Input extends { readonly encounterId: EncounterId }, Failure>(
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
    propose: composed((input) => results.selectOfficialMatches.execute(input)),
    confirm: composed((input) => results.confirmOfficialSelection.execute(input), true),
    reject: composed((input) => results.rejectOfficialSelection.execute(input)),
    proposeAlternative: composed((input) =>
      results.proposeAlternativeOfficialSelection.execute(input),
    ),
    openDispute: composed((input) => results.openMatchDispute.execute(input)),
    reviewDispute: composed((input) => results.reviewMatchDispute.execute(input)),
    resolveDispute: composed((input) => results.resolveMatchDispute.execute(input), true),
    get: { execute: (input) => results.getOfficialSelection.execute(input) },
  };
}
