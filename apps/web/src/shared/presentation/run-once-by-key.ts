/**
 * Dedupes an async operation by key for the lifetime of the returned handle.
 * Concurrent callers share one promise; a settled success or failure stays
 * cached until `forget`, so remount, refocus, and StrictMode cannot repeat it.
 */
export function createRunOnceByKey<T>() {
  const inFlight = new Map<string, Promise<T>>();

  return {
    run(key: string, execute: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) return existing;
      const started = execute();
      inFlight.set(key, started);
      return started;
    },
    forget(key: string): void {
      inFlight.delete(key);
    },
    clear(): void {
      inFlight.clear();
    },
  };
}
