import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  AssociateMyPlayerExternalClubRequest,
  PlayerGameAccountInputDto,
} from "@futrob/api-contracts";
import { FutrobApiError, resolvePersonalExternalClubId } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import type { SessionGeneration } from "@/modules/identity/session-store";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import {
  rememberPersonalClub,
  useRememberedPersonalClub,
} from "@/modules/navigation/personal-club";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

/** A 401 ends the session here, as every other mobile read does; the caller still sees it. */
async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) {
      await onProductUnauthorized(() => undefined);
    }
    throw error;
  }
}

export function isUnauthorized(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}

export function isNotFound(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 404;
}

export function usePlayerProfile() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerProfile(generation),
    queryFn: ({ signal }) => guarded(() => getFutrobClient().players.getProfile({ signal })),
    retry: false,
  });
}

/**
 * The personal space's club: the one this session chose, if still associated, else the first
 * association (as web). `undefined` until the profile loads, or when there is no club.
 */
export function usePersonalClub() {
  const profile = usePlayerProfile();
  const remembered = useRememberedPersonalClub();
  const clubs = profile.data?.externalClubs ?? [];
  const clubId = resolvePersonalExternalClubId(
    remembered,
    clubs.map((club) => club.externalClubId),
  );
  return { profile, clubs, clubId, club: clubs.find((club) => club.externalClubId === clubId) };
}

export function useRecentMatches(externalClubId: string | undefined) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "recent-matches", externalClubId),
    queryFn: ({ signal }) =>
      guarded(() =>
        getFutrobClient().statistics.getMyRecentMatches({ externalClubId }, { signal }),
      ),
    enabled: externalClubId !== undefined,
    retry: false,
  });
}

export function useRecentMatch(
  input: {
    providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
    externalMatchId: string;
    externalClubId: string | undefined;
  },
  enabled: boolean,
) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(
      generation,
      "recent-match",
      input.providerKey,
      input.externalMatchId,
      input.externalClubId,
    ),
    queryFn: ({ signal }) =>
      guarded(() => getFutrobClient().statistics.getMyRecentMatch(input, { signal })),
    enabled,
    retry: false,
  });
}

export function useGameProfile(externalClubId: string | undefined) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "game-profile", externalClubId),
    queryFn: ({ signal }) =>
      guarded(() => getFutrobClient().statistics.getMyGameProfile({ externalClubId }, { signal })),
    enabled: externalClubId !== undefined,
    retry: false,
  });
}

export function useMyCompetitions() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "my-competitions"),
    queryFn: ({ signal }) => guarded(() => getFutrobClient().competitions.listMine({ signal })),
    retry: false,
  });
}

export function useMyMemberships() {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "memberships"),
    queryFn: ({ signal }) => guarded(() => getFutrobClient().organizations.listMine({ signal })),
    retry: false,
  });
}

/** Explore pages are cursor-addressed; the first page has no cursor. */
const FIRST_EXPLORE_PAGE: string | undefined = undefined;

export function useExploreCompetitions(query: string) {
  const generation = useSessionGeneration();
  return useInfiniteQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "explore", query),
    queryFn: ({ signal, pageParam }) =>
      guarded(() =>
        getFutrobClient().competitions.explore(
          { q: query || undefined, cursor: pageParam, limit: 24 },
          { signal },
        ),
      ),
    initialPageParam: FIRST_EXPLORE_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
}

export function useExploreCompetition(competitionId: string) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(generation, "explore-competition", competitionId),
    queryFn: ({ signal }) =>
      guarded(() => getFutrobClient().competitions.getExplore(competitionId, { signal })),
    retry: false,
  });
}

export function useClubSearch(search: { query: string; platform: string } | null) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.playerSpace(
      generation,
      "club-search",
      search?.query,
      search?.platform,
    ),
    queryFn: ({ signal }) =>
      guarded(() =>
        getFutrobClient().gameData.clubs.search(
          { query: search!.query, platform: search!.platform, gameEdition: "fc27" },
          { signal },
        ),
      ),
    enabled: search !== null && search.query.length > 0,
    retry: false,
  });
}

/** Game data changed: every view built from the profile reads it again. */
function invalidateGameData(client: QueryClient, generation: SessionGeneration) {
  return Promise.all([
    client.invalidateQueries({ queryKey: mobileQueryKeys.playerProfile(generation) }),
    client.invalidateQueries({ queryKey: mobileQueryKeys.workspaceOptions(generation) }),
    client.invalidateQueries({ queryKey: mobileQueryKeys.playerHomeAll(generation) }),
    client.invalidateQueries({ queryKey: mobileQueryKeys.playerSpace(generation) }),
  ]);
}

export function useSaveGameAccount() {
  const generation = useSessionGeneration();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      input,
    }: {
      accountId: string | undefined;
      input: PlayerGameAccountInputDto;
    }) =>
      guarded(() =>
        accountId === undefined
          ? getFutrobClient().players.addGameAccount(input)
          : getFutrobClient().players.updateGameAccount(accountId, {
              identifier: input.identifier,
              platform: input.platform,
              gameEdition: input.gameEdition,
            }),
      ),
    onSuccess: () => invalidateGameData(client, generation),
  });
}

export function useAssociateClub() {
  const generation = useSessionGeneration();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AssociateMyPlayerExternalClubRequest) =>
      guarded(() => getFutrobClient().players.associateExternalClub(input)),
    onSuccess: async (result) => {
      rememberPersonalClub(result.externalClub.externalClubId);
      await invalidateGameData(client, generation);
    },
  });
}
