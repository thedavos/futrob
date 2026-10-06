import { createFileRoute } from "@tanstack/react-router";
import { reviewMatchDispute } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/disputes/review",
)({
  server: { handlers: { POST: ({ request, params }) => reviewMatchDispute(request, params) } },
});
