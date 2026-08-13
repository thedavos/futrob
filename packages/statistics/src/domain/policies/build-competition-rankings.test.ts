import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import { buildCompetitionRankings } from "./build-competition-rankings.ts";

describe("buildCompetitionRankings", () => {
  it("builds closed ranking kinds with eligibility encoded on each snapshot", () => {
    const snapshots = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [
        player({
          id: "p1-m1",
          playerProfileId: "scorer-a",
          goals: 4,
          assists: 1,
          rating: 8,
          isMvp: true,
          minutesPlayed: 90,
        }),
        player({
          id: "p1-m2",
          playerProfileId: "scorer-a",
          encounterId: "encounter-2",
          goals: 2,
          assists: 0,
          rating: 7,
          isMvp: false,
          minutesPlayed: 90,
        }),
        player({
          id: "p1-m3",
          playerProfileId: "scorer-a",
          encounterId: "encounter-3",
          goals: 1,
          assists: 2,
          rating: 9,
          isMvp: true,
          minutesPlayed: 90,
        }),
        player({
          id: "p2-m1",
          playerProfileId: "assister-b",
          goals: 0,
          assists: 5,
          rating: 6.5,
          isMvp: false,
          minutesPlayed: 90,
        }),
        player({
          id: "p2-m2",
          playerProfileId: "assister-b",
          encounterId: "encounter-2",
          goals: 1,
          assists: 1,
          rating: 7.5,
          isMvp: false,
          minutesPlayed: 90,
        }),
        player({
          id: "p2-m3",
          playerProfileId: "assister-b",
          encounterId: "encounter-3",
          goals: 0,
          assists: 2,
          rating: 8,
          isMvp: true,
          minutesPlayed: 90,
        }),
        player({
          id: "gk-m1",
          playerProfileId: "keeper-c",
          position: "goalkeeper",
          goals: 0,
          assists: 0,
          saves: 6,
          rating: 7,
          isMvp: false,
          minutesPlayed: 90,
        }),
        player({
          id: "gk-m2",
          playerProfileId: "keeper-c",
          encounterId: "encounter-2",
          position: "gk",
          goals: 0,
          assists: 0,
          saves: 4,
          rating: 7.2,
          isMvp: false,
          minutesPlayed: 90,
        }),
        player({
          id: "gk-m3",
          playerProfileId: "keeper-c",
          encounterId: "encounter-3",
          position: "portero",
          goals: 0,
          assists: 0,
          saves: 2,
          rating: 6.8,
          isMvp: false,
          minutesPlayed: 90,
        }),
      ],
      teamContributions: [
        team({ encounterId: "encounter-1", minutesPlayed: 270, goalsAgainst: 1 }),
        team({ encounterId: "encounter-2", minutesPlayed: 270, goalsAgainst: 0 }),
        team({ encounterId: "encounter-3", minutesPlayed: 270, goalsAgainst: 2 }),
      ],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshots.map((snapshot) => snapshot.kind)).toEqual([
      "scorer",
      "assister",
      "rating",
      "mvp",
      "goalkeeper",
    ]);
    for (const snapshot of snapshots) {
      expect(snapshot.formulaVersion).toBe("player-ranking-v1");
      expect(snapshot.eligibility).toEqual({
        minimumMatches: 3,
        minimumTeamMinutesRatio: 0.6,
      });
    }

    expect(snapshots.find((snapshot) => snapshot.kind === "scorer")?.rows).toEqual([
      {
        position: 1,
        playerProfileId: "scorer-a",
        teamId: asTeamId("home-team"),
        value: 7,
        matchesPlayed: 3,
        minutes: 270,
      },
      {
        position: 2,
        playerProfileId: "assister-b",
        teamId: asTeamId("home-team"),
        value: 1,
        matchesPlayed: 3,
        minutes: 270,
      },
    ]);
    expect(snapshots.find((snapshot) => snapshot.kind === "assister")?.rows[0]).toMatchObject({
      playerProfileId: "assister-b",
      value: 8,
    });
    expect(snapshots.find((snapshot) => snapshot.kind === "mvp")?.rows[0]).toMatchObject({
      playerProfileId: "scorer-a",
      value: 2,
    });
    expect(snapshots.find((snapshot) => snapshot.kind === "goalkeeper")?.rows).toEqual([
      {
        position: 1,
        playerProfileId: "keeper-c",
        teamId: asTeamId("home-team"),
        value: 12,
        matchesPlayed: 3,
        minutes: 270,
      },
    ]);
  });

  it("breaks ties stably by playerProfileId", () => {
    const snapshots = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [
        ...threeMatches({ playerProfileId: "zeta", goals: 3 }),
        ...threeMatches({ playerProfileId: "alpha", goals: 3 }),
      ],
      teamContributions: [],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(
      snapshots
        .find((snapshot) => snapshot.kind === "scorer")
        ?.rows.map((row) => row.playerProfileId),
    ).toEqual(["alpha", "zeta"]);
  });

  it("clears ineligible and absent players after void-style empty contributions", () => {
    const withPlayers = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: threeMatches({ playerProfileId: "gone", goals: 5 }),
      teamContributions: [],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });
    expect(withPlayers.find((snapshot) => snapshot.kind === "scorer")?.rows).toHaveLength(1);

    const emptied = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [],
      teamContributions: [],
      updatedAt: new Date("2026-08-13T13:00:00.000Z"),
    });
    for (const snapshot of emptied) {
      expect(snapshot.rows).toEqual([]);
    }
  });

  it("admits a one-match player via the 60% team match-clock path", () => {
    const snapshots = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [
        player({
          id: "short-1",
          playerProfileId: "short-minutes",
          goals: 2,
          minutesPlayed: 54,
        }),
        player({
          id: "starter-1",
          playerProfileId: "starter",
          goals: 0,
          minutesPlayed: 90,
        }),
      ],
      teamContributions: [team({ encounterId: "encounter-1", minutesPlayed: 990 })],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshots.find((snapshot) => snapshot.kind === "scorer")?.rows).toEqual([
      {
        position: 1,
        playerProfileId: "short-minutes",
        teamId: asTeamId("home-team"),
        value: 2,
        matchesPlayed: 1,
        minutes: 54,
      },
    ]);
  });

  it("excludes a two-match player under 60% of the team match clock", () => {
    const snapshots = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [
        player({
          id: "low-1",
          playerProfileId: "bench",
          goals: 4,
          minutesPlayed: 20,
        }),
        player({
          id: "starter-1",
          playerProfileId: "starter",
          goals: 0,
          minutesPlayed: 90,
        }),
        player({
          id: "low-2",
          playerProfileId: "bench",
          encounterId: "encounter-2",
          goals: 1,
          minutesPlayed: 20,
        }),
        player({
          id: "starter-2",
          playerProfileId: "starter",
          encounterId: "encounter-2",
          goals: 0,
          minutesPlayed: 90,
        }),
      ],
      teamContributions: [
        team({ encounterId: "encounter-1", minutesPlayed: 990 }),
        team({ encounterId: "encounter-2", minutesPlayed: 990 }),
      ],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(snapshots.find((snapshot) => snapshot.kind === "scorer")?.rows).toEqual([]);
  });

  it("ranks goalkeepers by saves then lower goals against", () => {
    const snapshots = buildCompetitionRankings({
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      playerContributions: [
        ...threeMatches({
          playerProfileId: "gk-more-ga",
          position: "goalkeeper",
          saves: 5,
          teamId: asTeamId("home-team"),
        }),
        ...threeMatches({
          playerProfileId: "gk-less-ga",
          position: "goalkeeper",
          saves: 5,
          teamId: asTeamId("away-team"),
          externalClubId: "club-2",
        }),
      ],
      teamContributions: [
        team({
          encounterId: "encounter-1",
          teamId: asTeamId("home-team"),
          goalsAgainst: 3,
          minutesPlayed: 90,
        }),
        team({
          encounterId: "encounter-2",
          teamId: asTeamId("home-team"),
          goalsAgainst: 3,
          minutesPlayed: 90,
        }),
        team({
          encounterId: "encounter-3",
          teamId: asTeamId("home-team"),
          goalsAgainst: 3,
          minutesPlayed: 90,
        }),
        team({
          encounterId: "encounter-1",
          teamId: asTeamId("away-team"),
          side: "away",
          externalClubId: "club-2",
          goalsAgainst: 1,
          minutesPlayed: 90,
        }),
        team({
          encounterId: "encounter-2",
          teamId: asTeamId("away-team"),
          side: "away",
          externalClubId: "club-2",
          goalsAgainst: 1,
          minutesPlayed: 90,
        }),
        team({
          encounterId: "encounter-3",
          teamId: asTeamId("away-team"),
          side: "away",
          externalClubId: "club-2",
          goalsAgainst: 1,
          minutesPlayed: 90,
        }),
      ],
      updatedAt: new Date("2026-08-13T12:00:00.000Z"),
    });

    expect(
      snapshots
        .find((snapshot) => snapshot.kind === "goalkeeper")
        ?.rows.map((row) => row.playerProfileId),
    ).toEqual(["gk-less-ga", "gk-more-ga"]);
  });
});

