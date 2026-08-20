export type AnalyticsSnapshotQueueMessage = Readonly<Record<string, never>>;

export async function handleAnalyticsSnapshotJob(
  _message: AnalyticsSnapshotQueueMessage,
): Promise<void> {
  throw new Error("analytics-snapshot.worker: not implemented");
}
