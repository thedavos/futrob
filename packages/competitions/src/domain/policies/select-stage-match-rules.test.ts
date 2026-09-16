import { describe, expect, it } from "vite-plus/test";
import type { CompetitionMatchRules } from "../value-objects/resolution-mode.ts";
import { selectStageMatchRules } from "./select-stage-match-rules.ts";

describe("selectStageMatchRules", () => {
  it("picks regular rules in a mixed competition", () => {
    const selected = selectStageMatchRules(
      { regularStage: independent(), knockoutStage: aggregate() },
      "regular",
    );
    expect(selected?.resolutionMode).toBe("independent_matches");
    expect(selected?.officialMatchesPerEncounter).toBe(1);
  });

  it("picks knockout rules in a mixed competition", () => {
    const selected = selectStageMatchRules(
      { regularStage: independent(), knockoutStage: aggregate() },
      "knockout",
    );
    expect(selected?.resolutionMode).toBe("aggregate_score");
    expect(selected?.officialMatchesPerEncounter).toBe(2);
  });

  it("returns the only knockout stage when a cup has no regular rules", () => {
    const selected = selectStageMatchRules(
      { regularStage: null, knockoutStage: aggregate() },
      "regular",
    );
    expect(selected?.resolutionMode).toBe("aggregate_score");
  });

  it("returns the only regular stage when a league has no knockout rules", () => {
    const selected = selectStageMatchRules(
      { regularStage: independent(), knockoutStage: null },
      "knockout",
    );
    expect(selected?.resolutionMode).toBe("independent_matches");
  });
});

function independent(): CompetitionMatchRules {
  return matchRules(1, "independent_matches");
}

function aggregate(): CompetitionMatchRules {
  return matchRules(2, "aggregate_score");
}

function matchRules(
  officialMatchesPerEncounter: 1 | 2,
  resolutionMode: CompetitionMatchRules["resolutionMode"],
): CompetitionMatchRules {
  return {
    officialMatchesPerEncounter,
    resolutionMode,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 2,
    minimumRescheduleNoticeHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  };
}
