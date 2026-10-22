import { useQuery } from "@tanstack/react-query";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import {
  CompetitionsClientError,
  listOrganizationTeams,
} from "@/modules/competitions/presentation/competitions-browser-client.ts";
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

function httpStatus(error: Error | null): number | undefined {
  return error instanceof CompetitionStandingsClientError ||
    error instanceof CompetitionsClientError
    ? error.status
    : undefined;
}

/** The server said no (403): cached protected data must not outlive that answer. */
export function isStandingsRefusal(error: Error | null): boolean {
  return httpStatus(error) === 403;
}

/** The session is gone (401): protected data cached under it is no longer ours to show. */
export function isSessionRefusal(error: Error | null): boolean {
  return httpStatus(error) === 401;
}

/** Either refusal withdraws the right to display what an earlier success returned. */
export function isAuthoritativeRefusal(error: Error | null): boolean {
  return isStandingsRefusal(error) || isSessionRefusal(error);
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
