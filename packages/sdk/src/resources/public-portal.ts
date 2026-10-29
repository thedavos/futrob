import {
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
  type GetPublicCalendarResponse,
  type GetPublicCompetitionResponse,
  type GetPublicStandingsResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/**
 * Anonymous reads of a published competition. They need no session, so a client built
 * without `getAccessToken` can call them; a missing or unpublished competition is a 404
 * `FutrobApiError` with code `public_portal.competition_not_found`.
 */
export function createPublicPortalResource(http: HttpClient) {
  return {
    async getCompetition(
      publicKey: string,
      options: RequestOptions = {},
    ): Promise<GetPublicCompetitionResponse> {
      return http.request({
        path: apiPath("public", "competitions", publicKey),
        method: "GET",
        options,
        parse: (data) => getPublicCompetitionResponseSchema.parse(data),
      });
    },
    async getStandings(
      publicKey: string,
      options: RequestOptions = {},
    ): Promise<GetPublicStandingsResponse> {
      return http.request({
        path: apiPath("public", "competitions", publicKey, "standings"),
        method: "GET",
        options,
        parse: (data) => getPublicStandingsResponseSchema.parse(data),
      });
    },
    async getCalendar(
      publicKey: string,
      options: RequestOptions = {},
    ): Promise<GetPublicCalendarResponse> {
      return http.request({
        path: apiPath("public", "competitions", publicKey, "calendar"),
        method: "GET",
        options,
        parse: (data) => getPublicCalendarResponseSchema.parse(data),
      });
    },
  };
}

export type PublicPortalResource = ReturnType<typeof createPublicPortalResource>;
