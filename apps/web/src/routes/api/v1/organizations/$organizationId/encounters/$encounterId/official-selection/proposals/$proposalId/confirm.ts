import { createFileRoute } from "@tanstack/react-router";
import { confirmOfficialSelection } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/proposals/$proposalId/confirm",
)({
  server: {
    handlers: {
      POST: ({ request, params }) => confirmOfficialSelection(request, params),
    },
  },
});
