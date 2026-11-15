import { asCompetitionId, asOrganizationId, asTeamId, type TeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type {
  CompetitionStandingRow,
  CompetitionStandingSnapshot,
} from "../entities/competition-standing-snapshot.ts";
import type { CompetitionSwissStandingContext } from "../ports/competition-swiss-standing-reader.port.ts";
import { applySwissStandings } from "./apply-swiss-standings.ts";

const [a, b, c, d] = ["a", "b", "c", "d"].map(asTeamId) as [TeamId, TeamId, TeamId, TeamId];

function row(teamId: TeamId, points: number, overrides: Partial<CompetitionStandingRow> = {}) {
  return {
    position: 1,
    teamId,
    played: 1,
    wins: points > 0 ? 1 : 0,
    draws: 0,
    losses: points > 0 ? 0 : 1,
    goalsFor: 1,
    goalsAgainst: 1,
    goalDifference: 0,
    points,
    form: [],
    ...overrides,
  } satisfies CompetitionStandingRow;
}

function snapshot(rows: readonly CompetitionStandingRow[]): CompetitionStandingSnapshot {
  return {
    competitionId: asCompetitionId("comp"),
    organizationId: asOrganizationId("org"),
    formulaVersion: "points-gd-gf-v1",
    rows,
    sourceRevisionMax: 1,
    updatedAt: new Date("2026-11-01T00:00:00.000Z"),
  };
}

function context(
  overrides: Partial<CompetitionSwissStandingContext> = {},
): CompetitionSwissStandingContext {
  return {
    seed: [a, b, c, d],
    opponentsByTeam: new Map([[a, [b]]]),
    byesByTeam: new Map(),
    withdrawnTeamIds: [],
    pointsPerBye: 3,
    roundsTotal: 3,
    roundsCompleted: 1,
    currentRound: 2,
    isFinal: false,
    ...overrides,
  };
}

const order = (rows: readonly CompetitionStandingRow[]) => rows.map((item) => item.teamId);

describe("applySwissStandings", () => {
  it("publishes the Swiss formula and the progress of the rounds", () => {
    const applied = applySwissStandings(snapshot([row(a, 3)]), context());
    expect(applied.formulaVersion).toBe("swiss-points-buchholz-gd-gf-v1");
    expect(applied.swiss).toEqual({
      roundsTotal: 3,
      roundsCompleted: 1,
      currentRound: 2,
      isFinal: false,
    });
  });

  it("breaks a tie on points by Buchholz, using the rivals' final points", () => {
    const applied = applySwissStandings(
      snapshot([row(a, 3), row(b, 3), row(c, 6), row(d, 0)]),
      context({
        opponentsByTeam: new Map([
          [a, [d]],
          [b, [c]],
          [c, [b]],
          [d, [a]],
        ]),
      }),
    );
    expect(order(applied.rows)).toEqual([c, b, a, d]);
    expect(applied.rows.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(applied.rows.find((item) => item.teamId === b)?.swiss?.buchholz).toBe(6);
    expect(applied.rows.find((item) => item.teamId === a)?.swiss?.buchholz).toBe(0);
  });

  it("falls through goal difference, goals for and seed", () => {
    const applied = applySwissStandings(
      snapshot([
        row(d, 3, { goalDifference: 2 }),
        row(c, 3, { goalDifference: 1, goalsFor: 5 }),
        row(b, 3, { goalDifference: 1, goalsFor: 1 }),
        row(a, 3, { goalDifference: 1, goalsFor: 1 }),
      ]),
      context({ opponentsByTeam: new Map() }),
    );
    expect(order(applied.rows)).toEqual([d, c, a, b]);
  });

  it.each([
    ["independent matches over two slots", 6],
    ["an aggregate", 3],
  ])("adds the bye credit of %s without inventing a match", (_label, pointsPerBye) => {
    const applied = applySwissStandings(
      snapshot([row(a, 3)]),
      context({ pointsPerBye, byesByTeam: new Map([[c, 1]]) }),
    );
    const rested = applied.rows.find((item) => item.teamId === c);
    expect(rested).toMatchObject({
      points: pointsPerBye,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      swiss: { byes: 1, buchholz: pointsPerBye, withdrawn: false },
    });
  });

  it("counts a bye toward the Team's own Buchholz and ignores encounters not listed", () => {
    const applied = applySwissStandings(
      snapshot([row(a, 3), row(b, 0)]),
      context({
        opponentsByTeam: new Map([
          [a, [b]],
          [b, [a]],
        ]),
        byesByTeam: new Map([[a, 1]]),
      }),
    );
    const top = applied.rows.find((item) => item.teamId === a);
    expect(top?.points).toBe(6);
    expect(top?.swiss?.buchholz).toBe(0 + 6);
    expect(applied.rows.find((item) => item.teamId === b)?.swiss?.buchholz).toBe(6);
  });

  it("keeps a withdrawn Team and marks it", () => {
    const applied = applySwissStandings(
      snapshot([row(a, 3), row(b, 0)]),
      context({ withdrawnTeamIds: [a] }),
    );
    expect(applied.rows[0]).toMatchObject({ teamId: a, points: 3, swiss: { withdrawn: true } });
  });

  it("lists every seeded Team from the first official result", () => {
    const applied = applySwissStandings(snapshot([row(a, 3), row(b, 0)]), context());
    expect(new Set(order(applied.rows))).toEqual(new Set([a, b, c, d]));
    expect(applied.rows.find((item) => item.teamId === d)).toMatchObject({ played: 0, points: 0 });
  });

  it("has no table before any official result, even with byes", () => {
    const applied = applySwissStandings(
      snapshot([]),
      context({ opponentsByTeam: new Map(), byesByTeam: new Map([[c, 1]]) }),
    );
    expect(applied.rows).toEqual([]);
    expect(applied.swiss.currentRound).toBe(2);
  });

  it("carries the final flag", () => {
    const applied = applySwissStandings(
      snapshot([row(a, 3)]),
      context({ currentRound: null, roundsCompleted: 3, isFinal: true }),
    );
    expect(applied.swiss).toMatchObject({ isFinal: true, currentRound: null });
  });
});
