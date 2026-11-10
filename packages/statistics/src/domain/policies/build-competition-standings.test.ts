import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import {
  officialSlotKey,
  type TeamMatchContribution,
} from "../entities/team-match-contribution.ts";
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
      occurredAtBySlot: new Map(),
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

  it("subtracts active point deductions and reorders the table by the remaining points", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({ officialSlot: 1, goalsFor: 2, goalsAgainst: 0 }),
        team({
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 2,
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      pointDeductions: [
        { teamId: asTeamId("home-team"), points: 2 },
        { teamId: asTeamId("home-team"), points: 2 },
      ],
      occurredAtBySlot: new Map(),
      updatedAt: new Date("2026-11-10T12:00:00.000Z"),
    });

    expect(
      snapshot.rows.map(({ position, teamId, played, wins, points, pointsDeducted }) => ({
        position,
        teamId,
        played,
        wins,
        points,
        pointsDeducted,
      })),
    ).toEqual([
      { position: 1, teamId: "away-team", played: 1, wins: 0, points: 0, pointsDeducted: 0 },
      { position: 2, teamId: "home-team", played: 1, wins: 1, points: -1, pointsDeducted: 4 },
    ]);
  });

  it("lists a sanctioned Team that has not played yet with its negative points", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      pointDeductions: [{ teamId: asTeamId("idle-team"), points: 3 }],
      occurredAtBySlot: new Map(),
      updatedAt: new Date("2026-11-10T12:00:00.000Z"),
    });

    expect(snapshot.rows).toEqual([
      expect.objectContaining({ teamId: "idle-team", played: 0, points: -3, pointsDeducted: 3 }),
    ]);
  });

  it("scores a two-leg aggregate_score encounter as one table match", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({
          officialSlot: 1,
          goalsFor: 1,
          goalsAgainst: 0,
          resolutionMode: "aggregate_score",
        }),
        team({
          officialSlot: 2,
          goalsFor: 0,
          goalsAgainst: 2,
          resolutionMode: "aggregate_score",
        }),
        team({
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
          resolutionMode: "aggregate_score",
        }),
        team({
          officialSlot: 2,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 2,
          goalsAgainst: 0,
          resolutionMode: "aggregate_score",
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      occurredAtBySlot: new Map(),
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

  it("mixed-league-playoffs-pj counts one league match plus one aggregate playoff as PJ 2", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({
          encounterId: asEncounterId("encounter-regular"),
          officialSlot: 1,
          goalsFor: 1,
          goalsAgainst: 0,
          resolutionMode: "independent_matches",
        }),
        team({
          encounterId: asEncounterId("encounter-regular"),
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
          resolutionMode: "independent_matches",
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 1,
          goalsFor: 1,
          goalsAgainst: 0,
          resolutionMode: "aggregate_score",
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 2,
          goalsFor: 0,
          goalsAgainst: 2,
          resolutionMode: "aggregate_score",
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
          resolutionMode: "aggregate_score",
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 2,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 2,
          goalsAgainst: 0,
          resolutionMode: "aggregate_score",
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      occurredAtBySlot: new Map(),
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshot.rows.find((row) => row.teamId === asTeamId("home-team"))).toMatchObject({
      played: 2,
      wins: 1,
      losses: 1,
      points: 3,
      goalsFor: 2,
      goalsAgainst: 2,
    });
  });

  it("scores a league win at 3 and a playoff win at 5 in the same table", () => {
    const snapshot = buildCompetitionStandings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      contributions: [
        team({
          encounterId: asEncounterId("encounter-regular"),
          officialSlot: 1,
          goalsFor: 1,
          goalsAgainst: 0,
        }),
        team({
          encounterId: asEncounterId("encounter-regular"),
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 1,
          goalsFor: 1,
          goalsAgainst: 0,
        }),
        team({
          encounterId: asEncounterId("encounter-knockout"),
          officialSlot: 1,
          side: "away",
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
          goalsFor: 0,
          goalsAgainst: 1,
        }),
      ],
      pointsRules: {
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        resolutionMode: "independent_matches",
      },
      pointsByEncounter: new Map([
        [
          "encounter-regular",
          {
            winPoints: 3,
            drawPoints: 1,
            lossPoints: 0,
            resolutionMode: "independent_matches",
          },
        ],
        [
          "encounter-knockout",
          {
            winPoints: 5,
            drawPoints: 1,
            lossPoints: 0,
            resolutionMode: "independent_matches",
          },
        ],
      ]),
      occurredAtBySlot: new Map(),
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshot.rows.find((row) => row.teamId === asTeamId("home-team"))).toMatchObject({
      played: 2,
      wins: 2,
      points: 8,
    });
  });

  describe("form", () => {
    it("lists the team's results oldest first, whatever the input order", () => {
      const contributions = [
        team({ encounterId: asEncounterId("e-1"), officialSlot: 1, goalsFor: 2, goalsAgainst: 0 }),
        team({ encounterId: asEncounterId("e-2"), officialSlot: 1, goalsFor: 0, goalsAgainst: 1 }),
        team({ encounterId: asEncounterId("e-3"), officialSlot: 1, goalsFor: 1, goalsAgainst: 1 }),
      ];
      const snapshot = standings(contributions, [
        [contributions[0]!, "2026-03-03T20:00:00.000Z"],
        [contributions[1]!, "2026-03-01T20:00:00.000Z"],
        [contributions[2]!, "2026-03-02T20:00:00.000Z"],
      ]);

      expect(formOf(snapshot, "home-team")).toEqual(["loss", "draw", "win"]);
    });

    it("keeps only the latest five results", () => {
      const outcomes: [number, number][] = [
        [1, 0],
        [1, 0],
        [0, 3],
        [2, 2],
        [1, 0],
        [0, 1],
        [4, 1],
      ];
      const contributions = outcomes.map(([goalsFor, goalsAgainst], index) =>
        team({ encounterId: asEncounterId(`e-${index}`), officialSlot: 1, goalsFor, goalsAgainst }),
      );
      const snapshot = standings(
        contributions,
        contributions.map((contribution, index) => [
          contribution,
          `2026-03-0${index + 1}T20:00:00.000Z`,
        ]),
      );

      expect(formOf(snapshot, "home-team")).toEqual(["loss", "draw", "win", "loss", "win"]);
      expect(rowOf(snapshot, "home-team")).toMatchObject({ played: 7 });
    });

    it("counts a two-leg aggregate_score encounter as one result", () => {
      const legs = [
        team({ officialSlot: 1, goalsFor: 1, goalsAgainst: 0, resolutionMode: "aggregate_score" }),
        team({ officialSlot: 2, goalsFor: 0, goalsAgainst: 2, resolutionMode: "aggregate_score" }),
      ];
      const earlier = team({
        encounterId: asEncounterId("e-0"),
        officialSlot: 1,
        goalsFor: 3,
        goalsAgainst: 0,
      });
      const snapshot = standings(
        [...legs, earlier],
        [
          [legs[0]!, "2026-03-01T20:00:00.000Z"],
          [legs[1]!, "2026-03-08T20:00:00.000Z"],
          [earlier, "2026-03-05T20:00:00.000Z"],
        ],
      );

      expect(formOf(snapshot, "home-team")).toEqual(["win", "loss"]);
    });

    it("leaves a match without a known time out of the form but not out of the points", () => {
      const timed = team({
        encounterId: asEncounterId("e-1"),
        officialSlot: 1,
        goalsFor: 0,
        goalsAgainst: 1,
      });
      const untimed = team({
        encounterId: asEncounterId("e-2"),
        officialSlot: 1,
        goalsFor: 2,
        goalsAgainst: 0,
      });
      const snapshot = standings([timed, untimed], [[timed, "2026-03-01T20:00:00.000Z"]]);

      expect(formOf(snapshot, "home-team")).toEqual(["loss"]);
      expect(rowOf(snapshot, "home-team")).toMatchObject({ played: 2, wins: 1, points: 3 });
    });

    it("orders equal times by encounter, then slot", () => {
      const sameTime = "2026-03-01T20:00:00.000Z";
      const contributions = [
        team({ encounterId: asEncounterId("e-b"), officialSlot: 1, goalsFor: 1, goalsAgainst: 0 }),
        team({ encounterId: asEncounterId("e-a"), officialSlot: 2, goalsFor: 1, goalsAgainst: 1 }),
        team({ encounterId: asEncounterId("e-a"), officialSlot: 1, goalsFor: 0, goalsAgainst: 1 }),
      ];
      const times = contributions.map((contribution) => [contribution, sameTime] as const);

      expect(formOf(standings(contributions, times), "home-team")).toEqual(["loss", "draw", "win"]);
      expect(
        formOf(standings([...contributions].reverse(), [...times].reverse()), "home-team"),
      ).toEqual(["loss", "draw", "win"]);
    });
  });
});

