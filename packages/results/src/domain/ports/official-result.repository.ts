import type { ActorId, CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { ConfirmationAction } from "../entities/confirmation-action.ts";
import type { MatchDispute } from "../entities/match-dispute.ts";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../entities/official-match-selection.ts";
import type { OfficialResult } from "../entities/official-result.ts";

/**
 * Reference ownership changes applied with a transition. A reference is owned by
 * at most one selection at a time, across every Encounter and organization.
 * Released claims stay on record with their release time.
 */
export interface SelectionReferenceClaims {
  /** References the selection must hold after the transition (already held ones are kept). */
  readonly acquire: readonly ExternalReference[];
  readonly release: "none" | "all" | { readonly keep: readonly ExternalReference[] };
}

/**
 * Everything one command changes, committed atomically: the selection at its
 * expected version, new proposals, audit actions, the dispute and reference claims.
 */
export interface SelectionTransition {
  /** Version the caller read; `0` creates the selection. */
  readonly expectedVersion: number;
  readonly selection: OfficialMatchSelection;
  readonly newProposals: readonly OfficialSelectionProposal[];
  readonly actions: readonly ConfirmationAction[];
  readonly dispute:
    | { readonly kind: "open"; readonly dispute: MatchDispute }
    | { readonly kind: "update"; readonly dispute: MatchDispute }
    | null;
  readonly references: SelectionReferenceClaims;
}

export type CommitSelectionTransitionResult =
  | { readonly status: "committed" }
  | { readonly status: "version_conflict"; readonly currentVersion: number }
  | { readonly status: "reference_claimed"; readonly providerMatchRef: ExternalReference };

export interface OfficialMatchSelectionRepository {
  /** The live selection of the Encounter, or null when none was ever proposed. */
  findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null>;
  listProposals(selectionId: string): Promise<readonly OfficialSelectionProposal[]>;
  /** Oldest first. Includes audit-only attempts that never produced a selection. */
  listActions(encounterId: EncounterId): Promise<readonly ConfirmationAction[]>;
  findActionsByCommandKey(input: {
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly commandKey: string;
  }): Promise<readonly ConfirmationAction[]>;
  /** Oldest first. At most the last one is not resolved. */
  listDisputes(selectionId: string): Promise<readonly MatchDispute[]>;
  /**
   * Compare-and-swap on `expectedVersion`. Must be all-or-nothing, including when
   * called inside an outer transaction: a conflict leaves no trace of this call.
   */
  commitTransition(transition: SelectionTransition): Promise<CommitSelectionTransitionResult>;
  /** Appends an audit entry that changes no state (e.g. a rejected reference reuse). */
  recordAudit(action: ConfirmationAction): Promise<void>;
}

export interface OfficialResultRepository {
  /**
   * Inserts a new revision. Never overwrites: a second row for the same
   * `(encounterId, revision)` must fail instead of replacing the first.
   */
  append(result: OfficialResult): Promise<OfficialResult>;
  /** Only `approved → voided`; slots and approval metadata are never rewritten. */
  markVoided(officialResultId: string): Promise<OfficialResult | null>;
  findApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  findLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null>;
  findById(officialResultId: string): Promise<OfficialResult | null>;
  listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]>;
  listByEncounter(encounterId: EncounterId): Promise<OfficialResult[]>;
}
