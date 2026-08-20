import {
  getCompetitionRankingsQuerySchema,
  getCompetitionRankingsResponseSchema,
  getCompetitionStandingsResponseSchema,
  getCompetitionTeamStatisticsResponseSchema,
  getMyMatchesQuerySchema,
  getMyMatchesResponseSchema,
  getMyRecentMatchPathSchema,
  getMyRecentMatchQuerySchema,
  getMyRecentMatchResponseSchema,
  getMyRecentMatchesQuerySchema,
  getMyRecentMatchesResponseSchema,
  getMyStatisticsQuerySchema,
  getMyStatisticsResponseSchema,
  type GetCompetitionRankingsQuery,
  type GetCompetitionRankingsResponse,
  type GetCompetitionStandingsResponse,
  type GetCompetitionTeamStatisticsResponse,
  type GetMyMatchesQuery,
  type GetMyMatchesResponse,
  type GetMyRecentMatchPath,
  type GetMyRecentMatchQueryInput,
  type GetMyRecentMatchResponse,
  type GetMyRecentMatchesQueryInput,
  type GetMyRecentMatchesResponse,
  type GetMyStatisticsQuery,
  type GetMyStatisticsResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export type GetMyRecentMatchInput = GetMyRecentMatchPath & GetMyRecentMatchQueryInput;

export function createStatisticsResource(http: HttpClient) {
  return {
    async getMyStatistics(query: GetMyStatisticsQuery = {}): Promise<GetMyStatisticsResponse> {
      const parsed = getMyStatisticsQuerySchema.parse(query);
      const search = new URLSearchParams();
      appendPersonalStatisticsFilters(search, parsed);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/statistics${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        parse: (data) => getMyStatisticsResponseSchema.parse(data),
      });
    },
    async getMyMatches(query: Partial<GetMyMatchesQuery> = {}): Promise<GetMyMatchesResponse> {
      const parsed = getMyMatchesQuerySchema.parse(query);
      const search = new URLSearchParams();
      appendPersonalStatisticsFilters(search, parsed);
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      search.set("limit", String(parsed.limit));
      return http.request({
        path: `/players/me/matches?${search.toString()}`,
        method: "GET",
        parse: (data) => getMyMatchesResponseSchema.parse(data),
      });
    },
    async getMyRecentMatches(
      query: GetMyRecentMatchesQueryInput = {},
    ): Promise<GetMyRecentMatchesResponse> {
      const parsed = getMyRecentMatchesQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.externalClubId) search.set("externalClubId", parsed.externalClubId);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/recent-matches${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        parse: (data) => getMyRecentMatchesResponseSchema.parse(data),
      });
    },
    async getMyRecentMatch(input: GetMyRecentMatchInput): Promise<GetMyRecentMatchResponse> {
      const path = getMyRecentMatchPathSchema.parse(input);
      const query = getMyRecentMatchQuerySchema.parse(input);
      const search = new URLSearchParams();
      if (query.externalClubId) search.set("externalClubId", query.externalClubId);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/recent-matches/${encodeURIComponent(path.providerKey)}/${encodeURIComponent(path.externalMatchId)}${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        parse: (data) => getMyRecentMatchResponseSchema.parse(data),
      });
    },
    async getCompetitionStandings(input: {
      readonly organizationId: string;
      readonly competitionId: string;
    }): Promise<GetCompetitionStandingsResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(input.organizationId)}/competitions/${encodeURIComponent(input.competitionId)}/standings`,
        method: "GET",
        parse: (data) => getCompetitionStandingsResponseSchema.parse(data),
      });
    },
    async getCompetitionTeamStatistics(input: {
      readonly organizationId: string;
      readonly competitionId: string;
    }): Promise<GetCompetitionTeamStatisticsResponse> {
      return http.request({
        path: `/organizations/${encodeURIComponent(input.organizationId)}/competitions/${encodeURIComponent(input.competitionId)}/team-statistics`,
        method: "GET",
        parse: (data) => getCompetitionTeamStatisticsResponseSchema.parse(data),
      });
    },
    async getCompetitionRankings(input: {
      readonly organizationId: string;
      readonly competitionId: string;
      readonly kind?: GetCompetitionRankingsQuery["kind"];
    }): Promise<GetCompetitionRankingsResponse> {
      const parsed = getCompetitionRankingsQuerySchema.parse({
        kind: input.kind,
      });
      const search = new URLSearchParams();
      if (parsed.kind) search.set("kind", parsed.kind);
      const queryString = search.toString();
      return http.request({
        path: `/organizations/${encodeURIComponent(input.organizationId)}/competitions/${encodeURIComponent(input.competitionId)}/rankings${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        parse: (data) => getCompetitionRankingsResponseSchema.parse(data),
      });
    },
  };
}

export type StatisticsResource = ReturnType<typeof createStatisticsResource>;

function appendPersonalStatisticsFilters(
  search: URLSearchParams,
  filters: GetMyStatisticsQuery,
): void {
  for (const key of ["competitionId", "teamId", "gameEdition", "platform", "position"] as const) {
    const value = filters[key];
    if (value) search.set(key, value);
  }
}
