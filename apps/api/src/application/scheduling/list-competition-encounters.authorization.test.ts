import { describe, expect, it, vi } from "vite-plus/test";
import {
  asFixtureRoundId,
  asFixtureStageId,
  ENCOUNTER_PERMISSION,
  type FixtureEncounter,
  type FixturePlan,
} from "@futrob/scheduling";
import { asEncounterId, type ActorId, type EncounterId, type TeamId } from "@futrob/shared-kernel";
import {
  createRbacMatrixFixture,
  RBAC_MATRIX_NOW,
  type RbacMatrixFixture,
} from "@/adapters/authorization/rbac-matrix.fixture.ts";
import { ListCompetitionEncountersUseCase } from "./list-competition-encounters.use-case.ts";

const stageId = asFixtureStageId("stage-1");

/** The fixture's own Encounter (Team A vs rival) plus `others` rival vs Team B ones. */
async function scenario(others = 1) {
  const f = await createRbacMatrixFixture();
  const otherIds = Array.from({ length: others }, (_, index) => asEncounterId(`other-${index}`));
  for (const encounterId of otherIds) {
    await f.encounters.upsert({
      encounterId,
      organizationId: f.ids.orgA,
      competitionId: f.ids.compA,
      stageId,
      homeTeamId: f.ids.teamRival,
      awayTeamId: f.ids.teamB,
      scheduledStartAt: RBAC_MATRIX_NOW,
      officialMatchCount: 1,
    });
  }
  const encounters = [
    fixtureEncounter(f.ids.encounterId, f.ids.teamA, f.ids.teamRival),
    ...otherIds.map((id) => fixtureEncounter(id, f.ids.teamRival, f.ids.teamB)),
  ];
  return { f, otherIds, encounters };
}

function fixtureEncounter(id: EncounterId, home: TeamId, away: TeamId): FixtureEncounter {
  return {
    id,
    stageId,
    roundId: asFixtureRoundId("round-1"),
    order: 1,
    home: { kind: "team", teamId: home },
    away: { kind: "team", teamId: away },
    scheduledStartAt: RBAC_MATRIX_NOW,
    officialMatchCount: 1,
    series: null,
  };
}

function plan(f: RbacMatrixFixture, encounters: readonly FixtureEncounter[]): FixturePlan {
  return {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "key",
    generationFingerprint: "fp",
    organizationId: f.ids.orgA,
    competitionId: f.ids.compA,
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "UTC",
    homeAndAway: false,
    seed: [f.ids.teamA, f.ids.teamRival, f.ids.teamB],
    stages: [
      {
        id: stageId,
        kind: "league",
        order: 1,
        rounds: [
          {
            id: asFixtureRoundId("round-1"),
            stageId,
            number: 1,
            scheduledStartAt: RBAC_MATRIX_NOW,
            encounters: [...encounters],
          },
        ],
      },
    ],
  };
}

async function list(
  f: RbacMatrixFixture,
  actorId: ActorId,
  encounters: readonly FixtureEncounter[],
): Promise<string[] | null> {
  const useCase = new ListCompetitionEncountersUseCase({
    authorization: f.authorization,
    clock: { now: () => RBAC_MATRIX_NOW },
    competitions: {
      findById: async () => ({
        // SAFETY: the use case reads only the competition's name and time zone.
        competition: { name: "Liga", timeZone: "UTC" } as never,
      }),
    },
    fixturePlans: { listActive: async () => [plan(f, encounters)] },
    teams: {
      findById: async (organizationId, id) => ({
        id,
        organizationId,
        name: String(id),
        createdAt: RBAC_MATRIX_NOW,
        createdByActorId: actorId,
        creationKey: null,
      }),
    },
    officialResults: { listByCompetition: async () => [] },
  });
  const result = await useCase.execute({
    actorId,
    organizationId: f.ids.orgA,
    competitionId: f.ids.compA,
  });
  return result ? result.encounters.map((entry) => entry.encounterId).sort() : null;
}

