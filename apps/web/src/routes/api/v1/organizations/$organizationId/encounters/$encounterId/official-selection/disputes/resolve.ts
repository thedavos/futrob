import { createFileRoute } from "@tanstack/react-router";
import { resolveMatchDispute } from "@/modules/results/server/official-selection.ts";

export const Route = createFileRoute(
  "/api/v1/organizations/$organizationId/encounters/$encounterId/official-selection/disputes/resolve",
)({
  server: { handlers: { POST: ({ request, params }) => resolveMatchDispute(request, params) } },
});
