import { TaggedError, type EncounterId } from "@futrob/shared-kernel";

export class EncounterNotFound extends TaggedError("EncounterNotFound")<{
  code: "results.encounter_not_found";
  message: string;
  encounterId: EncounterId;
}> {}

export class InvalidSelection extends TaggedError("InvalidSelection")<{
  code: "results.invalid_selection";
  message: string;
  expected: number;
  received: number;
}> {}

export class DuplicateProviderMatch extends TaggedError("DuplicateProviderMatch")<{
  code: "results.duplicate_provider_match";
  message: string;
}> {}

export class OfficialSelectionForbidden extends TaggedError("OfficialSelectionForbidden")<{
  code: "results.official_selection_forbidden";
  message: string;
}> {}

export type SelectOfficialMatchesError =
  | EncounterNotFound
  | OfficialSelectionForbidden
  | InvalidSelection
  | DuplicateProviderMatch;
