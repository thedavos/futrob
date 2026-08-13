import { TaggedError } from "@futrob/shared-kernel";

export class OfficialResultNotFound extends TaggedError("OfficialResultNotFound")<{
  code: "statistics.official_result_not_found";
  message: string;
}> {}

export type ProjectOfficialResultError = OfficialResultNotFound;
