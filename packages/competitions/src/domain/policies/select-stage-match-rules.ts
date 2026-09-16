import type { CompetitionRules } from "../entities/competition-rules.ts";
import type { CompetitionMatchRules } from "../value-objects/resolution-mode.ts";

export type CompetitionStageBand = "regular" | "knockout";

export function selectStageMatchRules(
  rules: Pick<CompetitionRules, "regularStage" | "knockoutStage">,
  band: CompetitionStageBand,
): CompetitionMatchRules | null {
  if (rules.regularStage && rules.knockoutStage) {
    return band === "knockout" ? rules.knockoutStage : rules.regularStage;
  }
  return rules.regularStage ?? rules.knockoutStage ?? null;
}
