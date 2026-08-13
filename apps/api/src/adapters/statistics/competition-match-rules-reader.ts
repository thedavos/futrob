import type {
  CompetitionMatchPointsRules,
  CompetitionMatchRulesReaderPort,
} from "@futrob/statistics";
import type { CompetitionRepository } from "@futrob/competitions";
import type { CompetitionId } from "@futrob/shared-kernel";

export class CompetitionsMatchRulesReader implements CompetitionMatchRulesReaderPort {
  constructor(private readonly competitions: CompetitionRepository) {}

  async getPointsRules(competitionId: CompetitionId): Promise<CompetitionMatchPointsRules | null> {
    const rules = await this.competitions.findRulesByCompetitionId(competitionId);
    const stage = rules?.regularStage ?? rules?.knockoutStage ?? null;
    if (!stage) return null;
    return {
      winPoints: stage.winPoints,
      drawPoints: stage.drawPoints,
      lossPoints: stage.lossPoints,
    };
  }
}
