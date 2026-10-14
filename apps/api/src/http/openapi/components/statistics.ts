import {
  competitionStandingRowSchema,
  competitionStandingSnapshotSchema,
  getCompetitionStandingsResponseSchema,
  teamCompetitionStatsSchema,
  getCompetitionTeamStatisticsResponseSchema,
  rankingEligibilitySchema,
  rankingRowSchema,
  rankingSnapshotSchema,
  getCompetitionRankingsResponseSchema,
  teamPerformanceRankingSnapshotSchema,
  getTeamPerformanceRankingResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const CompetitionStandingRow = namedSchema(
  "CompetitionStandingRow",
  competitionStandingRowSchema,
);
export const CompetitionStandingSnapshot = namedSchema(
  "CompetitionStandingSnapshot",
  competitionStandingSnapshotSchema,
);
export const GetCompetitionStandingsResponse = namedSchema(
  "GetCompetitionStandingsResponse",
  getCompetitionStandingsResponseSchema,
);
export const TeamCompetitionStats = namedSchema("TeamCompetitionStats", teamCompetitionStatsSchema);
export const GetCompetitionTeamStatisticsResponse = namedSchema(
  "GetCompetitionTeamStatisticsResponse",
  getCompetitionTeamStatisticsResponseSchema,
);
export const RankingEligibility = namedSchema("RankingEligibility", rankingEligibilitySchema);
export const RankingRow = namedSchema("RankingRow", rankingRowSchema);
export const RankingSnapshot = namedSchema("RankingSnapshot", rankingSnapshotSchema);
export const GetCompetitionRankingsResponse = namedSchema(
  "GetCompetitionRankingsResponse",
  getCompetitionRankingsResponseSchema,
);
export const TeamPerformanceRankingSnapshot = namedSchema(
  "TeamPerformanceRankingSnapshot",
  teamPerformanceRankingSnapshotSchema,
);
export const GetTeamPerformanceRankingResponse = namedSchema(
  "GetTeamPerformanceRankingResponse",
  getTeamPerformanceRankingResponseSchema,
);
