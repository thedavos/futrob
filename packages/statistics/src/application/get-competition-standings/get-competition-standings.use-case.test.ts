import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type {
  CompetitionStandingSnapshot,
  CompetitionStandingSnapshotRepository,
  RankingKind,
  RankingSnapshot,
  RankingSnapshotRepository,
  TeamCompetitionStats,
  TeamCompetitionStatsRepository,
} from "../../index.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";
import { GetCompetitionStandingsUseCase } from "./get-competition-standings.use-case.ts";
import { GetCompetitionTeamStatisticsUseCase } from "../get-competition-team-statistics/get-competition-team-statistics.use-case.ts";
import { GetCompetitionRankingsUseCase } from "../get-competition-rankings/get-competition-rankings.use-case.ts";

describe("competition statistics read use cases", () => {
  it("denies standings when the actor lacks STATISTICS_PERMISSION.read", async () => {
    const standings = new StandingRepo([
      snapshot({
        rows: [
          {
            position: 1,
            teamId: asTeamId("home-team"),
            played: 1,
            wins: 1,
            draws: 0,
            losses: 0,
            goalsFor: 1,
            goalsAgainst: 0,
            goalDifference: 1,
            points: 3,
            form: ["win"],
          },
        ],
      }),
    ]);
    const useCase = new GetCompetitionStandingsUseCase({
      standings,
      playoffSpots: playoffSpotsReader(null),
      swissStandings: { find: async () => null },
      authorization: denyAll,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).rejects.toBeInstanceOf(StatisticsAuthorizationForbidden);
  });

  it("returns the standing snapshot with its playoff spots when the actor has read", async () => {
    const expected = snapshot({
      rows: [
        {
          position: 1,
          teamId: asTeamId("home-team"),
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          goalsFor: 1,
          goalsAgainst: 0,
          goalDifference: 1,
          points: 3,
          form: ["win"],
        },
      ],
    });
    const reader = playoffSpotsReader(4);
    const useCase = new GetCompetitionStandingsUseCase({
      standings: new StandingRepo([expected]),
      playoffSpots: reader,
      swissStandings: { find: async () => null },
      authorization: allowRead,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toEqual({ ...expected, playoffSpots: 4, swiss: null });
    expect(reader.queries).toEqual([["organization-1", "competition-1"]]);
  });

  it("returns no standings before a snapshot exists", async () => {
    const useCase = new GetCompetitionStandingsUseCase({
      standings: new StandingRepo([]),
      playoffSpots: playoffSpotsReader(4),
      swissStandings: { find: async () => null },
      authorization: allowRead,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toBeNull();
  });

  it("denies team statistics when the actor lacks read", async () => {
    const useCase = new GetCompetitionTeamStatisticsUseCase({
      teamCompetitionStats: new TeamStatsRepo([]),
      authorization: denyAll,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).rejects.toBeInstanceOf(StatisticsAuthorizationForbidden);
  });

  it("returns team competition stats when the actor has read", async () => {
    const stats: TeamCompetitionStats = {
      teamId: asTeamId("home-team"),
      competitionId: asCompetitionId("competition-1"),
      organizationId: asOrganizationId("organization-1"),
      matchesPlayed: 1,
      minutes: 90,
      totals: {
        goals: 1,
        assists: 0,
        shots: 0,
        passAttempts: 0,
        passesMade: 0,
        tackleAttempts: 0,
        tacklesMade: 0,
        saves: 0,
        yellowCards: 0,
        redCards: 0,
        mvpAwards: 0,
        rating: 0,
      },
      averages: {
        goals: 1,
        assists: 0,
        shots: 0,
        passAttempts: 0,
        passesMade: 0,
        tackleAttempts: 0,
        tacklesMade: 0,
        saves: 0,
        yellowCards: 0,
        redCards: 0,
        mvpAwards: 0,
        rating: 0,
      },
      per90: {
        goals: 1,
        assists: 0,
        shots: 0,
        passAttempts: 0,
        passesMade: 0,
        tackleAttempts: 0,
        tacklesMade: 0,
        saves: 0,
        yellowCards: 0,
        redCards: 0,
        mvpAwards: 0,
        rating: 0,
      },
      partial: {
        minutes: false,
        goals: false,
        assists: false,
        shots: false,
        passAttempts: false,
        passesMade: false,
        tackleAttempts: false,
        tacklesMade: false,
        saves: false,
        yellowCards: false,
        redCards: false,
        mvpAwards: false,
        rating: false,
      },
      sourceRevisionMax: 1,
      updatedAt: new Date("2026-08-11T07:00:00.000Z"),
    };
    const useCase = new GetCompetitionTeamStatisticsUseCase({
      teamCompetitionStats: new TeamStatsRepo([stats]),
      authorization: allowRead,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toEqual([stats]);
  });

  it("denies rankings when the actor lacks STATISTICS_PERMISSION.read", async () => {
    const useCase = new GetCompetitionRankingsUseCase({
      rankings: new RankingRepo([]),
      authorization: denyAll,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).rejects.toBeInstanceOf(StatisticsAuthorizationForbidden);
  });

  it("returns ranking snapshots when the actor has read", async () => {
    const expected = rankingSnapshot({
      kind: "scorer",
      rows: [
        {
          position: 1,
          playerProfileId: "profile-1",
          teamId: asTeamId("home-team"),
          value: 7,
          matchesPlayed: 3,
          minutes: 270,
        },
      ],
    });
    const useCase = new GetCompetitionRankingsUseCase({
      rankings: new RankingRepo([expected]),
      authorization: allowRead,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toEqual([expected]);
  });

  it("filters rankings by kind when requested", async () => {
    const scorer = rankingSnapshot({ kind: "scorer", rows: [] });
    const mvp = rankingSnapshot({ kind: "mvp", rows: [] });
    const useCase = new GetCompetitionRankingsUseCase({
      rankings: new RankingRepo([scorer, mvp]),
      authorization: allowRead,
    });

    await expect(
      useCase.execute({
        actorId: asActorId("actor-1"),
        organizationId: asOrganizationId("organization-1"),
        competitionId: asCompetitionId("competition-1"),
        kind: "mvp",
      }),
    ).resolves.toEqual([mvp]);
  });
});

class StandingRepo implements CompetitionStandingSnapshotRepository {
  constructor(private readonly rows: CompetitionStandingSnapshot[]) {}

  async upsert(): Promise<void> {
    throw new Error("not used");
  }

  async findByCompetition(
    competitionId: CompetitionStandingSnapshot["competitionId"],
  ): Promise<CompetitionStandingSnapshot | null> {
    return this.rows.find((row) => row.competitionId === competitionId) ?? null;
  }

  async deleteByCompetition(): Promise<void> {
    throw new Error("not used");
  }
}

class TeamStatsRepo implements TeamCompetitionStatsRepository {
  constructor(private readonly rows: TeamCompetitionStats[]) {}

  async upsert(): Promise<void> {
    throw new Error("not used");
  }

  async findByTeamAndCompetition(): Promise<TeamCompetitionStats | null> {
    throw new Error("not used");
  }

  async listByCompetition(
    competitionId: TeamCompetitionStats["competitionId"],
  ): Promise<TeamCompetitionStats[]> {
    return this.rows.filter((row) => row.competitionId === competitionId);
  }

  async deleteByCompetition(): Promise<void> {
    throw new Error("not used");
  }
}

class RankingRepo implements RankingSnapshotRepository {
  constructor(private readonly rows: RankingSnapshot[]) {}

  async replaceForCompetition(): Promise<void> {
    throw new Error("not used");
  }

  async listByCompetition(
    competitionId: RankingSnapshot["competitionId"],
  ): Promise<RankingSnapshot[]> {
    return this.rows.filter((row) => row.competitionId === competitionId);
  }

  async findByCompetitionAndKind(
    competitionId: RankingSnapshot["competitionId"],
    kind: RankingKind,
  ): Promise<RankingSnapshot | null> {
    return (
      this.rows.find((row) => row.competitionId === competitionId && row.kind === kind) ?? null
    );
  }

  async deleteByCompetition(): Promise<void> {
    throw new Error("not used");
  }
}

describe("competition standings of a Swiss fixture", () => {
  it("applies the Swiss table on read and leaves the stored snapshot alone", async () => {
    const stored = snapshot({
      rows: [
        {
          position: 1,
          teamId: asTeamId("team-1"),
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          goalsFor: 2,
          goalsAgainst: 0,
          goalDifference: 2,
          points: 3,
          form: ["win"],
        },
      ],
    });
    const useCase = new GetCompetitionStandingsUseCase({
      standings: new StandingRepo([stored]),
      playoffSpots: playoffSpotsReader(null),
      swissStandings: {
        find: async () => ({
          seed: [asTeamId("team-1"), asTeamId("team-2")],
          opponentsByTeam: new Map(),
          byesByTeam: new Map([[asTeamId("team-2"), 1]]),
          withdrawnTeamIds: [],
          pointsPerBye: 3,
          roundsTotal: 2,
          roundsCompleted: 1,
          currentRound: 2,
          isFinal: false,
        }),
      },
      authorization: allowAll,
    });

    const applied = await useCase.execute({
      actorId: asActorId("actor"),
      organizationId: stored.organizationId,
      competitionId: stored.competitionId,
    });

    expect(applied?.formulaVersion).toBe("swiss-points-buchholz-gd-gf-v1");
    expect(applied?.swiss?.currentRound).toBe(2);
    expect(
      applied?.rows.map((row) => [row.teamId, row.points, row.played, row.swiss?.buchholz]),
    ).toEqual([
      ["team-2", 3, 0, 3],
      ["team-1", 3, 1, 0],
    ]);
    expect(stored.formulaVersion).toBe("points-gd-gf-v1");
  });
});

function playoffSpotsReader(spots: number | null) {
  const queries: [string, string][] = [];
  return {
    queries,
    async find(organizationId: string, competitionId: string) {
      queries.push([organizationId, competitionId]);
      return spots;
    },
  };
}

const allowAll: AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};

const denyAll: AuthorizationPort = {
  async decide(request) {
    return {
      allowed: false,
      permission: request.permission,
      scope: request.scope,
      reason: "denied",
    };
  },
  async getEffectiveAccess() {
    throw new Error("not used");
  },
};

const allowRead: AuthorizationPort = {
  async decide(request) {
    return {
      allowed: request.permission === STATISTICS_PERMISSION.read,
      permission: request.permission,
      scope: request.scope,
      reason: request.permission === STATISTICS_PERMISSION.read ? "allowed" : "denied",
    };
  },
  async getEffectiveAccess() {
    throw new Error("not used");
  },
};

function snapshot(
  input: Partial<CompetitionStandingSnapshot> & {
    readonly rows: CompetitionStandingSnapshot["rows"];
  },
): CompetitionStandingSnapshot {
  return {
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    formulaVersion: "points-gd-gf-v1",
    rows: input.rows,
    sourceRevisionMax: input.sourceRevisionMax ?? 1,
    updatedAt: input.updatedAt ?? new Date("2026-08-11T07:00:00.000Z"),
  };
}

function rankingSnapshot(
  input: Partial<RankingSnapshot> & {
    readonly kind: RankingKind;
    readonly rows: RankingSnapshot["rows"];
  },
): RankingSnapshot {
  return {
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    kind: input.kind,
    formulaVersion: "player-ranking-v1",
    eligibility: input.eligibility ?? {
      minimumMatches: 3,
      minimumTeamMinutesRatio: 0.6,
    },
    rows: input.rows,
    sourceRevisionMax: input.sourceRevisionMax ?? 1,
    updatedAt: input.updatedAt ?? new Date("2026-08-11T07:00:00.000Z"),
  };
}