function threeMatches(input: {
  readonly playerProfileId: string;
  readonly goals?: number;
  readonly position?: string | null;
  readonly saves?: number;
  readonly teamId?: ReturnType<typeof asTeamId>;
  readonly externalClubId?: string;
}): PlayerMatchContribution[] {
  return [1, 2, 3].map((index) =>
    player({
      id: `${input.playerProfileId}-m${index}`,
      playerProfileId: input.playerProfileId,
      encounterId: `encounter-${index}`,
      goals: input.goals ?? 0,
      position: input.position ?? "midfielder",
      saves: input.saves ?? null,
      teamId: input.teamId,
      externalClubId: input.externalClubId,
      minutesPlayed: 90,
    }),
  );
}

function player(input: {
  readonly id: string;
  readonly playerProfileId: string;
  readonly officialResultId?: string;
  readonly revision?: number;
  readonly encounterId?: string;
  readonly officialSlot?: 1 | 2;
  readonly gameAccountId?: string;
  readonly teamId?: ReturnType<typeof asTeamId>;
  readonly correlationStatus?: PlayerMatchContribution["correlationStatus"];
  readonly externalPlayerId?: string;
  readonly displayName?: string;
  readonly externalClubId?: string;
  readonly platform?: string;
  readonly gameEdition?: string;
  readonly position?: string | null;
  readonly minutesPlayed?: number | null;
  readonly goals?: number | null;
  readonly assists?: number | null;
  readonly shots?: number | null;
  readonly passAttempts?: number | null;
  readonly passesMade?: number | null;
  readonly tackleAttempts?: number | null;
  readonly tacklesMade?: number | null;
  readonly saves?: number | null;
  readonly yellowCards?: number | null;
  readonly redCards?: number | null;
  readonly isMvp?: boolean | null;
  readonly rating?: number | null;
}): PlayerMatchContribution {
  return {
    id: input.id,
    officialResultId: input.officialResultId ?? "result-1",
    revision: input.revision ?? 1,
    encounterId: asEncounterId(input.encounterId ?? "encounter-1"),
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    officialSlot: input.officialSlot ?? 1,
    playerProfileId: input.playerProfileId,
    gameAccountId: input.gameAccountId ?? "account-1",
    teamId: input.teamId ?? asTeamId("home-team"),
    correlationStatus: input.correlationStatus ?? "matched",
    externalPlayerId: input.externalPlayerId ?? input.playerProfileId,
    displayName: input.displayName ?? input.playerProfileId,
    externalClubId: input.externalClubId ?? "club-1",
    platform: input.platform ?? "common-gen5",
    gameEdition: input.gameEdition ?? "fc-26",
    position: input.position === undefined ? "midfielder" : input.position,
    minutesPlayed: input.minutesPlayed === undefined ? 90 : input.minutesPlayed,
    goals: input.goals === undefined ? 0 : input.goals,
    assists: input.assists === undefined ? 0 : input.assists,
    shots: input.shots ?? 0,
    passAttempts: input.passAttempts ?? 0,
    passesMade: input.passesMade ?? 0,
    tackleAttempts: input.tackleAttempts ?? 0,
    tacklesMade: input.tacklesMade ?? 0,
    saves: input.saves === undefined ? 0 : input.saves,
    yellowCards: input.yellowCards ?? 0,
    redCards: input.redCards ?? 0,
    isMvp: input.isMvp === undefined ? false : input.isMvp,
    rating: input.rating === undefined ? 7 : input.rating,
  };
}

