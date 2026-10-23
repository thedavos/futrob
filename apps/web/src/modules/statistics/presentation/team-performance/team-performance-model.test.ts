import { describe, expect, it } from "vite-plus/test";
import {
  projectionIncompleteFixture,
  teamPerformanceRankingFixture,
} from "./team-performance.fixtures.ts";
import {
  TEAM_PERFORMANCE_METRICS,
  teamPerformanceRows,
  teamPerformanceSummary,
  teamPerformanceWeight,
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
  });

  it("does not zero-fill a missing component", () => {
    const pumas = teamPerformanceRows(teamPerformanceRankingFixture(), new Map()).find(
      (row) => row.teamId === "team-pumas",
    );

    expect(pumas?.components.find((c) => c.metric === "defensiveEfficiency")?.value).toBeNull();
    expect(pumas?.missing).toEqual(["defensiveEfficiency"]);
    expect(pumas?.reason).toBe("missing_components");
  });

  it("reads weights from the statistics product constants", () => {
    expect(TEAM_PERFORMANCE_METRICS.map(teamPerformanceWeight)).toEqual([40, 20, 20, 10, 10]);
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
});
