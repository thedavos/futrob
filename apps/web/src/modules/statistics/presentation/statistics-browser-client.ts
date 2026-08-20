import {
  getMyMatchesQuerySchema,
  getMyMatchesResponseSchema,
  getMyRecentMatchesQuerySchema,
  getMyRecentMatchesResponseSchema,
  getMyStatisticsQuerySchema,
  getMyStatisticsResponseSchema,
  type GetMyMatchesQuery,
  type GetMyMatchesResponse,
  type GetMyRecentMatchesQueryInput,
  type GetMyRecentMatchesResponse,
  type GetMyStatisticsQuery,
  type GetMyStatisticsResponse,
  type RequestId,
} from "@futrob/api-contracts";
import type { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class StatisticsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "StatisticsClientError";
  }
}

async function requestStatisticsJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return requestBrowserJson({
    path,
    method: "GET",
    schema,
    fallbackCode: "statistics.client_error",
    createError: (status, error) =>
      new StatisticsClientError(status, error.code, error.requestId, error.retryAfterSeconds),
  });
}

export const statisticsBrowserClient = {
  getMyStatistics(filters: GetMyStatisticsQuery = {}): Promise<GetMyStatisticsResponse> {
    const query = getMyStatisticsQuerySchema.parse(filters);
    const search = new URLSearchParams();
    appendPersonalStatisticsFilters(search, query);
    const queryString = search.toString();
    return requestStatisticsJson(
      `/api/v1/players/me/statistics${queryString ? `?${queryString}` : ""}`,
      getMyStatisticsResponseSchema,
    );
  },

  getMyMatches(filters: Partial<GetMyMatchesQuery> = {}): Promise<GetMyMatchesResponse> {
    const query = getMyMatchesQuerySchema.parse(filters);
    const search = new URLSearchParams();
    appendPersonalStatisticsFilters(search, query);
    if (query.cursor !== undefined) search.set("cursor", query.cursor);
    search.set("limit", String(query.limit));
    return requestStatisticsJson(
      `/api/v1/players/me/matches?${search.toString()}`,
      getMyMatchesResponseSchema,
    );
  },

  getMyRecentMatches(
    filters: GetMyRecentMatchesQueryInput = {},
  ): Promise<GetMyRecentMatchesResponse> {
    const query = getMyRecentMatchesQuerySchema.parse(filters);
    const search = new URLSearchParams();
    if (query.externalClubId) search.set("externalClubId", query.externalClubId);
    const queryString = search.toString();
    return requestStatisticsJson(
      `/api/v1/players/me/recent-matches${queryString ? `?${queryString}` : ""}`,
      getMyRecentMatchesResponseSchema,
    );
  },
};

function appendPersonalStatisticsFilters(
  search: URLSearchParams,
  filters: GetMyStatisticsQuery,
): void {
  for (const key of ["competitionId", "teamId", "gameEdition", "platform", "position"] as const) {
    const value = filters[key];
    if (value !== undefined) search.set(key, value);
  }
}
