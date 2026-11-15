import {
  getCurrentCompetitionFixtureResponseSchema,
  type GetCurrentCompetitionFixtureResponse,
  type RequestId,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class CompetitionFixtureClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
  ) {
    super(code);
    this.name = "CompetitionFixtureClientError";
  }
}

const createError = (status: number, error: { code: string; requestId?: RequestId }) =>
  new CompetitionFixtureClientError(status, error.code, error.requestId);

export const competitionFixtureBrowserClient = {
  getCurrent(
    organizationId: string,
    competitionId: string,
  ): Promise<GetCurrentCompetitionFixtureResponse> {
    return requestBrowserJson({
      path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/fixture`,
      method: "GET",
      schema: getCurrentCompetitionFixtureResponseSchema,
      fallbackCode: "scheduling.fixture_load_failed",
      createError,
    });
  },
};
