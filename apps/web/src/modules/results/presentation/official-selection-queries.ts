import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  OfficialSelectionCommandResponse,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import type { Attempt, CommandOutcome, Failure, SelectionRead } from "./selection-draft.ts";

const REFUSED = [401, 403, 404];

const isRefusal = (error: Error | null) =>
  error instanceof FutrobApiError && REFUSED.includes(error.status);

/** Network failures and 5xx leave the outcome unknown: the server may have applied it. */
function failureOf(error: Error): Failure {
  if (!(error instanceof FutrobApiError)) return "unknown";
  if (error.status === 409) return "conflict";
  if (REFUSED.includes(error.status)) return "refused";
  if (error.status === 400 || error.status === 422) return "invalid";
  return "unknown";
}

/**
 * One persisted selection read plus the command path every panel shares: a conflict
 * reloads the read, and an accepted command refreshes every Encounter view.
 */
export function useSelectionRead<Intent>({
  enabled,
  queryKey,
  read,
  send,
}: {
  readonly enabled: boolean;
  readonly queryKey: QueryKey;
  readonly read: (signal: AbortSignal) => Promise<OfficialSelectionViewDto>;
  readonly send: (attempt: Attempt<Intent>) => Promise<OfficialSelectionCommandResponse>;
}): SelectionRead<Intent> {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => read(signal),
    enabled,
    retry: (failureCount, error) => !isRefusal(error) && failureCount < 2,
  });
  const refresh = () => void query.refetch();

  if (query.isError && isRefusal(query.error)) return { kind: "forbidden" };
  if (query.data) {
    return {
      kind: "ready",
      view: query.data,
      refreshing: query.isFetching,
      refreshFailed: query.isRefetchError,
      refresh,
      submit: async (attempt): Promise<CommandOutcome> => {
        try {
          await send(attempt);
        } catch (error) {
          const failure = error instanceof Error ? failureOf(error) : "unknown";
          if (failure === "conflict") await query.refetch();
          return {
            ok: false,
            failure,
            code: error instanceof FutrobApiError ? error.code : null,
          };
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.encounters.all });
        return { ok: true };
      },
    };
  }
  if (query.isError) return { kind: "error", retry: refresh };
  return { kind: "loading" };
}
