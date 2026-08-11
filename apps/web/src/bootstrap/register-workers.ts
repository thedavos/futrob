import {
  handleGameDataSyncJob,
  type GameDataSyncQueueMessage,
} from "@/workers/game-data-sync.worker.ts";

export interface QueueMessage<T> {
  readonly body: T;
  ack(): void;
  retry(options?: { readonly delaySeconds?: number }): void;
}

export interface QueueBatch {
  readonly messages: readonly QueueMessage<unknown>[];
}

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
          if (!isGameDataSyncQueueMessage(message.body)) {
            message.ack();
            return;
          }
          try {
            const result = await handleGameDataSyncJob(message.body, deps);
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

function isGameDataSyncQueueMessage(value: unknown): value is GameDataSyncQueueMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "jobId" in value &&
    typeof value.jobId === "string" &&
    value.jobId.length > 0 &&
    "requestId" in value &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0
  );
}
