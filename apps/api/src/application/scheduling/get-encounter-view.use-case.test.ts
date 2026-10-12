import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  asFixtureRoundId,
  asFixtureStageId,
  type EncounterScheduleSnapshot,
  type FixturePlan,
} from "@futrob/scheduling";
import {
  GetEncounterViewUseCase,
  type GetEncounterViewDependencies,
} from "./get-encounter-view.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const homeTeamId = asTeamId("team-home");
const awayTeamId = asTeamId("team-away");
const stageId = asFixtureStageId("stage-1");
const roundId = asFixtureRoundId("round-1");

const snapshot: EncounterScheduleSnapshot = {
  encounterId,
  organizationId,
  competitionId,
  stageId,
  homeTeamId,
  awayTeamId,
  scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
  officialMatchCount: 2,
};

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
    format: "knockout",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: [homeTeamId, awayTeamId],
    stages: [
      {
        id: stageId,
        kind: "knockout",
        order: 1,
        rounds: [
          {
            id: roundId,
            stageId,
            number: 1,
            scheduledStartAt: snapshot.scheduledStartAt,
            encounters: [
              {
                id: encounterId,
                stageId,
                roundId,
                order: 1,
                home: { kind: "team", teamId: homeTeamId },
                away: { kind: "team", teamId: awayTeamId },
                scheduledStartAt: snapshot.scheduledStartAt,
                officialMatchCount: 2,
                series: {
                  id: "series-1",
                  resolutionMode: "aggregate_score",
                  officialMatches: [
                    { id: asOfficialMatchSlotId("slot-1"), slot: 1 },
                    { id: asOfficialMatchSlotId("slot-2"), slot: 2 },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function dependencies(plans: FixturePlan[]): GetEncounterViewDependencies {
  const names = new Map<TeamId, string>([
    [homeTeamId, "Cuervos FC"],
    [awayTeamId, "Maderas FC"],
  ]);
  return {
    competitions: { findById: async () => null },
    teams: {
      findById: async (_organization, teamId) => {
        const name = names.get(teamId);
        return name
          ? {
              id: teamId,
              organizationId,
              name,
              createdAt: new Date("2026-08-01T00:00:00.000Z"),
              createdByActorId: asActorId("actor-1"),
              creationKey: null,
            }
          : null;
      },
    },
    connections: { findByTeam: async () => null },
    getExternalClub: async () => {
      throw new Error("Teams without a connection need no club lookup");
    },
    fixturePlans: { listActive: async () => plans },
    officialMatches: {
      listByEncounter: async () => [
        { slot: 2, scheduledStartAt: new Date("2026-09-16T22:30:00.000Z") },
      ],
    },
  };
}

describe("GetEncounterViewUseCase", () => {
  it("reads the series resolution mode and keeps a moved slot's own start", async () => {
    const view = await new GetEncounterViewUseCase(dependencies([plan()])).execute(snapshot);

    expect({
      resolutionMode: view?.resolutionMode,
      round: view?.round,
      officialMatches: view?.officialMatches,
    }).toEqual({
      resolutionMode: "aggregate_score",
      round: { number: 1, total: 1 },
      officialMatches: [
        { slot: 1, scheduledStartAt: new Date("2026-09-14T20:00:00.000Z") },
        { slot: 2, scheduledStartAt: new Date("2026-09-16T22:30:00.000Z") },
      ],
    });
  });

  it("leaves the resolution mode unknown when the Encounter is in no active plan", async () => {
    const view = await new GetEncounterViewUseCase(dependencies([])).execute(snapshot);

    expect({ resolutionMode: view?.resolutionMode, home: view?.home.name }).toEqual({
      resolutionMode: null,
      home: "Cuervos FC",
    });
  });
});
