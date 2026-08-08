import type { CompetitionId } from "@futrob/shared-kernel";
import type { CompetitionMatchRules } from "../value-objects/resolution-mode.ts";

export interface CompetitionRules {
  readonly competitionId: CompetitionId;
  readonly version: number;
  readonly regularStage: CompetitionMatchRules | null;
  readonly knockoutStage: CompetitionMatchRules | null;
  readonly awayGoalsEnabled: false;
  /** null means use default roster size (11) at evaluation time in teams */
  readonly maxRosterSize: number | null;
  readonly createdAt: Date;
}
