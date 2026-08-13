import type { CompetitionId, TeamId } from "@futrob/shared-kernel";
import type { TeamCompetitionStats } from "../entities/team-competition-stats.ts";

export interface TeamCompetitionStatsRepository {
  upsert(stats: TeamCompetitionStats): Promise<void>;
  findByTeamAndCompetition(
    teamId: TeamId,
    competitionId: CompetitionId,
  ): Promise<TeamCompetitionStats | null>;
  listByCompetition(competitionId: CompetitionId): Promise<TeamCompetitionStats[]>;
  deleteByCompetition(competitionId: CompetitionId): Promise<void>;
}
