import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixtureEncounter, FixturePlan } from "../entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../ports/official-encounter-score-reader.port.ts";
import { planEncounters } from "./edit-fixture-encounter.ts";
import { generateFixturePlan } from "./generate-fixture-plan.ts";
import {
  defaultSwissRoundCount,
  maxSwissRoundCount,
  pairSwissRound,
  type SwissPairing,
} from "./pair-swiss-round.ts";
import { reconcileSwissRounds } from "./reconcile-swiss-rounds.ts";
import { swissRounds } from "./swiss-standing-points.ts";

const teams = (count: number) =>
  Array.from({ length: count }, (_, index) => asTeamId(`t${String(index + 1).padStart(2, "0")}`));

function played(home: TeamId, away: TeamId | null, index: number): FixtureEncounter {
  return {
    id: asEncounterId(`e${index}`),
    stageId: "stage" as FixtureEncounter["stageId"],
    roundId: "round" as FixtureEncounter["roundId"],
    order: 1,
    home: { kind: "team", teamId: home },
    away: away === null ? { kind: "bye" } : { kind: "team", teamId: away },
    scheduledStartAt: new Date("2026-11-01T00:00:00.000Z"),
    officialMatchCount: 1,
    series: null,
  };
}

function tablesOf(pairing: SwissPairing) {
  if (pairing.kind !== "paired") throw new Error("Expected a complete pairing");
  return pairing.tables;
}

function completeGraphEncounters(groups: readonly (readonly TeamId[])[]): FixtureEncounter[] {
  const encounters: FixtureEncounter[] = [];
  for (const group of groups) {
    group.forEach((home, index) => {
      for (const away of group.slice(index + 1)) {
        encounters.push(played(home, away, encounters.length));
      }
    });
  }
  return encounters;
}

/** Deterministic PRNG so a failing tournament can be replayed from its seed. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function swissPlan(count: number, rounds: number): FixturePlan {
  return generateFixturePlan({
    organizationId: asOrganizationId("org"),
    competitionId: asCompetitionId("comp"),
    generationVersion: 1,
    rulesVersion: 1,
    format: "swiss",
    timeZone: "UTC",
    startsAt: new Date("2026-11-01T20:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
    seed: teams(count),
    homeAndAway: false,
    swiss: { rounds },
  });
}

/** Plays a whole tournament through the reconcile policy with random approved scores. */
function playTournament(count: number, rounds: number, seed: number): FixturePlan {
  const random = mulberry32(seed);
  const scores = new Map<EncounterId, OfficialEncounterScore>();
  let plan = swissPlan(count, rounds);
  const now = new Date("2026-11-01T00:00:00.000Z");
  for (;;) {
    for (const encounter of planEncounters(plan)) {
      if (!encounter.series || scores.has(encounter.id)) continue;
      scores.set(encounter.id, {
        officialResultId: `result-${encounter.id}`,
        revision: 1,
        slots: [
          {
            officialSlot: 1,
            homeGoals: Math.floor(random() * 4),
            awayGoals: Math.floor(random() * 4),
          },
        ],
      });
    }
    const change = reconcileSwissRounds({
      plan,
      scores,
      standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
      officialMatchCount: 1,
      resolutionMode: "independent_matches",
      now,
    });
    if (change.kind === "none") return plan;
    if (change.kind === "truncate") {
      plan = {
        ...plan,
        stages: plan.stages.map((stage) => ({
          ...stage,
          rounds: stage.rounds.filter((round) => !change.roundIds.includes(round.id)),
        })),
      };
      continue;
    }
    if (change.kind !== "pair") throw new Error(`Unexpected change ${change.kind}`);
    plan = {
      ...plan,
      revision: plan.revision + 1,
      stages: plan.stages.map((stage) => ({
        ...stage,
        rounds: stage.rounds.map((round) => (round.id === change.round.id ? change.round : round)),
      })),
    };
  }
}

function pairKey(left: TeamId, right: TeamId): string {
  return [left, right].sort().join("|");
}

