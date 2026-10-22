import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
} from "@futrob/api-contracts";

export type RulesStageKey = "regularStage" | "knockoutStage";
export type RulesStageLabel = "league" | "groups" | "knockout" | "playoffs";

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
} as const satisfies Record<CompetitionFormatDto, Record<RulesStageKey, RulesStageLabel>>;

/** Stages the persisted rules actually define, in play order. */
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

/** Only a draft accepts rule edits; every later status locks the structure. */
export function rulesAreEditable(draft: CompetitionDraftDto, canUpdate: boolean): boolean {
  return canUpdate && draft.competition.status === "draft";
}

/** Two-match ties are the only ones with a resolution choice; one match is independent. */
export function showsResolution(rules: CompetitionMatchRulesDto): boolean {
  return rules.officialMatchesPerEncounter === 2;
}
