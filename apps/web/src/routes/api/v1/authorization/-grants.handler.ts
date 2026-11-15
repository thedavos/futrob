import {
  listAccessGrantsQuerySchema,
  listAccessGrantsResponseSchema,
  type ListAccessGrantsQuery,
  type ListAccessGrantsResponse,
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

export async function handleListAccessGrantsRequest(
  request: Request,
  deps: { readonly load: (query: ListAccessGrantsQuery) => Promise<ListAccessGrantsResponse> },
): Promise<Response> {
  try {
    const query = listAccessGrantsQuerySchema.safeParse(queryRecord(new URL(request.url)));
    if (!query.success) {
      return apiErrorResponse(400, {
        code: "api.validation_error",
        messageKey: "errors.api.validation_error",
        details: { issues: query.error.issues },
      });
    }
    return jsonResponse(listAccessGrantsResponseSchema.parse(await deps.load(query.data)));
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
