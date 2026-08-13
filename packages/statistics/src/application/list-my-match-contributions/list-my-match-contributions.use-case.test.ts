import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type {
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "../../index.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";
import { GetMyPersonalStatisticsUseCase } from "../get-my-personal-statistics/get-my-personal-statistics.use-case.ts";
import { ListMyMatchContributionsUseCase } from "./list-my-match-contributions.use-case.ts";

class ContributionRepository implements PlayerMatchContributionRepository {
  readonly rows = new Map<string, PlayerMatchContribution>();

  async saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      this.rows.set(contribution.id, contribution);
    }
  }

  async deleteByOfficialResultRevision(): Promise<void> {
    throw new Error("not used");
  }

  async deleteByEncounterRevision(): Promise<void> {
    throw new Error("not used");
  }

  async deleteByCompetition(): Promise<void> {
    throw new Error("not used");
  }

  async listByPlayerProfile(playerProfileId: string): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.playerProfileId === playerProfileId);
  }

  async listByOfficialResult(officialResultId: string): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.officialResultId === officialResultId);
  }

  async listByEncounter(
    encounterId: PlayerMatchContribution["encounterId"],
  ): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.encounterId === encounterId);
  }

  async listByCompetition(
    competitionId: PlayerMatchContribution["competitionId"],
  ): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.competitionId === competitionId);
  }

  async listMatched(input: {
    readonly playerProfileId: string;
    readonly competitionId?: PlayerMatchContribution["competitionId"];
    readonly teamId?: NonNullable<PlayerMatchContribution["teamId"]>;
    readonly gameEdition?: string;
    readonly platform?: string;
    readonly position?: string;
  }): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()]
      .filter((row) => matchesContribution(row, input))
      .sort(compareContributionIds);
  }

  async listMatchedPage(input: {
    readonly playerProfileId: string;
    readonly competitionId?: PlayerMatchContribution["competitionId"];
    readonly teamId?: NonNullable<PlayerMatchContribution["teamId"]>;
    readonly gameEdition?: string;
    readonly platform?: string;
    readonly position?: string;
    readonly cursor?: string;
    readonly limit: number;
  }): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const matched = [...this.rows.values()]
      .filter(
        (row) =>
          matchesContribution(row, input) && (input.cursor === undefined || row.id > input.cursor),
      )
      .sort(compareContributionIds);
    const items = matched.slice(0, input.limit);
    return {
      items,
      nextCursor: items.length === input.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }
}

class PersonalStatsRepository implements PlayerPersonalStatsRepository {
  readonly rows = new Map<string, PlayerPersonalStats>();

  async upsert(stats: PlayerPersonalStats): Promise<void> {
    this.rows.set(stats.playerProfileId, stats);
  }

  async findByPlayerProfile(playerProfileId: string): Promise<PlayerPersonalStats | null> {
    return this.rows.get(playerProfileId) ?? null;
  }
}

class CompetitionStatsRepository implements PlayerCompetitionStatsRepository {
  readonly rows = new Map<string, PlayerCompetitionStats>();
  readonly lookups: Array<{ playerProfileId: string; competitionId: string }> = [];

  async upsert(stats: PlayerCompetitionStats): Promise<void> {
    this.rows.set(`${stats.playerProfileId}:${stats.competitionId}`, stats);
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: PlayerCompetitionStats["competitionId"],
  ): Promise<PlayerCompetitionStats | null> {
    this.lookups.push({ playerProfileId, competitionId });
    return this.rows.get(`${playerProfileId}:${competitionId}`) ?? null;
  }

  async listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]> {
    return [...this.rows.values()].filter((row) => row.playerProfileId === playerProfileId);
  }
}

function authorization(allowed: boolean): AuthorizationPort {
  return {
    async decide(request) {
      return {
        allowed,
        permission: request.permission,
        scope: request.scope,
        reason: allowed ? "allowed" : "denied",
      };
    },
    async getEffectiveAccess() {
      throw new Error("not used");
    },
  };
}

function profiles(entries: Readonly<Record<string, string>>) {
  return {
    async findByActor(actorId: string) {
      const id = entries[actorId];
      return id ? { id } : null;
    },
  };
}

function getStatistics(input: {
  readonly personalStats?: PersonalStatsRepository;
  readonly competitionStats?: CompetitionStatsRepository;
  readonly contributions?: ContributionRepository;
  readonly profileEntries?: Readonly<Record<string, string>>;
  readonly allowed?: boolean;
}) {
  return new GetMyPersonalStatisticsUseCase({
    personalStats: input.personalStats ?? new PersonalStatsRepository(),
    competitionStats: input.competitionStats ?? new CompetitionStatsRepository(),
    contributions: input.contributions ?? new ContributionRepository(),
    profiles: profiles(input.profileEntries ?? { "actor-1": "profile-1" }),
    authorization: authorization(input.allowed ?? true),
    clock: { now: () => new Date("2026-08-13T06:00:00.000Z") },
  });
}

