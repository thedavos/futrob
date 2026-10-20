import { describe, expect, it } from "vite-plus/test";
import type { Competition } from "@futrob/competitions";
import {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureEncounter,
  type FixturePlan,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationRequest,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  ListCompetitionEncountersUseCase,
  type ListCompetitionEncountersDependencies,
} from "./list-competition-encounters.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const stageId = asFixtureStageId("stage-1");
const actorId = asActorId("actor-1");
const cuervos = asTeamId("team-cuervos");
const maderas = asTeamId("team-maderas");
const halcones = asTeamId("team-halcones");

function encounter(
  id: string,
  home: TeamId,
  away: TeamId | null,
  startsAt: string,
  round: number,
): FixtureEncounter {
  return {
    id: asEncounterId(id),
    stageId,
    roundId: asFixtureRoundId(`round-${round}`),
    order: 1,
    home: { kind: "team", teamId: home },
    away: away ? { kind: "team", teamId: away } : { kind: "bye" },
    scheduledStartAt: new Date(startsAt),
    officialMatchCount: 2,
    series: null,
  };
}

function plan(): FixturePlan {
  return {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "key",
    generationFingerprint: "fp",
    organizationId,
    competitionId,
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: [cuervos, maderas, halcones],
    stages: [
      {
        id: stageId,
        kind: "league",
        order: 1,
        rounds: [
          {
            id: asFixtureRoundId("round-2"),
            stageId,
            number: 2,
            scheduledStartAt: new Date("2026-10-26T21:00:00.000Z"),
            encounters: [
              encounter("e-later", maderas, halcones, "2026-10-26T21:00:00.000Z", 2),
              encounter("e-bye", cuervos, null, "2026-10-26T21:00:00.000Z", 2),
            ],
          },
          {
            id: asFixtureRoundId("round-1"),
            stageId,
            number: 1,
            scheduledStartAt: new Date("2026-10-19T21:00:00.000Z"),
            encounters: [
              encounter("e-official", cuervos, maderas, "2026-10-19T21:00:00.000Z", 1),
              encounter("e-played", halcones, cuervos, "2026-10-19T23:00:00.000Z", 1),
            ],
          },
        ],
      },
    ],
  };
}

const names = new Map<TeamId, string>([
  [cuervos, "Cuervos FC"],
  [maderas, "Maderas FC"],
  [halcones, "Halcones FC"],
]);

function dependencies(
  options: {
    readonly allow?: (request: AuthorizationRequest) => boolean;
    readonly competition?: boolean;
    readonly plans?: FixturePlan[];
  } = {},
): ListCompetitionEncountersDependencies {
  const allow = options.allow ?? (() => true);
  const decide = (request: AuthorizationRequest) => ({
    allowed: allow(request),
    permission: request.permission,
    scope: request.scope,
    reason: allow(request) ? ("allowed" as const) : ("no-assignment" as const),
  });
  return {
    authorization: {
      decide: async (request) => decide(request),
      decideEach: async ({ actorId: actor, permission, scopes }) =>
        scopes.map((scope) => decide({ actorId: actor, permission, scope })),
    },
    clock: { now: () => new Date("2026-10-20T00:30:00.000Z") },
    competitions: {
      findById: async () =>
        options.competition === false
          ? null
          : {
              // SAFETY: the use case reads only the competition's name and time zone.
              competition: {
                name: "Liga Verify",
                timeZone: "America/Lima",
              } as Competition,
            },
    },
    fixturePlans: { listActive: async () => options.plans ?? [plan()] },
    teams: {
      findById: async (_organization, teamId) => {
        const name = names.get(teamId);
        return name
          ? {
              id: teamId,
              organizationId,
              name,
              createdAt: new Date("2026-08-01T00:00:00.000Z"),
              createdByActorId: actorId,
              creationKey: null,
            }
          : null;
      },
    },
    officialResults: {
      listByCompetition: async () => [
        { encounterId: asEncounterId("e-official"), status: "approved" },
        { encounterId: asEncounterId("e-played"), status: "voided" },
      ],
    },
  };
}

const run = (deps: ListCompetitionEncountersDependencies) =>
  new ListCompetitionEncountersUseCase(deps).execute({ actorId, organizationId, competitionId });

describe("ListCompetitionEncountersUseCase", () => {
  it("lists staff every paired Encounter earliest first with names and result status", async () => {
    const list = await run(dependencies());

    expect(list?.competition).toEqual({
      id: competitionId,
      name: "Liga Verify",
      timeZone: "America/Lima",
    });
    expect(
      list?.encounters.map((entry) => ({
        id: entry.encounterId,
        round: entry.round,
        teams: `${entry.home.name} vs ${entry.away.name}`,
        status: entry.status,
      })),
    ).toEqual([
      {
        id: "e-official",
        round: { number: 1, total: 2 },
        teams: "Cuervos FC vs Maderas FC",
        status: "official",
      },
      {
        id: "e-played",
        round: { number: 1, total: 2 },
        teams: "Halcones FC vs Cuervos FC",
        status: "awaiting_result",
      },
      {
        id: "e-later",
        round: { number: 2, total: 2 },
        teams: "Maderas FC vs Halcones FC",
        status: "scheduled",
      },
    ]);
  });

  it("shows a participant only the Encounters they may read", async () => {
    const list = await run(
      dependencies({
        allow: (request) =>
          request.permission === "encounters.read" && request.scope.encounterId === "e-played",
      }),
    );

    expect(list?.encounters.map((entry) => entry.encounterId)).toEqual(["e-played"]);
  });

  it("hides a competition the actor cannot read, unlike one they can read without encounters", async () => {
    const hidden = await run(dependencies({ allow: () => false }));
    const readable = await run(
      dependencies({ allow: (request) => request.permission === "competitions.read" }),
    );

    expect(hidden).toBeNull();
    expect(readable?.encounters).toEqual([]);
  });

  it("answers null for a missing competition and an empty list before the fixture exists", async () => {
    expect(await run(dependencies({ competition: false }))).toBeNull();
    expect((await run(dependencies({ plans: [] })))?.encounters).toEqual([]);
  });
});
