import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";

export interface TeamMatchContributionRepository {
  saveMany(contributions: readonly TeamMatchContribution[]): Promise<void>;
  deleteByEncounterRevision(input: {
    readonly encounterId: EncounterId;
    readonly revision: number | "all";
  }): Promise<void>;
  deleteByCompetition(competitionId: CompetitionId): Promise<void>;
  listByTeam(
    teamId: NonNullable<TeamMatchContribution["teamId"]>,
  ): Promise<TeamMatchContribution[]>;
  listByEncounter(encounterId: EncounterId): Promise<TeamMatchContribution[]>;
  listByCompetition(competitionId: CompetitionId): Promise<TeamMatchContribution[]>;
}
