import {
  getMyMatchesQuerySchema,
  getMyMatchesResponseSchema,
  getMyStatisticsQuerySchema,
  getMyStatisticsResponseSchema,
  type GetMyMatchesQuery,
  type GetMyMatchesResponse,
  type GetMyStatisticsQuery,
  type GetMyStatisticsResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

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
