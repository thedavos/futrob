import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleListEncounterCandidates } from "@/modules/results/server/encounter-reads.ts";

export const Route = createFileRoute("/api/v1/encounters/$encounterId/candidates")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListEncounterCandidates(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
