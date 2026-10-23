import { describe, expect, it } from "vite-plus/test";
import {
  leagueDraft,
  leaguePlayoffsDraft,
  publishedDraft,
  regularRules,
} from "./competition-rules-fixtures.ts";
import { rulesAreEditable, rulesStages, showsResolution } from "./competition-rules-model.ts";

describe("rulesStages", () => {
  it("lists only the stages the persisted rules define, named by format", () => {
    expect(rulesStages(leaguePlayoffsDraft).map((stage) => stage.label)).toEqual([
      "league",
      "playoffs",
    ]);
    expect(rulesStages(leagueDraft).map((stage) => stage.label)).toEqual(["league"]);
  });

  it("names a groups + knockout format's stages", () => {
    const draft = {
      ...leaguePlayoffsDraft,
      competition: { ...leaguePlayoffsDraft.competition, format: "groups-knockout" as const },
    };
    expect(rulesStages(draft).map((stage) => stage.label)).toEqual(["groups", "knockout"]);
  });

  it("returns nothing for a knockout-only draft without a regular stage", () => {
    const draft = {
      competition: { ...leaguePlayoffsDraft.competition, format: "knockout" as const },
      rules: { ...leaguePlayoffsDraft.rules, regularStage: null },
    };
    expect(rulesStages(draft).map((stage) => stage.label)).toEqual(["knockout"]);
  });
});

describe("rulesAreEditable", () => {
  it("allows editing only a draft the actor may update", () => {
    expect(rulesAreEditable(leaguePlayoffsDraft, true)).toBe(true);
    expect(rulesAreEditable(leaguePlayoffsDraft, false)).toBe(false);
    expect(rulesAreEditable(publishedDraft, true)).toBe(false);
  });
});

describe("showsResolution", () => {
  it("applies only to two-match ties", () => {
    expect(showsResolution(regularRules)).toBe(false);
    expect(showsResolution({ ...regularRules, officialMatchesPerEncounter: 2 })).toBe(true);
  });
});
