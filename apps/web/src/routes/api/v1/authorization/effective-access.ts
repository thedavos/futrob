import { createFileRoute } from "@tanstack/react-router";
import {
  effectiveAccessSchema,
  getEffectiveAccessQuerySchema,
  type PermissionDto,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/authorization/effective-access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = getEffectiveAccessQuerySchema.safeParse(
            Object.fromEntries(url.searchParams.entries()),
          );
          if (!parsed.success) {
            return jsonResponse(
              {
                code: "api.validation_error",
                messageKey: "errors.api.validation_error",
                details: { issues: parsed.error.issues },
              },
              400,
            );
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          const body = await client.authorization.getEffectiveAccess(
            {
              organizationId: parsed.data.organizationId,
              competitionId: parsed.data.competitionId,
              teamId: parsed.data.teamId,
              encounterId: parsed.data.encounterId,
            },
            parsed.data.permissions as readonly PermissionDto[] | undefined,
          );
          return jsonResponse(effectiveAccessSchema.parse(body));
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
