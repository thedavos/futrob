import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import { handleProviderSyncJobRequest } from "./-sync-jobs.handler.ts";

export const Route = createFileRoute("/api/v1/game-data/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleProviderSyncJobRequest(request, {
          authenticate: () => createAuthenticatedProductApiClient(request),
          getQueue: async () => (await getWorkerBindings()).JOB_QUEUE,
        });
      },
    },
  },
});
