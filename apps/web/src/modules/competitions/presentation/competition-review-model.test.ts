import { describe, expect, it } from "vite-plus/test";
import type { CompetitionDraftDto, CompetitionMatchRulesDto } from "@futrob/api-contracts";
import {
  datesLabel,
  matchesSummary,
  pointsSummary,
  rulesArePublishable,
  teamCountLabel,
} from "./competition-review-model.ts";

const stage = (count: 1 | 2): CompetitionMatchRulesDto => ({
  officialMatchesPerEncounter: count,
  resolutionMode: count === 1 ? "independent_matches" : "aggregate_score",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: 2,
  minimumRescheduleNoticeHours: 12,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
});

function rules(
  regular: CompetitionMatchRulesDto | null,
  knockout: CompetitionMatchRulesDto | null,
  maxRosterSize: number | null = null,
): CompetitionDraftDto["rules"] {
  return {
    version: 1,
    regularStage: regular,
    knockoutStage: knockout,
    awayGoalsEnabled: false,
    maxRosterSize,
    rankingEligibility: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

describe("competition review copy", () => {
  it("labels optional dates and team counts", () => {
    expect(datesLabel({ startsOn: null, endsOn: null })).toBe("Sin definir");
    expect(datesLabel({ startsOn: "2026-10-12", endsOn: "2026-12-20" })).toBe(
      "12 oct 2026 – 20 dic 2026",
    );
    expect(teamCountLabel(0)).toBe("0 equipos");
    expect(teamCountLabel(1)).toBe("1 equipo");
  });

  it("shows saved matches and points for each stage", () => {
    const league = rules(stage(1), null);
    expect(matchesSummary("league", league)).toBe("1 partido por enfrentamiento");
    expect(pointsSummary("league", league)).toBe("Victoria 3 · Empate 1 · Derrota 0");

    const playoffs = rules(stage(1), stage(2));
    expect(matchesSummary("league-playoffs", playoffs)).toBe(
      "Etapa regular: 1 partido por enfrentamiento · Playoffs: 2 partidos por enfrentamiento",
    );
  });

  it("requires whole proposal expiry hours from 1 through 72 before publishing", () => {
    for (const hours of [1, 12, 72]) {
      expect(
        rulesArePublishable(
          "league",
          rules({ ...stage(1), rescheduleProposalExpiryHours: hours }, null),
        ),
      ).toBe(true);
    }
    for (const hours of [0, 73, 1.5]) {
      expect(
        rulesArePublishable(
          "league",
          rules({ ...stage(1), rescheduleProposalExpiryHours: hours }, null),
        ),
      ).toBe(false);
    }
  });

  it("accepts only the stage shape and points a publish would accept", () => {
    expect(rulesArePublishable("league", rules(stage(1), null))).toBe(true);
    expect(rulesArePublishable("knockout", rules(null, stage(2)))).toBe(true);
    expect(rulesArePublishable("groups-knockout", rules(stage(1), null))).toBe(false);
    expect(
      rulesArePublishable(
        "league",
        rules({ ...stage(1), resolutionMode: "aggregate_score" }, null),
      ),
    ).toBe(false);
    expect(rulesArePublishable("league", rules(stage(1), null, 0))).toBe(false);
  });
});
