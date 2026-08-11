import { TaggedError } from "@futrob/shared-kernel";
import type { EncounterId } from "@futrob/shared-kernel";

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

export class ProviderMatchSnapshotMissing extends TaggedError("ProviderMatchSnapshotMissing")<{
  code: "results.provider_match_snapshot_missing";
  message: string;
  externalId: string;
}> {}

export type ConfirmOfficialSelectionError =
  | SelectionNotFound
  | SelectionNotConfirmable
  | OfficialResultForbidden
  | ProviderMatchSnapshotMissing;

export type ApproveOfficialResultError = ConfirmOfficialSelectionError;
