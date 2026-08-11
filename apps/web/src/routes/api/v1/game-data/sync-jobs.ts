import { createFileRoute } from "@tanstack/react-router";
import {
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
} from "@futrob/api-contracts";
import {
  createAuthenticatedProductApiClient,
  productApiBffErrorResponse,
} from "@/context/create-authenticated-product-api-client.ts";
import { getWorkerEnv } from "@/modules/identity/adapters/auth/worker-env.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import { enqueueProviderSyncJob } from "@/workers/provider-sync-job.producer.ts";

export const Route = createFileRoute("/api/v1/game-data/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { client, requestId } = await createAuthenticatedProductApiClient(request);
          const parsed = enqueueProviderSyncJobRequestSchema.safeParse(
            await request.json().catch(() => null),
          );
          if (!parsed.success) {
            return apiErrorResponse(
              400,
              {
                code: "api.validation_error",
                messageKey: "errors.api.validation_error",
                details: { issues: parsed.error.issues },
              },
              requestId,
            );
          }
          const queue = getWorkerEnv().JOB_QUEUE;
          if (!queue) {
            return apiErrorResponse(
              503,
              {
                code: "game_data.sync_queue_unavailable",
                messageKey: "errors.game_data.sync_queue_unavailable",
              },
              requestId,
            );
          }
          const job = await enqueueProviderSyncJob({
            enqueue: () => client.gameData.syncJobs.enqueue(parsed.data),
            queue,
          });
          return jsonResponse(providerSyncJobResponseSchema.parse(job), 202);
        } catch (error) {
          return productApiBffErrorResponse(error);
        }
      },
    },
  },
});
