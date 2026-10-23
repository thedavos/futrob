import { useQueries, useQuery } from "@tanstack/react-query";
import type {
  CompetitionTeamManagementDetailResponse,
  GetCompetitionRankingsResponse,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { readKeepingRefusal, refusalLabel } from "@/shared/presentation/query/stored-refusal.ts";
import {
  TeamsClientError,
  teamsBrowserClient,
} from "@/modules/teams/presentation/teams-browser-client.ts";
import {
  CompetitionRankingsClientError,
  competitionRankingsBrowserClient,
} from "./competition-rankings-browser-client.ts";
import {
  rankingNamesFromTeams,
  rankingNamesRestriction,
  type RankingNamesState,
} from "./competition-rankings-view.ts";

export const competitionRankingsQueryKey = (organizationId: string, competitionId: string) =>
  [...queryKeys.statistics.all, "competition-rankings", organizationId, competitionId] as const;

const rankingRosterQueryKey = (organizationId: string, competitionId: string, teamId: string) =>
  [...competitionRankingsQueryKey(organizationId, competitionId), "roster", teamId] as const;

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
  const readResult = await readKeepingRefusal(
    () => competitionRankingsBrowserClient.getCompetitionRankings(organizationId, competitionId),
    (error) => (error instanceof CompetitionRankingsClientError ? error.status : undefined),
  );
  if (readResult.outcome === "refused") {
    return { kind: "refused", reason: refusalLabel(readResult.status) };
  }
  return { kind: "loaded", data: readResult.value };
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
  // A Team that left the competition or is out of the actor's scope keeps its rows unnamed.
  const readResult = await readKeepingRefusal(
    () => teamsBrowserClient.getCompetitionTeamManagement(organizationId, competitionId, teamId),
    (error) => (error instanceof TeamsClientError ? error.status : undefined),
  );
  if (readResult.outcome === "refused") return { kind: "refused" };
  return { kind: "loaded", detail: readResult.value };
}

/**
 * Resolves player and Team names through each Team's roster read.
 * Ranking rows only carry ids; names are never inferred from them. The roster endpoint
 * authorizes every Team on its own, so each row's Team is read and a refusal only hides
 * that Team's names.
 */
export function useRankingNames(
  organizationId: string,
  competitionId: string,
  teamIds: readonly string[],
  enabled: boolean,
): RankingNamesState {
  const results = useQueries({
    queries: teamIds.map((teamId) => ({
      queryKey: rankingRosterQueryKey(organizationId, competitionId, teamId),
      queryFn: () => readRoster(organizationId, competitionId, teamId),
      enabled,
    })),
  });
  if (results.some((result) => result.isPending)) return { status: "loading" };
  const names = rankingNamesFromTeams(
    results.flatMap((result) => (result.data?.kind === "loaded" ? [result.data.detail] : [])),
  );
  const restricted = rankingNamesRestriction(
    results.filter((result) => result.data?.kind === "refused").length,
    results.length,
  );
  const failed = results.filter((result) => result.isError);
  if (failed.length === 0) return { status: "ready", names, restricted };
  return {
    status: "failed",
    names,
    restricted,
    retry: () => {
      for (const result of failed) void result.refetch();
    },
  };
}
