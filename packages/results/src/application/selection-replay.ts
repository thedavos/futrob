import { err, ok, type ActorId, type EncounterId, type Result } from "@futrob/shared-kernel";
import type {
  ConfirmationAction,
  ConfirmationActionType,
} from "../domain/entities/confirmation-action.ts";
import type { MatchDispute } from "../domain/entities/match-dispute.ts";
import {
  CommandKeyReused,
  type SelectionVersionConflict,
} from "../domain/errors/official-selection.errors.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../domain/ports/official-result.repository.ts";
import type { OfficialSelectionCommandOutput } from "./official-selection-output.ts";
import { versionConflict } from "./selection-command-support.ts";

export type ReplayLookup =
  | { readonly kind: "none" }
  | { readonly kind: "replay"; readonly actions: readonly ConfirmationAction[] }
  | { readonly kind: "reused"; readonly error: CommandKeyReused };

/**
 * Looks the command up by `(encounter, actor, commandKey)`. Callers authorize
 * first: a historical key never restores a permission that was revoked.
 */
export async function lookupReplay(
  selections: OfficialMatchSelectionRepository,
  input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
    readonly fingerprint: string;
  },
): Promise<ReplayLookup> {
  const actions = await selections.findActionsByCommandKey(input);
  if (actions.length === 0) return { kind: "none" };
  if (actions.some((action) => action.requestFingerprint !== input.fingerprint)) {
    return {
      kind: "reused",
      error: new CommandKeyReused({
        code: "results.command_key_reused",
        message: "The command key was already used for a different request",
      }),
    };
  }
  return { kind: "replay", actions };
}

/**
 * Rebuilds what the command returned when it first ran, not the current state: the
 * selection as that command left it (status, version, round, proposal), the dispute as
 * it stood at that step and the result as it was approved. A later transition never
 * leaks into a replay.
 */
export async function replayOutput(
  deps: {
    readonly selections: OfficialMatchSelectionRepository;
    readonly results: Pick<OfficialResultRepository, "findById">;
  },
  encounterId: EncounterId,
  actions: readonly ConfirmationAction[],
): Promise<OfficialSelectionCommandOutput | null> {
  const last = actions.at(-1);
  const current = await deps.selections.findLatestByEncounter(encounterId);
  if (!current || !last) return null;
  const [proposals, disputes] = await Promise.all([
    deps.selections.listProposals(current.id),
    deps.selections.listDisputes(current.id),
  ]);
  const returned = last.type === "returned_to_selection";
  const proposalId = actions.find((action) => action.proposalId)?.proposalId ?? null;
  const proposal = proposals.find((row) => row.id === proposalId) ?? null;
  const resultId = actions.find((action) => action.officialResultId)?.officialResultId ?? null;
  const result = resultId ? await deps.results.findById(resultId) : null;
  const disputeId = actions.find((action) => action.details?.disputeId)?.details?.disputeId;
  return {
    selection: {
      ...current,
      status: last.toStatus ?? current.status,
      version: last.versionAfter,
      round: returned ? (proposal?.round ?? current.round) + 1 : (proposal?.round ?? current.round),
      currentProposalId: returned ? null : (proposal?.id ?? null),
      updatedAt: last.occurredAt,
    },
    proposal: returned ? null : proposal,
    actions,
    dispute: disputeAsOf(last, disputes.find((row) => row.id === disputeId) ?? null),
    // The result was approved by this command even if a later void closed it.
    approvedResult: result ? { ...result, status: "approved" } : null,
    integrityFlags: actions.flatMap((action) => action.details?.integrityFlags ?? []),
    replayed: true,
  };
}

/** Actions that put a dispute in the `open` state. */
const OPENING_ACTIONS: ReadonlySet<ConfirmationActionType> = new Set([
  "rejected",
  "alternative_proposed",
  "dispute_opened",
]);

function disputeAsOf(last: ConfirmationAction, dispute: MatchDispute | null): MatchDispute | null {
  if (!dispute) return null;
  const unresolved = {
    resolvedByActorId: null,
    resolvedAt: null,
    resolution: null,
    resolutionProposalId: null,
    resolutionReason: null,
  };
  if (OPENING_ACTIONS.has(last.type)) {
    return {
      ...dispute,
      ...unresolved,
      status: "open",
      reviewStartedByActorId: null,
      reviewStartedAt: null,
    };
  }
  if (last.type === "review_started") return { ...dispute, ...unresolved, status: "under_review" };
  return dispute;
}

/**
 * A commit lost the version race. If the same command already landed (concurrent
 * replay) return its outcome; otherwise report the conflict.
 */
export async function conflictOrReplay(
  deps: {
    readonly selections: OfficialMatchSelectionRepository;
    readonly results: Pick<OfficialResultRepository, "findById">;
  },
  input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
    readonly fingerprint: string;
    readonly expectedVersion: number;
    readonly currentVersion: number;
  },
): Promise<Result<OfficialSelectionCommandOutput, SelectionVersionConflict | CommandKeyReused>> {
  const replay = await lookupReplay(deps.selections, input);
  if (replay.kind === "reused") return err(replay.error);
  if (replay.kind === "replay") {
    const output = await replayOutput(deps, input.encounterId, replay.actions);
    if (output) return ok(output);
  }
  return err(versionConflict(input.expectedVersion, input.currentVersion));
}
