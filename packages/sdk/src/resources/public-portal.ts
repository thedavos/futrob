import {
  getPublicBracketResponseSchema,
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicRankingResponseSchema,
  getPublicRulesResponseSchema,
  getPublicStandingsResponseSchema,
  getPublicTeamsResponseSchema,
  listPublicCompetitionsResponseSchema,
  type GetPublicBracketResponse,
  type GetPublicCalendarResponse,
  type GetPublicCompetitionResponse,
  type GetPublicRankingResponse,
  type GetPublicRulesResponse,
  type GetPublicStandingsResponse,
  type GetPublicTeamsResponse,
  type ListPublicCompetitionsResponse,
  type PublicRankingKindDto,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Where a published competition lives publicly: `/{organizationSlug}/{competitionKey}` (ADR-0024). */
export interface PublicCompetitionRef {
  readonly organizationSlug: string;
  readonly competitionKey: string;
}

/**
 * Anonymous reads of a published competition. They need no session, so a client built
 * without `getAccessToken` can call them; a missing, unpublished or other organization's
 * competition is a 404 `FutrobApiError` with code `public_portal.competition_not_found`.
 */
export function createPublicPortalResource(http: HttpClient) {
  const path = (ref: PublicCompetitionRef, ...rest: string[]) =>
    apiPath(
      "public",
      "organizations",
      ref.organizationSlug,
      "competitions",
      ref.competitionKey,
      ...rest,
    );
  return {
    /** Every published, paused or finished competition by public address (sitemap source). */
    async listCompetitions(options: RequestOptions = {}): Promise<ListPublicCompetitionsResponse> {
      return http.request({
        path: apiPath("public", "competitions"),
        method: "GET",
        options,
        parse: (data) => listPublicCompetitionsResponseSchema.parse(data),
      });
    },
    async getCompetition(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicCompetitionResponse> {
      return http.request({
        path: path(ref),
        method: "GET",
        options,
        parse: (data) => getPublicCompetitionResponseSchema.parse(data),
      });
    },
    async getStandings(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicStandingsResponse> {
      return http.request({
        path: path(ref, "standings"),
        method: "GET",
        options,
        parse: (data) => getPublicStandingsResponseSchema.parse(data),
      });
    },
    async getCalendar(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicCalendarResponse> {
      return http.request({
        path: path(ref, "calendar"),
        method: "GET",
        options,
        parse: (data) => getPublicCalendarResponseSchema.parse(data),
      });
    },
    async getTeams(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicTeamsResponse> {
      return http.request({
        path: path(ref, "teams"),
        method: "GET",
        options,
        parse: (data) => getPublicTeamsResponseSchema.parse(data),
      });
    },
    async getRules(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicRulesResponse> {
      return http.request({
        path: path(ref, "rules"),
        method: "GET",
        options,
        parse: (data) => getPublicRulesResponseSchema.parse(data),
      });
    },
    async getBracket(
      ref: PublicCompetitionRef,
      options: RequestOptions = {},
    ): Promise<GetPublicBracketResponse> {
      return http.request({
        path: path(ref, "bracket"),
        method: "GET",
        options,
        parse: (data) => getPublicBracketResponseSchema.parse(data),
      });
    },
    async getRanking(
      ref: PublicCompetitionRef,
      kind: PublicRankingKindDto,
      options: RequestOptions = {},
    ): Promise<GetPublicRankingResponse> {
      return http.request({
        path: path(ref, "rankings", kind),
        method: "GET",
        options,
        parse: (data) => getPublicRankingResponseSchema.parse(data),
      });
    },
  };
}

export type PublicPortalResource = ReturnType<typeof createPublicPortalResource>;
