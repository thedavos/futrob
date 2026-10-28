import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { pendingRosterInvitation } from "./roster-invitation-link.ts";
import { resolveSessionGate } from "./session-gate.ts";

export function useSessionGateQuery() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.sessionGate(generation),
    queryFn: async () => {
      const gate = await resolveSessionGate();
      const token = gate.kind === "ready" ? await pendingRosterInvitation() : null;
      return token && gate.kind === "ready"
        ? { ...gate, route: `/roster-invitations/accept/${encodeURIComponent(token)}` }
        : gate;
    },
  });
}

export function useResetSessionGate() {
  const queryClient = useQueryClient();
  const generation = useSessionGeneration();
  return () => {
    void queryClient.resetQueries({ queryKey: mobileQueryKeys.sessionGate(generation) });
  };
}
