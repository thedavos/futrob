import type { CompetitionId } from "@futrob/shared-kernel";

export type StandingResolutionMode = "independent_matches" | "aggregate_score";

export interface CompetitionMatchPointsRules {
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
  readonly resolutionMode: StandingResolutionMode;
}

export interface CompetitionMatchRulesReaderPort {
  getPointsRules(competitionId: CompetitionId): Promise<CompetitionMatchPointsRules | null>;
}
