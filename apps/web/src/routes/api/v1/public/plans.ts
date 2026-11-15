import { createFileRoute } from "@tanstack/react-router";
import { listPublicPlansResponseSchema } from "@futrob/api-contracts";
import {
  createAnonymousProductApiClient,
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/create-authenticated-product-api-client.ts";
import { jsonResponse } from "@/shared/infrastructure/http/api-response.ts";

/** Same-origin read of the public plan catalog (no actor): onboarding gates formats with it. */
export const Route = createFileRoute("/api/v1/public/plans")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { client } = await createAnonymousProductApiClient(request);
          return jsonResponse(
            listPublicPlansResponseSchema.parse(await client.billing.listPublicPlans()),
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