describe("ListMyMatchContributionsUseCase", () => {
  it("returns only matched contributions ordered by id with cursor paging", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({ id: "c-1", playerProfileId: "profile-1", correlationStatus: "matched" }),
      contribution({ id: "c-2", playerProfileId: "profile-1", correlationStatus: "unmatched" }),
      contribution({ id: "c-3", playerProfileId: "profile-1", correlationStatus: "matched" }),
      contribution({ id: "c-4", playerProfileId: "profile-1", correlationStatus: "matched" }),
      contribution({ id: "c-5", playerProfileId: "profile-2", correlationStatus: "matched" }),
    ]);
    const list = new ListMyMatchContributionsUseCase({
      contributions,
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(true),
    });

    const firstPage = await list.execute({
      actorId: asActorId("actor-1"),
      limit: 2,
    });
    expect(firstPage.items.map((row) => row.id)).toEqual(["c-1", "c-3"]);
    expect(firstPage.nextCursor).toBe("c-3");

    const secondPage = await list.execute({
      actorId: asActorId("actor-1"),
      cursor: firstPage.nextCursor ?? undefined,
      limit: 2,
    });
    expect(secondPage.items.map((row) => row.id)).toEqual(["c-4"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("filters matched contributions by competition when provided", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({
        id: "c-1",
        playerProfileId: "profile-1",
        competitionId: "competition-1",
        correlationStatus: "matched",
      }),
      contribution({
        id: "c-2",
        playerProfileId: "profile-1",
        competitionId: "competition-2",
        correlationStatus: "matched",
      }),
    ]);
    const list = new ListMyMatchContributionsUseCase({
      contributions,
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(true),
    });

    const page = await list.execute({
      actorId: asActorId("actor-1"),
      competitionId: asCompetitionId("competition-2"),
      limit: 10,
    });
    expect(page.items.map((row) => row.id)).toEqual(["c-2"]);
    expect(page.nextCursor).toBeNull();
  });

  it("combines team, edition, platform, and position filters with AND semantics", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({
        id: "matching",
        playerProfileId: "profile-1",
        teamId: "team-1",
        gameEdition: "fc26",
        platform: "playstation",
        position: "midfielder",
        correlationStatus: "matched",
      }),
      contribution({
        id: "wrong-position",
        playerProfileId: "profile-1",
        teamId: "team-1",
        gameEdition: "fc26",
        platform: "playstation",
        position: "striker",
        correlationStatus: "matched",
      }),
    ]);
    const list = new ListMyMatchContributionsUseCase({
      contributions,
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(true),
    });

    const page = await list.execute({
      actorId: asActorId("actor-1"),
      teamId: asTeamId("team-1"),
      gameEdition: "fc26",
      platform: "playstation",
      position: "midfielder",
      limit: 20,
    });

    expect(page.items.map((row) => row.id)).toEqual(["matching"]);
  });

  it("derives the profile from actorId and ignores a foreign profile property", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({ id: "own", playerProfileId: "profile-1", correlationStatus: "matched" }),
      contribution({ id: "foreign", playerProfileId: "profile-2", correlationStatus: "matched" }),
    ]);
    const list = new ListMyMatchContributionsUseCase({
      contributions,
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(true),
    });
    const untrustedInput = {
      actorId: asActorId("actor-1"),
      playerProfileId: "profile-2",
      limit: 20,
    };

    const page = await list.execute(untrustedInput);

    expect(page.items.map((row) => row.id)).toEqual(["own"]);
  });

  it("returns an empty page when a team filter has no contributions", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({
        id: "c-1",
        playerProfileId: "profile-1",
        teamId: "team-1",
        correlationStatus: "matched",
      }),
    ]);
    const list = new ListMyMatchContributionsUseCase({
      contributions,
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(true),
    });

    const page = await list.execute({
      actorId: asActorId("actor-1"),
      teamId: asTeamId("team-2"),
      limit: 20,
    });

    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("throws a tagged forbidden error when authorization denies", async () => {
    const list = new ListMyMatchContributionsUseCase({
      contributions: new ContributionRepository(),
      profiles: profiles({ "actor-1": "profile-1" }),
      authorization: authorization(false),
    });

    await expect(list.execute({ actorId: asActorId("actor-1"), limit: 20 })).rejects.toBeInstanceOf(
      StatisticsAuthorizationForbidden,
    );
  });
});

