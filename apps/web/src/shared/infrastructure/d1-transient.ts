/**
 * Miniflare D1 throws an internal JSON parse error when two local Workers
 * (web + auth) open the same persist-to SQLite at once. Retry those blips.
 */

const TRANSIENT_D1_MARKERS = [
  "internal error",
  "Failed to parse body as JSON",
  "SQLITE_BUSY",
  "database is locked",
] as const;

function transientCause(error: Error): Error | undefined {
  const cause = error.cause;
  return cause instanceof Error ? cause : undefined;
}

export function isTransientD1Error(error: Error): boolean {
  let current: Error | undefined = error;
  const seen = new Set<Error>();
  while (current !== undefined && !seen.has(current)) {
    const error = current;
    seen.add(error);
    if (TRANSIENT_D1_MARKERS.some((marker) => error.message.includes(marker))) {
      return true;
    }
    current = transientCause(error);
  }
  return false;
}

export async function retryTransientD1<T>(
  operation: () => Promise<T>,
  options: {
    readonly attempts?: number;
    readonly delayMs?: number;
    readonly sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 40;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !isTransientD1Error(error) || attempt === attempts) {
        throw error;
      }
      await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}
