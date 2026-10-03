import { useCompetitionTeamManagementDetailQuery } from "../competition-team-queries.ts";
import type { CaptainTeamAccess, CaptainTeamScope } from "./captain-team-access.ts";

/** Placeholder for hooks that need a scope before access is ready; nothing can act on it. */
const NO_SCOPE = { organizationId: "", competitionId: "", teamId: "" } as const;

/**
 * The team detail behind a captain page, plus the scope the mutation hooks need. Owns the only
 * empty fallback: pages render actions only when access is `ready`, and the query stays
 * disabled without a team.
 */
export function useCaptainTeamDetail(access: CaptainTeamAccess) {
  const scope: CaptainTeamScope = access.kind === "ready" ? access.scope : NO_SCOPE;
  const detail = useCompetitionTeamManagementDetailQuery(
    scope.organizationId,
    scope.competitionId,
    scope.teamId || null,
  );
  return { scope, detail };
}
