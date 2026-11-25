import type {
  CompetitionTeamManagementMemberDto,
  CompetitionTeamManagementSummaryDto,
} from "@futrob/api-contracts";

export type CompetitionTeamsFilter = "all" | "pending" | "no_club";

export type CompetitionTeamsSummary = {
  readonly total: number;
  readonly pending: number;
  readonly noClub: number;
};

export function summarizeCompetitionTeams(
  items: readonly CompetitionTeamManagementSummaryDto[],
): CompetitionTeamsSummary {
  let pending = 0;
  let noClub = 0;
  for (const item of items) {
    if (item.entry.status === "pending") pending += 1;
    if (item.externalClub === null) noClub += 1;
  }
  return { total: items.length, pending, noClub };
}

export function filterCompetitionTeams(
  items: readonly CompetitionTeamManagementSummaryDto[],
  query: string,
  filter: CompetitionTeamsFilter,
): readonly CompetitionTeamManagementSummaryDto[] {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === "pending" && item.entry.status !== "pending") return false;
    if (filter === "no_club" && item.externalClub !== null) return false;
    if (!normalizedQuery) return true;
    const teamMatch = item.team.name.toLowerCase().includes(normalizedQuery);
    const clubMatch =
      item.externalClub?.externalClubName.toLowerCase().includes(normalizedQuery) ?? false;
    return teamMatch || clubMatch;
  });
}

export function countTeamCaptains(members: readonly CompetitionTeamManagementMemberDto[]): number {
  let count = 0;
  for (const member of members) {
    if (member.membership.role === "captain" || member.membership.role === "vice_captain") {
      count += 1;
    }
  }
  return count;
}
