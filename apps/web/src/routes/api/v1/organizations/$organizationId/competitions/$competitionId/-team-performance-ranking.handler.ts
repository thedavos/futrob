import {
  getTeamPerformanceRankingResponseSchema,
  type GetTeamPerformanceRankingResponse,
} from "@futrob/api-contracts";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

type TeamPerformanceScope = {
  readonly organizationId: string;
  readonly competitionId: string;
};

/** The product API authorizes `statistics.read`; the BFF only forwards the session actor. */
export async function handleGetTeamPerformanceRankingRequest(
  params: TeamPerformanceScope,
  deps: {
    readonly load: (scope: TeamPerformanceScope) => Promise<GetTeamPerformanceRankingResponse>;
  },
): Promise<Response> {
  try {
    const ranking = await deps.load({
      organizationId: params.organizationId,
      competitionId: params.competitionId,
    });
    return jsonResponse(getTeamPerformanceRankingResponseSchema.parse(ranking));
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