function standings(
  contributions: readonly TeamMatchContribution[],
  times: readonly (readonly [TeamMatchContribution, string])[],
) {
  return buildCompetitionStandings({
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    contributions,
    pointsRules: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      resolutionMode: "independent_matches",
    },
    occurredAtBySlot: new Map(
      times.map(([contribution, occurredAt]) => [
        officialSlotKey(contribution),
        new Date(occurredAt),
      ]),
    ),
    updatedAt: new Date("2026-08-13T12:00:00.000Z"),
  });
}

function rowOf(snapshot: ReturnType<typeof standings>, teamId: string) {
  return snapshot.rows.find((row) => row.teamId === asTeamId(teamId));
}

function formOf(snapshot: ReturnType<typeof standings>, teamId: string) {
  return rowOf(snapshot, teamId)?.form;
}

function team(input: {
  readonly encounterId?: ReturnType<typeof asEncounterId>;
  readonly officialSlot: 1 | 2;
  readonly side?: TeamMatchContribution["side"];
  readonly teamId?: ReturnType<typeof asTeamId>;
  readonly externalClubId?: string;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly resolutionMode?: TeamMatchContribution["resolutionMode"];
}): TeamMatchContribution {
  return {
    id: `home-${input.officialSlot}-${input.side ?? "home"}-${input.encounterId ?? "encounter-1"}`,
    officialResultId: "result-1",
    revision: 1,
    encounterId: input.encounterId ?? asEncounterId("encounter-1"),
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    officialSlot: input.officialSlot,
    resolutionMode: input.resolutionMode ?? "independent_matches",
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
