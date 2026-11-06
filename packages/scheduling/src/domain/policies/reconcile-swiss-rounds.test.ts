import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixtureEncounter, FixturePlan, FixtureRound } from "../entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../ports/official-encounter-score-reader.port.ts";
import { generateFixturePlan } from "./generate-fixture-plan.ts";
import { reconcileSwissRounds, rollForwardWholeDays } from "./reconcile-swiss-rounds.ts";
import { swissPairingPoints, swissPointsPerBye, swissRounds } from "./swiss-standing-points.ts";
import { zonedParts } from "./zoned-instant.ts";

const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map(asTeamId) as [
  TeamId,
  TeamId,
  TeamId,
  TeamId,
  TeamId,
];
const now = new Date("2026-11-01T00:00:00.000Z");

function plan(seed: readonly TeamId[], rounds: number): FixturePlan {
  return generateFixturePlan({
    organizationId: asOrganizationId("org"),
    competitionId: asCompetitionId("comp"),
    generationVersion: 1,
    rulesVersion: 1,
    format: "swiss",
    timeZone: "America/Lima",
    startsAt: new Date("2026-11-02T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
    seed,
    homeAndAway: false,
    swiss: { rounds },
  });
}

function score(homeGoals = 1, awayGoals = 0): OfficialEncounterScore {
  return {
    officialResultId: "result",
    revision: 1,
    slots: [{ officialSlot: 1, homeGoals, awayGoals }],
  };
}

function reconcile(
  current: FixturePlan,
  scores: ReadonlyMap<EncounterId, OfficialEncounterScore>,
  at: Date = now,
) {
  return reconcileSwissRounds({
    plan: current,
    scores,
    standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    officialMatchCount: 1,
    resolutionMode: "independent_matches",
    now: at,
  });
}

function withRound(current: FixturePlan, round: FixtureRound): FixturePlan {
  return {
    ...current,
    revision: current.revision + 1,
    stages: current.stages.map((stage) => ({
      ...stage,
      rounds: stage.rounds.map((existing) => (existing.id === round.id ? round : existing)),
    })),
  };
}

function encountersOf(current: FixturePlan, roundIndex: number): readonly FixtureEncounter[] {
  return swissRounds(current)[roundIndex]?.encounters ?? [];
}

function allScored(
  encounters: readonly FixtureEncounter[],
): Map<EncounterId, OfficialEncounterScore> {
  return new Map(
    encounters.filter((encounter) => encounter.series).map((item) => [item.id, score()]),
  );
}

/** Round 1 played and round 2 paired through the policy. */
function secondRoundPaired() {
  const generated = plan([a, b, c, d], 2);
  const scores = allScored(encountersOf(generated, 0));
  const change = reconcile(generated, scores);
  if (change.kind !== "pair") throw new Error(`Expected a pairing, got ${change.kind}`);
  return { paired: withRound(generated, change.round), scores };
}

describe("reconcileSwissRounds", () => {
  it("waits while a round has an unplayed encounter, however overdue", () => {
    const generated = plan([a, b, c, d], 2);
    const [first] = encountersOf(generated, 0);
    const scores = new Map([[first!.id, score()]]);

    expect(reconcile(generated, scores, new Date("2030-01-01T00:00:00.000Z"))).toEqual({
      kind: "none",
    });
  });

  it("pairs the next round once every encounter is settled, in the table order and id form", () => {
    const generated = plan([a, b, c, d], 2);
    const scores = allScored(encountersOf(generated, 0));

    const change = reconcile(generated, scores);

    expect(change).toMatchObject({
      kind: "pair",
      round: {
        number: 2,
        encounters: [
          { order: 1, home: { teamId: a }, away: { teamId: b } },
          { order: 2, home: { teamId: c }, away: { teamId: d } },
        ],
      },
    });
    if (change.kind !== "pair") throw new Error("Expected a pairing");
    const roundId = swissRounds(generated)[1]!.id;
    expect(change.round.encounters[0]!.id).toBe(`${roundId}:encounter:1:p1`);
    expect(roundId).toContain(":stage:1:");
  });

  it("does nothing on a repeat once the next round is paired", () => {
    const { paired, scores } = secondRoundPaired();
    expect(reconcile(paired, scores)).toEqual({ kind: "none" });
  });

  it("gives a new id to a table paired again at a later revision", () => {
    const { paired } = secondRoundPaired();
    const { id: firstId } = encountersOf(paired, 1)[0]!;
    const emptied = withRound(paired, { ...swissRounds(paired)[1]!, encounters: [] });
    const change = reconcile(emptied, allScored(encountersOf(paired, 0)));
    if (change.kind !== "pair") throw new Error("Expected a pairing");
    expect(change.round.encounters[0]!.id).not.toBe(firstId);
  });

  it("is final with nothing left when every round is settled", () => {
    const { paired, scores } = secondRoundPaired();
    const all = new Map([...scores, ...allScored(encountersOf(paired, 1))]);
    expect(reconcile(paired, all)).toEqual({ kind: "none" });
  });

  it("unpairs the later rounds when a void reopens an earlier one", () => {
    const { paired, scores } = secondRoundPaired();
    const voided = new Map(scores);
    voided.delete(encountersOf(paired, 0)[0]!.id);

    const change = reconcile(paired, voided);

    expect(change).toMatchObject({ kind: "unpair", rounds: [{ number: 2 }] });
    const emptied = withRound(paired, { ...swissRounds(paired)[1]!, encounters: [] });
    expect(reconcile(emptied, voided)).toEqual({ kind: "none" });
  });

  it("turns the encounter of a withdrawn Team into a bye for its rival", () => {
    const generated = plan([a, b, c, d], 2);
    const before = encountersOf(generated, 0)[0]!;

    const change = reconcile({ ...generated, withdrawnTeamIds: [a] }, new Map());

    expect(change).toMatchObject({
      kind: "forfeit",
      before: { id: before.id },
      after: { id: before.id, home: { teamId: c }, away: { kind: "bye" }, series: null },
    });
  });

  it("removes the encounter when both Teams have withdrawn", () => {
    const generated = plan([a, b, c, d], 2);
    const change = reconcile({ ...generated, withdrawnTeamIds: [a, c] }, new Map());
    expect(change).toMatchObject({ kind: "forfeit", after: null });
  });

  it("removes the bye of a withdrawn Team while its round is being played", () => {
    const generated = plan([a, b, c], 2);
    const bye = encountersOf(generated, 0).at(-1)!;
    expect(bye.away.kind).toBe("bye");

    const change = reconcile({ ...generated, withdrawnTeamIds: [c] }, new Map());

    expect(change).toMatchObject({ kind: "forfeit", before: { id: bye.id }, after: null });
  });

  it("keeps a bye of a settled round when its Team withdraws later", () => {
    const generated = plan([a, b, c], 2);
    const scores = allScored(encountersOf(generated, 0));
    const change = reconcile(generated, scores);
    if (change.kind !== "pair") throw new Error("Expected a pairing");
    const paired = withRound(generated, change.round);
    const withdrawn: FixturePlan = { ...paired, withdrawnTeamIds: [c] };

    const next = reconcile(withdrawn, scores);

    if (next.kind !== "forfeit") throw new Error(`Expected a forfeit, got ${next.kind}`);
    expect(next.round.number).toBe(2);
    expect(next.before.home).not.toEqual({ kind: "bye" });
  });

  it("converts a voided encounter of an already withdrawn Team instead of unpairing", () => {
    const { paired, scores } = secondRoundPaired();
    const reopened = encountersOf(paired, 0)[0]!;
    const voided = new Map(scores);
    voided.delete(reopened.id);

    const change = reconcile({ ...paired, withdrawnTeamIds: [a] }, voided);

    expect(change).toMatchObject({
      kind: "forfeit",
      before: { id: reopened.id },
      after: { home: { teamId: c }, away: { kind: "bye" } },
    });
  });

  it("never touches an approved or closed encounter of a withdrawn Team", () => {
    const generated = plan([a, b, c, d], 2);
    const [first, second] = encountersOf(generated, 0) as [FixtureEncounter, FixtureEncounter];
    const closed: FixtureEncounter = { ...second, series: null, closedWithoutResult: true };
    const current: FixturePlan = {
      ...withRound(generated, {
        ...swissRounds(generated)[0]!,
        encounters: [first, closed],
      }),
      withdrawnTeamIds: [a, b],
    };

    expect(reconcile(current, new Map([[first.id, score()]])).kind).toBe("pair");
  });

  it("drops the empty rounds when no legal pairing is left", () => {
    const generated = plan([a, b, c, d], 3);
    const scores = allScored(encountersOf(generated, 0));
    const withdrawn: FixturePlan = { ...generated, withdrawnTeamIds: [a, b, c] };

    const change = reconcile(withdrawn, scores);

    const [, second, third] = swissRounds(generated) as [FixtureRound, FixtureRound, FixtureRound];
    expect(change).toEqual({ kind: "truncate", roundIds: [second.id, third.id] });
  });

  it("pairs again after removals empty a round before a paired one", () => {
    const { paired, scores } = secondRoundPaired();
    const third = swissRounds(paired)[1]!;
    const hole = withRound(paired, { ...swissRounds(paired)[0]!, encounters: [] });

    expect(reconcile(hole, scores)).toMatchObject({ kind: "unpair", rounds: [{ id: third.id }] });
  });

  it("rolls a past date forward keeping the local wall clock", () => {
    const generated = plan([a, b, c, d], 2);
    const scores = allScored(encountersOf(generated, 0));
    const late = new Date("2027-03-20T15:00:00.000Z");

    const change = reconcile(generated, scores, late);

    if (change.kind !== "pair") throw new Error("Expected a pairing");
    const start = change.round.encounters[0]!.scheduledStartAt;
    const planned = swissRounds(generated)[1]!.scheduledStartAt;
    expect(start.getTime()).toBeGreaterThan(late.getTime());
    expect(start.getTime() - late.getTime()).toBeLessThanOrEqual(86_400_000);
    const local = zonedParts(start, "America/Lima");
    const wanted = zonedParts(planned, "America/Lima");
    expect([local.hour, local.minute]).toEqual([wanted.hour, wanted.minute]);
  });

  it("keeps the local hour across a daylight-saving change", () => {
    const scheduled = new Date("2026-03-01T17:00:00.000Z");
    const rolled = rollForwardWholeDays(
      scheduled,
      "Europe/Madrid",
      new Date("2026-04-10T12:00:00.000Z"),
    );
    expect(zonedParts(rolled, "Europe/Madrid").hour).toBe(18);
    expect(rolled.toISOString()).toBe("2026-04-10T16:00:00.000Z");
  });

  it("keeps a future date as planned", () => {
    const scheduled = new Date("2026-12-01T00:00:00.000Z");
    expect(rollForwardWholeDays(scheduled, "UTC", now)).toBe(scheduled);
  });
});

describe("Swiss pairing points", () => {
  const rules = {
    standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    officialMatchCount: 2 as const,
  };

  it("credits a bye as a win over each match or over the aggregate", () => {
    expect(swissPointsPerBye({ ...rules, resolutionMode: "independent_matches" })).toBe(6);
    expect(swissPointsPerBye({ ...rules, resolutionMode: "aggregate_score" })).toBe(3);
  });

  it("adds the bye to the approved results oriented by the slots", () => {
    const generated = plan([a, b, c, d, e], 3);
    const scores = new Map(
      encountersOf(generated, 0)
        .filter((encounter) => encounter.series)
        .map((encounter) => [encounter.id, score(2, 2)]),
    );
    const points = swissPairingPoints(generated, scores, {
      ...rules,
      officialMatchCount: 1,
      resolutionMode: "independent_matches",
    });
    expect(Object.fromEntries(points)).toEqual({ a: 1, b: 1, c: 1, d: 1, e: 3 });
  });
});
