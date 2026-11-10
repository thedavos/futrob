import type { CompetitionMatchRules } from "@futrob/competitions";
import { describe, expect, it } from "vite-plus/test";
import type { PublicRulesReaderPort, PublicRulesSource } from "../../domain/ports/public-rules-reader.port.ts";
import { GetPublicRulesUseCase } from "./get-public-rules.use-case.ts";
import { competitionSource, PUBLIC_KEY, publishedReader } from "../public-portal.test-helper.ts";

const REGULAR: CompetitionMatchRules = {
  officialMatchesPerEncounter: 1,
  resolutionMode: "independent_matches",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: 2,
  minimumRescheduleNoticeHours: 12,
  rescheduleProposalExpiryHours: 24,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
};

function rulesReader(source: PublicRulesSource | null): PublicRulesReaderPort & {
  readonly calls: number;
} {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async read() {
      state.calls += 1;
      return source;
    },
  };
}

describe("GetPublicRulesUseCase", () => {
  it("publishes the format, team range and the rules of each defined stage", async () => {
    const result = await new GetPublicRulesUseCase({
      competitions: publishedReader(competitionSource({ format: "league-playoffs" })),
      rules: rulesReader({
        teams: { min: 4, max: 16 },
        regularStage: REGULAR,
        knockoutStage: {
          ...REGULAR,
          officialMatchesPerEncounter: 2,
          resolutionMode: "aggregate_score",
          allowRescheduling: false,
          maxReschedulesPerTeam: null,
        },
        maxRosterSize: null,
      }),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      format: "league-playoffs",
      teams: { min: 4, max: 16 },
      stages: [
        {
          stage: "regular",
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
          officialMatchesPerEncounter: 1,
          resolutionMode: "independent_matches",
          rescheduling: { allowed: true, maxPerTeam: 2, minimumNoticeHours: 12 },
        },
        {
          stage: "knockout",
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
          officialMatchesPerEncounter: 2,
          resolutionMode: "aggregate_score",
          rescheduling: { allowed: false },
        },
      ],
      maxRosterSize: null,
    });
  });

  it("keeps approval workflow settings out of the public rules", async () => {
    const result = await new GetPublicRulesUseCase({
      competitions: publishedReader(competitionSource()),
      rules: rulesReader({
        teams: { min: 2, max: null },
        regularStage: REGULAR,
        knockoutStage: null,
        maxRosterSize: 18,
      }),
    }).execute({ key: PUBLIC_KEY });

    const wire = JSON.stringify(result.isOk() && result.value);
    for (const internal of [
      "rescheduleProposalExpiryHours",
      "rescheduleRequiresOpponentApproval",
      "rescheduleRequiresOrganizerApproval",
      "version",
      "competitionId",
    ]) {
      expect(wire).not.toContain(internal);
    }
  });

  it("answers no stages when the competition has no stored rules", async () => {
    const result = await new GetPublicRulesUseCase({
      competitions: publishedReader(competitionSource({ format: "knockout" })),
      rules: rulesReader(null),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      format: "knockout",
      teams: null,
      stages: [],
      maxRosterSize: null,
    });
  });

  it("does not read the rules of an unpublished competition", async () => {
    const rules = rulesReader(null);
    const result = await new GetPublicRulesUseCase({
      competitions: publishedReader(competitionSource({ status: "archived" })),
      rules,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(rules.calls).toBe(0);
  });
});
