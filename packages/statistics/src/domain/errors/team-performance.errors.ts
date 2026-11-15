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

export class PerformanceRankingNotInPlan extends TaggedError("PerformanceRankingNotInPlan")<{
  code: "statistics.performance_ranking_not_in_plan";
  message: string;
}> {}
