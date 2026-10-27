import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { resolveSessionGate } from "./session-gate.ts";

export function useSessionGateQuery() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.sessionGate(generation),
    queryFn: () => resolveSessionGate(),
  });
}

export function useResetSessionGate() {
  const queryClient = useQueryClient();
  const generation = useSessionGeneration();
  return () => {
    void queryClient.resetQueries({ queryKey: mobileQueryKeys.sessionGate(generation) });
  };
}
