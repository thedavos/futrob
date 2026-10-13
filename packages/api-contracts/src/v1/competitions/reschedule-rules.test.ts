import { describe, expect, it } from "vite-plus/test";
import { competitionMatchRulesSchema } from "./schemas.ts";

const rules = {
  officialMatchesPerEncounter: 1,
  resolutionMode: "independent_matches",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: 2,
  minimumRescheduleNoticeHours: 24,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
};

describe("competition proposal expiry wire contract", () => {
  it("fills the approved 12-hour default for a legacy payload without changing minimum notice", () => {
    expect(competitionMatchRulesSchema.parse(rules)).toMatchObject({
      rescheduleProposalExpiryHours: 12,
      minimumRescheduleNoticeHours: 24,
    });
  });
  it.each([1, 6, 12, 72])("accepts %i whole hours and returns them to the consumer", (hours) => {
    expect(
      competitionMatchRulesSchema.parse({ ...rules, rescheduleProposalExpiryHours: hours })
        .rescheduleProposalExpiryHours,
    ).toBe(hours);
  });
  it.each([0, -1, 73, 1.5, "12", null])("rejects expiry %s at the wire boundary", (value) => {
    const result = competitionMatchRulesSchema.safeParse({
      ...rules,
      rescheduleProposalExpiryHours: value,
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Invalid expiry parsed");
    expect(result.error.issues.map((issue) => issue.path)).toEqual([
      ["rescheduleProposalExpiryHours"],
    ]);
  });
});
