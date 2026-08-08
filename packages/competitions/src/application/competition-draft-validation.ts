import type { CompetitionFormat } from "../domain/entities/competition.ts";
import type { CompetitionRules } from "../domain/entities/competition-rules.ts";
import type { CompetitionMatchRules } from "../domain/value-objects/resolution-mode.ts";

export function isValidCompetitionRules(
  format: CompetitionFormat,
  rules: CompetitionRules,
): boolean {
  const needsRegular = format !== "knockout";
  const needsKnockout = format !== "league";
  if (Boolean(rules.regularStage) !== needsRegular) return false;
  if (Boolean(rules.knockoutStage) !== needsKnockout) return false;
  if (
    rules.maxRosterSize != null &&
    (!Number.isInteger(rules.maxRosterSize) || rules.maxRosterSize < 1)
  ) {
    return false;
  }
  return [rules.regularStage, rules.knockoutStage]
    .filter((value): value is CompetitionMatchRules => value != null)
    .every(isValidMatchRules);
}

function isValidMatchRules(rules: CompetitionMatchRules): boolean {
  if (![rules.winPoints, rules.drawPoints, rules.lossPoints].every(Number.isInteger)) return false;
  if (
    !(
      rules.winPoints > rules.drawPoints &&
      rules.drawPoints >= rules.lossPoints &&
      rules.lossPoints >= 0
    )
  ) {
    return false;
  }
  if (rules.officialMatchesPerEncounter === 1 && rules.resolutionMode !== "independent_matches") {
    return false;
  }
  if (rules.officialMatchesPerEncounter !== 1 && rules.officialMatchesPerEncounter !== 2)
    return false;
  if (
    !Number.isInteger(rules.minimumRescheduleNoticeHours) ||
    rules.minimumRescheduleNoticeHours < 0
  ) {
    return false;
  }
  return (
    rules.maxReschedulesPerTeam == null ||
    (Number.isInteger(rules.maxReschedulesPerTeam) && rules.maxReschedulesPerTeam >= 0)
  );
}
