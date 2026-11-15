import {
  getCompetitionStandingsResponseSchema,
  type GetCompetitionStandingsResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class CompetitionStandingsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
  ) {
    super(code);
    this.name = "CompetitionStandingsClientError";
  }
}

export function getCompetitionStandings(
  organizationId: string,
  competitionId: string,
): Promise<GetCompetitionStandingsResponse> {
  return requestBrowserJson({
    path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/standings`,
    method: "GET",
    schema: getCompetitionStandingsResponseSchema,
    fallbackCode: "statistics.standings_load_failed",
    createError: (status, error) =>
      new CompetitionStandingsClientError(status, error.code, error.requestId),
  });
}
