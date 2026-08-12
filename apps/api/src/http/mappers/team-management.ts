import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
} from "@futrob/api-contracts";
import type {
  TeamRosterManagementDetail,
  TeamRosterManagementSummary,
} from "@/application/teams/team-roster-management.use-case.ts";
import { competitionEntryDto } from "./competition-entry.ts";
import { rosterMembershipDto, teamDto, teamExternalClubDto } from "./team.ts";

export function teamRosterManagementSummaryDto(
  value: TeamRosterManagementSummary,
): CompetitionTeamManagementSummaryDto {
  return {
    team: teamDto(value.team),
    entry: competitionEntryDto(value.entry),
    roster: {
      state: value.roster.state,
      memberCount: value.roster.memberCount,
      maxSize: value.roster.maxSize,
      lockedAt: value.roster.lockedAt?.toISOString() ?? null,
    },
    externalClub: value.externalClub ? teamExternalClubDto(value.externalClub) : null,
  };
}

export function teamRosterManagementDetailDto(
  value: TeamRosterManagementDetail,
): CompetitionTeamManagementDetailResponse {
  return {
    ...teamRosterManagementSummaryDto(value),
    members: value.members.map((member) => ({
      membership: rosterMembershipDto(member.membership),
      presentation: {
        displayName: member.presentation.displayName ?? "Jugador sin nombre público",
        avatarUrl: member.presentation.avatarUrl,
      },
    })),
  };
}
