import { createFileRoute } from "@tanstack/react-router";
import { openMatchDispute } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/disputes",
)({
  server: {
    handlers: {
      POST: ({ request, params }) => openMatchDispute(request, params),
    },
  },
});
