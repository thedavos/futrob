import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FutrobApiError } from "@futrob/sdk";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import type { ResolveScheduleChangeRequestBody } from "@futrob/api-contracts";
import { scheduleChangeBrowserClient } from "./schedule-change-browser-client.ts";
import type { ScheduleChangesState } from "./schedule-changes-section.tsx";

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
    return {
      kind: "ready",
      requests: query.data.requests,
      refreshing: query.isFetching,
      refreshFailed: query.isRefetchError,
      refresh,
      resolve: async (requestId: string, input: ResolveScheduleChangeRequestBody) => {
        try {
          await scheduleChangeBrowserClient().resolveScheduleChangeRequest(
            encounterId,
            requestId,
            input,
          );
        } catch (error) {
          if (error instanceof FutrobApiError && [401, 403, 404, 409].includes(error.status)) {
            await query.refetch();
          }
          throw error;
        }
        await Promise.all([
          client.invalidateQueries({ queryKey: queryKeys.encounters.all }),
          client.invalidateQueries({ queryKey: queryKeys.competitions.all }),
          client.invalidateQueries({ queryKey: queryKeys.players.meNextEncounter() }),
        ]);
      },
    };
  }
  if (query.isError) return { kind: "error", retry: refresh };
  return { kind: "loading" };
}
