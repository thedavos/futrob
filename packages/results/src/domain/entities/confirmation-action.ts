import type {
  ActorId,
  CompetitionId,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { IntegrityFlag } from "../policies/integrity-flags.ts";
import type { SelectionStatus } from "../value-objects/selection-status.ts";

export type ConfirmationActionType =
  | "proposed"
  | "confirmed"
  | "approved"
  | "integrity_review_required"
  | "rejected"
  | "alternative_proposed"
  | "dispute_opened"
  | "review_started"
  | "dispute_resolved_approved"
  | "returned_to_selection"
  | "voided"
  | "reference_reuse_rejected"
  | "legacy_review_required";

/** Who acted: a Team representative, an operator with `results.approve`, or the system. */
export type ConfirmationCapacity = "team" | "operator" | "system";

export interface ConfirmationActionDetails {
  readonly integrityFlags?: readonly IntegrityFlag[];
  /** Flags an operator accepted explicitly when approving. */
  readonly acknowledgedFlags?: readonly IntegrityFlag[];
  readonly conflictingReference?: ExternalReference;
  readonly selectedProposalId?: string;
  /** Dispute this action opened, advanced or closed. */
  readonly disputeId?: string;
}

/**
 * Append-only audit entry. A command that changes several statuses writes one
 * entry per step (e.g. `confirmed` then `approved`) sharing the command key.
 */
export interface ConfirmationAction {
  readonly id: string;
  /** Null only for an attempt that never produced a selection. */
  readonly selectionId: string | null;
  readonly proposalId: string | null;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly type: ConfirmationActionType;
  readonly fromStatus: SelectionStatus | null;
  readonly toStatus: SelectionStatus | null;
  readonly versionBefore: number;
  readonly versionAfter: number;
  readonly actorId: ActorId;
  readonly teamId: TeamId | null;
  readonly capacity: ConfirmationCapacity;
  readonly reason: string | null;
  readonly commandKey: string | null;
  readonly requestFingerprint: string | null;
  readonly officialResultId: string | null;
  readonly details: ConfirmationActionDetails | null;
  readonly occurredAt: Date;
}
