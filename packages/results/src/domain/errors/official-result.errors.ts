import { TaggedError } from "@futrob/shared-kernel";
import type { EncounterId } from "@futrob/shared-kernel";
import type {
  ConfirmationWindowClosed,
  CommandKeyReused,
  ReferenceAlreadyClaimed,
  SelectionAlreadyApproved,
  SelectionProposalStale,
  SelectionVersionConflict,
  SelfConfirmationForbidden,
} from "./official-selection.errors.ts";
import type {
  CandidateNotAssociated,
  OfficialSelectionForbidden,
} from "./select-official-matches.errors.ts";

export class SelectionNotFound extends TaggedError("SelectionNotFound")<{
  code: "results.selection_not_found";
  message: string;
  encounterId: EncounterId;
}> {}

export class SelectionNotConfirmable extends TaggedError("SelectionNotConfirmable")<{
  code: "results.selection_not_confirmable";
  message: string;
}> {}

export class OfficialResultForbidden extends TaggedError("OfficialResultForbidden")<{
  code: "results.official_result_forbidden";
  message: string;
}> {}

export class OfficialResultNotFound extends TaggedError("OfficialResultNotFound")<{
  code: "results.official_result_not_found";
  message: string;
}> {}

export class ProviderMatchSnapshotMissing extends TaggedError("ProviderMatchSnapshotMissing")<{
  code: "results.provider_match_snapshot_missing";
  message: string;
  externalId: string;
}> {}

export type ConfirmOfficialSelectionError =
  | ConfirmationWindowClosed
  | SelectionNotFound
  | SelectionNotConfirmable
  | OfficialResultForbidden
  | OfficialSelectionForbidden
  | ProviderMatchSnapshotMissing
  | CandidateNotAssociated
  | SelectionVersionConflict
  | SelectionProposalStale
  | SelectionAlreadyApproved
  | SelfConfirmationForbidden
  | ReferenceAlreadyClaimed
  | CommandKeyReused;

export type ApproveOfficialResultError = ConfirmOfficialSelectionError;

export type VoidOfficialResultError = OfficialResultForbidden | OfficialResultNotFound;
