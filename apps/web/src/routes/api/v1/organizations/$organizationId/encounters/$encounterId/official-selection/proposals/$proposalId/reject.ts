import { createFileRoute } from "@tanstack/react-router";
import { rejectOfficialSelection } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/proposals/$proposalId/reject",
)({
  server: {
    handlers: {
      POST: ({ request, params }) => rejectOfficialSelection(request, params),
    },
  },
});
