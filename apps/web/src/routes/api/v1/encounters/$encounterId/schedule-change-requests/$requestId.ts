import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { handleGetScheduleChangeRequest } from "@/modules/scheduling/server/schedule-change-requests.handler.ts";

export const Route = createFileRoute(
  "/api/v1/encounters/$encounterId/schedule-change-requests/$requestId",
)({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleGetScheduleChangeRequest(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
