import type { GetMyTeamsResponse } from "@futrob/api-contracts";

/** Prefer the active roster membership for the competition; otherwise any membership in that competition. */
export function teamIdForCompetition(
  competitionId: string,
  teams: GetMyTeamsResponse | undefined,
): string | undefined {
  if (!teams) return undefined;
  const inCompetition = teams.teams.filter(
    (item) => item.membership.competitionId === competitionId,
  );
  if (inCompetition.length === 0) return undefined;
  const active = inCompetition.find(
    (item) => item.membership.id === teams.activeRosterMembershipId,
  );
  return (active ?? inCompetition[0])?.membership.teamId;
}
