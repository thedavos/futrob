import { useQuery } from "@tanstack/react-query";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { TeamsClientError } from "@/modules/teams/presentation/teams-browser-client.ts";
import { listEveryCompetitionManagementPage } from "@/modules/teams/presentation/competition-team-queries.ts";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  readKeepingRefusal,
  type AuthoritativeStatus,
} from "@/shared/presentation/query/stored-refusal.ts";
import {
  CompetitionStandingsClientError,
  getCompetitionStandings,
} from "./competition-standings-client.ts";

function clientStatus(error: Error): number | undefined {
  return error instanceof CompetitionStandingsClientError ||
    error instanceof CompetitionsClientError ||
    error instanceof TeamsClientError
    ? error.status
    : undefined;
}

function standingsRefusal(status: AuthoritativeStatus): Refusal["refused"] {
  switch (status) {
    case 401:
      return "session";
    case 403:
      return "permission";
    case 404:
      return "not_found";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
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
  const readResult = await readKeepingRefusal(read, clientStatus);
  if (readResult.outcome === "refused") return { refused: standingsRefusal(readResult.status) };
  return readResult.value;
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
    retry: (failureCount) => failureCount < 2,
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
        const items = await listEveryCompetitionManagementPage(organizationId, competitionId, 25);
        return { teams: items.map((item) => ({ id: item.team.id, name: item.team.name })) };
      }),
    enabled,
  });
}
