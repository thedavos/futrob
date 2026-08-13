import { createFileRoute } from "@tanstack/react-router";
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client.ts";
import { getWorkerEnv } from "@/modules/identity/adapters/auth/worker-env.ts";
import { handleProviderSyncJobRequest } from "./-sync-jobs.handler.ts";

export const Route = createFileRoute("/api/v1/game-data/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleProviderSyncJobRequest(request, {
          authenticate: () => createAuthenticatedProductApiClient(request),
          getQueue: () => getWorkerEnv().JOB_QUEUE,
        });
      },
    },
  },
});
