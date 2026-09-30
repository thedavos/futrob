import { TaggedError } from "@futrob/shared-kernel";

export class TeamPerformanceScopeInvalid extends TaggedError("TeamPerformanceScopeInvalid")<{
  code: "statistics.team_performance_scope_invalid";
  message: string;
}> {}

export class TeamPerformanceSnapshotConflict extends TaggedError(
  "TeamPerformanceSnapshotConflict",
)<{
  code: "statistics.team_performance_snapshot_conflict";
  message: string;
}> {}
