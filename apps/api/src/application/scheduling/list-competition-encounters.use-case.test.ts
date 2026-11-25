import { describe, expect, it } from "vite-plus/test";
import type { Competition } from "@futrob/competitions";
import {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureEncounter,
  type FixturePlan,
  type SeriesResolutionMode,
} from "@futrob/scheduling";
import type { OfficialResultSlotSnapshot } from "@futrob/results";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
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
  options: {
    readonly officialMatchCount?: 1 | 2;
    readonly resolutionMode?: SeriesResolutionMode;
  } = {},
): FixtureEncounter {
  const officialMatchCount = options.officialMatchCount ?? 2;
  return {
    id: asEncounterId(id),
    stageId,
    roundId: asFixtureRoundId(`round-${round}`),
    order: 1,
    home: { kind: "team", teamId: home },
    away: away ? { kind: "team", teamId: away } : { kind: "bye" },
    scheduledStartAt: new Date(startsAt),
    officialMatchCount,
    series: options.resolutionMode
      ? {
          id: `series-${id}`,
          resolutionMode: options.resolutionMode,
          officialMatches:
            officialMatchCount === 2
              ? [
                  { id: asOfficialMatchSlotId(`${id}:1`), slot: 1 },
                  { id: asOfficialMatchSlotId(`${id}:2`), slot: 2 },
                ]
              : [{ id: asOfficialMatchSlotId(`${id}:1`), slot: 1 }],
        }
      : null,
  };
}

function slot(
  officialSlot: 1 | 2,
  homeGoals: number,
  awayGoals: number,
  homeTeamId?: TeamId | null,
  awayTeamId?: TeamId | null,
): OfficialResultSlotSnapshot {
  return {
    officialSlot,
    providerMatchRef: { providerKey: "ea-clubs", externalId: `match-${officialSlot}` },
    homeExternalClubId: "club-a",
    awayExternalClubId: "club-b",
    homeGoals,
    awayGoals,
    occurredAt: new Date("2026-10-19T21:15:00.000Z"),
    gameEdition: "FC 26",
    platform: "playstation",
    players: [],
    homeTeamId,
    awayTeamId,
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
    readonly results?: Awaited<
      ReturnType<ListCompetitionEncountersDependencies["officialResults"]["listByCompetition"]>
    >;
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
      listByCompetition: async () =>
        options.results ?? [
          {
            encounterId: asEncounterId("e-official"),
            revision: 1,
            status: "approved",
            slots: [slot(1, 3, 1, cuervos, maderas)],
          },
          {
            encounterId: asEncounterId("e-played"),
            revision: 1,
            status: "voided",
            slots: [slot(1, 2, 0, halcones, cuervos)],
          },
        ],
    },
  };
}

const leagueStage = { id: stageId, kind: "league", order: 1 } as const;

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
        score: entry.score,
      })),
    ).toEqual([
      {
        id: "e-official",
        round: { id: "round-1", number: 1, total: 2, stage: leagueStage },
        teams: "Cuervos FC vs Maderas FC",
        status: "official",
        score: [{ homeGoals: 3, awayGoals: 1 }],
      },
      {
        id: "e-played",
        round: { id: "round-1", number: 1, total: 2, stage: leagueStage },
        teams: "Halcones FC vs Cuervos FC",
        status: "awaiting_result",
        score: null,
      },
      {
        id: "e-later",
        round: { id: "round-2", number: 2, total: 2, stage: leagueStage },
        teams: "Maderas FC vs Halcones FC",
        status: "scheduled",
        score: null,
      },
    ]);
  });

  it("orients latest approved official scores to fixture sides, keeps series mode and hides unattributable slots", async () => {
    const basePlan = plan();
    const aggregate = encounter("e-official", cuervos, maderas, "2026-10-19T21:00:00.000Z", 1, {
      officialMatchCount: 2,
      resolutionMode: "aggregate_score",
    });
    const unattributed = encounter("e-played", halcones, cuervos, "2026-10-19T23:00:00.000Z", 1, {
      officialMatchCount: 1,
    });
    const customPlan: FixturePlan = {
      ...basePlan,
      stages: [
        {
          ...basePlan.stages[0]!,
          rounds: [
            {
              id: asFixtureRoundId("round-1"),
              stageId,
              number: 1,
              scheduledStartAt: new Date("2026-10-19T21:00:00.000Z"),
              encounters: [aggregate, unattributed],
            },
          ],
        },
      ],
    };

    const list = await run(
      dependencies({
        plans: [customPlan],
        results: [
          {
            encounterId: asEncounterId("e-official"),
            revision: 1,
            status: "approved",
            slots: [slot(1, 0, 0, cuervos, maderas)],
          },
          {
            encounterId: asEncounterId("e-official"),
            revision: 2,
            status: "approved",
            // Slot 2 stored before slot 1 and flipped in EA (away club hosted in EA)
            slots: [slot(2, 0, 2, maderas, cuervos), slot(1, 1, 2, maderas, cuervos)],
          },
          {
            encounterId: asEncounterId("e-played"),
            revision: 1,
            status: "approved",
            slots: [slot(1, 4, 0, null, null)],
          },
        ],
      }),
    );

    expect(
      list?.encounters.map((entry) => ({
        id: entry.encounterId,
        status: entry.status,
        resolutionMode: entry.resolutionMode,
        score: entry.score,
      })),
    ).toEqual([
      {
        id: "e-official",
        status: "official",
        resolutionMode: "aggregate_score",
        score: [
          { homeGoals: 2, awayGoals: 1 },
          { homeGoals: 2, awayGoals: 0 },
        ],
      },
      {
        id: "e-played",
        status: "official",
        resolutionMode: null,
        score: null,
      },
    ]);
  });

  it("keeps the round and stage of every Encounter so two stages' Round 1 stay apart", async () => {
    const playoffsStageId = asFixtureStageId("stage-2");
    const leaguePlan = plan();
    const final = {
      ...encounter("e-playoff", cuervos, maderas, "2026-11-09T21:00:00.000Z", 1),
      stageId: playoffsStageId,
      roundId: asFixtureRoundId("stage-2:round-1"),
    };
    const leaguePlayoffs: FixturePlan = {
      ...leaguePlan,
      format: "league-playoffs",
      stages: [
        ...leaguePlan.stages,
        {
          id: playoffsStageId,
          kind: "playoffs",
          order: 2,
          rounds: [
            {
              id: asFixtureRoundId("stage-2:round-1"),
              stageId: playoffsStageId,
              number: 1,
              scheduledStartAt: new Date("2026-11-09T21:00:00.000Z"),
              encounters: [final],
            },
          ],
        },
      ],
    };

    const list = await run(dependencies({ plans: [leaguePlayoffs] }));

    expect(list?.encounters.map((entry) => [entry.encounterId, entry.round])).toEqual([
      ["e-official", { id: "round-1", number: 1, total: 2, stage: leagueStage }],
      ["e-played", { id: "round-1", number: 1, total: 2, stage: leagueStage }],
      ["e-later", { id: "round-2", number: 2, total: 2, stage: leagueStage }],
      [
        "e-playoff",
        {
          id: "stage-2:round-1",
          number: 1,
          total: 1,
          stage: { id: playoffsStageId, kind: "playoffs", order: 2 },
        },
      ],
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
