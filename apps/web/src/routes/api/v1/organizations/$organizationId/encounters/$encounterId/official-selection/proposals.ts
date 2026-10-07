import { createFileRoute } from "@tanstack/react-router";
import { proposeOfficialSelection } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/proposals",
)({
  server: {
    handlers: {
      POST: ({ request, params }) => proposeOfficialSelection(request, params),
    },
  },
});
