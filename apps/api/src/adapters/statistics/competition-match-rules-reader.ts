import type {
  CompetitionMatchPointsRules,
  CompetitionMatchRulesQuery,
  CompetitionMatchRulesReaderPort,
} from "@futrob/statistics";
import {
  selectStageMatchRules,
  type CompetitionRepository,
  type CompetitionStageBand,
} from "@futrob/competitions";

export class CompetitionsMatchRulesReader implements CompetitionMatchRulesReaderPort {
  constructor(private readonly competitions: CompetitionRepository) {}

  async getPointsRules(
    query: CompetitionMatchRulesQuery,
  ): Promise<CompetitionMatchPointsRules | null> {
    const rules = await this.competitions.findRulesByCompetitionId(query.competitionId);
    if (!rules) return null;
    const stage = selectStageMatchRules(rules, stageBandFromStageId(query.stageId));
    if (!stage) return null;
    return {
      winPoints: stage.winPoints,
      drawPoints: stage.drawPoints,
      lossPoints: stage.lossPoints,
      resolutionMode: stage.resolutionMode,
    };
  }
}

function stageBandFromStageId(stageId: string | undefined): CompetitionStageBand {
  if (stageId === undefined || stageId === "") return "regular";
  const orderToken = stageId.split(":stage:").at(-1);
  const order = Number(orderToken);
  if (!Number.isFinite(order)) return "regular";
  return order <= 1 ? "regular" : "knockout";
}
