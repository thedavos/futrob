import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";
import {
  getMyMatchesQuerySchema,
  getMyStatisticsQuerySchema,
  type GetMyMatchesQuery,
  type GetMyStatisticsQuery,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { statisticsBrowserClient } from "@/modules/statistics/presentation/statistics-browser-client.ts";

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
