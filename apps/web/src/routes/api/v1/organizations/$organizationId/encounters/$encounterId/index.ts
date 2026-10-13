import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleGetEncounterView } from "@/modules/results/server/encounter-reads.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleGetEncounterView(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
