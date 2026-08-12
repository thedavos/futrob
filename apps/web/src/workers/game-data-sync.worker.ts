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
  },
): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/api/v1/internal/game-data/sync-jobs/${encodeURIComponent(message.jobId)}/run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.internalJobSecret}`,
        "X-Request-ID": message.requestId,
      },
    },
  );
  if (!response.ok && response.status !== 409) {
    throw new Error(`Provider sync runner returned ${response.status}`);
  }
}
