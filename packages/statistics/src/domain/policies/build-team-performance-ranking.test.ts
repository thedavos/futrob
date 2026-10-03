import { describe, expect, it } from "vite-plus/test";
import { asTeamId } from "@futrob/shared-kernel";
import { buildTeamPerformanceRanking } from "./build-team-performance-ranking.ts";
import {
  performanceHome,
  performancePair,
  performanceSources,
} from "./team-performance.fixture.ts";

const now = new Date("2030-01-01T00:00:00.000Z");

describe("team performance normalization", () => {
  it("keeps fractional DG endpoints exactly 0 and 100 for wire validation", () => {
    const contributions = [1, 2, 3].flatMap((i) =>
      performancePair(i, { goalsFor: i === 1 ? 5 : 6, shots: 10 }, { shots: 10 }),
    );
    const snapshot = buildTeamPerformanceRanking(performanceSources(contributions), now);
    expect(snapshot.rows.map((row) => row.components.goalDifference)).toEqual([100, 0]);
    expect(snapshot.rows.map((row) => row.score)).toEqual([96, 4]);
  });
  it("recomputes DG for other comparables when an old appearance is corrected", () => {
    const third = [4, 5, 6].flatMap((i) =>
      performancePair(
        i,
        { teamId: asTeamId("team-c"), goalsFor: 1, goalsAgainst: 0 },
        { teamId: asTeamId("team-d") },
      ),
    );
    const first = [1, 2, 3].flatMap((i) => performancePair(i, { shots: 12 }, { shots: 12 }));
    const before = buildTeamPerformanceRanking(performanceSources([...first, ...third]), now);
    const corrected = [1, 2, 3].flatMap((i) =>
      performancePair(
        i,
        { shots: 12, goalsFor: i === 1 ? 0 : 2, goalsAgainst: i === 1 ? 8 : 0 },
        { shots: 12 },
      ),
    );
    const after = buildTeamPerformanceRanking(performanceSources([...corrected, ...third]), now);
    expect(before.rows.find((row) => row.teamId === "team-c")?.components.goalDifference).toBe(75);
    expect(
      after.rows.find((row) => row.teamId === "team-c")?.components.goalDifference,
    ).toBeCloseTo(87.5);
    expect(after.rows.find((row) => row.teamId === "team-c")?.evidence.goalsFor).toBe(3);
  });
  it("derives literal components and weighted scores from official slot stats", () => {
    const snapshot = buildTeamPerformanceRanking(performanceSources(), now);
    expect(snapshot.rows[0]).toMatchObject({
      teamId: performanceHome,
      score: 95,
      position: 1,
      status: "scored",
      components: {
        results: 100,
        goalDifference: 100,
        recentForm: 100,
        offensiveEfficiency: 50,
        defensiveEfficiency: 100,
      },
      evidence: {
        resultPoints: 9,
        resultMaximum: 9,
        goalsFor: 6,
        goalsAgainst: 0,
        shotsFor: 12,
        shotsAgainst: 12,
      },
      coverage: { encounters: 3, competitiveUnits: 3, officialMatches: 3, reason: "complete" },
    });
    expect(snapshot.rows[1]?.score).toBe(5);
    expect(snapshot.window).toEqual({
      kind: "competition_all",
      minimumEncounters: 3,
      recentEncounterLimit: 5,
      from: "2026-08-01T19:00:00.000Z",
      through: "2026-08-03T19:00:00.000Z",
    });
  });

  it("reaches literal zero and 100 without changing the weights", () => {
    const snapshot = buildTeamPerformanceRanking(
      performanceSources([1, 2, 3].flatMap((i) => performancePair(i, { shots: 2 }, { shots: 2 }))),
      now,
    );
    expect(snapshot.rows.map((row) => row.score)).toEqual([100, 0]);
  });

  it("draws score 40, use neutral DG when equal, and share positions", () => {
    const snapshot = buildTeamPerformanceRanking(
      performanceSources(
        [1, 2, 3].flatMap((i) =>
          performancePair(i, { goalsFor: 1, goalsAgainst: 1, shots: 2 }, { shots: 2 }),
        ),
      ),
      now,
    );
    expect(
      snapshot.rows.map((row) => ({
        position: row.position,
        score: row.score,
        gd: row.components.goalDifference,
      })),
    ).toEqual([
      { position: 1, score: 40, gd: 50 },
      { position: 1, score: 40, gd: 50 },
    ]);
  });

  it("counts encounters for the minimum; two slots are not two encounters", () => {
    const matches = [1, 2].flatMap((i) => [
      ...performancePair(i),
      ...performancePair(i, { officialSlot: 2, id: `second-${i}` }),
    ]);
    const snapshot = buildTeamPerformanceRanking(performanceSources(matches), now);
    expect(snapshot.rows[0]).toMatchObject({
      status: "incomplete",
      score: null,
      position: null,
      coverage: { encounters: 2, officialMatches: 4, reason: "insufficient_sample" },
    });
    expect(snapshot.rows[0]?.missing).toHaveLength(5);
  });

  it("shows approved teams with no data and byes as no_data, never zero", () => {
    const sources = performanceSources([]);
    const snapshot = buildTeamPerformanceRanking(
      { ...sources, teamIds: [...sources.teamIds, asTeamId("bye-team")] },
      now,
    );
    expect(snapshot.rows).toHaveLength(3);
    expect(
      snapshot.rows.every((row) => row.score === null && row.coverage.reason === "no_data"),
    ).toBe(true);
  });

  it.each([null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "fails closed for own shots %s",
    (shots) => {
      const snapshot = buildTeamPerformanceRanking(
        performanceSources([1, 2, 3].flatMap((i) => performancePair(i, { shots }))),
        now,
      );
      const home = snapshot.rows.find((row) => row.teamId === performanceHome)!;
      expect(home.score).toBeNull();
      expect(home.missing).toContain("offensiveEfficiency");
      expect(snapshot.rows.find((row) => row.teamId !== performanceHome)?.missing).toContain(
        "defensiveEfficiency",
      );
    },
  );

  it("does not use saves or tackles as substitutes for missing opponent shots", () => {
    const snapshot = buildTeamPerformanceRanking(
      performanceSources(
        [1, 2, 3].flatMap((i) =>
          performancePair(i, { saves: 20, tacklesMade: 20 }, { shots: null }),
        ),
      ),
      now,
    );
    expect(snapshot.rows.find((row) => row.teamId === performanceHome)).toMatchObject({
      score: null,
      missing: ["defensiveEfficiency"],
      components: { offensiveEfficiency: 50, defensiveEfficiency: null },
      coverage: { defendingMatches: 0 },
    });
  });

  it("uses the five most recent official encounters, independent of host date and input order", () => {
    const contributions = [1, 2, 3, 4, 5, 6, 7].flatMap((i) =>
      performancePair(i, i <= 3 ? {} : { goalsFor: 0, goalsAgainst: 2 }),
    );
    const sources = performanceSources(contributions);
    const first = buildTeamPerformanceRanking(sources, now);
    const second = buildTeamPerformanceRanking(
      {
        ...sources,
        contributions: [...contributions].reverse(),
        teamIds: [...sources.teamIds].reverse(),
      },
      new Date("2050-12-31T00:00:00.000Z"),
    );
    expect(first.rows).toEqual(second.rows);
    expect(first.rows.find((row) => row.teamId === performanceHome)?.components.recentForm).toBe(
      20,
    );
    expect(
      first.rows.find((row) => row.teamId === performanceHome)?.components.results,
    ).toBeCloseTo(300 / 7);
  });

  it("preserves independent slots and aggregated series in mixed stages", () => {
    const contributions = [
      ...performancePair(1),
      ...performancePair(1, { id: "second-1", officialSlot: 2, goalsFor: 0, goalsAgainst: 2 }),
      ...performancePair(2, { resolutionMode: "aggregate_score", goalsFor: 3 }),
      ...performancePair(2, {
        id: "second-2",
        officialSlot: 2,
        resolutionMode: "aggregate_score",
        goalsFor: 0,
        goalsAgainst: 2,
      }),
      ...performancePair(3, { goalsFor: 1, goalsAgainst: 1 }),
    ];
    const home = buildTeamPerformanceRanking(performanceSources(contributions), now).rows.find(
      (row) => row.teamId === performanceHome,
    )!;
    expect(home.coverage).toMatchObject({ encounters: 3, competitiveUnits: 4, officialMatches: 5 });
    expect(home.evidence).toMatchObject({
      resultPoints: 7,
      resultMaximum: 12,
      recentPoints: 5.5,
      recentMaximum: 9,
    });
    expect(home.components.results).toBeCloseTo(700 / 12);
    expect(home.components.recentForm).toBeCloseTo(550 / 9);
  });

  it("uses deterministic ID order for temporal and score ties", () => {
    const contributions = [1, 2, 3, 4, 5, 6].flatMap((i) =>
      performancePair(i, {
        occurredAt: new Date("2026-08-01T19:00:00Z"),
        goalsFor: i === 6 ? 0 : 2,
        goalsAgainst: i === 6 ? 2 : 0,
      }),
    );
    const ranking = buildTeamPerformanceRanking(performanceSources(contributions), now);
    expect(ranking.rows.find((row) => row.teamId === performanceHome)?.components.recentForm).toBe(
      100,
    );
  });

  it("refuses scores for a partially projected source set", () => {
    const snapshot = buildTeamPerformanceRanking(
      { ...performanceSources(), projectionComplete: false },
      now,
    );
    expect(
      snapshot.rows.every(
        (row) => row.score === null && row.coverage.reason === "projection_incomplete",
      ),
    ).toBe(true);
  });
});
