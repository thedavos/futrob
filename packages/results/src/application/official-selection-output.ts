import type { ConfirmationAction } from "../domain/entities/confirmation-action.ts";
import type { MatchDispute } from "../domain/entities/match-dispute.ts";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../domain/entities/official-match-selection.ts";
import type { OfficialResult } from "../domain/entities/official-result.ts";
import type { IntegrityFlag } from "../domain/policies/integrity-flags.ts";
import type { SelectionCommand } from "../domain/policies/selection-transitions.ts";

/** What a selection command returns; a replay returns the same shape with `replayed: true`. */
export interface OfficialSelectionCommandOutput {
  readonly selection: OfficialMatchSelection;
  /** Proposal created or acted on by the command, when there is one. */
  readonly proposal: OfficialSelectionProposal | null;
  /** Audit entries the command wrote, in order. */
  readonly actions: readonly ConfirmationAction[];
  readonly dispute: MatchDispute | null;
  /** Set only when the command approved a result. Statistics may be projected from it. */
  readonly approvedResult: OfficialResult | null;
  readonly integrityFlags: readonly IntegrityFlag[];
  readonly replayed: boolean;
}

/** Commands the requesting actor can issue right now (version checks still apply). */
export type OfficialSelectionAllowedAction = SelectionCommand;

/**
 * Authorized operational view of one Encounter's selection. It carries proposal
 * references, audit entries and the dispute, never the provider's raw payload.
 */
export interface OfficialSelectionView {
  readonly encounterId: OfficialMatchSelection["encounterId"];
  /** Null before the first proposal. */
  readonly selection: OfficialMatchSelection | null;
  readonly proposals: readonly OfficialSelectionProposal[];
  readonly actions: readonly ConfirmationAction[];
  readonly disputes: readonly MatchDispute[];
  readonly activeDispute: MatchDispute | null;
  readonly approvedResultId: string | null;
  readonly integrityFlags: readonly IntegrityFlag[];
  readonly allowedActions: readonly OfficialSelectionAllowedAction[];
}
