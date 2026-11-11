import type { OfficialResultSlotSnapshot } from "@futrob/results";
import type { FixtureEncounter, FixturePlan } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vitest";
import { buildResult } from "@/adapters/results/official-selection.fixtures.ts";
import { SchedulingPublicBracketReader, SchedulingPublicCalendarReader } from "./readers.ts";

const scope = {
  organizationId: asOrganizationId("org-portal"),
  competitionId: asCompetitionId("comp-portal"),
};
const teamA = asTeamId("team-a");
const teamB = asTeamId("team-b");
const encounterId = asEncounterId("encounter-a-b");
const kickoff = new Date("2026-11-01T18:00:00.000Z");

const encounter = {
  id: encounterId,
  order: 1,
  home: { kind: "team", teamId: teamA },
  away: { kind: "team", teamId: teamB },
  scheduledStartAt: kickoff,
  officialMatchCount: 2,
  series: null,
} as unknown as FixtureEncounter;

const plan = {
  timeZone: "UTC",
  stages: [
    {
      kind: "knockout",
      order: 1,
      rounds: [{ number: 1, scheduledStartAt: kickoff, encounters: [encounter] }],
    },
  ],
} as unknown as FixturePlan;

function slot(
  officialSlot: 1 | 2,
  home: [team: TeamId | null, goals: number],
  away: [team: TeamId | null, goals: number],
): OfficialResultSlotSnapshot {
  const base = buildResult(scope, encounterId, asActorId("actor-1")).slots[0]!;
  return {
    ...base,
    officialSlot,
    homeTeamId: home[0],
    homeGoals: home[1],
    awayTeamId: away[0],
    awayGoals: away[1],
  };
}

function readers(slots: readonly OfficialResultSlotSnapshot[]) {
  const result = buildResult(scope, encounterId, asActorId("actor-1"), { slots: [...slots] });
  const fixturePlans = { listActive: async () => [plan] };
  const officialResults = { listByCompetition: async () => [result] };
  return {
    result,
    calendar: new SchedulingPublicCalendarReader(fixturePlans, officialResults),
    bracket: new SchedulingPublicBracketReader(fixturePlans, officialResults),
  };
}

async function published(slots: readonly OfficialResultSlotSnapshot[]) {
  const { calendar, bracket } = readers(slots);
  const [entry] = await calendar.list(scope);
  const tree = await bracket.read(scope);
  return {
    calendar: entry?.officialScore,
    bracket: tree?.stages[0]?.rounds[0]?.encounters[0]?.officialScore,
  };
}

describe("public portal official scores", () => {
  // Fixture A–B. Slot 1 was recorded by EA as A 2–0 B; slot 2 as B 3–1 A, i.e. A 1–3 B.
  const expected = [
    { homeGoals: 2, awayGoals: 0 },
    { homeGoals: 1, awayGoals: 3 },
  ];

  it("orients each calendar and bracket slot to the Encounter's teams", async () => {
    const slots = [slot(2, [teamB, 3], [teamA, 1]), slot(1, [teamA, 2], [teamB, 0])];

    expect(await published(slots)).toEqual({ calendar: expected, bracket: expected });
    // The stored EA observation is left as recorded.
    expect(slots[0]).toMatchObject({ homeTeamId: teamB, homeGoals: 3 });
  });

  it("orients from either attributed side", async () => {
    const scores = await published([
      slot(1, [teamA, 2], [null, 0]),
      slot(2, [null, 3], [teamA, 1]),
    ]);

    expect(scores).toEqual({ calendar: expected, bracket: expected });
  });

  it("keeps an approved score when both teams are later re-linked to other clubs", async () => {
    // Approved as club-a 2–0 club-b with A on club-a. Re-linking A→club-c and B→club-a changes
    // only ExternalClubConnections; the attribution frozen on the result is what the portal reads.
    const approved = { ...slot(1, [teamA, 2], [teamB, 0]), homeExternalClubId: "club-a" };

    const scores = await published([approved]);

    expect(scores).toEqual({
      calendar: [{ homeGoals: 2, awayGoals: 0 }],
      bracket: [{ homeGoals: 2, awayGoals: 0 }],
    });
  });

  it("publishes no score when a slot cannot be attributed to the Encounter's teams", async () => {
    const unattributed = buildResult(scope, encounterId, asActorId("actor-1")).slots[0]!;

    const scores = await published([
      slot(1, [teamA, 2], [teamB, 0]),
      { ...unattributed, officialSlot: 2 },
    ]);

    expect(scores).toEqual({ calendar: null, bracket: null });
  });
});
