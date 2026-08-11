import { Hono } from "hono";
import { z } from "zod";
import type { ProviderSyncJob } from "@futrob/game-data";
import type { AppDeps } from "@/app.ts";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { validationErrorResponse } from "@/http/errors.ts";
import { createInternalJobAuthMiddleware } from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

const enqueueSchema = z.object({
  organizationId: z.string().trim().min(1),
  providerKey: z.literal("ea-clubs"),
  externalClubId: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  gameEdition: z.string().trim().min(1),
  matchType: z.string().trim().min(1),
  maxResultCount: z.number().int().min(1).max(100),
});

export function registerProviderSyncJobRoutes(app: Hono, deps: AppDeps): void {
  const internal = new Hono();
  internal.use("*", createInternalJobAuthMiddleware(deps.internalJobSecret));

  internal.post("/internal/game-data/sync-jobs", async (c) => {
    const parsed = enqueueSchema.safeParse(await c.req.json().catch(() => null));
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

  internal.post("/internal/game-data/sync-jobs/:jobId/run", async (c) => {
    const job = await deps.modules.gameData.executeProviderSyncJob.execute(c.req.param("jobId"));
    return job
      ? jsonResponse(toSyncJobDto(job))
      : jsonResponse({ code: "game_data.sync_job_not_claimable" }, 409);
  });

  app.route("/", internal);
}

function toSyncJobDto(job: ProviderSyncJob) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    providerKey: job.providerKey,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    requestId: job.requestId,
    updatedAt: job.updatedAt.toISOString(),
    ...(job.status === "retry_scheduled" || job.status === "dead"
      ? { lastErrorCode: job.lastErrorCode }
      : {}),
  };
}
