import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleListCompetitionEncounters } from "@/modules/results/server/encounter-reads.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/competitions/$competitionId/encounters",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListCompetitionEncounters(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
