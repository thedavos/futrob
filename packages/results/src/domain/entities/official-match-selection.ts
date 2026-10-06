import type { ActorId, CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { SelectionStatus } from "../value-objects/selection-status.ts";

export interface OfficialSlotSelection {
  readonly officialSlot: 1 | 2;
  readonly providerMatchRef: ExternalReference;
}

/**
 * Negotiation aggregate for one Encounter. Proposals, actions and disputes hang
 * off it; `version` is the compare-and-swap token every command must present.
 * `round` separates negotiation cycles: it advances when an operator returns
 * the case to selection or when a voided selection is proposed again.
 */
export interface OfficialMatchSelection {
  readonly id: string;
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly status: SelectionStatus;
  readonly version: number;
  readonly round: number;
  /** Proposal the status refers to; null while the case is back in selection. */
  readonly currentProposalId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Immutable version of a selection put forward by a Team. */
export interface OfficialSelectionProposal {
  readonly id: string;
  readonly selectionId: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly round: number;
  readonly sequence: number;
  /** Null only for rows migrated from before Team attribution existed. */
  readonly proposingTeamId: string | null;
  readonly proposedByActorId: ActorId;
  /** Sorted by `officialSlot`. */
  readonly slots: readonly OfficialSlotSelection[];
  readonly confirmationDeadline: Date;
  readonly supersedesProposalId: string | null;
  readonly reason: string | null;
  readonly createdAt: Date;
}
