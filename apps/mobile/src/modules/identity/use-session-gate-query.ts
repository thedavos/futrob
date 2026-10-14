import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { resolveSessionGate } from "./session-gate.ts";

export function useSessionGateQuery() {
  return useQuery({
    queryKey: mobileQueryKeys.sessionGate(),
    queryFn: () => resolveSessionGate(),
  });
}

export function useResetSessionGate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.resetQueries({ queryKey: mobileQueryKeys.sessionGate() });
  };
}
