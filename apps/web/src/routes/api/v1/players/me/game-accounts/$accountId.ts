import { createFileRoute } from "@tanstack/react-router";
import {
  updateMyPlayerGameAccountParamsSchema,
  updateMyPlayerGameAccountRequestSchema,
  updateMyPlayerGameAccountResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/players/me/game-accounts/$accountId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const path = updateMyPlayerGameAccountParamsSchema.safeParse(params);
          if (!path.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: path.error.issues },
            });
          }
          const parsed = updateMyPlayerGameAccountRequestSchema.safeParse(
            await request.json().catch(() => null),
          );
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            updateMyPlayerGameAccountResponseSchema.parse(
              await client.teams.updateMyGameAccount(path.data.accountId, parsed.data),
            ),
          );
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
