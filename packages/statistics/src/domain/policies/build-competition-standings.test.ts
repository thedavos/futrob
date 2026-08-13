import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import { buildCompetitionStandings } from "./build-competition-standings.ts";

describe("buildCompetitionStandings", () => {
  it("counts each official slot as a table match under independent_matches", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({ officialSlot: 1, goalsFor: 1, goalsAgainst: 0 }),
        team({
          officialSlot: 2,
          side: "home",
          goalsFor: 0,
          goalsAgainst: 2,
        }),
        team({
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
        }),
        team({
          officialSlot: 2,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 2,
          goalsAgainst: 0,
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshot.rows.find((row) => row.teamId === asTeamId("home-team"))).toMatchObject({
      played: 2,
      wins: 1,
      losses: 1,
      points: 3,
      goalsFor: 1,
      goalsAgainst: 2,
    });
  });

  it("scores a two-leg aggregate_score encounter as one table match", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({ officialSlot: 1, goalsFor: 1, goalsAgainst: 0 }),
        team({ officialSlot: 2, goalsFor: 0, goalsAgainst: 2 }),
        team({
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
        }),
        team({
          officialSlot: 2,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 2,
          goalsAgainst: 0,
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "aggregate_score",
      },
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshot.rows).toEqual([
      expect.objectContaining({
        position: 1,
        teamId: asTeamId("away-team"),
        played: 1,
        wins: 1,
        draws: 0,
        losses: 0,
        goalsFor: 2,
        goalsAgainst: 1,
        goalDifference: 1,
        points: 3,
      }),
      expect.objectContaining({
        position: 2,
        teamId: asTeamId("home-team"),
        played: 1,
        wins: 0,
        draws: 0,
        losses: 1,
        goalsFor: 1,
        goalsAgainst: 2,
        goalDifference: -1,
        points: 0,
      }),
    ]);
  });
});

function team(input: {
  readonly officialSlot: 1 | 2;
  readonly side?: TeamMatchContribution["side"];
  readonly teamId?: ReturnType<typeof asTeamId>;
  readonly externalClubId?: string;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
}): TeamMatchContribution {
  return {
    id: `home-${input.officialSlot}-${input.side ?? "home"}`,
    officialResultId: "result-1",
    revision: 1,
    encounterId: asEncounterId("encounter-1"),
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    officialSlot: input.officialSlot,
    teamId: input.teamId ?? asTeamId("home-team"),
    correlationStatus: "matched",
    side: input.side ?? "home",
    externalClubId: input.externalClubId ?? "club-1",
    goalsFor: input.goalsFor,
    goalsAgainst: input.goalsAgainst,
    platform: "playstation",
    gameEdition: "fc26",
    minutesPlayed: 90,
    goals: null,
    assists: null,
    shots: null,
    passAttempts: null,
    passesMade: null,
    tackleAttempts: null,
    tacklesMade: null,
    saves: null,
    yellowCards: null,
    redCards: null,
    isMvp: null,
    rating: null,
  };
}
