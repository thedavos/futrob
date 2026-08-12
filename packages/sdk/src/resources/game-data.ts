import {
  getClubMatchesQuerySchema,
  getClubMatchesResponseSchema,
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
  getClubQuerySchema,
  getClubResponseSchema,
  searchClubsQuerySchema,
  searchClubsResponseSchema,
  type GetClubMatchesQueryInput,
  type GetClubMatchesResponse,
  type EnqueueProviderSyncJobRequest,
  type ProviderSyncJobResponse,
  type GetClubQueryInput,
  type GetClubResponse,
  type SearchClubsQueryInput,
  type SearchClubsResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function createGameDataResource(http: HttpClient) {
  return {
    clubs: {
      async search(input: SearchClubsQueryInput): Promise<SearchClubsResponse> {
        const query = searchClubsQuerySchema.parse(input);
        return http.request({
          path: `/game-data/clubs/search${toQuery(query)}`,
          method: "GET",
          parse: (data) => searchClubsResponseSchema.parse(data),
        });
      },

      async retrieve(
        externalClubId: string,
        input: GetClubQueryInput = {},
      ): Promise<GetClubResponse> {
        const query = getClubQuerySchema.parse(input);
        return http.request({
          path: `/game-data/clubs/${encodeURIComponent(externalClubId)}${toQuery(query)}`,
          method: "GET",
          parse: (data) => getClubResponseSchema.parse(data),
        });
      },

      async matches(
        externalClubId: string,
        input: GetClubMatchesQueryInput = {},
      ): Promise<GetClubMatchesResponse> {
        const query = getClubMatchesQuerySchema.parse(input);
        return http.request({
          path: `/game-data/clubs/${encodeURIComponent(externalClubId)}/matches${toQuery(query)}`,
          method: "GET",
          parse: (data) => getClubMatchesResponseSchema.parse(data),
        });
      },
    },
    syncJobs: {
      async enqueue(input: EnqueueProviderSyncJobRequest): Promise<ProviderSyncJobResponse> {
        return http.request({
          path: "/internal/game-data/sync-jobs",
          method: "POST",
          body: enqueueProviderSyncJobRequestSchema.parse(input),
          parse: (data) => providerSyncJobResponseSchema.parse(data),
        });
      },
    },
  };
}

export type GameDataResource = ReturnType<typeof createGameDataResource>;
