import {
  getMyMatchesQuerySchema,
  getMyMatchesResponseSchema,
  getMyStatisticsResponseSchema,
  type GetMyMatchesQuery,
  type GetMyMatchesResponse,
  type GetMyStatisticsResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createStatisticsResource(http: HttpClient) {
  return {
    async getMyStatistics(): Promise<GetMyStatisticsResponse> {
      return http.request({
        path: "/players/me/statistics",
        method: "GET",
        parse: (data) => getMyStatisticsResponseSchema.parse(data),
      });
    },
    async getMyMatches(query: Partial<GetMyMatchesQuery> = {}): Promise<GetMyMatchesResponse> {
      const parsed = getMyMatchesQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.competitionId) search.set("competitionId", parsed.competitionId);
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
