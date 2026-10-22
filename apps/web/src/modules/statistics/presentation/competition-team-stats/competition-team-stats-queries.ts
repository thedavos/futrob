import { useQuery } from "@tanstack/react-query";
import type { GetCompetitionTeamStatisticsResponse } from "@futrob/api-contracts";
import {
  TeamsClientError,
  teamsBrowserClient,
} from "@/modules/teams/presentation/teams-browser-client.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
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
      try {
        const response = await statisticsBrowserClient.getCompetitionTeamStatistics(
          organizationId,
          competitionId,
        );
        return { kind: "ok", response };
      } catch (error) {
        const refusal =
          error instanceof StatisticsClientError ? teamStatisticsRefusal(error.status) : null;
        if (refusal) return { kind: "refused", refusal };
        throw error;
      }
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
      const names: Record<string, string> = {};
      let cursor: string | undefined;
      try {
        do {
          const page = await teamsBrowserClient.listCompetitionManagement(
            organizationId,
            competitionId,
            { cursor, limit: 50 },
          );
          for (const item of page.items) names[item.team.id] = item.team.name;
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
      } catch (error) {
        if (error instanceof TeamsClientError && isAuthoritativeRefusal(error.status)) {
          return { kind: "denied" };
        }
        throw error;
      }
      return { kind: "ok", names };
    },
    enabled,
    retry: false,
  });
}

function teamStatisticsRefusal(status: number): TeamStatisticsRefusal | null {
  if (isAuthoritativeRefusal(status)) return status === 404 ? "not_found" : "forbidden";
  return null;
}

function isAuthoritativeRefusal(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}
