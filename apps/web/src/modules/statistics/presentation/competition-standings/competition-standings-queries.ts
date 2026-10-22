import { useQuery } from "@tanstack/react-query";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { listOrganizationTeams } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  CompetitionStandingsClientError,
  getCompetitionStandings,
} from "./competition-standings-client.ts";

/** A refusal is the server's answer, not a transient failure; asking again cannot change it. */
const retryUnlessRefused = (failureCount: number, error: Error) =>
  !(error instanceof CompetitionStandingsClientError && [401, 403, 404].includes(error.status)) &&
  failureCount < 2;

export function isStandingsRefusal(error: Error | null): boolean {
  return error instanceof CompetitionStandingsClientError && error.status === 403;
}

/**
 * Standings are read only once EffectiveAccess allows `statistics.read` for the
 * competition; the server authorizes the read again.
 */
export function useCompetitionStandings(organizationId: string, competitionId: string) {
  const access = useEffectivePermissions({ organizationId, competitionId }, [
    STATISTICS_PERMISSION.read,
  ]);
  const allowed = access.allowed.has(STATISTICS_PERMISSION.read);
  const standings = useQuery({
    queryKey: [
      ...queryKeys.statistics.all,
      "competition",
      organizationId,
      competitionId,
      "standings",
    ] as const,
    queryFn: () => getCompetitionStandings(organizationId, competitionId),
    enabled: allowed,
    retry: retryUnlessRefused,
  });
  return { access, allowed, standings };
}

/** Names for the standings rows; the table stays readable if they do not load. */
export function useStandingsTeamNames(organizationId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.competitions.teams(organizationId),
    queryFn: () => listOrganizationTeams(organizationId),
    enabled,
  });
}
