import { createFileRoute } from "@tanstack/react-router";
import {
  getActorPreferencesResponseSchema,
  saveActorPreferencesRequestSchema,
  saveActorPreferencesResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

export const Route = createFileRoute("/api/v1/identity/preferences")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          const body = getActorPreferencesResponseSchema.parse(
            await client.identity.getActorPreferences(),
          );
          return jsonResponse(body);
        } catch (error) {
          if (!(error instanceof Error)) {
            return productApiBffErrorResponse({ kind: "unexpected" });
          }
          return productApiBffErrorResponseForError(error);
        }
      },
      PUT: async ({ request }) => {
        try {
          const json: unknown = await request.json().catch(() => null);
          const parsed = saveActorPreferencesRequestSchema.safeParse(json);
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
          const body = saveActorPreferencesResponseSchema.parse(
            await client.identity.saveActorPreferences(parsed.data),
          );
          return jsonResponse(body);
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
