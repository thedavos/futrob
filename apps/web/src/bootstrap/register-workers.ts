import { z } from "zod";
import { handleGameDataSyncJob } from "@/workers/game-data-sync.worker.ts";

export interface QueueMessage<T> {
  readonly body: T;
  ack(): void;
  retry(options?: { readonly delaySeconds?: number }): void;
}

export interface QueueBatch {
  readonly messages: readonly QueueMessage<unknown>[];
}

const gameDataSyncQueueMessageSchema = z.object({
  jobId: z.string().min(1),
  requestId: z.string().min(1),
});

export function registerWorkers(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
  readonly now?: () => Date;
}) {
  return {
    async queue(batch: QueueBatch): Promise<void> {
      await Promise.all(
        batch.messages.map(async (message) => {
          const parsed = gameDataSyncQueueMessageSchema.safeParse(message.body);
          if (!parsed.success) {
            message.ack();
            return;
          }
          try {
            const result = await handleGameDataSyncJob(parsed.data, deps);
            if (result.action === "ack") {
              message.ack();
            } else {
              message.retry({ delaySeconds: result.delaySeconds });
            }
          } catch {
            message.retry();
          }
        }),
      );
    },
  };
}
