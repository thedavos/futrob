import type { OfficialResult } from "@futrob/results";
import {
  generateFixturePlan,
  swissRounds,
  type CompetitionFixtureSourceSnapshot,
  type FixtureFormat,
  type FixturePlan,
} from "@futrob/scheduling";
import { asCompetitionId, asOrganizationId, asTeamId, type TeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { FixturePlayoffSpotsReader } from "./fixture-playoff-spots-reader.ts";
import { FixtureSwissStandingReader } from "./fixture-swiss-standing-reader.ts";

const organizationId = asOrganizationId("org");
const competitionId = asCompetitionId("comp");
const [a, b, c] = ["a", "b", "c"].map(asTeamId) as [TeamId, TeamId, TeamId];

function plan(format: FixtureFormat): FixturePlan {
  return generateFixturePlan({
    organizationId,
    competitionId,
    generationVersion: 1,
    rulesVersion: 1,
    format,
    timeZone: "UTC",
    startsAt: new Date("2026-11-01T20:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 2, knockout: 2 },
    resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
    seed: [a, b, c],
    homeAndAway: false,
    ...(format === "swiss" ? { swiss: { rounds: 2 } } : {}),
  });
}

const source: CompetitionFixtureSourceSnapshot = {
  organizationId,
  competitionId,
  status: "published",
  format: "swiss",
  timeZone: "UTC",
  rulesVersion: 1,
  officialMatchCounts: { regular: 2, knockout: 2 },
  resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
  standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
  pointDeductions: [],
  approvedParticipants: [a, b, c],
};

function result(encounterId: string, status: OfficialResult["status"]) {
  return { encounterId, status, revision: 1 } as OfficialResult;
}

function reader(current: FixturePlan, results: readonly OfficialResult[]) {
  return new FixtureSwissStandingReader({
    fixturePlans: { listActive: async () => [current] },
    results: { listByCompetition: async () => [...results] },
    source: { load: async () => source },
  });
}

describe("FixtureSwissStandingReader", () => {
  it("is null for any other format", async () => {
    await expect(
      reader(plan("league"), []).find(organizationId, competitionId),
    ).resolves.toBeNull();
  });

  it("reads rivals only from approved encounters, byes and the bye credit", async () => {
    const current = plan("swiss");
    const [table, bye] = swissRounds(current)[0]!.encounters;

    const pending = await reader(current, []).find(organizationId, competitionId);
    expect(pending?.opponentsByTeam.size).toBe(0);
    expect(pending).toMatchObject({
      pointsPerBye: 6,
      roundsTotal: 2,
      roundsCompleted: 0,
      currentRound: 1,
      isFinal: false,
    });
    expect(pending?.byesByTeam.get(c)).toBeUndefined();
    expect(bye?.away.kind).toBe("bye");

    const voided = await reader(current, [result(table!.id, "voided")]).find(
      organizationId,
      competitionId,
    );
    expect(voided?.opponentsByTeam.size).toBe(0);

    const approved = await reader(current, [result(table!.id, "approved")]).find(
      organizationId,
      competitionId,
    );
    expect(Object.fromEntries(approved!.opponentsByTeam)).toEqual({ a: [b], b: [a] });
    expect(approved).toMatchObject({ roundsCompleted: 1, currentRound: null, isFinal: false });
    expect(approved?.byesByTeam.get(c)).toBe(1);
  });

  it("reports final once truncation leaves only settled rounds", async () => {
    const current = plan("swiss");
    const [first, second] = current.stages[0]!.rounds;
    const truncated: FixturePlan = {
      ...current,
      stages: [{ ...current.stages[0]!, rounds: [first!] }],
    };
    expect(second).toBeDefined();
    const [table] = first!.encounters;

    await expect(
      reader(truncated, [result(table!.id, "approved")]).find(organizationId, competitionId),
    ).resolves.toMatchObject({ roundsTotal: 1, roundsCompleted: 1, isFinal: true });
  });
});

describe("FixturePlayoffSpotsReader on a Swiss fixture", () => {
  it("stays null", async () => {
    const spots = new FixturePlayoffSpotsReader({
      fixturePlans: { listActive: async () => [plan("swiss")] },
      results: { listByCompetition: async () => [] },
    });
    await expect(spots.find(organizationId, competitionId)).resolves.toBeNull();
  });
});
