import {
  changeOrganizationRoleRequestSchema,
  organizationRoleAssignmentSchema,
  type ChangeOrganizationRoleRequest,
  type OrganizationRoleAssignmentDto,
} from "@futrob/api-contracts";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export async function handleChangeMemberRoleRequest(
  request: Request,
  deps: {
    readonly change: (
      input: ChangeOrganizationRoleRequest,
    ) => Promise<OrganizationRoleAssignmentDto>;
  },
): Promise<Response> {
  try {
    const body = changeOrganizationRoleRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!body.success) {
      return apiErrorResponse(400, {
        code: "api.validation_error",
        messageKey: "errors.api.validation_error",
        details: { issues: body.error.issues },
      });
    }
    return jsonResponse(organizationRoleAssignmentSchema.parse(await deps.change(body.data)));
  } catch (error) {
    if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
    return productApiBffErrorResponseForError(error);
  }
}