describe("GetMyPersonalStatisticsUseCase", () => {
  it("returns null when no personal stats exist", async () => {
    expect(await getStatistics({}).execute({ actorId: asActorId("actor-1") })).toBeNull();
  });

  it("returns null when the actor has no player profile", async () => {
    expect(
      await getStatistics({ profileEntries: {} }).execute({ actorId: asActorId("actor-1") }),
    ).toBeNull();
  });

  it("derives the statistics profile from actorId and ignores a foreign profile property", async () => {
    const personalStats = new PersonalStatsRepository();
    const row: PlayerPersonalStats = {
      playerProfileId: "profile-1",
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
        rating: 8,
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
        rating: 8,
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
        rating: 8,
      },
      partial: {
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
        minutes: false,
      },
      sourceRevisionMax: 1,
      updatedAt: new Date("2026-08-11T07:00:00.000Z"),
    };
    await personalStats.upsert(row);
    await personalStats.upsert({ ...row, playerProfileId: "profile-2", matchesPlayed: 99 });

    const get = getStatistics({ personalStats });
    const untrustedInput = {
      actorId: asActorId("actor-1"),
      playerProfileId: "profile-2",
    };
    expect(await get.execute(untrustedInput)).toEqual(row);
  });

  it("uses the competition snapshot when competitionId is the only filter", async () => {
    const competitionStats = new CompetitionStatsRepository();
    const row = competitionStatsRow();
    await competitionStats.upsert(row);
    const get = getStatistics({ competitionStats });

    const result = await get.execute({
      actorId: asActorId("actor-1"),
      competitionId: row.competitionId,
    });

    expect(competitionStats.lookups).toEqual([
      { playerProfileId: "profile-1", competitionId: "competition-1" },
    ]);
    expect(result).toEqual({
      playerProfileId: row.playerProfileId,
      matchesPlayed: row.matchesPlayed,
      minutes: row.minutes,
      totals: row.totals,
      averages: row.averages,
      per90: row.per90,
      partial: row.partial,
      sourceRevisionMax: row.sourceRevisionMax,
      updatedAt: row.updatedAt,
    });
  });

  it("aggregates contributions for any non-competition filter combination", async () => {
    const contributions = new ContributionRepository();
    await contributions.saveMany([
      contribution({
        id: "c-1",
        playerProfileId: "profile-1",
        teamId: "team-1",
        correlationStatus: "matched",
      }),
      contribution({
        id: "c-2",
        playerProfileId: "profile-1",
        teamId: "team-2",
        correlationStatus: "matched",
      }),
    ]);
    const get = getStatistics({ contributions });

    const result = await get.execute({
      actorId: asActorId("actor-1"),
      teamId: asTeamId("team-1"),
    });

    expect(result).toEqual(
      expect.objectContaining({
        playerProfileId: "profile-1",
        matchesPlayed: 1,
        totals: expect.objectContaining({ goals: 1 }),
        updatedAt: new Date("2026-08-13T06:00:00.000Z"),
      }),
    );
  });

  it("throws a tagged forbidden error when authorization denies", async () => {
    await expect(
      getStatistics({ allowed: false }).execute({ actorId: asActorId("actor-1") }),
    ).rejects.toBeInstanceOf(StatisticsAuthorizationForbidden);
  });
});

function contribution(input: {
  readonly id: string;
  readonly playerProfileId: string | null;
  readonly competitionId?: string;
  readonly teamId?: string;
  readonly gameEdition?: string;
  readonly platform?: string;
  readonly position?: string | null;
  readonly correlationStatus: PlayerMatchContribution["correlationStatus"];
}): PlayerMatchContribution {
  return {
    id: input.id,
    officialResultId: "result-1",
    revision: 1,
    encounterId: asEncounterId("encounter-1"),
    competitionId: asCompetitionId(input.competitionId ?? "competition-1"),
    organizationId: asOrganizationId("organization-1"),
    officialSlot: 1,
    playerProfileId: input.playerProfileId,
    gameAccountId: input.correlationStatus === "matched" ? "account-1" : null,
    teamId: input.teamId ? asTeamId(input.teamId) : null,
    correlationStatus: input.correlationStatus,
    externalPlayerId: "player-1",
    displayName: "player-1",
    externalClubId: "club-1",
    platform: input.platform ?? "playstation",
    gameEdition: input.gameEdition ?? "fc26",
    position: input.position === undefined ? "midfielder" : input.position,
    minutesPlayed: 90,
    goals: 1,
    assists: 0,
    shots: 2,
    passAttempts: 20,
    passesMade: 15,
    tackleAttempts: 4,
    tacklesMade: 2,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 8,
  };
}

function competitionStatsRow(): PlayerCompetitionStats {
  return {
    playerProfileId: "profile-1",
    competitionId: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("organization-1"),
    ...aggregatePlayerContributions([
      contribution({
        id: "competition-snapshot-source",
        playerProfileId: "profile-1",
        correlationStatus: "matched",
      }),
    ]),
    updatedAt: new Date("2026-08-12T06:00:00.000Z"),
  };
}

function matchesContribution(
  row: PlayerMatchContribution,
  input: {
    readonly playerProfileId: string;
    readonly competitionId?: PlayerMatchContribution["competitionId"];
    readonly teamId?: NonNullable<PlayerMatchContribution["teamId"]>;
    readonly gameEdition?: string;
    readonly platform?: string;
    readonly position?: string;
  },
): boolean {
  return (
    row.correlationStatus === "matched" &&
    row.playerProfileId === input.playerProfileId &&
    (input.competitionId === undefined || row.competitionId === input.competitionId) &&
    (input.teamId === undefined || row.teamId === input.teamId) &&
    (input.gameEdition === undefined || row.gameEdition === input.gameEdition) &&
    (input.platform === undefined || row.platform === input.platform) &&
    (input.position === undefined || row.position === input.position)
  );
}

function compareContributionIds(
  left: PlayerMatchContribution,
  right: PlayerMatchContribution,
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
