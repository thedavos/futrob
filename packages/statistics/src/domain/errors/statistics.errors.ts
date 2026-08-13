import { TaggedError } from "@futrob/shared-kernel";

export class StatisticsAuthorizationForbidden extends TaggedError(
  "StatisticsAuthorizationForbidden",
)<{
  code: "statistics.read_own_forbidden";
  message: string;
}> {}
