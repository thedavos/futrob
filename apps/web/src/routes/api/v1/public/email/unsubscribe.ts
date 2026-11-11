import { createFileRoute } from "@tanstack/react-router";
import {
  unsubscribeEmailRequestSchema,
  unsubscribeEmailResponseSchema,
} from "@futrob/api-contracts";
import {
  createAnonymousProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

/**
 * Anonymous opt-out from non-critical email. The page sends `{ token }` as JSON; a mail
 * client's one-click unsubscribe (RFC 8058) POSTs a form to the `List-Unsubscribe` URL,
 * which carries the token in its query string.
 */
export const Route = createFileRoute("/api/v1/public/email/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const isJson = request.headers.get("content-type")?.includes("application/json");
          const json: unknown = isJson ? await request.json().catch(() => null) : null;
          const parsed = unsubscribeEmailRequestSchema.safeParse(
            json ?? { token: new URL(request.url).searchParams.get("token") ?? "" },
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
          const { client } = await createAnonymousProductApiClient(request);
          return jsonResponse(
            unsubscribeEmailResponseSchema.parse(await client.email.unsubscribe(parsed.data.token)),
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
