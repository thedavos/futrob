/**
 * Statuses the product API uses as a final answer: missing session, missing permission,
 * or a resource that is not there.
 */
export type AuthoritativeStatus = 401 | 403 | 404;

export type StoredRead<T> =
  | { readonly outcome: "value"; readonly value: T }
  | { readonly outcome: "refused"; readonly status: AuthoritativeStatus };

export function authoritativeStatus(status: number): AuthoritativeStatus | undefined {
  if (status === 401 || status === 403 || status === 404) return status;
  return undefined;
}

/**
 * Stores a 401, 403, or 404 as the query value. TanStack Query keeps the last successful
 * `data` across later errors, so a thrown refusal would let a cached success return after
 * the next 500. A stored refusal replaces that success until the same key reads again.
 */
export async function readKeepingRefusal<T>(
  read: () => Promise<T>,
  statusOf: (error: Error) => number | undefined,
): Promise<StoredRead<T>> {
  try {
    return { outcome: "value", value: await read() };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const status = authoritativeStatus(statusOf(error) ?? 0);
    if (status !== undefined) return { outcome: "refused", status };
    throw error;
  }
}

/** 401 and 403 are both "this actor may not read this"; 404 is a missing resource. */
export function refusalLabel(status: AuthoritativeStatus): "forbidden" | "not_found" {
  switch (status) {
    case 404:
      return "not_found";
    case 401:
    case 403:
      return "forbidden";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}
