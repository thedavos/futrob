import {
  getCompetitionRankingsQuerySchema,
  getCompetitionRankingsResponseSchema,
  type GetCompetitionRankingsQuery,
  type GetCompetitionRankingsResponse,
} from "@futrob/api-contracts";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";

/** Player rankings for one competition; the product API authorizes `statistics.read`. */
export async function handleGetCompetitionRankingsRequest(
  request: Request,
  deps: {
    readonly load: (query: GetCompetitionRankingsQuery) => Promise<GetCompetitionRankingsResponse>;
  },
): Promise<Response> {
  try {
    const query = getCompetitionRankingsQuerySchema.safeParse(queryRecord(new URL(request.url)));
    if (!query.success) {
      return apiErrorResponse(400, {
        code: "api.validation_error",
        messageKey: "errors.api.validation_error",
        details: { issues: query.error.issues },
      });
    }
    return jsonResponse(getCompetitionRankingsResponseSchema.parse(await deps.load(query.data)));
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
