import { createFileRoute } from "@tanstack/react-router";
import {
  getEmailPreferencesResponseSchema,
  saveEmailPreferencesRequestSchema,
  saveEmailPreferencesResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

/** The signed-in actor's email locale and non-critical opt-out (ADR-0030). */
export const Route = createFileRoute("/api/v1/notifications/email-preferences")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAuthenticatedProductApiClient(request);
          return jsonResponse(
            getEmailPreferencesResponseSchema.parse(await client.email.getPreferences()),
          );
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
          const parsed = saveEmailPreferencesRequestSchema.safeParse(json);
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
            saveEmailPreferencesResponseSchema.parse(
              await client.email.savePreferences(parsed.data),
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
