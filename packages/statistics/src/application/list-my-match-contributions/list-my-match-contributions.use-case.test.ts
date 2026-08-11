import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import type {
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "../../index.ts";
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

  async listMatchedPage(input: {
    readonly playerProfileId: string;
    readonly competitionId?: PlayerMatchContribution["competitionId"];
    readonly cursor?: string;
    readonly limit: number;
  }): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const matched = [...this.rows.values()]
      .filter(
        (row) =>
          row.correlationStatus === "matched" &&
          row.playerProfileId === input.playerProfileId &&
          (input.competitionId === undefined || row.competitionId === input.competitionId) &&
          (input.cursor === undefined || row.id > input.cursor),
      )
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
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
    const list = new ListMyMatchContributionsUseCase(contributions);

    const firstPage = await list.execute({
      playerProfileId: "profile-1",
      limit: 2,
    });
    expect(firstPage.items.map((row) => row.id)).toEqual(["c-1", "c-3"]);
    expect(firstPage.nextCursor).toBe("c-3");

    const secondPage = await list.execute({
      playerProfileId: "profile-1",
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
    const list = new ListMyMatchContributionsUseCase(contributions);

    const page = await list.execute({
      playerProfileId: "profile-1",
      competitionId: asCompetitionId("competition-2"),
      limit: 10,
    });
    expect(page.items.map((row) => row.id)).toEqual(["c-2"]);
    expect(page.nextCursor).toBeNull();
  });
});

describe("GetMyPersonalStatisticsUseCase", () => {
  it("returns null when no personal stats exist", async () => {
    const personalStats = new PersonalStatsRepository();
    const get = new GetMyPersonalStatisticsUseCase(personalStats);
    expect(await get.execute({ playerProfileId: "missing" })).toBeNull();
  });

  it("returns personal stats for the player profile", async () => {
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

    const get = new GetMyPersonalStatisticsUseCase(personalStats);
    expect(await get.execute({ playerProfileId: "profile-1" })).toEqual(row);
  });
});

function contribution(input: {
  readonly id: string;
  readonly playerProfileId: string | null;
  readonly competitionId?: string;
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
    correlationStatus: input.correlationStatus,
    externalPlayerId: "player-1",
    displayName: "player-1",
    externalClubId: "club-1",
    platform: "playstation",
    gameEdition: "fc26",
    position: "midfielder",
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
