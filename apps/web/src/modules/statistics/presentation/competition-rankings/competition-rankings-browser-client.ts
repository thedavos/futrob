import {
  getCompetitionRankingsResponseSchema,
  type GetCompetitionRankingsResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class CompetitionRankingsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
  ) {
    super(code);
    this.name = "CompetitionRankingsClientError";
  }
}

export const competitionRankingsBrowserClient = {
  /** Every player ranking kind of the competition, through the authenticated web BFF. */
  getCompetitionRankings(
    organizationId: string,
    competitionId: string,
  ): Promise<GetCompetitionRankingsResponse> {
    return requestBrowserJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/rankings`,
      method: "GET",
      schema: getCompetitionRankingsResponseSchema,
      fallbackCode: "statistics.rankings_load_failed",
      createError: (status, error) =>
        new CompetitionRankingsClientError(status, error.code, error.requestId),
    });
  },
};
