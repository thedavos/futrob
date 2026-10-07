import { createFileRoute } from "@tanstack/react-router";
import { proposeAlternativeOfficialSelection } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/proposals/$proposalId/alternative",
)({
  server: {
    handlers: {
      POST: ({ request, params }) => proposeAlternativeOfficialSelection(request, params),
    },
  },
});
