import { describe, expect, it } from "vite-plus/test";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import {
  standingsTableRows,
  swissStandingsProgress,
  teamNamesFrom,
} from "./competition-standings-model.ts";

const row = (position: number, teamId: string) => ({
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
});
