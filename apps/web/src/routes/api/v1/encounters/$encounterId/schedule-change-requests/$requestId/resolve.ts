import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleResolveScheduleChangeRequest } from "@/modules/scheduling/server/schedule-change-requests.handler.ts";

export const Route = createFileRoute(
  "/api/v1/encounters/$encounterId/schedule-change-requests/$requestId/resolve",
)({
  server: {
    handlers: {
      POST: ({ request, params }) =>
        handleResolveScheduleChangeRequest(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
