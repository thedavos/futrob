import {
  assignOrganizationPlanRequestSchema,
  assignOrganizationPlanResponseSchema,
  getOrganizationPlanResponseSchema,
} from "@futrob/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/organizations/$organizationId/billing/plan")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getOrganizationPlanResponseSchema.parse(
              await client.billing.getOrganizationPlan(params.organizationId, {
                signal: request.signal,
              }),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
      /** Platform superuser: the product API refuses everyone else with 403. */
      PUT: async ({ request, params }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = assignOrganizationPlanRequestSchema.safeParse(json);
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
            assignOrganizationPlanResponseSchema.parse(
              await client.billing.assignOrganizationPlan(params.organizationId, parsed.data, {
                signal: request.signal,
              }),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) return productApiBffErrorResponse({ kind: "unexpected" });
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
