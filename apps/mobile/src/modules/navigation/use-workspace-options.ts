import { useQuery } from "@tanstack/react-query";
import { buildWorkspaceOptions, FutrobApiError, type WorkspaceOptions } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

async function loadWorkspaceOptions(signal: AbortSignal): Promise<WorkspaceOptions> {
  const client = getFutrobClient();
  try {
    const [mine, competitions, profile] = await Promise.all([
      client.organizations.listMine({ signal }),
      client.competitions.listMine({ signal }),
      client.players.getProfile({ signal }),
    ]);
    return buildWorkspaceOptions({
      memberships: mine.memberships,
      competitions: competitions.competitions,
      externalClubs: profile.externalClubs,
    });
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) {
      await onProductUnauthorized(() => undefined);
    }
    throw error;
  }
}

/** The context selector's groups: the actor's clubs, competitions and organizations. */
export function useWorkspaceOptions() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.workspaceOptions(generation),
    queryFn: ({ signal }) => loadWorkspaceOptions(signal),
    retry: false,
  });
}

export function isUnauthorizedError(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}