describe("pairSwissRound", () => {
  it("pairs round one as 1 v n/2 + 1", () => {
    const tables = tablesOf(
      pairSwissRound({
        seed: teams(8),
        withdrawnTeamIds: [],
        points: new Map(),
        encounters: [],
      }),
    );
    expect(tables).toEqual([
      { home: "t01", away: "t05" },
      { home: "t02", away: "t06" },
      { home: "t03", away: "t07" },
      { home: "t04", away: "t08" },
    ]);
  });

  it("gives the bye to the last ranked Team without one, on the last table", () => {
    const [a, b, c] = teams(3) as [TeamId, TeamId, TeamId];
    const tables = tablesOf(
      pairSwissRound({
        seed: [a, b, c],
        withdrawnTeamIds: [],
        points: new Map([
          [a, 3],
          [b, 0],
          [c, 3],
        ]),
        encounters: [played(a, b, 0), played(c, null, 1)],
      }),
    );
    expect(tables.at(-1)).toEqual({ home: b, away: null });
    // c rested last round, so it has hosted fewer games than a.
    expect(tables[0]).toEqual({ home: c, away: a });
  });

  it("hosts the Team with fewer home games, and the better ranked on a tie", () => {
    const [a, b, c, d] = teams(4) as [TeamId, TeamId, TeamId, TeamId];
    const tables = tablesOf(
      pairSwissRound({
        seed: [a, b, c, d],
        withdrawnTeamIds: [],
        points: new Map([
          [a, 3],
          [c, 3],
        ]),
        encounters: [played(a, b, 0), played(c, d, 1)],
      }),
    );
    // a and c hosted once each and b and d never: the better ranked hosts both tables.
    expect(tables[0]).toEqual({ home: a, away: c });
    expect(tables[1]).toEqual({ home: b, away: d });

    const afterAwayGame = tablesOf(
      pairSwissRound({
        seed: [a, b],
        withdrawnTeamIds: [],
        points: new Map([[a, 3]]),
        encounters: [played(a, c, 0), played(c, b, 1), played(b, d, 2), played(a, d, 3)],
      }),
    );
    expect(afterAwayGame).toEqual([{ home: b, away: a }]);
  });

  it("treats a closed encounter as already met", () => {
    const [a, b] = teams(2) as [TeamId, TeamId];
    const closed = { ...played(a, b, 0), closedWithoutResult: true as const };
    expect(
      pairSwissRound({ seed: [a, b], withdrawnTeamIds: [], points: new Map(), encounters: [closed] }),
    ).toEqual({ kind: "exhausted" });
  });

  it("is exhausted with fewer than two active Teams", () => {
    const [a, b] = teams(2) as [TeamId, TeamId];
    expect(
      pairSwissRound({ seed: [a, b], withdrawnTeamIds: [b], points: new Map(), encounters: [] }),
    ).toEqual({ kind: "exhausted" });
  });

  it("finds the bye that leaves a pairing when H withdraws from a K4 factor", () => {
    const [b, c, d, e, a, f, g, h] = teams(8) as [
      TeamId,
      TeamId,
      TeamId,
      TeamId,
      TeamId,
      TeamId,
      TeamId,
      TeamId,
    ];
    const encounters = completeGraphEncounters([
      [b, c, d, e],
      [a, f, g, h],
    ]);
    const tables = tablesOf(
      pairSwissRound({
        seed: [b, c, d, e, a, f, g, h],
        withdrawnTeamIds: [h],
        points: new Map(),
        encounters,
      }),
    );
    const bye = tables.at(-1);
    expect(bye?.away).toBeNull();
    expect([b, c, d, e]).toContain(bye?.home);
    const met = new Set(
      encounters.map((encounter) =>
        pairKey(
          (encounter.home as { teamId: TeamId }).teamId,
          (encounter.away as { teamId: TeamId }).teamId,
        ),
      ),
    );
    for (const table of tables.slice(0, -1)) {
      expect(met.has(pairKey(table.home, table.away as TeamId))).toBe(false);
    }
  });

  it("proves quickly that two closed factions cannot pair after two withdrawals", () => {
    const all = teams(64);
    const left = all.slice(0, 32);
    const right = all.slice(32);
    const started = Date.now();
    const pairing = pairSwissRound({
      seed: all,
      withdrawnTeamIds: left.slice(0, 2),
      points: new Map(),
      encounters: completeGraphEncounters([left, right]),
    });
    expect(pairing).toEqual({ kind: "exhausted" });
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it.each(Array.from({ length: 63 }, (_, index) => index + 2))(
    "plays %i Teams through the default rounds with no rematch",
    (count) => {
      const rounds = defaultSwissRoundCount(count);
      const seed = count * 7919;
      const plan = playTournament(count, rounds, seed);
      const allPaired = swissRounds(plan);
      expect(allPaired).toHaveLength(rounds);

      const met = new Set<string>();
      const byes = new Set<TeamId>();
      for (const round of allPaired) {
        const seen = new Set<TeamId>();
        for (const encounter of round.encounters) {
          const home = encounter.home.kind === "team" ? encounter.home.teamId : null;
          const away = encounter.away.kind === "team" ? encounter.away.teamId : null;
          if (!home) throw new Error("Swiss home slot must be a Team");
          expect(seen.has(home)).toBe(false);
          seen.add(home);
          if (away) {
            expect(seen.has(away)).toBe(false);
            seen.add(away);
            const key = pairKey(home, away);
            expect(met.has(key)).toBe(false);
            met.add(key);
          } else {
            expect(byes.has(home)).toBe(false);
            byes.add(home);
          }
        }
        expect(seen.size).toBe(count);
      }
      expect(playTournament(count, rounds, seed)).toEqual(plan);
    },
  );
});

/** The ADR's plain search: backtrack over the same preference order, trying every bye. */
function referencePairing(
  ranked: readonly TeamId[],
  met: ReadonlySet<string>,
  byes: ReadonlySet<TeamId>,
): readonly (readonly [TeamId, TeamId | null])[] | null {
  const search = (remaining: readonly TeamId[]): (readonly [TeamId, TeamId])[] | null => {
    const [top, ...rest] = remaining;
    if (top === undefined) return [];
    const middle = Math.floor((rest.length + 1) / 2) - 1;
    for (const rival of [...rest.slice(middle), ...rest.slice(0, middle).reverse()]) {
      if (met.has(pairKey(top, rival))) continue;
      const others = search(rest.filter((team) => team !== rival));
      if (others) return [[top, rival], ...others];
    }
    return null;
  };
  if (ranked.length % 2 === 0) return search(ranked);
  const bottomUp = [...ranked].reverse();
  const candidates = [
    ...bottomUp.filter((team) => !byes.has(team)),
    ...bottomUp.filter((team) => byes.has(team)),
  ];
  for (const bye of candidates) {
    const pairs = search(ranked.filter((team) => team !== bye));
    if (pairs) return [...pairs, [bye, null]];
  }
  return null;
}

describe("pairSwissRound against plain backtracking", () => {
  it("chooses the same tables, or none, on random histories within one score group", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const random = mulberry32(seed);
      const count = 3 + Math.floor(random() * 10);
      const seedOrder = teams(count);
      const encounters: FixtureEncounter[] = [];
      const met = new Set<string>();
      const density = random();
      seedOrder.forEach((home, index) => {
        for (const away of seedOrder.slice(index + 1)) {
          if (random() >= density) continue;
          encounters.push(played(home, away, encounters.length));
          met.add(pairKey(home, away));
        }
      });
      const pairing = pairSwissRound({
        seed: seedOrder,
        withdrawnTeamIds: [],
        points: new Map(),
        encounters,
      });
      const reference = referencePairing(seedOrder, met, new Set());
      if (reference === null) {
        expect(pairing).toEqual({ kind: "exhausted" });
        continue;
      }
      const tables = tablesOf(pairing).map((table) =>
        table.away === null ? pairKey(table.home, table.home) : pairKey(table.home, table.away),
      );
      expect(tables).toEqual(
        reference.map(([home, away]) => pairKey(home, away ?? home)),
      );
    }
  });
});

describe("Swiss round count limits", () => {
  it("defaults to the ceiling of log2 and caps at half the Teams rounded up", () => {
    expect([2, 3, 4, 5, 8, 9, 64].map(defaultSwissRoundCount)).toEqual([1, 2, 2, 3, 3, 4, 6]);
    expect([2, 3, 4, 5, 8, 9, 64].map(maxSwissRoundCount)).toEqual([1, 2, 2, 3, 4, 5, 32]);
  });

  it.each([4, 6, 8, 10, 12, 16, 20, 32, 3, 5, 7, 9, 11, 15, 21, 33])(
    "keeps %i Teams pairable through the maximum rounds",
    (count) => {
      for (let seed = 1; seed <= 20; seed += 1) {
        const rounds = swissRounds(playTournament(count, maxSwissRoundCount(count), seed));
        expect({ seed, rounds: rounds.length }).toEqual({
          seed,
          rounds: maxSwissRoundCount(count),
        });
      }
    },
    30_000,
  );
});

