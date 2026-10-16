import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FutrobApiError } from "@futrob/sdk";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { scheduleChangeBrowserClient } from "./schedule-change-browser-client.ts";
import type { ScheduleChangeCommands, ScheduleChangesState } from "./schedule-changes-section.tsx";

const requestKey = (encounterId: string) =>
  [...queryKeys.encounters.all, "schedule-change-requests", encounterId] as const;

export function useScheduleChanges(encounterId: string, enabled: boolean): ScheduleChangesState {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: requestKey(encounterId),
    queryFn: ({ signal }) =>
      scheduleChangeBrowserClient().listScheduleChangeRequests(encounterId, { signal }),
    enabled,
    retry: (attempt, error) =>
      !(error instanceof FutrobApiError && [401, 403, 404].includes(error.status)) && attempt < 2,
  });
  const refresh = () => {
    void query.refetch();
  };
  const refused =
    query.error instanceof FutrobApiError && [401, 403, 404].includes(query.error.status);
  if (refused) return { kind: "forbidden" };
  if (query.data) {
    // Success or failure, the hero, slots and list must show what the server now holds.
    const run = async <Result>(command: () => Promise<Result>): Promise<void> => {
      try {
        await command();
      } finally {
        await Promise.all([
          client.invalidateQueries({ queryKey: queryKeys.encounters.all }),
          client.invalidateQueries({ queryKey: queryKeys.competitions.all }),
          client.invalidateQueries({ queryKey: queryKeys.players.meNextEncounter() }),
        ]);
      }
    };
    const api = scheduleChangeBrowserClient();
    const commands: ScheduleChangeCommands = {
      create: (body) => run(() => api.createScheduleChangeRequest(encounterId, body)),
      accept: (target, body) =>
        run(() => api.acceptScheduleChangeProposal({ encounterId, ...target }, body)),
      reject: (target, body) =>
        run(() => api.rejectScheduleChangeProposal({ encounterId, ...target }, body)),
      counter: (target, body) =>
        run(() => api.counterScheduleChangeProposal({ encounterId, ...target }, body)),
      resolve: (requestId, body) =>
        run(() => api.resolveScheduleChangeRequest(encounterId, requestId, body)),
    };
    return {
      kind: "ready",
      requests: query.data.requests,
      creation: query.data.creation,
      refreshing: query.isFetching,
      refreshFailed: query.isRefetchError,
      refresh,
      commands,
    };
  }
  if (query.isError) return { kind: "error", retry: refresh };
  return { kind: "loading" };
}
