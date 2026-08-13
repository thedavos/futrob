import type { CompetitionId } from "@futrob/shared-kernel";

export interface CompetitionMatchPointsRules {
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
}

export interface CompetitionMatchRulesReaderPort {
  getPointsRules(competitionId: CompetitionId): Promise<CompetitionMatchPointsRules | null>;
}
