import type {
  CompetitionTeamManagementMemberDto,
  CompetitionTeamManagementSummaryDto,
} from "@futrob/api-contracts";

export type CompetitionTeamsFilter = "all" | "pending" | "no_club";

export type CompetitionTeamsSummary = {
  /** Entries the organizer approved: the competition's registered teams (ADR-0019). */
  readonly approved: number;
  readonly pending: number;
  /** Active (non-rejected) entries without an EA club. */
  readonly noClub: number;
  /** Every loaded Team, rejected entries included. */
  readonly loaded: number;
};

function lacksExternalClub(item: CompetitionTeamManagementSummaryDto): boolean {
  return item.externalClub === null && item.entry.status !== "rejected";
}

export function summarizeCompetitionTeams(
  items: readonly CompetitionTeamManagementSummaryDto[],
): CompetitionTeamsSummary {
  let approved = 0;
  let pending = 0;
  let noClub = 0;
  for (const item of items) {
    if (item.entry.status === "approved") approved += 1;
    if (item.entry.status === "pending") pending += 1;
    if (lacksExternalClub(item)) noClub += 1;
  }
  return { approved, pending, noClub, loaded: items.length };
}

export function filterCompetitionTeams(
  items: readonly CompetitionTeamManagementSummaryDto[],
  query: string,
  filter: CompetitionTeamsFilter,
): readonly CompetitionTeamManagementSummaryDto[] {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === "pending" && item.entry.status !== "pending") return false;
    if (filter === "no_club" && !lacksExternalClub(item)) return false;
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
