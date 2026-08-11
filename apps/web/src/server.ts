import startServer from "@tanstack/react-start/server-entry";
import { registerWorkers, type QueueBatch } from "@/bootstrap/register-workers.ts";

interface WorkerEnv {
  readonly FUTROB_API_BASE_URL: string;
  readonly INTERNAL_JOB_SECRET: string;
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
};
