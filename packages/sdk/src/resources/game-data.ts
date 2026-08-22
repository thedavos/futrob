import {
  getClubMatchesQuerySchema,
  getClubMatchesResponseSchema,
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
  getClubQuerySchema,
  getClubResponseSchema,
  providerHealthResponseSchema,
  type ProviderHealthResponse,
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
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

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
      async search(
        input: SearchClubsQueryInput,
        options: RequestOptions = {},
      ): Promise<SearchClubsResponse> {
        const query = searchClubsQuerySchema.parse(input);
        return http.request({
          path: `/game-data/clubs/search${toQuery(query)}`,
          method: "GET",
          options,
          parse: (data) => searchClubsResponseSchema.parse(data),
        });
      },

      async retrieve(
        externalClubId: string,
        input: GetClubQueryInput = {},
        options: RequestOptions = {},
      ): Promise<GetClubResponse> {
        const query = getClubQuerySchema.parse(input);
        return http.request({
          path: `${apiPath("game-data", "clubs", externalClubId)}${toQuery(query)}`,
          method: "GET",
          options,
          parse: (data) => getClubResponseSchema.parse(data),
        });
      },

      async matches(
        externalClubId: string,
        input: GetClubMatchesQueryInput = {},
        options: RequestOptions = {},
      ): Promise<GetClubMatchesResponse> {
        const query = getClubMatchesQuerySchema.parse(input);
        return http.request({
          path: `${apiPath("game-data", "clubs", externalClubId, "matches")}${toQuery(query)}`,
          method: "GET",
          options,
          parse: (data) => getClubMatchesResponseSchema.parse(data),
        });
      },
    },
    syncJobs: {
      async enqueue(
        input: EnqueueProviderSyncJobRequest,
        options: RequestOptions = {},
      ): Promise<ProviderSyncJobResponse> {
        return http.request({
          path: "/internal/game-data/sync-jobs",
          method: "POST",
          body: enqueueProviderSyncJobRequestSchema.parse(input),
          options,
          parse: (data) => providerSyncJobResponseSchema.parse(data),
        });
      },

      /** Runs the next queued job (recovery cron entry point). 204 → null. */
      async runNext(options: RequestOptions = {}): Promise<ProviderSyncJobResponse | null> {
        return http.request({
          path: "/internal/game-data/sync-jobs/run-next",
          method: "POST",
          options,
          parse: (data) => (data === null ? null : providerSyncJobResponseSchema.parse(data)),
        });
      },

      async run(jobId: string, options: RequestOptions = {}): Promise<ProviderSyncJobResponse> {
        return http.request({
          path: apiPath("internal", "game-data", "sync-jobs", jobId, "run"),
          method: "POST",
          options,
          parse: (data) => providerSyncJobResponseSchema.parse(data),
        });
      },
    },
    providers: {
      async health(
        providerKey: string,
        options: RequestOptions = {},
      ): Promise<ProviderHealthResponse> {
        return http.request({
          path: apiPath("internal", "game-data", "providers", providerKey, "health"),
          method: "GET",
          options,
          parse: (data) => providerHealthResponseSchema.parse(data),
        });
      },
    },
  };
}

export type GameDataResource = ReturnType<typeof createGameDataResource>;