async function grant(
  f: RbacMatrixFixture,
  actorId: ActorId,
  encounterId: EncounterId,
  effect: "allow" | "deny",
) {
  await f.grants.upsert({
    id: `${effect}-${actorId}-${encounterId}`,
    organizationId: f.ids.orgA,
    actorId,
    permission: ENCOUNTER_PERMISSION.read,
    effect,
    scopeType: "encounter",
    scopeId: encounterId,
    grantedByActorId: f.actors.organizer,
    reason: null,
    createdAt: RBAC_MATRIX_NOW,
    updatedAt: RBAC_MATRIX_NOW,
  });
}

describe("ListCompetitionEncountersUseCase with the contextual resolver", () => {
  it("hides an Encounter denied to staff while listing the others", async () => {
    const { f, otherIds, encounters } = await scenario();
    await grant(f, f.actors.organizationStaff, f.ids.encounterId, "deny");

    expect(await list(f, f.actors.organizationStaff, encounters)).toEqual(otherIds);
    expect(await list(f, f.actors.organizer, encounters)).toEqual(
      [f.ids.encounterId, ...otherIds].sort(),
    );
  });

  it("lists a captain their Team's Encounters plus explicit grants, minus specific denials", async () => {
    const { f, otherIds, encounters } = await scenario(2);
    const [granted] = otherIds;
    if (!granted) throw new Error("scenario without other Encounters");

    expect(await list(f, f.actors.rosterCaptain, encounters)).toEqual([f.ids.encounterId]);

    await grant(f, f.actors.rosterCaptain, granted, "allow");
    expect(await list(f, f.actors.rosterCaptain, encounters)).toEqual(
      [f.ids.encounterId, granted].sort(),
    );

    await grant(f, f.actors.rosterCaptain, f.ids.encounterId, "deny");
    expect(await list(f, f.actors.rosterCaptain, encounters)).toEqual([granted]);
  });

  it("hides the competition from an outsider unless a grant opens one Encounter", async () => {
    const { f, otherIds, encounters } = await scenario();

    expect(await list(f, f.actors.outsider, encounters)).toBeNull();
    expect(await list(f, f.actors.organizerB, encounters)).toBeNull();

    await grant(f, f.actors.outsider, otherIds[0]!, "allow");
    expect(await list(f, f.actors.outsider, encounters)).toEqual(otherIds);
  });

  it("never lists an Encounter whose stored chain belongs to another competition", async () => {
    const { f, otherIds, encounters } = await scenario();
    const foreign = fixtureEncounter(f.ids.siblingEncounterId, f.ids.teamA, f.ids.teamRival);

    expect(await list(f, f.actors.organizer, [...encounters, foreign])).toEqual(
      [f.ids.encounterId, ...otherIds].sort(),
    );
    expect(await list(f, f.actors.rosterCaptain, [...encounters, foreign])).toEqual([
      f.ids.encounterId,
    ]);
  });

  for (const actor of ["organizationStaff", "rosterCaptain", "outsider"] as const) {
    it(`reads the same sources once for 51 Encounters as for 2 (${actor})`, async () => {
      const sourceReads = async (others: number) => {
        const { f, encounters } = await scenario(others);
        const spies = [
          vi.spyOn(f.encounters, "findById"),
          vi.spyOn(f.encounters, "findByIds"),
          vi.spyOn(f.grants, "listForActorAndScopes"),
          vi.spyOn(f.entries, "findByCompetitionAndTeam"),
        ];
        await list(f, f.actors[actor], encounters);
        return spies.map((spy) => spy.mock.calls.length);
      };

      const small = await sourceReads(1);
      const large = await sourceReads(50);

      expect(large).toEqual(small);
      // findById, findByIds, grants per decision call, entries
      expect(large.slice(0, 2)).toEqual([0, 1]);
      expect(large[2]).toBeLessThanOrEqual(2);
    });
  }
});
