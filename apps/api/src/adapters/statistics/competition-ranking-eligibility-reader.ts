import type {
  CompetitionRankingEligibilityReaderPort,
  RankingEligibilityConfig,
} from "@futrob/statistics";
import type { CompetitionRepository } from "@futrob/competitions";
import type { CompetitionId } from "@futrob/shared-kernel";

export class CompetitionsRankingEligibilityReader implements CompetitionRankingEligibilityReaderPort {
  constructor(
    private readonly competitions: Pick<CompetitionRepository, "findRulesByCompetitionId">,
  ) {}

  async getRankingEligibility(
    competitionId: CompetitionId,
  ): Promise<RankingEligibilityConfig | null> {
    const rules = await this.competitions.findRulesByCompetitionId(competitionId);
    const eligibility = rules?.rankingEligibility;
    if (!eligibility) return null;
    return {
      minimumMatches: eligibility.minimumMatches,
      minimumTeamMinutesRatio: eligibility.minimumTeamMinutesRatio,
    };
  }
}
