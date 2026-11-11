import {
  listOrganizationAuditQuerySchema,
  listOrganizationAuditResponseSchema,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export type ConnectAuditApi = (request: Request) => Promise<{ readonly client: FutrobClient }>;

export async function handleListOrganizationAudit(
  request: Request,
  organizationId: string,
  connect: ConnectAuditApi,
): Promise<Response> {
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  const query = listOrganizationAuditQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success)
    return apiErrorResponse(400, {
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      details: { issues: query.error.issues },
    });
  try {
    const { client } = await connect(request);
    return jsonResponse(
      listOrganizationAuditResponseSchema.parse(
        await client.audit.list(organizationId, query.data),
      ),
    );
  } catch (error) {
    return error instanceof Error
      ? productApiBffErrorResponseForError(error)
      : productApiBffErrorResponse({ kind: "unexpected" });
  }
}
