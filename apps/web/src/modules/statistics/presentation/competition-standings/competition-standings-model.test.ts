import { describe, expect, it } from "vite-plus/test";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import {
  standingsSummary,
  standingsTableRows,
  swissStandingsProgress,
  teamNamesFrom,
} from "./competition-standings-model.ts";

const row = (
  position: number,
  teamId: string,
  overrides: Partial<CompetitionStandingSnapshotDto["rows"][number]> = {},
) => ({
  position,
  teamId,
  played: 1,
  wins: 1,
  draws: 0,
  losses: 0,
  goalsFor: 2,
  goalsAgainst: 1,
  goalDifference: 1,
  points: 3,
  form: [],
  ...overrides,
});

const snapshot: CompetitionStandingSnapshotDto = {
  competitionId: "c1",
  organizationId: "o1",
  formulaVersion: "points-gd-gf-v1",
  rows: [row(1, "b"), row(2, "a"), row(3, "gone")],
  sourceRevisionMax: 1,
  updatedAt: "2026-10-12T01:00:00.000Z",
  playoffSpots: null,
  swiss: null,
};

describe("swissStandingsProgress", () => {
  const swiss = { roundsTotal: 5, roundsCompleted: 2, currentRound: 3, isFinal: false };

  it("is null outside the Swiss format", () => {
    expect(swissStandingsProgress(null)).toBeNull();
  });

  it("names the round being played", () => {
    expect(swissStandingsProgress(swiss)).toEqual({ kind: "round", current: 3, total: 5 });
  });

  it("says final once every round is settled, even if the plan shrank", () => {
    expect(
      swissStandingsProgress({ ...swiss, roundsTotal: 3, roundsCompleted: 3, isFinal: true }),
    ).toEqual({ kind: "final" });
  });

  it("does not invent a current round between two rounds", () => {
    expect(swissStandingsProgress({ ...swiss, currentRound: null })).toEqual({
      kind: "between",
      completed: 2,
      total: 5,
    });
  });
});

describe("standings rows", () => {
  it("keeps the server order and never shows an id as a name", () => {
    const names = {
      kind: "ready",
      byId: teamNamesFrom([
        { id: "a", name: "A FC" },
        { id: "b", name: "B FC" },
      ]),
    } as const;
    expect(standingsTableRows(snapshot, names).map((r) => [r.row.position, r.team])).toEqual([
      [1, { kind: "name", value: "B FC" }],
      [2, { kind: "name", value: "A FC" }],
      [3, { kind: "unresolved" }],
    ]);
  });

  it("marks names loading or unavailable without hiding the figures", () => {
    expect(standingsTableRows(snapshot, { kind: "loading" })[0]?.team).toEqual({ kind: "loading" });
    expect(standingsTableRows(snapshot, { kind: "unavailable" })[0]?.team).toEqual({
      kind: "unresolved",
    });
  });

  it("highlights only the leader without a playoff cut, and the playoff zone when a cut exists", () => {
    const names = { kind: "unavailable" } as const;
    expect(standingsTableRows(snapshot, names).map((r) => r.inHighlightedZone)).toEqual([
      true,
      false,
      false,
    ]);
    expect(
      standingsTableRows({ ...snapshot, playoffSpots: 2 }, names).map((r) => [
        r.inHighlightedZone,
        r.lastAboveCut,
      ]),
    ).toEqual([
      [true, false],
      [true, true],
      [false, false],
    ]);
  });
});

describe("standingsSummary", () => {
  it("derives leader gap, best attack, best defense and official match count from rows", () => {
    const summary = standingsSummary({
      ...snapshot,
      rows: [
        row(1, "rv", { played: 7, goalsFor: 15, goalsAgainst: 7, points: 18 }),
        row(2, "dl", { played: 7, goalsFor: 12, goalsAgainst: 8, points: 11 }),
        row(3, "sq", { played: 5, goalsFor: 4, goalsAgainst: 7, points: 3 }),
      ],
    });
    expect(summary).toEqual({
      leader: { teamId: "rv", points: 18, leadOverSecond: 7 },
      bestAttack: { value: 15, perMatch: 15 / 7, teamIds: ["rv"] },
      bestDefense: { value: 7, perMatch: 1, teamIds: ["rv", "sq"] },
      officialMatches: 9,
      teamCount: 3,
    });
  });

  it("avoids fabricating best attack/defense when no team has played a match", () => {
    const summary = standingsSummary({
      ...snapshot,
      rows: [
        row(1, "a", { played: 0, wins: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }),
        row(2, "b", { played: 0, wins: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }),
      ],
    });
    expect(summary).toEqual({
      leader: { teamId: "a", points: 0, leadOverSecond: 0 },
      bestAttack: null,
      bestDefense: null,
      officialMatches: 0,
      teamCount: 2,
    });
  });
});
