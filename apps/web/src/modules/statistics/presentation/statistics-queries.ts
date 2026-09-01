import { queryOptions, useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import {
  getMyGameProfileQuerySchema,
  getMyMatchesQuerySchema,
  getMyStatisticsQuerySchema,
  type GetMyMatchesQuery,
  type GetMyRecentMatchesResponse,
  type GameDataProviderKeyQuery,
  type GetMyGameProfileQueryInput,
  type GetMyStatisticsQuery,
  type PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  statisticsBrowserClient,
  type GetMyRecentMatchBrowserInput,
} from "@/modules/statistics/presentation/statistics-browser-client.ts";

const RECENT_MATCH_DETAIL_STALE_TIME_MS = 30_000;

export function useMyStatisticsQuery(filters: GetMyStatisticsQuery = {}) {
  const query = getMyStatisticsQuerySchema.parse(filters);
  return useQuery({
    queryKey: queryKeys.statistics.me(query),
    queryFn: () => statisticsBrowserClient.getMyStatistics(query),
  });
}

export function useMyMatchesQuery(filters: Partial<GetMyMatchesQuery> = {}) {
  const query = getMyMatchesQuerySchema.parse(filters);
  type Page = Awaited<ReturnType<typeof statisticsBrowserClient.getMyMatches>>;
  return useInfiniteQuery<
    Page,
    Error,
    InfiniteData<Page>,
    ReturnType<typeof queryKeys.statistics.meMatches>,
    string | undefined
  >({
    queryKey: queryKeys.statistics.meMatches(query),
    queryFn: ({ pageParam }) =>
      statisticsBrowserClient.getMyMatches({
        ...query,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useMyRecentMatchesQuery(externalClubId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gameData.meRecentMatches(externalClubId),
    queryFn: () =>
      statisticsBrowserClient.getMyRecentMatches(externalClubId ? { externalClubId } : {}),
    enabled,
    retry: false,
  });
}

export function useMyGameProfileQuery(filters: GetMyGameProfileQueryInput = {}, enabled = true) {
  const query = getMyGameProfileQuerySchema.parse(filters);
  return useQuery({
    queryKey: queryKeys.gameData.meGameProfile(query),
    queryFn: () => statisticsBrowserClient.getMyGameProfile(query),
    enabled,
    retry: false,
  });
}

export function recentMatchListSummary(
  list: GetMyRecentMatchesResponse | undefined,
  providerKey: GameDataProviderKeyQuery,
  externalMatchId: string,
): PlayerRecentProviderMatchDto | undefined {
  if (list?.status !== "ready") return undefined;
  return list.matches.find(
    (row) =>
      row.match.provider.key === providerKey &&
      row.match.provider.externalMatchId === externalMatchId,
  );
}

export function myRecentMatchQueryOptions(input: GetMyRecentMatchBrowserInput) {
  return queryOptions({
    queryKey: queryKeys.gameData.meRecentMatch(input),
    queryFn: () => statisticsBrowserClient.getMyRecentMatch(input),
    staleTime: RECENT_MATCH_DETAIL_STALE_TIME_MS,
    retry: false,
  });
}

export function useMyRecentMatchQuery(input: GetMyRecentMatchBrowserInput, enabled = true) {
  return useQuery({
    ...myRecentMatchQueryOptions(input),
    enabled,
  });
}
