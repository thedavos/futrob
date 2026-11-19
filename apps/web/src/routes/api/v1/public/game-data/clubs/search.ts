import { createFileRoute } from "@tanstack/react-router";
import { searchClubsQuerySchema, searchClubsResponseSchema } from "@futrob/api-contracts";
import {
  createAnonymousProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import {
  apiErrorResponse,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";
import { BFF_RATE_LIMIT_POLICY } from "@/shared/infrastructure/rate-limit/bff-rate-limiter.ts";
import { enforceBffRateLimit } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

/** Signed-out landing search (no actor), limited per IP. */
export const Route = createFileRoute("/api/v1/public/game-data/clubs/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client, requestId } = await createAnonymousProductApiClient(request);
          const rejection = await enforceBffRateLimit({
            request,
            actorId: null,
            requestId,
            policy: BFF_RATE_LIMIT_POLICY.publicClubSearch,
          });
          if (rejection) return rejection;
          const parsed = searchClubsQuerySchema.safeParse(queryRecord(new URL(request.url)));
          if (!parsed.success) {
            return apiErrorResponse(400, {
              code: "api.validation_error",
              messageKey: "errors.api.validation_error",
              details: { issues: parsed.error.issues },
            });
          }
          return jsonResponse(
            searchClubsResponseSchema.parse(
              await client.gameData.clubs.searchAnonymously(parsed.data),
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
