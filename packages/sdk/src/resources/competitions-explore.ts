import {
  exploreCompetitionsQuerySchema,
  exploreCompetitionsResponseSchema,
  getExploreCompetitionResponseSchema,
  openCompetitionsQuerySchema,
  openCompetitionsResponseSchema,
  type ExploreCompetitionsQueryInput,
  type ExploreCompetitionsResponse,
  type GetExploreCompetitionResponse,
  type OpenCompetitionsQueryInput,
  type OpenCompetitionsResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Explore reads of the competitions resource: the signed-in catalogue and the landing list. */
export function createCompetitionExploreMethods(http: HttpClient) {
  return {
    /** Service-only and actor-free: open, listed competitions for the signed-out landing. */
    async listOpenAnonymously(
      query: OpenCompetitionsQueryInput = {},
      options: RequestOptions = {},
    ): Promise<OpenCompetitionsResponse> {
      const parsed = openCompetitionsQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.q) search.set("q", parsed.q);
      if (parsed.platform) search.set("platform", parsed.platform);
      search.set("limit", String(parsed.limit));
      return http.request({
        path: `${apiPath("internal", "competitions", "explore", "open")}?${search.toString()}`,
        method: "GET",
        options,
        parse: (data) => openCompetitionsResponseSchema.parse(data),
      });
    },

    async explore(
      query: ExploreCompetitionsQueryInput = {},
      options: RequestOptions = {},
    ): Promise<ExploreCompetitionsResponse> {
      const parsed = exploreCompetitionsQuerySchema.parse(query);
      const search = new URLSearchParams();
      if (parsed.q) search.set("q", parsed.q);
      if (parsed.format) search.set("format", parsed.format);
      if (parsed.status) search.set("status", parsed.status);
      if (parsed.region) search.set("region", parsed.region);
      if (parsed.platform) search.set("platform", parsed.platform);
      search.set("sort", parsed.sort);
      search.set("limit", String(parsed.limit));
      if (parsed.cursor) search.set("cursor", parsed.cursor);
      return http.request({
        path: `/competitions/explore?${search.toString()}`,
        method: "GET",
        options,
        parse: (data) => exploreCompetitionsResponseSchema.parse(data),
      });
    },

    async getExplore(
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<GetExploreCompetitionResponse> {
      return http.request({
        path: apiPath("competitions", "explore", competitionId),
        method: "GET",
        options,
        parse: (data) => getExploreCompetitionResponseSchema.parse(data),
      });
    },
  };
}
