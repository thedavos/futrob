import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface QueryDataPatch<T> {
  readonly apply: (current: T) => T;
  /**
   * Undoes only this patch on the data cached when it fails, copying the touched entity back from
   * `previous`, so a later patch to the same query survives.
   */
  readonly revert: (current: T, previous: T) => T;
}

/**
 * Applies `patch` to one cached query and returns how to undo it. An in-flight fetch of that query
 * is cancelled first so it cannot overwrite the patch, and an uncached query is left alone.
 */
export async function patchQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patch: QueryDataPatch<T>,
): Promise<() => void> {
  await queryClient.cancelQueries({ queryKey, exact: true });
  const previous = queryClient.getQueryData<T>(queryKey);
  if (previous === undefined) return () => {};
  queryClient.setQueryData<T>(queryKey, patch.apply(previous));
  return () =>
    queryClient.setQueryData<T>(queryKey, (current) =>
      current === undefined ? current : patch.revert(current, previous),
    );
}
