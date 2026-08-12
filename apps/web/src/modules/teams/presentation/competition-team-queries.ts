import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

export function useCompetitionTeamManagementQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagement(organizationId, competitionId),
    queryFn: () =>
      teamsBrowserClient.listCompetitionManagement(organizationId, competitionId, { limit: 25 }),
    enabled: organizationId.length > 0 && competitionId.length > 0,
  });
}

export function useCompetitionTeamManagementDetailQuery(
  organizationId: string,
  competitionId: string,
  teamId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.teams.competitionManagementDetail(
      organizationId,
      competitionId,
      teamId ?? "",
    ),
    queryFn: () =>
      teamsBrowserClient.getCompetitionTeamManagement(organizationId, competitionId, teamId!),
    enabled: organizationId.length > 0 && competitionId.length > 0 && Boolean(teamId),
  });
}
