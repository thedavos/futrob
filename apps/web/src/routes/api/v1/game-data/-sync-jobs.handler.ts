import {
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
  type RequestId,
} from "@futrob/api-contracts";
import type { FutrobClient } from "@futrob/sdk";
import {
  productApiBffErrorResponse,
  productApiBffErrorResponseForError,
} from "@/context/product-api-bff-error-response.ts";
import { apiErrorResponse, jsonResponse } from "@/shared/infrastructure/http/api-response.ts";
import {
  enqueueProviderSyncJob,
  type ProviderSyncJobQueue,
} from "@/workers/provider-sync-job.producer.ts";

type ProviderSyncJobClient = {
  readonly authorization: Pick<FutrobClient["authorization"], "getEffectiveAccess">;
  readonly gameData: {
    readonly syncJobs: Pick<FutrobClient["gameData"]["syncJobs"], "enqueue">;
  };
};

export async function handleProviderSyncJobRequest(
  request: Request,
  deps: {
    readonly authenticate: () => Promise<{
      readonly client: ProviderSyncJobClient;
      readonly requestId: RequestId;
    }>;
    readonly getQueue: () => Promise<ProviderSyncJobQueue | undefined>;
  },
): Promise<Response> {
  try {
    const { client, requestId } = await deps.authenticate();
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

    const access = await client.authorization.getEffectiveAccess(
      { organizationId: parsed.data.organizationId },
      ["organizations.read"],
    );
    const canReadOrganization = access.permissions.some(
      ({ permission, allowed }) => permission === "organizations.read" && allowed,
    );
    if (!canReadOrganization) {
      return apiErrorResponse(
        403,
        {
          code: "authorization.forbidden",
          messageKey: "errors.authorization.forbidden",
        },
        requestId,
      );
    }

    const queue = await deps.getQueue();
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
    if (!(error instanceof Error)) {
      return productApiBffErrorResponse({ kind: "unexpected" });
    }
    return productApiBffErrorResponseForError(error);
  }
}
