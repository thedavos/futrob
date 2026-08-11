import { providerSyncJobResponseSchema } from "@futrob/api-contracts";

const MAX_QUEUE_DELAY_SECONDS = 43_200;

export interface GameDataSyncQueueMessage {
  readonly jobId: string;
  readonly requestId: string;
}

export async function handleGameDataSyncJob(
  message: GameDataSyncQueueMessage,
  deps: {
    readonly fetcher: typeof fetch;
    readonly apiBaseUrl: string;
    readonly internalJobSecret: string;
    readonly now?: () => Date;
  },
): Promise<
  { readonly action: "ack" } | { readonly action: "retry"; readonly delaySeconds: number }
> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/game-data/sync-jobs/${encodeURIComponent(message.jobId)}/run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.internalJobSecret}`,
        "X-Request-ID": message.requestId,
      },
    },
  );
  if (response.status === 409) {
    return { action: "ack" };
  }
  if (!response.ok) {
    throw new Error(`Provider sync runner returned ${response.status}`);
  }
  const raw: unknown = await response.json().catch(() => null);
  const job = providerSyncJobResponseSchema.parse(raw);
  if (job.status === "retry_scheduled" || job.status === "queued") {
    return {
      action: "retry",
      delaySeconds: retryDelaySeconds(job.availableAt, deps.now?.() ?? new Date()),
    };
  }
  if (job.status === "running") {
    return {
      action: "retry",
      delaySeconds: retryDelaySeconds(job.leaseExpiresAt, deps.now?.() ?? new Date()),
    };
  }
  return { action: "ack" };
}

export async function recoverNextProviderSyncJob(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/game-data/sync-jobs/run-next`,
    { method: "POST", headers: { Authorization: `Bearer ${deps.internalJobSecret}` } },
  );
  if (!response.ok) {
    throw new Error(`Provider sync recovery returned ${response.status}`);
  }
}

function retryDelaySeconds(timestamp: string | null, now: Date): number {
  if (!timestamp) return 1;
  return Math.min(
    MAX_QUEUE_DELAY_SECONDS,
    Math.max(1, Math.ceil((new Date(timestamp).getTime() - now.getTime()) / 1_000)),
  );
}
