export type StatisticsProjectionQueueMessage = Readonly<Record<string, never>>;

/**
 * Queue consumer: react to results.official-result-approved.
 */
export async function handleStatisticsProjectionJob(
  _message: StatisticsProjectionQueueMessage,
): Promise<void> {
  throw new Error("statistics-projection.worker: not implemented");
}
