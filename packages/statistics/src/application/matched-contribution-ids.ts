import type { TeamId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../domain/entities/player-match-contribution.ts";
import type { TeamMatchContribution } from "../domain/entities/team-match-contribution.ts";

export function addMatchedPlayerProfiles(
  profiles: Set<string>,
  contributions: readonly PlayerMatchContribution[],
): void {
  for (const contribution of contributions) {
    if (contribution.correlationStatus === "matched" && contribution.playerProfileId !== null) {
      profiles.add(contribution.playerProfileId);
    }
  }
}

export function addMatchedTeams(
  teams: Set<TeamId>,
  contributions: readonly TeamMatchContribution[],
): void {
  for (const contribution of contributions) {
    if (contribution.correlationStatus === "matched" && contribution.teamId !== null) {
      teams.add(contribution.teamId);
    }
  }
}
