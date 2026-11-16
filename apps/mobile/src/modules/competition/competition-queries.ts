import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CompetitionDraftDto,
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementListResponse,
  GetCompetitionRankingsResponse,
  GetCompetitionStandingsResponse,
  GetCurrentCompetitionFixtureResponse,
} from "@futrob/api-contracts";
import { FutrobApiError, rankingNamesFromTeams, type RankingNames } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { onProductUnauthorized } from "@/modules/identity/session-lifecycle";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

export type CompetitionScope = { readonly organizationId: string; readonly competitionId: string };

/**
 * A 403 or 404 is the server's answer, not a failure: it is stored as the query's value, so a
 * later transient error cannot bring back data the actor was already refused (same rule as web's
 * `readKeepingRefusal`). A 401 ends the session; the screen then redirects to login.
 */
export type Refused = { readonly refused: "forbidden" | "not_found" };

export function isRefused<T extends object>(value: T | Refused | undefined): value is Refused {
  return value !== undefined && "refused" in value;
}

export function isUnauthorized(error: Error): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}

async function readKeepingRefusal<T>(read: () => Promise<T>): Promise<T | Refused> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof FutrobApiError) {
      if (error.status === 401) await onProductUnauthorized(() => undefined);
      if (error.status === 403) return { refused: "forbidden" };
      if (error.status === 404) return { refused: "not_found" };
    }
    throw error;
  }
}

function useCompetitionRead<T>(
  scope: CompetitionScope,
  resource: string,
  read: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.competitionRead(
      generation,
      scope.organizationId,
      scope.competitionId,
      resource,
    ),
    queryFn: ({ signal }) => readKeepingRefusal(() => read(signal)),
    enabled,
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
  });
}

export function useCompetitionFixture(scope: CompetitionScope) {
  return useCompetitionRead<GetCurrentCompetitionFixtureResponse>(scope, "fixture", (signal) =>
    getFutrobClient().encounters.getCurrentFixture(scope.organizationId, scope.competitionId, {
      signal,
    }),
  );
}

export function useCompetitionStandings(scope: CompetitionScope, enabled: boolean) {
  return useCompetitionRead<GetCompetitionStandingsResponse>(
    scope,
    "standings",
    (signal) => getFutrobClient().statistics.getCompetitionStandings(scope, { signal }),
    enabled,
  );
}

export function useCompetitionRankings(scope: CompetitionScope, enabled: boolean) {
  return useCompetitionRead<GetCompetitionRankingsResponse>(
    scope,
    "rankings",
    (signal) => getFutrobClient().statistics.getCompetitionRankings(scope, { signal }),
    enabled,
  );
}

export function useCompetitionRules(scope: CompetitionScope) {
  return useCompetitionRead<CompetitionDraftDto>(scope, "rules", (signal) =>
    getFutrobClient().competitions.getDraft(scope.organizationId, scope.competitionId, { signal }),
  );
}

export function useCompetitionTeam(scope: CompetitionScope, teamId: string) {
  return useCompetitionRead<CompetitionTeamManagementDetailResponse>(
    scope,
    `team:${teamId}`,
    (signal) =>
      getFutrobClient().teams.getCompetitionTeamManagement(
        scope.organizationId,
        scope.competitionId,
        teamId,
        { signal },
      ),
  );
}

const TEAM_PAGE_SIZE = 25;

/** The competition's teams, one cursor page at a time, as the web teams console reads them. */
export function useCompetitionTeams(scope: CompetitionScope) {
  const generation = useSessionGeneration();
  return useInfiniteQuery({
    queryKey: mobileQueryKeys.competitionRead(
      generation,
      scope.organizationId,
      scope.competitionId,
      "teams",
    ),
    queryFn: ({ pageParam, signal }) =>
      readKeepingRefusal<CompetitionTeamManagementListResponse>(() =>
        getFutrobClient().teams.listCompetitionManagement(
          scope.organizationId,
          scope.competitionId,
          { cursor: pageParam, limit: TEAM_PAGE_SIZE },
          { signal },
        ),
      ),
    // SAFETY: widens the first page param (no cursor) to the cursor type later pages use.
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (isRefused(page) ? undefined : (page.nextCursor ?? undefined)),
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
  });
}

/**
 * Names for the standings rows, from every page of the competition's team list. Unknown
 * (`undefined`) while loading or when the list cannot be read: the table stays readable.
 */
export function useStandingsTeamNames(
  scope: CompetitionScope,
  enabled: boolean,
): ReadonlyMap<string, string> | undefined {
  const query = useCompetitionRead(
    scope,
    "standings-team-names",
    async (signal) => {
      const names = new Map<string, string>();
      let cursor: string | undefined;
      do {
        const page = await getFutrobClient().teams.listCompetitionManagement(
          scope.organizationId,
          scope.competitionId,
          { cursor, limit: TEAM_PAGE_SIZE },
          { signal },
        );
        for (const item of page.items) names.set(item.team.id, item.team.name);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return { names };
    },
    enabled,
  );
  return query.data && !isRefused(query.data) ? query.data.names : undefined;
}

/**
 * Player and team names for ranking rows, through each team's roster read (authorized per
 * team). `loading` until every roster settles; a refused roster leaves its rows unnamed.
 */
export type RankingNamesState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly names: RankingNames;
      readonly restricted: boolean;
      /** Set when a roster read failed and can be retried. */
      readonly retry: (() => void) | null;
    };

export function useRankingNames(
  scope: CompetitionScope,
  teamIds: readonly string[],
): RankingNamesState {
  const generation = useSessionGeneration();
  const results = useQueries({
    queries: teamIds.map((teamId) => ({
      queryKey: mobileQueryKeys.competitionRead(
        generation,
        scope.organizationId,
        scope.competitionId,
        `team:${teamId}`,
      ),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        readKeepingRefusal(() =>
          getFutrobClient().teams.getCompetitionTeamManagement(
            scope.organizationId,
            scope.competitionId,
            teamId,
            { signal },
          ),
        ),
      retry: (failureCount: number, error: Error) => !isUnauthorized(error) && failureCount < 2,
    })),
  });
  if (results.some((result) => result.isPending)) return { status: "loading" };
  const details = results.flatMap((result) =>
    result.data && !isRefused(result.data) ? [result.data] : [],
  );
  const failed = results.filter((result) => result.isError);
  return {
    status: "ready",
    names: rankingNamesFromTeams(details),
    restricted: results.some((result) => isRefused(result.data)),
    retry:
      failed.length === 0
        ? null
        : () => {
            for (const result of failed) void result.refetch();
          },
  };
}

/** Revalidate retained competition screens without crossing the current session's cache. */
export function useCompetitionRefresh(scope: CompetitionScope) {
  const client = useQueryClient();
  const generation = useSessionGeneration();
  const { organizationId, competitionId } = scope;
  const refresh = useCallback(() => {
    const queryKey = mobileQueryKeys
      .competitionRead(generation, organizationId, competitionId, "")
      .slice(0, -1);
    void client.refetchQueries({ queryKey, type: "active", stale: true }, { cancelRefetch: false });
  }, [client, generation, organizationId, competitionId]);
  useFocusEffect(refresh);
  useExternalSync(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
}
