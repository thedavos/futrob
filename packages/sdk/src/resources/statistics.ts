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
  getMyGameProfileQuerySchema,
  getMyGameProfileResponseSchema,
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
  type GetMyGameProfileQuery,
  type GetMyGameProfileQueryInput,
  type GetMyGameProfileResponse,
  type GetMyStatisticsQuery,
  type GetMyStatisticsResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export type GetMyRecentMatchInput = GetMyRecentMatchPath & GetMyRecentMatchQueryInput;

export function createStatisticsResource(http: HttpClient) {
  return {
    async getMyStatistics(
      query: GetMyStatisticsQuery = {},
      options: RequestOptions = {},
    ): Promise<GetMyStatisticsResponse> {
      const parsed = getMyStatisticsQuerySchema.parse(query);
      const search = new URLSearchParams();
      appendPersonalStatisticsFilters(search, parsed);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/statistics${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        options,
        parse: (data) => getMyStatisticsResponseSchema.parse(data),
      });
    },
    async getMyMatches(
      query: Partial<GetMyMatchesQuery> = {},
      options: RequestOptions = {},
    ): Promise<GetMyMatchesResponse> {
      const parsed = getMyMatchesQuerySchema.parse(query);
      const search = new URLSearchParams();
      appendPersonalStatisticsFilters(search, parsed);
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      search.set("limit", String(parsed.limit));
      return http.request({
        path: `/players/me/matches?${search.toString()}`,
        method: "GET",
        options,
        parse: (data) => getMyMatchesResponseSchema.parse(data),
      });
    },
    async getMyRecentMatches(
      query: GetMyRecentMatchesQueryInput = {},
      options: RequestOptions = {},
    ): Promise<GetMyRecentMatchesResponse> {
      const parsed = getMyRecentMatchesQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.externalClubId) search.set("externalClubId", parsed.externalClubId);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/recent-matches${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        options,
        parse: (data) => getMyRecentMatchesResponseSchema.parse(data),
      });
    },
    async getMyGameProfile(
      query: GetMyGameProfileQueryInput = {},
      options: RequestOptions = {},
    ): Promise<GetMyGameProfileResponse> {
      const parsed = getMyGameProfileQuerySchema.parse(query);
      const search = new URLSearchParams();
      appendGameProfileFilters(search, parsed);
      const queryString = search.toString();
      return http.request({
        path: `/players/me/game-profile${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        options,
        parse: (data) => getMyGameProfileResponseSchema.parse(data),
      });
    },
    async getMyRecentMatch(
      input: GetMyRecentMatchInput,
      options: RequestOptions = {},
    ): Promise<GetMyRecentMatchResponse> {
      const path = getMyRecentMatchPathSchema.parse(input);
      const query = getMyRecentMatchQuerySchema.parse(input);
      const search = new URLSearchParams();
      if (query.externalClubId) search.set("externalClubId", query.externalClubId);
      const queryString = search.toString();
      return http.request({
        path: `${apiPath("players", "me", "recent-matches", path.providerKey, path.externalMatchId)}${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        options,
        parse: (data) => getMyRecentMatchResponseSchema.parse(data),
      });
    },
    async getCompetitionStandings(
      input: {
        readonly organizationId: string;
        readonly competitionId: string;
      },
      options: RequestOptions = {},
    ): Promise<GetCompetitionStandingsResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          input.organizationId,
          "competitions",
          input.competitionId,
          "standings",
        ),
        method: "GET",
        options,
        parse: (data) => getCompetitionStandingsResponseSchema.parse(data),
      });
    },
    async getCompetitionTeamStatistics(
      input: {
        readonly organizationId: string;
        readonly competitionId: string;
      },
      options: RequestOptions = {},
    ): Promise<GetCompetitionTeamStatisticsResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          input.organizationId,
          "competitions",
          input.competitionId,
          "team-statistics",
        ),
        method: "GET",
        options,
        parse: (data) => getCompetitionTeamStatisticsResponseSchema.parse(data),
      });
    },
    async getCompetitionRankings(
      input: {
        readonly organizationId: string;
        readonly competitionId: string;
        readonly kind?: GetCompetitionRankingsQuery["kind"];
      },
      options: RequestOptions = {},
    ): Promise<GetCompetitionRankingsResponse> {
      const parsed = getCompetitionRankingsQuerySchema.parse({
        kind: input.kind,
      });
      const search = new URLSearchParams();
      if (parsed.kind) search.set("kind", parsed.kind);
      const queryString = search.toString();
      return http.request({
        path: `${apiPath("organizations", input.organizationId, "competitions", input.competitionId, "rankings")}${queryString ? `?${queryString}` : ""}`,
        method: "GET",
        options,
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

function appendGameProfileFilters(search: URLSearchParams, filters: GetMyGameProfileQuery): void {
  if (filters.externalClubId) search.set("externalClubId", filters.externalClubId);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
}
