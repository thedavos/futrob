import startServer from "@tanstack/react-start/server-entry";
import { registerWorkers, type QueueBatch } from "@/bootstrap/register-workers.ts";
import { recoverNextProviderSyncJob } from "@/workers/game-data-sync.worker.ts";

interface WorkerEnv {
  readonly FUTROB_API_BASE_URL: string;
  readonly INTERNAL_JOB_SECRET: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
}

export default {
  fetch: startServer.fetch,
  async queue(batch: QueueBatch, env: WorkerEnv): Promise<void> {
    await registerWorkers({
      fetcher: fetch,
      apiBaseUrl: env.FUTROB_API_BASE_URL,
      internalJobSecret: env.INTERNAL_JOB_SECRET,
    }).queue(batch);
  },
  scheduled(_controller: ScheduledController, env: WorkerEnv, context: ExecutionContext): void {
    context.waitUntil(
      recoverNextProviderSyncJob({
        fetcher: fetch,
        apiBaseUrl: env.FUTROB_API_BASE_URL,
        internalJobSecret: env.INTERNAL_JOB_SECRET,
      }),
    );
  },
};
