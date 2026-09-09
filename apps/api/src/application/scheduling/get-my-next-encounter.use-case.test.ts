import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  err,
  ok,
  type TeamId,
} from "@futrob/shared-kernel";
import { asFixtureRoundId, asFixtureStageId, type FixturePlan } from "@futrob/scheduling";
import { ProviderUnavailable, type ExternalClub } from "@futrob/game-data";
import type { Competition } from "@futrob/competitions";
import type {
  CompetitionRosterMembership,
  ExternalClubConnection,
  PlayerProfile,
  Team,
} from "@futrob/teams";
import {
  GetMyNextEncounterUseCase,
  type GetMyNextEncounterDependencies,
} from "./get-my-next-encounter.use-case.ts";

const actorId = asActorId("actor-1");
const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const homeTeamId = asTeamId("team-home");
const awayTeamId = asTeamId("team-away");
const encounterId = asEncounterId("encounter-1");
const now = new Date("2026-09-07T18:00:00.000Z");

function profile(): PlayerProfile {
  return { id: "profile-1", actorId, createdAt: new Date("2026-08-01T00:00:00.000Z") };
}

function membership(teamId: TeamId): CompetitionRosterMembership {
  return {
    id: `membership-${teamId}`,
    organizationId,
    competitionId,
    teamId,
    playerProfileId: "profile-1",
    gameAccountId: null,
    role: "player",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  };
}

function team(id: TeamId, name: string): Team {
  return {
    id,
    organizationId,
    name,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    createdByActorId: actorId,
    creationKey: null,
  };
}

function competition(): Competition {
  return {
    id: competitionId,
    organizationId,
    name: "Liga Futrob",
    status: "published",
    modality: "fc-clubs",
    gameEdition: "fc26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    createdByActorId: actorId,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  };
}

function connection(teamId: TeamId, name: string): ExternalClubConnection {
  return {
    teamId,
    providerKey: "ea-clubs",
    externalClubId: `club-${teamId}`,
    externalClubName: name,
    gameEdition: "fc26",
    platform: "common-gen5",
  };
}

function club(teamId: TeamId, name: string, imageUrl: string | null): ExternalClub {
  return {
    providerKey: "ea-clubs",
    externalClubId: `club-${teamId}`,
    name,
    platform: "common-gen5",
    gameEdition: "fc26",
    imageUrl,
  };
}

function plan(): FixturePlan {
  const stageId = asFixtureStageId("stage-1");
  const roundId = asFixtureRoundId("round-4");
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
    seed: [homeTeamId, awayTeamId],
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
            scheduledStartAt: now,
            encounters: [],
          },
          {
            id: asFixtureRoundId("round-2"),
            stageId,
            number: 2,
            scheduledStartAt: now,
            encounters: [],
          },
          {
            id: asFixtureRoundId("round-3"),
            stageId,
            number: 3,
            scheduledStartAt: now,
            encounters: [],
          },
          {
            id: roundId,
            stageId,
            number: 4,
            scheduledStartAt: now,
            encounters: [
              {
                id: encounterId,
                stageId,
                roundId,
                order: 1,
                home: { kind: "team", teamId: homeTeamId },
                away: { kind: "team", teamId: awayTeamId },
                scheduledStartAt: new Date("2026-09-07T21:00:00.000Z"),
                officialMatchCount: 1,
                series: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function dependencies(
  overrides?: Partial<GetMyNextEncounterDependencies>,
): GetMyNextEncounterDependencies {
  return {
    clock: { now: () => now },
    profiles: { findByActor: async () => profile() },
    rosters: { listByPlayerProfile: async () => [membership(homeTeamId)] },
    encounters: {
      findNextUpcomingByTeamIds: async () => ({
        encounterId,
        organizationId,
        competitionId,
        homeTeamId,
        awayTeamId,
        scheduledStartAt: new Date("2026-09-07T21:00:00.000Z"),
        officialMatchCount: 1,
      }),
    },
    competitions: { findById: async () => ({ competition: competition() }) },
    teams: {
      findById: async (_organization, teamId) =>
        teamId === homeTeamId
          ? team(homeTeamId, "Cuervos FC1")
          : teamId === awayTeamId
            ? team(awayTeamId, "MADERAS FC")
            : null,
    },
    connections: {
      findByTeam: async (teamId) =>
        teamId === homeTeamId ? connection(homeTeamId, "Cuervos FC1") : null,
    },
    getExternalClub: async () =>
      ok(club(homeTeamId, "Cuervos FC1", "https://cdn.example.com/cuervos.png")),
    fixturePlans: { listActive: async () => [plan()] },
    ...overrides,
  };
}

describe("GetMyNextEncounterUseCase", () => {
  it("returns null when the actor has no profile or roster", async () => {
    const missingProfile = new GetMyNextEncounterUseCase(
      dependencies({ profiles: { findByActor: async () => null } }),
    );
    const emptyRoster = new GetMyNextEncounterUseCase(
      dependencies({ rosters: { listByPlayerProfile: async () => [] } }),
    );
    expect(await missingProfile.execute({ actorId })).toBeNull();
    expect(await emptyRoster.execute({ actorId })).toBeNull();
  });

  it("returns null when no upcoming snapshot exists", async () => {
    const useCase = new GetMyNextEncounterUseCase(
      dependencies({ encounters: { findNextUpcomingByTeamIds: async () => null } }),
    );
    expect(await useCase.execute({ actorId })).toBeNull();
  });

  it("composes the next encounter with round, names and best-effort crests", async () => {
    const useCase = new GetMyNextEncounterUseCase(dependencies());
    expect(await useCase.execute({ actorId })).toEqual({
      encounterId,
      competition: {
        id: competitionId,
        organizationId,
        name: "Liga Futrob",
        timeZone: "America/Lima",
      },
      round: { number: 4, total: 4 },
      scheduledStartAt: new Date("2026-09-07T21:00:00.000Z"),
      officialMatchCount: 1,
      home: {
        teamId: homeTeamId,
        name: "Cuervos FC1",
        externalClub: club(homeTeamId, "Cuervos FC1", "https://cdn.example.com/cuervos.png"),
      },
      away: {
        teamId: awayTeamId,
        name: "MADERAS FC",
        externalClub: null,
      },
    });
  });

  it("keeps the team club name when crest lookup fails", async () => {
    const useCase = new GetMyNextEncounterUseCase(
      dependencies({
        getExternalClub: async () =>
          err(
            new ProviderUnavailable({
              code: "game_data.provider_unavailable",
              message: "timeout",
              retryAfterSeconds: 30,
            }),
          ),
      }),
    );
    const result = await useCase.execute({ actorId });
    expect(result?.home.externalClub).toEqual(club(homeTeamId, "Cuervos FC1", null));
  });

  it("omits the round when the encounter is not in an active plan", async () => {
    const useCase = new GetMyNextEncounterUseCase(
      dependencies({ fixturePlans: { listActive: async () => [] } }),
    );
    expect((await useCase.execute({ actorId }))?.round).toBeNull();
  });
});
