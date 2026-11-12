import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
} from "@futrob/api-contracts";

export type RulesStageKey = "regularStage" | "knockoutStage";
export type RulesStageLabel = "league" | "groups" | "knockout" | "playoffs" | "swiss";

export type RulesStage = {
  readonly key: RulesStageKey;
  readonly label: RulesStageLabel;
  readonly rules: CompetitionMatchRulesDto;
};

const STAGE_LABELS = {
  league: { regularStage: "league", knockoutStage: "knockout" },
  knockout: { regularStage: "league", knockoutStage: "knockout" },
  "groups-knockout": { regularStage: "groups", knockoutStage: "knockout" },
  "league-playoffs": { regularStage: "league", knockoutStage: "playoffs" },
  swiss: { regularStage: "swiss", knockoutStage: "knockout" },
} as const satisfies Record<CompetitionFormatDto, Record<RulesStageKey, RulesStageLabel>>;

/** Stages the persisted rules actually define, in play order. Same as the web rules page. */
export function rulesStages(draft: CompetitionDraftDto): readonly RulesStage[] {
  const labels = STAGE_LABELS[draft.competition.format];
  const stages: RulesStage[] = [];
  if (draft.rules.regularStage) {
    stages.push({
      key: "regularStage",
      label: labels.regularStage,
      rules: draft.rules.regularStage,
    });
  }
  if (draft.rules.knockoutStage) {
    stages.push({
      key: "knockoutStage",
      label: labels.knockoutStage,
      rules: draft.rules.knockoutStage,
    });
  }
  return stages;
}

/** Two-match ties are the only ones with a resolution choice; one match is independent. */
export function showsResolution(rules: CompetitionMatchRulesDto): boolean {
  return rules.officialMatchesPerEncounter === 2;
}

/** Tiebreak criteria in the order `statistics` applies them; Swiss adds Buchholz. */
export function tiebreakCriteria(
  format: CompetitionFormatDto,
): readonly ("points" | "buchholz" | "goalDifference" | "goalsFor")[] {
  return format === "swiss"
    ? ["points", "buchholz", "goalDifference", "goalsFor"]
    : ["points", "goalDifference", "goalsFor"];
}
