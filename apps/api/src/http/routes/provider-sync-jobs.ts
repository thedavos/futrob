import type { Hono } from "hono";
import { providerSyncJobResponseSchema } from "@futrob/api-contracts";
import type { ProviderSyncJob } from "@futrob/game-data";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation, logCorrelatedInfo } from "@/context/request-correlation.ts";
import { apiErrorResponse } from "@/http/errors.ts";
import { createInternalOpenApiRouter } from "@/http/openapi/router.ts";
import {
  persistProviderSyncJobRoute,
  recoverNextProviderSyncJobRoute,
  runProviderSyncJobRoute,
} from "@/http/openapi/routes/game-data.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerProviderSyncJobRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);

  internal.openapi(persistProviderSyncJobRoute, async (c) => {
    const input = c.req.valid("json");
    const job = await deps.modules.gameData.enqueueProviderSyncJob.execute({
      organizationId: input.organizationId,
      providerKey: input.providerKey,
      requestId: currentRequestCorrelation()?.requestId ?? crypto.randomUUID(),
      sync: {
        externalClubId: input.externalClubId,
        platform: input.platform,
        gameEdition: input.gameEdition,
        matchType: input.matchType,
        maxResultCount: input.maxResultCount,
      },
    });
    return jsonResponse(toSyncJobDto(job), 202);
  });

  internal.openapi(recoverNextProviderSyncJobRoute, async () => {
    const job = await deps.modules.gameData.executeProviderSyncJob.execute();
    return job ? jsonResponse(toSyncJobDto(job)) : new Response(null, { status: 204 });
  });

  internal.openapi(runProviderSyncJobRoute, async (c) => {
    const jobId = c.req.valid("param").jobId;
    logCorrelatedInfo("provider.sync_job.started", { jobId });
    const job = await deps.modules.gameData.executeProviderSyncJob.execute(jobId);
    logCorrelatedInfo("provider.sync_job.completed", {
      jobId,
      status: job?.status ?? "not_claimable",
      attempt: job?.attempt ?? null,
    });
    return job
      ? jsonResponse(toSyncJobDto(job))
      : apiErrorResponse(409, {
          code: "game_data.sync_job_not_claimable",
          messageKey: "errors.game_data.sync_job_not_claimable",
        });
  });

  app.route("/", internal);
}

function toSyncJobDto(job: ProviderSyncJob) {
  const dto = {
    id: job.id,
    organizationId: job.organizationId,
    providerKey: job.providerKey,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    requestId: job.requestId,
    availableAt:
      job.status === "queued" || job.status === "retry_scheduled"
        ? job.availableAt.toISOString()
        : null,
    leaseExpiresAt: job.status === "running" ? job.leaseExpiresAt.toISOString() : null,
    updatedAt: job.updatedAt.toISOString(),
  };
  if (job.status === "retry_scheduled" || job.status === "dead") {
    return providerSyncJobResponseSchema.parse({ ...dto, lastErrorCode: job.lastErrorCode });
  }
  return providerSyncJobResponseSchema.parse(dto);
}
