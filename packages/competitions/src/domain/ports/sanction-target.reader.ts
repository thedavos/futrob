import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/**
 * What a sanction needs from teams and scheduling. `competitions` is a leaf of the
 * context graph, so `apps/api` implements this port over their public APIs.
 */
export interface SanctionTargetReaderPort {
  /** The Team whose roster the player is on in this competition, or null. */
  findPlayerTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    playerProfileId: string,
  ): Promise<TeamId | null>;
  /** True when the encounter belongs to the competition and the Team plays it. */
  isEncounterOfTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    encounterId: string,
    teamId: TeamId,
  ): Promise<boolean>;
}
