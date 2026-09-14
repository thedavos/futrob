import { TaggedError } from "@futrob/shared-kernel";
import type {
  EncounterNotFound,
  OfficialSelectionForbidden,
} from "./select-official-matches.errors.ts";

export class CandidateDataUnavailable extends TaggedError("CandidateDataUnavailable")<{
  code: "results.candidate_data_unavailable";
  message: string;
}> {}

export type ListEncounterCandidatesError =
  | EncounterNotFound
  | OfficialSelectionForbidden
  | CandidateDataUnavailable;
