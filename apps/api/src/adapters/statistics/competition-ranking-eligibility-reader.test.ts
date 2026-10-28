import { describe, expect, it } from "vite-plus/test";
import type { CompetitionRepository, CompetitionRules } from "@futrob/competitions";
import { asCompetitionId } from "@futrob/shared-kernel";
import { CompetitionsRankingEligibilityReader } from "./competition-ranking-eligibility-reader.ts";

const competitionId = asCompetitionId("competition-1");

describe("CompetitionsRankingEligibilityReader", () => {
  it("returns the minimums configured in the competition rules", async () => {
    const reader = new CompetitionsRankingEligibilityReader(
      repoWith(rules({ minimumMatches: 1, minimumTeamMinutesRatio: 0.25 })),
    );

    await expect(reader.getRankingEligibility(competitionId)).resolves.toEqual({
      minimumMatches: 1,
      minimumTeamMinutesRatio: 0.25,
    });
  });

  it("returns null when the competition keeps the defaults", async () => {
    const reader = new CompetitionsRankingEligibilityReader(repoWith(rules(null)));

    await expect(reader.getRankingEligibility(competitionId)).resolves.toBeNull();
  });

  it("returns null when the competition has no rules", async () => {
    const reader = new CompetitionsRankingEligibilityReader(repoWith(null));

    await expect(reader.getRankingEligibility(competitionId)).resolves.toBeNull();
  });
});

function rules(rankingEligibility: CompetitionRules["rankingEligibility"]): CompetitionRules {
  return {
    competitionId,
    version: 1,
    regularStage: null,
    knockoutStage: null,
    awayGoalsEnabled: false,
    maxRosterSize: null,
    rankingEligibility,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function repoWith(
  value: CompetitionRules | null,
): Pick<CompetitionRepository, "findRulesByCompetitionId"> {
  return { findRulesByCompetitionId: async () => value };
}
