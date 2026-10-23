import { describe, expect, it } from "vite-plus/test";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import { standingsTableRows, teamNamesFrom } from "./competition-standings-model.ts";

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
});

const snapshot: CompetitionStandingSnapshotDto = {
  competitionId: "c1",
  organizationId: "o1",
  formulaVersion: "points-gd-gf-v1",
  rows: [row(1, "b"), row(2, "a"), row(3, "gone")],
  sourceRevisionMax: 1,
  updatedAt: "2026-10-12T01:00:00.000Z",
};

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
