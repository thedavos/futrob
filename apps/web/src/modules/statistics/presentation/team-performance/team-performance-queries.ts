import { useQuery } from "@tanstack/react-query";
import {
  getTeamPerformanceRankingResponseSchema,
  type GetTeamPerformanceRankingResponse,
} from "@futrob/api-contracts";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { StatisticsClientError } from "../statistics-browser-client.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

/**
 * A refusal is stored as data, not as an error: TanStack Query keeps the last successful
 * `data` across later errors, so a cached ranking would otherwise reappear after a
 * 401/403 followed by a 500.
 */
export type TeamPerformanceRankingResult =
  | { readonly kind: "ranking"; readonly response: GetTeamPerformanceRankingResponse }
  | { readonly kind: "refused"; readonly status: 401 | 403 | 404 };

export const teamPerformanceRankingQueryKey = ({ organizationId, competitionId }: Scope) =>
  [...queryKeys.statistics.all, "team-performance", organizationId, competitionId] as const;

export function getTeamPerformanceRanking({
  organizationId,
  competitionId,
}: Scope): Promise<GetTeamPerformanceRankingResponse> {
  return requestBrowserJson({
    path: `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/team-performance-ranking`,
    method: "GET",
    schema: getTeamPerformanceRankingResponseSchema,
    fallbackCode: "statistics.team_performance_load_failed",
    createError: (status, error) =>
      new StatisticsClientError(status, error.code, error.requestId, error.retryAfterSeconds),
  });
}

export async function loadTeamPerformanceRanking(
  scope: Scope,
): Promise<TeamPerformanceRankingResult> {
  try {
    return { kind: "ranking", response: await getTeamPerformanceRanking(scope) };
  } catch (error) {
    if (error instanceof StatisticsClientError) {
      const { status } = error;
      if (status === 401 || status === 403 || status === 404) return { kind: "refused", status };
    }
    throw error;
  }
}

export function useTeamPerformanceRankingQuery(scope: Scope, enabled: boolean) {
  return useQuery({
    queryKey: teamPerformanceRankingQueryKey(scope),
    queryFn: () => loadTeamPerformanceRanking(scope),
    enabled,
    retry: (failureCount) => failureCount < 2,
  });
}
