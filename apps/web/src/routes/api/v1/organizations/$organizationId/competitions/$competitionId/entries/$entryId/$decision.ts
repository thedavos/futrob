import { createFileRoute } from "@tanstack/react-router";
import { decideTeamEntryResponseSchema } from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/entries/$entryId/$decision",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (params.decision !== "approve" && params.decision !== "reject") {
          return apiErrorResponse(404, {
            code: "api.not_found",
            messageKey: "errors.api.not_found",
          });
        }
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          const result =
            params.decision === "approve"
              ? await client.competitions.approveTeamEntry(
                  params.organizationId,
                  params.competitionId,
                  params.entryId,
                )
              : await client.competitions.rejectTeamEntry(
                  params.organizationId,
                  params.competitionId,
                  params.entryId,
                );
          return jsonResponse(decideTeamEntryResponseSchema.parse(result));
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
    },
  },
});
