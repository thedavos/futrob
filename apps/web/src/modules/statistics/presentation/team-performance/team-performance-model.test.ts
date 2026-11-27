import { describe, expect, it } from "vite-plus/test";
import {
  projectionIncompleteFixture,
  teamPerformanceRankingFixture,
} from "./team-performance.fixtures.ts";
import {
  teamPerformanceHighlights,
  teamPerformanceRows,
  teamPerformanceSummary,
} from "./team-performance-model.ts";

describe("team performance view model", () => {
  it("keeps server order, positions and scores, and leaves unknown names null", () => {
    const rows = teamPerformanceRows(
      teamPerformanceRankingFixture(),
      new Map([["team-cuervos", "Cuervos FC"]]),
    );

    expect(rows.map((row) => [row.teamId, row.position, row.score])).toEqual([
      ["team-cuervos", 1, 95],
      ["team-halcones", 2, 40],
      ["team-maderas", 3, 5],
      ["team-pumas", null, null],
      ["team-tiburones-del-pacifico", null, null],
      ["team-sin-nombre", null, null],
    ]);
    expect(rows[0]?.name).toBe("Cuervos FC");
    expect(rows[1]?.name).toBeNull();
    expect(rows[0]?.components.find((c) => c.metric === "results")?.contribution).toBe(40);
  });

  it("does not zero-fill a missing component", () => {
    const pumas = teamPerformanceRows(teamPerformanceRankingFixture(), new Map()).find(
      (row) => row.teamId === "team-pumas",
    );

    expect(pumas?.components.find((c) => c.metric === "defensiveEfficiency")?.value).toBeNull();
    expect(
      pumas?.components.find((c) => c.metric === "defensiveEfficiency")?.contribution,
    ).toBeNull();
    expect(pumas?.missing).toEqual(["defensiveEfficiency"]);
    expect(pumas?.reason).toBe("missing_components");
  });

  it("counts scored, incomplete and approved sources without voids", () => {
    expect(teamPerformanceSummary(teamPerformanceRankingFixture())).toEqual({
      scored: 3,
      incomplete: 3,
      approvedSources: 2,
    });
    expect(teamPerformanceSummary(projectionIncompleteFixture())).toMatchObject({
      scored: 0,
      incomplete: 3,
    });
  });

  it("derives KPI highlights without inventing unavailable metrics", () => {
    const ready = teamPerformanceHighlights(teamPerformanceRankingFixture());
    expect(ready.leader).toEqual({
      teamIds: ["team-cuervos"],
      score: 95,
      leadOverSecond: 55,
    });
    expect(ready.bestForm?.teamIds).toEqual(["team-cuervos"]);
    expect(ready.bestForm?.value).toBe(100);
    expect(ready.bestDefense?.teamIds).toEqual(["team-cuervos"]);
    expect(ready.bestDefense?.value).toBe(100);
    expect(ready.scored).toBe(3);
    expect(ready.total).toBe(6);

    const incomplete = teamPerformanceHighlights(projectionIncompleteFixture());
    expect(incomplete.leader).toBeNull();
    expect(incomplete.bestForm).toBeNull();
    expect(incomplete.bestDefense).toBeNull();
    expect(incomplete.scored).toBe(0);
    expect(incomplete.total).toBe(3);
  });
});
