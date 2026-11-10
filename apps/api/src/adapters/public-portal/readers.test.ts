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
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";
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
  home: [club: string, goals: number],
  away: [club: string, goals: number],
): OfficialResultSlotSnapshot {
  const base = buildResult(scope, encounterId, asActorId("actor-1")).slots[0]!;
  return {
    ...base,
    officialSlot,
    homeExternalClubId: home[0],
    homeGoals: home[1],
    awayExternalClubId: away[0],
    awayGoals: away[1],
  };
}

function connections(clubs: ReadonlyArray<[TeamId, string]>) {
  const repo = new InMemoryExternalClubConnectionRepository();
  for (const [teamId, externalClubId] of clubs) {
    repo.rows.set(teamId, {
      teamId,
      providerKey: "ea-clubs",
      externalClubId,
      externalClubName: externalClubId,
      gameEdition: "fc27",
      platform: "playstation",
    });
  }
  return repo;
}

describe("public portal official scores", () => {
  // Fixture A–B. Slot 1 was recorded by EA as A 2–0 B; slot 2 as B 3–1 A, i.e. A 1–3 B.
  const result = buildResult(scope, encounterId, asActorId("actor-1"), {
    slots: [slot(2, ["club-b", 3], ["club-a", 1]), slot(1, ["club-a", 2], ["club-b", 0])],
  });
  const fixturePlans = { listActive: async () => [plan] };
  const officialResults = { listByCompetition: async () => [result] };
  const clubs = connections([
    [teamA, "club-a"],
    [teamB, "club-b"],
  ]);
  const expected = [
    { homeGoals: 2, awayGoals: 0 },
    { homeGoals: 1, awayGoals: 3 },
  ];

  it("orients each calendar slot to the Encounter's teams", async () => {
    const reader = new SchedulingPublicCalendarReader(fixturePlans, officialResults, clubs);

    const [entry] = await reader.list(scope);

    expect(entry?.officialScore).toEqual(expected);
    // The stored EA observation is left as recorded.
    expect(result.slots[0]).toMatchObject({ homeExternalClubId: "club-b", homeGoals: 3 });
  });

  it("orients each bracket slot to the Encounter's teams", async () => {
    const reader = new SchedulingPublicBracketReader(fixturePlans, officialResults, clubs);

    const bracket = await reader.read(scope);

    expect(bracket?.stages[0]?.rounds[0]?.encounters[0]?.officialScore).toEqual(expected);
  });

  it("orients from either connected side", async () => {
    const reader = new SchedulingPublicCalendarReader(
      fixturePlans,
      officialResults,
      connections([[teamB, "club-b"]]),
    );

    const [entry] = await reader.list(scope);

    expect(entry?.officialScore).toEqual(expected);
  });
});
