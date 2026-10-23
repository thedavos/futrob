import { useQuery } from "@tanstack/react-query";
import type { GetCompetitionTeamStatisticsResponse } from "@futrob/api-contracts";
import { listEveryCompetitionManagementPage } from "@/modules/teams/presentation/competition-team-queries.ts";
import { TeamsClientError } from "@/modules/teams/presentation/teams-browser-client.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { readKeepingRefusal, refusalLabel } from "@/shared/presentation/query/stored-refusal.ts";
import { StatisticsClientError, statisticsBrowserClient } from "../statistics-browser-client.ts";
import type { TeamNames } from "./competition-team-stats-state.ts";

export type TeamStatisticsRefusal = "forbidden" | "not_found";

/**
 * An authoritative refusal (401/403/404) is stored as the query result instead of thrown, so it
 * replaces previously cached figures rather than sitting next to them as `error` + stale `data`.
 * Recoverable failures still throw and keep the cached figures.
 */
export type TeamStatisticsResult =
  | { readonly kind: "ok"; readonly response: GetCompetitionTeamStatisticsResponse }
  | { readonly kind: "refused"; readonly refusal: TeamStatisticsRefusal };

export type TeamNamesResult =
  | { readonly kind: "ok"; readonly names: TeamNames }
  | { readonly kind: "denied" };

export function useCompetitionTeamStatisticsQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.statistics.competitionTeams(organizationId, competitionId),
    queryFn: async (): Promise<TeamStatisticsResult> => {
      const readResult = await readKeepingRefusal(
        () => statisticsBrowserClient.getCompetitionTeamStatistics(organizationId, competitionId),
        (error) => (error instanceof StatisticsClientError ? error.status : undefined),
      );
      if (readResult.outcome === "refused") {
        return { kind: "refused", refusal: refusalLabel(readResult.status) };
      }
      return { kind: "ok", response: readResult.value };
    },
    enabled,
    retry: false,
  });
}

/**
 * Team statistics carry ids only; names come from the competition team list the organizer
 * already reads. Loads every page so the table can label each row without fetch-in-effect.
 * A refusal of that list replaces cached names so revoked labels are not kept on screen.
 */
export function useCompetitionTeamNamesQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagementTeamNames(organizationId, competitionId),
    queryFn: async (): Promise<TeamNamesResult> => {
      const readResult = await readKeepingRefusal(
        async () => {
          const names: Record<string, string> = {};
          const items = await listEveryCompetitionManagementPage(organizationId, competitionId, 50);
          for (const item of items) names[item.team.id] = item.team.name;
          return names;
        },
        (error) => (error instanceof TeamsClientError ? error.status : undefined),
      );
      if (readResult.outcome === "refused") return { kind: "denied" };
      return { kind: "ok", names: readResult.value };
    },
    enabled,
    retry: false,
  });
}
