import type { CompetitionId } from "@futrob/shared-kernel";
import type { CompetitionMatchRules } from "../value-objects/resolution-mode.ts";

export interface CompetitionRules {
  readonly competitionId: CompetitionId;
  readonly version: number;
  readonly regularStage: CompetitionMatchRules | null;
  readonly knockoutStage: CompetitionMatchRules | null;
  readonly awayGoalsEnabled: false;
  readonly createdAt: Date;
}
