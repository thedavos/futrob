import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import {
  handleCreateScheduleChangeRequest,
  handleListScheduleChangeRequests,
} from "@/modules/scheduling/server/schedule-change-requests.handler.ts";

export const Route = createFileRoute("/api/v1/encounters/$encounterId/schedule-change-requests")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleListScheduleChangeRequests(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
      POST: ({ request, params }) =>
        handleCreateScheduleChangeRequest(request, params, (incoming) =>
          createAuthenticatedProductApiClient(incoming),
        ),
    },
  },
});
