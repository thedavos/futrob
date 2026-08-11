import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { generateFixturePlan } from "./generate-fixture-plan.ts";

const teams = ["alpha", "bravo", "charlie", "delta"].map(asTeamId);

function baseInput() {
  return {
    organizationId: asOrganizationId("org-1"),
    competitionId: asCompetitionId("competition-1"),
    generationVersion: 1,
    rulesVersion: 3,
    timeZone: "America/Lima",
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1 as const, knockout: 2 as const },
    resolutionModes: {
      regular: "independent_matches" as const,
      knockout: "aggregate_score" as const,
    },
    seed: teams,
    homeAndAway: false,
  };
}

describe("generateFixturePlan", () => {
  it("generates a deterministic single round-robin without duplicate pairings", () => {
    const input = {
      ...baseInput(),
      format: "league" as const,
    };

    const first = generateFixturePlan(input);
    const replay = generateFixturePlan(input);

    expect(first).toEqual(replay);
    expect(first.stages).toHaveLength(1);
    expect(first.stages[0]?.rounds).toHaveLength(3);
    const encounters = first.stages.flatMap((stage) =>
      stage.rounds.flatMap((round) => round.encounters),
    );
    expect(encounters).toHaveLength(6);
    expect(encounters[0]?.series).toMatchObject({
      resolutionMode: "independent_matches",
      officialMatches: [{ slot: 1 }],
    });
    expect(
      new Set(
        encounters.map((encounter) =>
          [encounter.home, encounter.away]
            .map((slot) => (slot.kind === "team" ? slot.teamId : slot.kind))
            .sort()
            .join(":"),
        ),
      ).size,
    ).toBe(6);
  });

  it("creates one explicit bye per round for an odd league", () => {
    const oddTeams = teams.slice(0, 3);
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "league",
      seed: oddTeams,
    });

    expect(plan.stages[0]?.rounds).toHaveLength(3);
    for (const round of plan.stages[0]?.rounds ?? []) {
      expect(
        round.encounters.filter(
          (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
        ),
      ).toHaveLength(1);
      expect(
        round.encounters.find(
          (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
        )?.series,
      ).toBeNull();
    }
  });

  it("creates one encounter for the minimum two-participant league", () => {
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "league",
      seed: teams.slice(0, 2),
    });

    expect(plan.stages[0]?.rounds).toHaveLength(1);
    expect(plan.stages[0]?.rounds[0]?.encounters).toHaveLength(1);
  });

  it("swaps home and away in the return leg", () => {
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "league",
      homeAndAway: true,
    });
    const rounds = plan.stages[0]?.rounds ?? [];

    expect(rounds).toHaveLength(6);
    for (let index = 0; index < 3; index += 1) {
      const firstLeg = rounds[index]?.encounters ?? [];
      const returnLeg = rounds[index + 3]?.encounters ?? [];
      expect(returnLeg.map(({ home, away }) => [home, away])).toEqual(
        firstLeg.map(({ home, away }) => [away, home]),
      );
    }
  });

  it("builds a knockout bracket with explicit byes and winner references", () => {
    const sixTeams = [...teams, asTeamId("echo"), asTeamId("foxtrot")];
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "knockout",
      seed: sixTeams,
    });
    const rounds = plan.stages[0]?.rounds ?? [];

    expect(rounds.map((round) => round.encounters.length)).toEqual([4, 2, 1]);
    expect(
      rounds[0]?.encounters.filter(
        (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
      ),
    ).toHaveLength(2);
    expect(
      rounds[1]?.encounters.every(
        ({ home, away }) => home.kind === "winner" && away.kind === "winner",
      ),
    ).toBe(true);
    expect(
      rounds[0]?.encounters.find(({ home, away }) => home.kind === "team" && away.kind === "team")
        ?.series,
    ).toMatchObject({
      resolutionMode: "aggregate_score",
      officialMatches: [{ slot: 1 }, { slot: 2 }],
    });
  });

  it("combines stable groups with a reproducible qualifier bracket", () => {
    const eightTeams = [
      ...teams,
      asTeamId("echo"),
      asTeamId("foxtrot"),
      asTeamId("golf"),
      asTeamId("hotel"),
    ];
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "groups-knockout",
      seed: eightTeams,
      groups: { count: 2, qualifiersPerGroup: 2 },
    });

    expect(plan.stages.map((stage) => stage.kind)).toEqual(["groups", "knockout"]);
    expect(plan.stages[0]?.rounds).toHaveLength(3);
    expect(plan.stages[0]?.rounds[0]?.encounters.map((encounter) => encounter.groupId)).toEqual([
      "group-1",
      "group-1",
      "group-2",
      "group-2",
    ]);
    const qualifierRound = plan.stages[1]?.rounds[0];
    expect(qualifierRound?.encounters).toHaveLength(2);
    expect(plan.stages[0]?.rounds[0]?.encounters[0]?.officialMatchCount).toBe(1);
    expect(qualifierRound?.encounters[0]?.officialMatchCount).toBe(2);
    expect(qualifierRound?.encounters.flatMap(({ home, away }) => [home.kind, away.kind])).toEqual([
      "group-rank",
      "group-rank",
      "group-rank",
      "group-rank",
    ]);
    for (const encounter of qualifierRound?.encounters ?? []) {
      if (encounter.home.kind === "group-rank" && encounter.away.kind === "group-rank") {
        expect(encounter.home.groupId).not.toBe(encounter.away.groupId);
      }
    }
  });

  it("avoids same-group opening knockout rematches when qualifiers are not a power of two", () => {
    const sixTeams = [...teams, asTeamId("echo"), asTeamId("foxtrot")];
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "groups-knockout",
      seed: sixTeams,
      groups: { count: 3, qualifiersPerGroup: 2 },
    });
    const qualifierRound = plan.stages[1]?.rounds[0];
    expect(qualifierRound?.encounters).toHaveLength(4);
    expect(
      qualifierRound?.encounters.filter(
        (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
      ),
    ).toHaveLength(2);
    for (const encounter of qualifierRound?.encounters ?? []) {
      expect(encounter.home.kind === "bye" && encounter.away.kind === "bye").toBe(false);
      if (encounter.home.kind === "group-rank" && encounter.away.kind === "group-rank") {
        expect(encounter.home.groupId).not.toBe(encounter.away.groupId);
      }
    }
  });

  it("changes the generation key when schedule inputs change", () => {
    const base = {
      ...baseInput(),
      format: "league" as const,
    };
    const first = generateFixturePlan(base);
    const shifted = generateFixturePlan({
      ...base,
      startsAt: new Date("2026-09-08T01:00:00.000Z"),
    });

    expect(first.generationKey).not.toBe(shifted.generationKey);
    expect(first.id).not.toBe(shifted.id);
  });

  it("links league standings to a playoff stage", () => {
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "league-playoffs",
      playoffs: { teamCount: 4 },
    });

    expect(plan.stages.map((stage) => stage.kind)).toEqual(["league", "playoffs"]);
    expect(plan.stages[1]?.rounds.map((round) => round.encounters.length)).toEqual([2, 1]);
    expect(plan.stages[1]?.rounds[0]?.encounters[0]?.home.kind).toBe("stage-rank");
  });

  it("preserves the competition wall-clock time across daylight-saving changes", () => {
    const plan = generateFixturePlan({
      ...baseInput(),
      format: "league",
      timeZone: "America/New_York",
      startsAt: new Date("2026-03-02T01:00:00.000Z"),
    });
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    expect(plan.stages[0]?.rounds.map((round) => formatter.format(round.scheduledStartAt))).toEqual(
      ["20:00", "20:00", "20:00"],
    );
  });
});
