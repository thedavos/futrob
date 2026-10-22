import { useQuery } from "@tanstack/react-query";
import { teamsBrowserClient } from "@/modules/teams/presentation/teams-browser-client.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { StatisticsClientError, statisticsBrowserClient } from "../statistics-browser-client.ts";

export function useCompetitionTeamStatisticsQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.statistics.competitionTeams(organizationId, competitionId),
    queryFn: () =>
      statisticsBrowserClient.getCompetitionTeamStatistics(organizationId, competitionId),
    enabled,
    retry: false,
  });
}

/**
 * Team statistics carry ids only; names come from the competition team list the organizer
 * already reads. Loads every page so the table can label each row without fetch-in-effect.
 */
export function useCompetitionTeamNamesQuery(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagementTeamNames(organizationId, competitionId),
    queryFn: async () => {
      const names: Record<string, string> = {};
      let cursor: string | undefined;
      do {
        const page = await teamsBrowserClient.listCompetitionManagement(
          organizationId,
          competitionId,
          { cursor, limit: 50 },
        );
        for (const item of page.items) names[item.team.id] = item.team.name;
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return names;
    },
    enabled,
    retry: false,
  });
}

export function teamStatisticsRefusal(error: Error | null): "forbidden" | "not_found" | null {
  if (!(error instanceof StatisticsClientError)) return null;
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "not_found";
  return null;
}
