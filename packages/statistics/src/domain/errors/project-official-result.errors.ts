import { TaggedError } from "@futrob/shared-kernel";

export class OfficialResultNotFound extends TaggedError("OfficialResultNotFound")<{
  code: "statistics.official_result_not_found";
  message: string;
}> {}

export class OfficialResultNotApproved extends TaggedError("OfficialResultNotApproved")<{
  code: "statistics.official_result_not_approved";
  message: string;
  officialResultId: string;
}> {}

export type ProjectApprovedOfficialResultError = OfficialResultNotFound | OfficialResultNotApproved;
