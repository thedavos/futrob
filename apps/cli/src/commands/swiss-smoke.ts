import { Effect } from "effect";
import {
  generateFixturePlan,
  reconcileSwissRounds,
  swissRounds,
  withoutRounds,
  withRoundEncounters,
  type FixturePlan,
  type OfficialEncounterScore,
} from "@futrob/scheduling";
import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
} from "@futrob/shared-kernel";
import { print, printJson } from "../lib/print.ts";

const RULES = {
  standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
  officialMatchCount: 1,
  resolutionMode: "independent_matches",
} as const;

/** Plays every round through the pure policies, the home side winning each match. */
function play(teamCount: number, rounds: number): FixturePlan {
  let plan = generateFixturePlan({
    organizationId: asOrganizationId("org_smoke"),
    competitionId: asCompetitionId("comp_smoke"),
    generationVersion: 1,
    rulesVersion: 1,
    format: "swiss",
    timeZone: "UTC",
    startsAt: new Date("2026-11-01T20:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
    seed: Array.from({ length: teamCount }, (_, index) => asTeamId(`team_${index + 1}`)),
    homeAndAway: false,
    swiss: { rounds },
  });
  const scores = new Map<EncounterId, OfficialEncounterScore>();
  const now = new Date("2026-11-01T00:00:00.000Z");
  for (;;) {
    for (const round of swissRounds(plan)) {
      for (const encounter of round.encounters) {
        if (!encounter.series) continue;
        scores.set(encounter.id, {
          officialResultId: `result_${encounter.id}`,
          revision: 1,
          slots: [{ officialSlot: 1, homeGoals: 1, awayGoals: 0 }],
        });
      }
    }
    const change = reconcileSwissRounds({ plan, scores, ...RULES, now });
    switch (change.kind) {
      case "none":
        return plan;
      case "pair":
        plan = {
          ...withRoundEncounters(plan, change.round.id, change.round.encounters),
          revision: plan.revision + 1,
        };
        break;
      case "truncate":
        plan = { ...withoutRounds(plan, change.roundIds), revision: plan.revision + 1 };
        break;
      case "forfeit":
      case "unpair":
        throw new Error(`Unexpected change without withdrawals or voids: ${change.kind}`);
    }
  }
}

function tablesOf(plan: FixturePlan) {
  return swissRounds(plan).map((round) => ({
    round: round.number,
    tables: round.encounters.map((encounter) => ({
      home: encounter.home.kind === "team" ? encounter.home.teamId : null,
      away: encounter.away.kind === "team" ? encounter.away.teamId : null,
    })),
  }));
}

export function run(): Effect.Effect<number, never> {
  return Effect.sync(() => {
    const even = tablesOf(play(8, 3));
    const odd = tablesOf(play(7, 3));
    const failures: string[] = [];

    for (const [label, rounds] of [
      ["8 Teams", even],
      ["7 Teams", odd],
    ] as const) {
      const met = new Set<string>();
      for (const { tables } of rounds) {
        for (const { home, away } of tables) {
          if (home === null || away === null) continue;
          const key = [home, away].sort().join("|");
          if (met.has(key)) failures.push(`${label}: rematch ${key}`);
          met.add(key);
        }
      }
    }
    if (even.length !== 3) failures.push(`8 Teams: expected 3 rounds, got ${even.length}`);
    if (even.some(({ tables }) => tables.length !== 4 || tables.some(({ away }) => !away))) {
      failures.push("8 Teams: every round must have four tables and no bye");
    }
    const resting = odd.map(
      ({ tables }) => tables.filter(({ away }) => away === null).map(({ home }) => home)[0],
    );
    if (resting.some((team) => !team)) failures.push("7 Teams: every round must have a bye");
    if (new Set(resting).size !== resting.length) failures.push("7 Teams: a Team rested twice");

    printJson({ ok: failures.length === 0, failures, even, odd, resting });
    if (failures.length > 0) {
      print("swiss-smoke FAILED");
      return 1;
    }
    print("swiss-smoke OK");
    return 0;
  });
}
