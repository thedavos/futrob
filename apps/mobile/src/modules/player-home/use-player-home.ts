import { useQuery } from "@tanstack/react-query";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { loadPlayerHome } from "./load-player-home";
import type { PlayerHomeSnapshot } from "./player-home-model";

type PlayerHomeLoad = {
  readonly snapshot: PlayerHomeSnapshot | null;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly initialClub?: string;
  readonly unauthorized: boolean;
  readonly retry: () => void;
};

/**
 * Loads the six-source snapshot for one club. Without a club, the profile is read first and its
 * first association is handed to the caller as `initialClub`, so the snapshot loads once, for
 * that club. A retry keeps the current snapshot on screen until the next one settles; a club
 * change never presents the previous club's data.
 */
export function usePlayerHome(externalClubId: string | undefined): PlayerHomeLoad {
  const generation = useSessionGeneration();
  const profileQuery = useQuery({
    queryKey: mobileQueryKeys.playerProfile(generation),
    queryFn: async ({ signal }) => {
      try {
        return await getFutrobClient().players.getProfile({ signal });
      } catch (error) {
        if (error instanceof FutrobApiError && error.status === 401) {
          await onProductUnauthorized(() => undefined);
        }
        throw error;
      }
    },
    enabled: externalClubId === undefined,
    retry: false,
  });
  const firstClub = profileQuery.data?.externalClubs[0]?.externalClubId;
  const homeQuery = useQuery({
    queryKey: mobileQueryKeys.playerHome(generation, externalClubId),
    queryFn: async ({ signal }) => {
      try {
        return await loadPlayerHome({ externalClubId, signal });
      } catch (error) {
        if (error instanceof FutrobApiError && error.status === 401) {
          await onProductUnauthorized(() => undefined);
        }
        throw error;
      }
    },
    enabled:
      externalClubId !== undefined ||
      (profileQuery.isFetched && firstClub === undefined && !isUnauthorized(profileQuery.error)),
    retry: false,
  });

  const error = profileQuery.error ?? homeQuery.error;
  const snapshot =
    homeQuery.data?.externalClubId === externalClubId ? (homeQuery.data ?? null) : null;
  const loading = profileQuery.isFetching || homeQuery.isFetching;
  return {
    snapshot,
    loading,
    failed: homeQuery.isError && !snapshot && !isUnauthorized(error),
    initialClub: externalClubId === undefined ? firstClub : undefined,
    unauthorized: isUnauthorized(error),
    retry: () => {
      void profileQuery.refetch();
      void homeQuery.refetch();
    },
  };
}

function isUnauthorized(error: Error | null | undefined): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}
