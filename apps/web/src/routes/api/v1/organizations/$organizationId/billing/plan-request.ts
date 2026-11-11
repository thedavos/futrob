import {
  requestOrganizationPlanRequestSchema,
  requestOrganizationPlanResponseSchema,
} from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/billing/plan-request")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = requestOrganizationPlanRequestSchema.safeParse(json);
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
          return jsonResponse(
            requestOrganizationPlanResponseSchema.parse(
              await client.billing.requestOrganizationPlan(params.organizationId, parsed.data, {
                signal: request.signal,
              }),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          await client.billing.cancelOrganizationPlanRequest(params.organizationId, {
            signal: request.signal,
          });
          return new Response(null, { status: 204 });
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
