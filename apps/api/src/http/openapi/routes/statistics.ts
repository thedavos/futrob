import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  GetCompetitionRankingsResponse,
  GetCompetitionStandingsResponse,
  GetCompetitionTeamStatisticsResponse,
  GetTeamPerformanceRankingResponse,
} from "@/http/openapi/components.ts";
import { getCompetitionRankingsQuerySchema } from "@futrob/api-contracts";

export const getTeamPerformanceRankingRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/team-performance-ranking",
  operationId: "getTeamPerformanceRanking",
  tags: ["statistics"],
  summary: "Read the versioned official team performance ranking, separate from standings",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description:
      "Ranking with component coverage, or null before the first rebuild. Incomplete rows have no score or position.",
    schema: GetTeamPerformanceRankingResponse,
  },
  errors: [401, 403],
});

export const getCompetitionStandingsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/standings",
  operationId: "getCompetitionStandings",
  tags: ["statistics"],
  summary: "Read the official competition standings snapshot",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description: "Standing snapshot or null when nothing has been projected",
    schema: GetCompetitionStandingsResponse,
  },
  errors: [401, 403],
});

export const getCompetitionTeamStatisticsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/team-statistics",
  operationId: "getCompetitionTeamStatistics",
  tags: ["statistics"],
  summary: "Read official team competition statistics",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description: "Team competition aggregates",
    schema: GetCompetitionTeamStatisticsResponse,
  },
  errors: [401, 403],
});

export const getCompetitionRankingsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/rankings",
  operationId: "getCompetitionRankings",
  tags: ["statistics"],
  summary: "Read competition player ranking snapshots",
  params: pathParams(["organizationId", "competitionId"]),
  query: getCompetitionRankingsQuerySchema,
  success: {
    status: 200,
    description: "Ranking snapshots for the competition",
    schema: GetCompetitionRankingsResponse,
  },
  errors: [401, 403],
});
