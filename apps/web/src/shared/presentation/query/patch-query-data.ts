import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Writes `update(current)` into one cached query and returns how to put the previous data back.
 * An in-flight fetch of that query is cancelled first so it cannot overwrite the patch, and an
 * uncached query is left alone.
 */
export async function patchQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: (current: T) => T,
): Promise<() => void> {
  await queryClient.cancelQueries({ queryKey, exact: true });
  const previous = queryClient.getQueryData<T>(queryKey);
  if (previous === undefined) return () => {};
  queryClient.setQueryData<T>(queryKey, update(previous));
  return () => queryClient.setQueryData<T>(queryKey, previous);
}
