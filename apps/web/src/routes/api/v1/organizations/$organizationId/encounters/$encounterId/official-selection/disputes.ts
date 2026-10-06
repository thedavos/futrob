import { createFileRoute } from "@tanstack/react-router";
import {
  getOperatorOfficialSelection,
  openMatchDispute,
} from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/disputes",
)({
  server: {
    handlers: {
      GET: ({ request, params }) => getOperatorOfficialSelection(request, params),
      POST: ({ request, params }) => openMatchDispute(request, params),
    },
  },
});
