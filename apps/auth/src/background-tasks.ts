/**
 * Work that runs after the response is sent (account email). Shutdown waits
 * for it so a deploy does not drop a reset link mid-send.
 */
export function createBackgroundTasks(onError: (cause: unknown) => void) {
  const pending = new Set<Promise<void>>();
  return {
    run(task: Promise<unknown>): void {
      const tracked: Promise<void> = task.then(
        () => undefined,
        (cause: unknown) => onError(cause),
      );
      pending.add(tracked);
      void tracked.finally(() => pending.delete(tracked));
    },
    async drain(): Promise<void> {
      await Promise.allSettled([...pending]);
    },
  };
}
