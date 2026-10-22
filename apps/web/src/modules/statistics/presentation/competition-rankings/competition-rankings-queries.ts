import { useQueries, useQuery } from "@tanstack/react-query";
import type {
  CompetitionTeamManagementDetailResponse,
  GetCompetitionRankingsResponse,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  TeamsClientError,
  teamsBrowserClient,
} from "@/modules/teams/presentation/teams-browser-client.ts";
import {
  CompetitionRankingsClientError,
  competitionRankingsBrowserClient,
} from "./competition-rankings-browser-client.ts";
import { rankingNamesFromTeams, type RankingNamesState } from "./competition-rankings-view.ts";

export const competitionRankingsQueryKey = (organizationId: string, competitionId: string) =>
  [...queryKeys.statistics.all, "competition-rankings", organizationId, competitionId] as const;

const rankingRosterQueryKey = (organizationId: string, competitionId: string, teamId: string) =>
  [...competitionRankingsQueryKey(organizationId, competitionId), "roster", teamId] as const;

const isRefusalStatus = (status: number) => status === 401 || status === 403 || status === 404;

/**
 * A refusal is stored as the query's data, not thrown: TanStack Query keeps the last
 * successful data through later errors, so a thrown 403 followed by a 500 would bring
 * back rankings the actor was already denied.
 */
export type RankingsRead =
  | { readonly kind: "loaded"; readonly data: GetCompetitionRankingsResponse }
  | { readonly kind: "refused"; readonly reason: "forbidden" | "not_found" };

export async function readCompetitionRankings(
  organizationId: string,
  competitionId: string,
): Promise<RankingsRead> {
  try {
    const data = await competitionRankingsBrowserClient.getCompetitionRankings(
      organizationId,
      competitionId,
    );
    return { kind: "loaded", data };
  } catch (error) {
    if (error instanceof CompetitionRankingsClientError && isRefusalStatus(error.status)) {
      return { kind: "refused", reason: error.status === 404 ? "not_found" : "forbidden" };
    }
    throw error;
  }
}

export function useCompetitionRankingsQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: competitionRankingsQueryKey(organizationId, competitionId),
    queryFn: () => readCompetitionRankings(organizationId, competitionId),
    enabled,
  });
}

/** Same rule as the rankings: a roster refusal replaces any names cached before it. */
type RosterRead =
  | { readonly kind: "loaded"; readonly detail: CompetitionTeamManagementDetailResponse }
  | { readonly kind: "refused" };

async function readRoster(
  organizationId: string,
  competitionId: string,
  teamId: string,
): Promise<RosterRead> {
  try {
    const detail = await teamsBrowserClient.getCompetitionTeamManagement(
      organizationId,
      competitionId,
      teamId,
    );
    return { kind: "loaded", detail };
  } catch (error) {
    // A Team that left the competition or is out of the actor's scope keeps its rows unnamed.
    if (error instanceof TeamsClientError && isRefusalStatus(error.status)) {
      return { kind: "refused" };
    }
    throw error;
  }
}

/**
 * Resolves player and Team names through each Team's roster read.
 * Ranking rows only carry ids; names are never inferred from them.
 */
export function useRankingNames(
  organizationId: string,
  competitionId: string,
  teamIds: readonly string[],
  canReadRosters: boolean | null,
): RankingNamesState {
  const results = useQueries({
    queries: teamIds.map((teamId) => ({
      queryKey: rankingRosterQueryKey(organizationId, competitionId, teamId),
      queryFn: () => readRoster(organizationId, competitionId, teamId),
      enabled: canReadRosters === true,
    })),
  });
  if (canReadRosters === null) return { status: "loading" };
  if (!canReadRosters) return { status: "restricted" };
  if (results.some((result) => result.isPending && result.fetchStatus !== "idle")) {
    return { status: "loading" };
  }
  const names = rankingNamesFromTeams(
    results.flatMap((result) => (result.data?.kind === "loaded" ? [result.data.detail] : [])),
  );
  const failed = results.filter((result) => result.isError);
  if (failed.length === 0) return { status: "ready", names };
  return {
    status: "failed",
    names,
    retry: () => {
      for (const result of failed) void result.refetch();
    },
  };
}
