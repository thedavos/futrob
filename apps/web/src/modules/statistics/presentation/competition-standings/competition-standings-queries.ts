import { useQuery } from "@tanstack/react-query";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import {
  TeamsClientError,
  teamsBrowserClient,
} from "@/modules/teams/presentation/teams-browser-client.ts";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  CompetitionStandingsClientError,
  getCompetitionStandings,
} from "./competition-standings-client.ts";

/** A refusal is the server's answer, not a transient failure; asking again cannot change it. */
const retryUnlessRefused = (failureCount: number, error: Error) =>
  !(error instanceof CompetitionStandingsClientError && error.status === 404) && failureCount < 2;

function httpStatus(error: Error): number | undefined {
  return error instanceof CompetitionStandingsClientError ||
    error instanceof CompetitionsClientError ||
    error instanceof TeamsClientError
    ? error.status
    : undefined;
}

/**
 * A refusal (401, 403, or a 404 for a missing competition) is stored as the query's value, not
 * thrown. Query data survives later errors, so a thrown refusal would let an older success reappear after the next transient failure; as a value
 * it replaces that success and stays until a fresh read for the same key succeeds.
 */
export type Refusal = { readonly refused: "permission" | "session" | "not_found" };

export function isRefusal<T extends object>(value: T | Refusal | undefined): value is Refusal {
  return value !== undefined && "refused" in value;
}

async function refusedAsValue<T>(read: () => Promise<T>): Promise<T | Refusal> {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const status = httpStatus(error);
    if (status === 403) return { refused: "permission" };
    if (status === 401) return { refused: "session" };
    if (status === 404) return { refused: "not_found" };
    throw error;
  }
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
    queryFn: () => refusedAsValue(() => getCompetitionStandings(organizationId, competitionId)),
    enabled: allowed,
    retry: retryUnlessRefused,
  });
  return { access, allowed, standings };
}

/**
 * Names for the standings rows. Read from the competition's team list, which staff may read inside
 * their competition; the organization team list needs `teams.read` at organization scope.
 * The table stays readable if they do not load.
 */
export function useStandingsTeamNames(
  organizationId: string,
  competitionId: string,
  enabled: boolean,
) {
  return useQuery({
    // Own key: the entry may hold a refusal, which other consumers of the team list cannot read.
    queryKey: [
      ...queryKeys.teams.competitionManagement(organizationId, competitionId),
      "standings-names",
    ] as const,
    queryFn: () =>
      refusedAsValue(async () => {
        const teams: { id: string; name: string }[] = [];
        let cursor: string | undefined;
        do {
          const page = await teamsBrowserClient.listCompetitionManagement(
            organizationId,
            competitionId,
            { cursor, limit: 25 },
          );
          for (const item of page.items) teams.push({ id: item.team.id, name: item.team.name });
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        return { teams };
      }),
    enabled,
  });
}
