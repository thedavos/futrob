import {
  getCompetitionTeamStatisticsResponseSchema,
  type GetCompetitionTeamStatisticsResponse,
} from "@futrob/api-contracts";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

type CompetitionScope = { readonly organizationId: string; readonly competitionId: string };

/** Forwards the organizer team statistics read; the product API authorizes `statistics.read`. */
export async function handleGetCompetitionTeamStatisticsRequest(
  params: CompetitionScope,
  deps: {
    readonly load: (scope: CompetitionScope) => Promise<GetCompetitionTeamStatisticsResponse>;
  },
): Promise<Response> {
  try {
    const result = await deps.load({
      organizationId: params.organizationId,
      competitionId: params.competitionId,
    });
    return jsonResponse(getCompetitionTeamStatisticsResponseSchema.parse(result));
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
