import { createFileRoute } from "@tanstack/react-router";
import { getTeamOfficialSelection } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/",
)({
  server: {
    handlers: {
      GET: ({ request, params }) => getTeamOfficialSelection(request, params),
    },
  },
});
