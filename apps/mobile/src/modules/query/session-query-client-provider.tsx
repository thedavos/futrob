import { useSyncExternalStore, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient, type QueryFilters } from "@tanstack/react-query";
import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";
import {
  getSessionGeneration,
  subscribeSessionGeneration,
  type SessionGeneration,
} from "@/modules/identity/session-store";
import { belongsToEndedSession } from "./query-keys";

export function useSessionGeneration(): SessionGeneration {
  return useSyncExternalStore(
    subscribeSessionGeneration,
    getSessionGeneration,
    getSessionGeneration,
  );
}

/**
 * Provides `client` and, whenever the session changes, cancels and drops every query a
 * previous session started, so its data and its in-flight responses never reach the next one.
 * Queries outside the session scope are kept.
 */
export function SessionQueryClientProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  useExternalSync(
    () =>
      subscribeSessionGeneration(() => {
        const current = getSessionGeneration();
        const filters: QueryFilters = {
          predicate: (query) => belongsToEndedSession(query.queryKey, current),
        };
        void client.cancelQueries(filters);
        client.removeQueries(filters);
      }),
    [client],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
