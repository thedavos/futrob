import type { ProviderSyncJobResponse } from "@futrob/api-contracts";
import type { GameDataSyncQueueMessage } from "./game-data-sync.worker.ts";

export interface ProviderSyncJobQueue {
  send(message: GameDataSyncQueueMessage): Promise<void>;
}

export async function enqueueProviderSyncJob(input: {
  readonly enqueue: () => Promise<ProviderSyncJobResponse>;
  readonly queue: ProviderSyncJobQueue;
}): Promise<ProviderSyncJobResponse> {
  const job = await input.enqueue();
  await input.queue.send({ jobId: job.id, requestId: job.requestId });
  return job;
}
