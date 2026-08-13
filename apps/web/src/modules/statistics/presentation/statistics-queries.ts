import { useQuery } from "@tanstack/react-query";
import {
  getMyMatchesQuerySchema,
  getMyStatisticsQuerySchema,
  type GetMyMatchesQuery,
  type GetMyStatisticsQuery,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { statisticsBrowserClient } from "./statistics-browser-client.ts";

export function useMyStatisticsQuery(filters: GetMyStatisticsQuery = {}) {
  const query = getMyStatisticsQuerySchema.parse(filters);
  return useQuery({
    queryKey: queryKeys.statistics.me(query),
    queryFn: () => statisticsBrowserClient.getMyStatistics(query),
  });
}

export function useMyMatchesQuery(filters: Partial<GetMyMatchesQuery> = {}) {
  const query = getMyMatchesQuerySchema.parse(filters);
  return useQuery({
    queryKey: queryKeys.statistics.meMatches(query),
    queryFn: () => statisticsBrowserClient.getMyMatches(query),
  });
}
