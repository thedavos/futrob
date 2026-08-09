import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys.ts";

export function invalidateEffectiveAccessQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all });
}
