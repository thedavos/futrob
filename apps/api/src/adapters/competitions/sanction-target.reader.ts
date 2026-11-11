import type { SanctionTargetReaderPort } from "@futrob/competitions";
import type { EncounterScheduleRepository } from "@futrob/scheduling";
import {
  asEncounterId,
  type CompetitionId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionRosterMembershipRepository } from "@futrob/teams";

/** Resolves sanction targets over the teams roster and the scheduling encounters. */
export class RosterAndEncounterSanctionTargetReader implements SanctionTargetReaderPort {
  constructor(
    private readonly deps: {
      readonly rosters: Pick<CompetitionRosterMembershipRepository, "findByPlayerAndCompetition">;
      readonly encounters: Pick<EncounterScheduleRepository, "findById">;
    },
  ) {}

  async findPlayerTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    playerProfileId: string,
  ): Promise<TeamId | null> {
    const membership = await this.deps.rosters.findByPlayerAndCompetition(
      playerProfileId,
      competitionId,
    );
    return membership?.organizationId === organizationId ? membership.teamId : null;
  }

  async isEncounterOfTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    encounterId: string,
    teamId: TeamId,
  ): Promise<boolean> {
    const encounter = await this.deps.encounters.findById(asEncounterId(encounterId));
    return (
      encounter?.organizationId === organizationId &&
      encounter.competitionId === competitionId &&
      (encounter.homeTeamId === teamId || encounter.awayTeamId === teamId)
    );
  }
}
