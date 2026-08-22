import startServer from "@tanstack/react-start/server-entry";
import { registerWorkers, type QueueBatch } from "@/bootstrap/register-workers.ts";
import { captureWorkerError, withWorkerSentry } from "@/observability/sentry.ts";
import { createConsoleLogger } from "@futrob/logger";

const logger = createConsoleLogger({ format: "plain", scope: "worker" });
import { recoverNextProviderSyncJob } from "@/workers/game-data-sync.worker.ts";

interface WorkerEnv {
  readonly FUTROB_API_BASE_URL: string;
  readonly INTERNAL_JOB_SECRET: string;
  readonly NODE_ENV?: string;
  readonly SENTRY_DSN?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
}

const worker = {
  fetch: startServer.fetch,
  async queue(batch: QueueBatch, env: WorkerEnv): Promise<void> {
    logger.info("queue.batch.received", { messageCount: batch.messages.length });
    const startedAt = Date.now();
    try {
      await registerWorkers({
        fetcher: fetch,
        apiBaseUrl: env.FUTROB_API_BASE_URL,
        internalJobSecret: env.INTERNAL_JOB_SECRET,
      }).queue(batch);
    } catch (error) {
      logger.error("queue.batch.failed", {
        messageCount: batch.messages.length,
        durationMs: Date.now() - startedAt,
      });
      captureWorkerError(error, { handler: "queue" });
      throw error;
    }
    logger.info("queue.batch.completed", { durationMs: Date.now() - startedAt });
  },
  scheduled(controller: ScheduledController, env: WorkerEnv, context: ExecutionContext): void {
    context.waitUntil(
      recoverNextProviderSyncJob({
        fetcher: fetch,
        apiBaseUrl: env.FUTROB_API_BASE_URL,
        internalJobSecret: env.INTERNAL_JOB_SECRET,
      }).catch((cause) => {
        captureWorkerError(cause, { handler: "scheduled", cron: controller.cron });
      }),
    );
  },
};

export default withWorkerSentry(worker);
