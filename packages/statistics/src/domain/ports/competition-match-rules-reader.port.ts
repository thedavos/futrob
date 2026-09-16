import type { CompetitionId } from "@futrob/shared-kernel";
import type { StandingResolutionMode } from "../entities/team-match-contribution.ts";

export type { StandingResolutionMode };

export interface CompetitionMatchPointsRules {
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
  readonly resolutionMode: StandingResolutionMode;
}

export interface CompetitionMatchRulesQuery {
  readonly competitionId: CompetitionId;
  readonly stageId?: string;
}

export interface CompetitionMatchRulesReaderPort {
  getPointsRules(query: CompetitionMatchRulesQuery): Promise<CompetitionMatchPointsRules | null>;
}
