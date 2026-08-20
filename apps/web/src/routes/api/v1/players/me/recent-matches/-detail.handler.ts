import {
  getMyRecentMatchPathSchema,
  getMyRecentMatchQuerySchema,
  getMyRecentMatchResponseSchema,
  type GetMyRecentMatchPath,
  type GetMyRecentMatchQuery,
  type GetMyRecentMatchResponse,
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

type GetMyRecentMatchInput = GetMyRecentMatchPath & GetMyRecentMatchQuery;

export async function handleGetMyRecentMatchRequest(
  request: Request,
  params: Readonly<Record<"providerKey" | "externalMatchId", string>>,
  deps: {
    readonly load: (input: GetMyRecentMatchInput) => Promise<GetMyRecentMatchResponse>;
  },
): Promise<Response> {
  try {
    const path = getMyRecentMatchPathSchema.safeParse(params);
    const query = getMyRecentMatchQuerySchema.safeParse(queryRecord(new URL(request.url)));
    if (!path.success || !query.success) {
      return apiErrorResponse(400, {
        code: "api.validation_error",
        messageKey: "errors.api.validation_error",
        details: {
          issues: [
            ...(path.success ? [] : path.error.issues),
            ...(query.success ? [] : query.error.issues),
          ],
        },
      });
    }

    const result = await deps.load({ ...path.data, ...query.data });
    return jsonResponse(getMyRecentMatchResponseSchema.parse(result));
  } catch (error) {
    if (!(error instanceof Error)) {
      return productApiBffErrorResponse({ kind: "unexpected" });
    }
    return productApiBffErrorResponseForError(error);
  }
}