function team(input: {
  readonly id?: string;
  readonly officialResultId?: string;
  readonly revision?: number;
  readonly encounterId: string;
  readonly officialSlot?: 1 | 2;
  readonly teamId?: ReturnType<typeof asTeamId>;
  readonly correlationStatus?: TeamMatchContribution["correlationStatus"];
  readonly side?: TeamMatchContribution["side"];
  readonly externalClubId?: string;
  readonly goalsFor?: number;
  readonly goalsAgainst?: number;
  readonly platform?: string;
  readonly gameEdition?: string;
  readonly minutesPlayed?: number | null;
  readonly goals?: number | null;
  readonly assists?: number | null;
  readonly shots?: number | null;
  readonly passAttempts?: number | null;
  readonly passesMade?: number | null;
  readonly tackleAttempts?: number | null;
  readonly tacklesMade?: number | null;
  readonly saves?: number | null;
  readonly yellowCards?: number | null;
  readonly redCards?: number | null;
  readonly isMvp?: boolean | null;
  readonly rating?: number | null;
}): TeamMatchContribution {
  return {
    id: input.id ?? `${input.encounterId}-${input.side ?? "home"}`,
    officialResultId: input.officialResultId ?? "result-1",
    revision: input.revision ?? 1,
    encounterId: asEncounterId(input.encounterId),
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    officialSlot: input.officialSlot ?? 1,
    teamId: input.teamId ?? asTeamId("home-team"),
    correlationStatus: input.correlationStatus ?? "matched",
    side: input.side ?? "home",
    externalClubId: input.externalClubId ?? "club-1",
    goalsFor: input.goalsFor ?? 1,
    goalsAgainst: input.goalsAgainst ?? 0,
    platform: input.platform ?? "common-gen5",
    gameEdition: input.gameEdition ?? "fc-26",
    minutesPlayed: input.minutesPlayed === undefined ? 90 : input.minutesPlayed,
    goals: input.goals ?? null,
    assists: input.assists ?? null,
    shots: input.shots ?? null,
    passAttempts: input.passAttempts ?? null,
    passesMade: input.passesMade ?? null,
    tackleAttempts: input.tackleAttempts ?? null,
    tacklesMade: input.tacklesMade ?? null,
    saves: input.saves ?? null,
    yellowCards: input.yellowCards ?? null,
    redCards: input.redCards ?? null,
    isMvp: input.isMvp ?? null,
    rating: input.rating ?? null,
  };
}
