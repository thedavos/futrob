import { createFileRoute } from "@tanstack/react-router";
import {
  cancelAccountDeletionResponseSchema,
  getAccountDeletionResponseSchema,
  requestAccountDeletionRequestSchema,
  requestAccountDeletionResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/identity/account/deletion")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getAccountDeletionResponseSchema.parse(await client.identity.getAccountDeletion()),
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = requestAccountDeletionRequestSchema.safeParse(json);
          if (!parsed.success) {
            return jsonResponse(
              { code: "api.validation_error", messageKey: "errors.api.validation_error" },
              400,
            );
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            requestAccountDeletionResponseSchema.parse(
              await client.identity.requestAccountDeletion(parsed.data),
            ),
          );
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            cancelAccountDeletionResponseSchema.parse(
              await client.identity.cancelAccountDeletion(),
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
