import { describe, expect, it } from "vite-plus/test";
import type { CompetitionEncounterDto } from "@futrob/api-contracts";
import {
  encounterFilterRounds,
  filterEncounters,
  groupEncountersByRound,
  NO_ENCOUNTER_FILTERS,
  validEncounterFilters,
} from "./competition-encounters-model.ts";

const league = { id: "plan-1:stage:1", kind: "league", order: 1 } as const;
const playoffs = { id: "plan-1:stage:2", kind: "playoffs", order: 2 } as const;

function encounter(
  encounterId: string,
  scheduledStartAt: string,
  round: Partial<CompetitionEncounterDto["round"]> = {},
): CompetitionEncounterDto {
  return {
    encounterId,
    round: { id: "plan-1:stage:1:round:1", number: 1, total: 3, stage: league, ...round },
    scheduledStartAt,
    officialMatchCount: 1,
    resolutionMode: null,
    home: { teamId: "team-a", name: "Cuervos FC" },
    away: { teamId: "team-b", name: "Maderas FC" },
    status: "scheduled",
    score: null,
  };
}

describe("groupEncountersByRound", () => {
  it("tells a round on both sides of local midnight from one that only crosses UTC midnight", () => {
    // America/Lima is UTC−5: 04:30Z is 23:30 on the 19th, 05:30Z is 00:30 on the 20th.
    const acrossLocalMidnight = groupEncountersByRound(
      [
        encounter("before", "2026-10-20T04:30:00.000Z"),
        encounter("after", "2026-10-20T05:30:00.000Z"),
      ],
      "America/Lima",
    );
    const sameLocalDay = groupEncountersByRound(
      [
        encounter("evening", "2026-10-19T23:00:00.000Z"),
        encounter("late", "2026-10-20T04:59:00.000Z"),
      ],
      "America/Lima",
    );

    expect(acrossLocalMidnight.map((group) => group.spansMultipleDays)).toEqual([true]);
    expect(sameLocalDay.map((group) => group.spansMultipleDays)).toEqual([false]);
  });

  it("keeps two stages' Round 1 as separate groups in stage order and filters each alone", () => {
    const encounters = [
      encounter("playoff", "2026-10-12T01:00:00.000Z", {
        id: "plan-1:stage:2:round:1",
        stage: playoffs,
        total: 1,
      }),
      encounter("league", "2026-10-19T01:00:00.000Z"),
    ];

    const rounds = encounterFilterRounds(encounters);
    const groups = groupEncountersByRound(encounters, "America/Lima");

    expect(rounds.map((round) => round.key)).toEqual([
      "plan-1:stage:1:round:1",
      "plan-1:stage:2:round:1",
    ]);
    expect(groups.map((group) => group.encounters.map((item) => item.encounterId))).toEqual([
      ["league"],
      ["playoff"],
    ]);
    const only = (roundKey: string) =>
      filterEncounters(encounters, { ...NO_ENCOUNTER_FILTERS, roundKey }).map(
        (item) => item.encounterId,
      );
    expect(only("plan-1:stage:1:round:1")).toEqual(["league"]);
    expect(only("plan-1:stage:2:round:1")).toEqual(["playoff"]);
  });

  it("falls back to the round number when an older API sends no round id", () => {
    const encounters = [
      encounter("first", "2026-10-12T01:00:00.000Z", { id: null, stage: null }),
      encounter("second", "2026-10-19T01:00:00.000Z", { id: null, number: 2, stage: null }),
    ];

    expect(encounterFilterRounds(encounters).map((round) => round.key)).toEqual(["1", "2"]);
    expect(
      filterEncounters(encounters, { ...NO_ENCOUNTER_FILTERS, roundKey: "2" }).map(
        (item) => item.encounterId,
      ),
    ).toEqual(["second"]);
  });
});

describe("validEncounterFilters", () => {
  it("keeps a round chosen from an older API response once the API sends round ids", () => {
    const legacy = [
      encounter("first", "2026-10-12T01:00:00.000Z", { id: null, stage: null }),
      encounter("second", "2026-10-19T01:00:00.000Z", { id: null, number: 2, stage: null }),
    ];
    const current = [
      encounter("first", "2026-10-12T01:00:00.000Z"),
      encounter("second", "2026-10-19T01:00:00.000Z", {
        id: "plan-1:stage:1:round:2",
        number: 2,
      }),
    ];
    const savedKey = encounterFilterRounds(legacy)[1]!.key;

    const filters = validEncounterFilters(
      { ...NO_ENCOUNTER_FILTERS, roundKey: savedKey },
      [],
      encounterFilterRounds(current),
    );

    expect(savedKey).toBe("2");
    expect(filters.roundKey).toBe("plan-1:stage:1:round:2");
    expect(filterEncounters(current, filters).map((item) => item.encounterId)).toEqual(["second"]);
  });

  it("drops an older round number that now names a round in more than one stage", () => {
    const current = [
      encounter("league", "2026-10-12T01:00:00.000Z", {
        id: "plan-1:stage:1:round:2",
        number: 2,
      }),
      encounter("playoff", "2026-10-19T01:00:00.000Z", {
        id: "plan-1:stage:2:round:2",
        number: 2,
        stage: playoffs,
      }),
    ];

    const filters = validEncounterFilters(
      { ...NO_ENCOUNTER_FILTERS, roundKey: "2" },
      [],
      encounterFilterRounds(current),
    );

    expect(filters.roundKey).toBeNull();
  });
});
