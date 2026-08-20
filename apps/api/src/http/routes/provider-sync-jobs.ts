import { Hono } from "hono";
import {
  enqueueProviderSyncJobRequestSchema,
  providerSyncJobResponseSchema,
} from "@futrob/api-contracts";
import type { ProviderSyncJob } from "@futrob/game-data";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation, logCorrelatedInfo } from "@/context/request-correlation.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import { createInternalJobAuthMiddleware } from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerProviderSyncJobRoutes(app: Hono, deps: AppDeps): void {
  const internal = new Hono();
  internal.use("*", createInternalJobAuthMiddleware(deps.internalJobSecret));

  internal.post("/internal/game-data/sync-jobs", async (c) => {
    const parsed = enqueueProviderSyncJobRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const input = parsed.data;
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

  internal.post("/internal/game-data/sync-jobs/run-next", async () => {
    const job = await deps.modules.gameData.executeProviderSyncJob.execute();
    return job ? jsonResponse(toSyncJobDto(job)) : new Response(null, { status: 204 });
  });

  internal.post("/internal/game-data/sync-jobs/:jobId/run", async (c) => {
    const jobId = c.req.param("jobId");
    logCorrelatedInfo("provider.sync_job.started", { jobId });
    const job = await deps.modules.gameData.executeProviderSyncJob.execute(jobId);
    logCorrelatedInfo("provider.sync_job.completed", {
      jobId,
      status: job?.status ?? "not_claimable",
      attempt: job?.attempt ?? null,
    });
    return job
      ? jsonResponse(toSyncJobDto(job))
      : jsonResponse({ code: "game_data.sync_job_not_claimable" }, 409);
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
