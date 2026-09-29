import { createFileRoute } from "@tanstack/react-router";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  MAX_COVER_BYTES,
  readCompetitionCoverBytes,
  storeCompetitionCover,
} from "@/shared/infrastructure/media/competition-cover-storage.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/covers/$creationKey",
)({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        try {
          const declaredLength = Number(request.headers.get("content-length") ?? "0");
          if (declaredLength > MAX_COVER_BYTES) {
            return apiErrorResponse(413, {
              code: "media.too_large",
              messageKey: "errors.media.too_large",
            });
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          const access = await client.authorization.getEffectiveAccess(
            { organizationId: params.organizationId },
            [COMPETITION_PERMISSION.update],
          );
          const allowed = access.permissions.some(
            (entry) => entry.permission === COMPETITION_PERMISSION.update && entry.allowed,
          );
          if (!allowed) {
            return apiErrorResponse(403, {
              code: "authorization.forbidden",
              messageKey: "errors.authorization.forbidden",
            });
          }
          const { MEDIA_BUCKET } = await getWorkerBindings();
          if (!MEDIA_BUCKET) return productApiBffErrorResponse({ kind: "unexpected" });
          const bytes = await readCompetitionCoverBytes(request);
          if (bytes === null) {
            return apiErrorResponse(413, {
              code: "media.too_large",
              messageKey: "errors.media.too_large",
            });
          }
          const stored = await storeCompetitionCover({
            bucket: MEDIA_BUCKET,
            organizationId: params.organizationId,
            creationKey: params.creationKey,
            bytes,
          });
          if (!stored.ok) {
            return apiErrorResponse(stored.status, {
              code: stored.code,
              messageKey: `errors.${stored.code}`,
            });
          }
          return jsonResponse({ key: stored.key }, 201);
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
