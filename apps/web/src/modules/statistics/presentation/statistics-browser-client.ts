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
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";

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

async function requestJson<T>(path: string, parse: (data: unknown) => T): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readBrowserApiError(response, raw, "statistics.client_error");
    throw new StatisticsClientError(
      response.status,
      error.code,
      error.requestId,
      error.retryAfterSeconds,
    );
  }
  return parse(raw);
}

export const statisticsBrowserClient = {
  getMyStatistics(filters: GetMyStatisticsQuery = {}): Promise<GetMyStatisticsResponse> {
    const query = getMyStatisticsQuerySchema.parse(filters);
    const search = new URLSearchParams();
    appendPersonalStatisticsFilters(search, query);
    const queryString = search.toString();
    return requestJson(
      `/api/v1/players/me/statistics${queryString ? `?${queryString}` : ""}`,
      (data) => getMyStatisticsResponseSchema.parse(data),
    );
  },

  getMyMatches(filters: Partial<GetMyMatchesQuery> = {}): Promise<GetMyMatchesResponse> {
    const query = getMyMatchesQuerySchema.parse(filters);
    const search = new URLSearchParams();
    appendPersonalStatisticsFilters(search, query);
    if (query.cursor !== undefined) search.set("cursor", query.cursor);
    search.set("limit", String(query.limit));
    return requestJson(`/api/v1/players/me/matches?${search.toString()}`, (data) =>
      getMyMatchesResponseSchema.parse(data),
    );
  },

  getMyRecentMatches(
    filters: GetMyRecentMatchesQueryInput = {},
  ): Promise<GetMyRecentMatchesResponse> {
    const query = getMyRecentMatchesQuerySchema.parse(filters);
    const search = new URLSearchParams();
    if (query.externalClubId) search.set("externalClubId", query.externalClubId);
    const queryString = search.toString();
    return requestJson(
      `/api/v1/players/me/recent-matches${queryString ? `?${queryString}` : ""}`,
      (data) => getMyRecentMatchesResponseSchema.parse(data),
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
