import { describe, expect, it } from "vite-plus/test";
import type { CompetitionRepository, CompetitionRules } from "@futrob/competitions";
import { asCompetitionId } from "@futrob/shared-kernel";
import { CompetitionsMatchRulesReader } from "./competition-match-rules-reader.ts";

describe("CompetitionsMatchRulesReader", () => {
  it("resolves independent_matches for a regular league-playoffs stage", async () => {
    const reader = new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules()));

    expect(
      await reader.getPointsRules({
        competitionId: asCompetitionId("competition-1"),
        stageId: "plan:fixture:stage:1",
      }),
    ).toMatchObject({ resolutionMode: "independent_matches" });
  });

  it("resolves aggregate_score for a knockout league-playoffs stage", async () => {
    const reader = new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules()));

    expect(
      await reader.getPointsRules({
        competitionId: asCompetitionId("competition-1"),
        stageId: "plan:fixture:stage:2",
      }),
    ).toMatchObject({ resolutionMode: "aggregate_score" });
  });

  it("defaults omitted stageId to regular independent_matches in league-playoffs", async () => {
    const reader = new CompetitionsMatchRulesReader(repoWith(leaguePlayoffsRules()));

    expect(
      await reader.getPointsRules({
        competitionId: asCompetitionId("competition-1"),
      }),
    ).toMatchObject({ resolutionMode: "independent_matches" });
  });

  it("returns knockout rules for a cup even when the stage id looks regular", async () => {
    const reader = new CompetitionsMatchRulesReader(
      repoWith({
        ...leaguePlayoffsRules(),
        regularStage: null,
      }),
    );

    expect(
      await reader.getPointsRules({
        competitionId: asCompetitionId("competition-1"),
        stageId: "plan:fixture:stage:1",
      }),
    ).toMatchObject({ resolutionMode: "aggregate_score" });
  });
});

function repoWith(rules: CompetitionRules): CompetitionRepository {
  return {
    async saveDraft(draft) {
      return draft;
    },
    async findById() {
      return null;
    },
    async findByCreationKey() {
      return null;
    },
    async findRulesByCompetitionId(competitionId) {
      return competitionId === rules.competitionId ? rules : null;
    },
    async listByOrganization() {
      return [];
    },
  };
}

function leaguePlayoffsRules(): CompetitionRules {
  return {
    competitionId: asCompetitionId("competition-1"),
    version: 1,
    regularStage: {
      officialMatchesPerEncounter: 1,
      resolutionMode: "independent_matches",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    knockoutStage: {
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    awayGoalsEnabled: false,
    maxRosterSize: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  };
}
