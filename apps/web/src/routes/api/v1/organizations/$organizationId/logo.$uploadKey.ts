import { createFileRoute } from "@tanstack/react-router";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  MAX_IMAGE_BYTES,
  readImageBytes,
  storeOrganizationLogo,
} from "@/shared/infrastructure/media/media-storage.ts";

/**
 * Stores the image bytes in R2 under `organization-logos/{organizationId}/{uploadKey}.{ext}`.
 * The logo only changes once the client registers the returned key through `logo`.
 */
export const Route = createFileRoute("/api/v1/organizations/$organizationId/logo/$uploadKey")({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        try {
          const declaredLength = Number(request.headers.get("content-length") ?? "0");
          if (declaredLength > MAX_IMAGE_BYTES) {
            return apiErrorResponse(413, {
              code: "media.too_large",
              messageKey: "errors.media.too_large",
            });
          }
          const { client } = await createAuthenticatedProductApiClient(request);
          const access = await client.authorization.getEffectiveAccess(
            { organizationId: params.organizationId },
            [ORGANIZATION_PERMISSION.update],
          );
          const allowed = access.permissions.some(
            (entry) => entry.permission === ORGANIZATION_PERMISSION.update && entry.allowed,
          );
          if (!allowed) {
            return apiErrorResponse(403, {
              code: "authorization.forbidden",
              messageKey: "errors.authorization.forbidden",
            });
          }
          const { MEDIA_BUCKET } = await getWorkerBindings();
          if (!MEDIA_BUCKET) return productApiBffErrorResponse({ kind: "unexpected" });
          const bytes = await readImageBytes(request);
          if (bytes === null) {
            return apiErrorResponse(413, {
              code: "media.too_large",
              messageKey: "errors.media.too_large",
            });
          }
          const stored = await storeOrganizationLogo({
            bucket: MEDIA_BUCKET,
            organizationId: params.organizationId,
            uploadKey: params.uploadKey,
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
