import { TaggedError, type EncounterId } from "@futrob/shared-kernel";
import type { IntegrityFlag } from "../policies/integrity-flags.ts";
import type { SelectionCommand } from "../policies/selection-transitions.ts";
import type { SelectionStatus } from "../value-objects/selection-status.ts";
import type {
  CandidateNotAssociated,
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
  OfficialSelectionForbidden,
} from "./select-official-matches.errors.ts";
import type {
  OfficialResultForbidden,
  ProviderMatchSnapshotMissing,
  SelectionNotConfirmable,
  SelectionNotFound,
} from "./official-result.errors.ts";

export class SelectionVersionConflict extends TaggedError("SelectionVersionConflict")<{
  code: "results.selection_version_conflict";
  message: string;
  expectedVersion: number;
  currentVersion: number;
}> {}

export class SelectionProposalStale extends TaggedError("SelectionProposalStale")<{
  code: "results.selection_proposal_stale";
  message: string;
  proposalId: string;
}> {}

export class SelectionStateConflict extends TaggedError("SelectionStateConflict")<{
  code: "results.selection_state_conflict";
  message: string;
  command: SelectionCommand;
  status: SelectionStatus | null;
}> {}

export class SelectionAlreadyApproved extends TaggedError("SelectionAlreadyApproved")<{
  code: "results.selection_already_approved";
  message: string;
  encounterId: EncounterId;
}> {}

export class SelfConfirmationForbidden extends TaggedError("SelfConfirmationForbidden")<{
  code: "results.self_confirmation_forbidden";
  message: string;
}> {}

export class ReasonRequired extends TaggedError("ReasonRequired")<{
  code: "results.reason_required";
  message: string;
}> {}

export class ReferenceAlreadyClaimed extends TaggedError("ReferenceAlreadyClaimed")<{
  code: "results.reference_already_claimed";
  message: string;
  providerKey: string;
  externalId: string;
}> {}

export class CommandKeyReused extends TaggedError("CommandKeyReused")<{
  code: "results.command_key_reused";
  message: string;
}> {}

export class ProposalNotFound extends TaggedError("ProposalNotFound")<{
  code: "results.proposal_not_found";
  message: string;
  proposalId: string;
}> {}

export class IntegrityFlagsNotAcknowledged extends TaggedError("IntegrityFlagsNotAcknowledged")<{
  code: "results.integrity_flags_not_acknowledged";
  message: string;
  flags: readonly IntegrityFlag[];
}> {}

type SelectionAuthorityError = EncounterNotFound | OfficialSelectionForbidden;
type SelectionInputError = InvalidSelection | DuplicateProviderMatch | CandidateNotAssociated;
type SelectionConcurrencyError =
  | SelectionVersionConflict
  | SelectionProposalStale
  | SelectionStateConflict
  | SelectionAlreadyApproved
  | CommandKeyReused;

export type ProposeOfficialSelectionError =
  | SelectionAuthorityError
  | SelectionInputError
  | SelectionConcurrencyError
  | ReferenceAlreadyClaimed;

export type RejectOfficialSelectionError =
  | SelectionAuthorityError
  | SelectionNotFound
  | SelectionConcurrencyError
  | SelfConfirmationForbidden
  | ReasonRequired;

export type ProposeAlternativeOfficialSelectionError =
  | RejectOfficialSelectionError
  | SelectionInputError
  | ReferenceAlreadyClaimed
  | ProviderMatchSnapshotMissing
  | SelectionNotConfirmable;

export type OpenMatchDisputeError =
  | SelectionAuthorityError
  | SelectionNotFound
  | SelectionConcurrencyError
  | ReasonRequired;

export type ReviewMatchDisputeError =
  | EncounterNotFound
  | OfficialResultForbidden
  | SelectionNotFound
  | SelectionConcurrencyError;

export type ResolveMatchDisputeError =
  | ReviewMatchDisputeError
  | ReasonRequired
  | ProposalNotFound
  | IntegrityFlagsNotAcknowledged
  | CandidateNotAssociated
  | ProviderMatchSnapshotMissing
  | ReferenceAlreadyClaimed;

export type GetOfficialSelectionError =
  | EncounterNotFound
  | OfficialSelectionForbidden
  | SelectionNotFound;
