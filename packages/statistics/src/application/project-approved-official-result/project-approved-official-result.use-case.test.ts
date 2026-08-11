import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import type {
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerIdentityResolution,
  PlayerIdentityResolverPort,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "../../index.ts";
import { ProjectApprovedOfficialResultUseCase } from "./project-approved-official-result.use-case.ts";

class ContributionRepository implements PlayerMatchContributionRepository {
  readonly rows = new Map<string, PlayerMatchContribution>();

  async saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      this.rows.set(
        [
          contribution.officialResultId,
          contribution.revision,
          contribution.officialSlot,
          contribution.externalPlayerId,
        ].join(":"),
        contribution,
      );
    }
  }

  async deleteByOfficialResultRevision(input: {
    readonly officialResultId: string;
    readonly revision: number | "all";
  }): Promise<void> {
    this.deleteMatching(
      (row) =>
        row.officialResultId === input.officialResultId &&
        (input.revision === "all" || row.revision === input.revision),
    );
  }

  async deleteByEncounterRevision(input: {
    readonly encounterId: PlayerMatchContribution["encounterId"];
    readonly revision: number | "all";
  }): Promise<void> {
    this.deleteMatching(
      (row) =>
        row.encounterId === input.encounterId &&
        (input.revision === "all" || row.revision === input.revision),
    );
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

  private deleteMatching(predicate: (row: PlayerMatchContribution) => boolean): void {
    for (const [key, row] of this.rows) {
      if (predicate(row)) this.rows.delete(key);
    }
  }
}

class CompetitionStatsRepository implements PlayerCompetitionStatsRepository {
  readonly rows = new Map<string, PlayerCompetitionStats>();

  async upsert(stats: PlayerCompetitionStats): Promise<void> {
    this.rows.set(`${stats.playerProfileId}:${stats.competitionId}`, stats);
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: PlayerCompetitionStats["competitionId"],
  ): Promise<PlayerCompetitionStats | null> {
    return this.rows.get(`${playerProfileId}:${competitionId}`) ?? null;
  }

  async listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]> {
    return [...this.rows.values()].filter((row) => row.playerProfileId === playerProfileId);
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

function makeHarness(input: {
  readonly results: readonly OfficialResult[];
  readonly resolutions: Readonly<Record<string, PlayerIdentityResolution>>;
}) {
  const byId = new Map(input.results.map((result) => [result.id, result]));
  const officialResults: OfficialResultReaderPort = {
    async getApprovedByEncounter(encounterId) {
      return (
        [...byId.values()]
          .filter((result) => result.encounterId === encounterId && result.status === "approved")
          .sort((left, right) => right.revision - left.revision)[0] ?? null
      );
    },
    async getById(officialResultId) {
      return byId.get(officialResultId) ?? null;
    },
  };
  const identities: PlayerIdentityResolverPort = {
    async resolve(correlation) {
      return input.resolutions[correlation.externalPlayerId] ?? { status: "unmatched" };
    },
  };
  const contributions = new ContributionRepository();
  const competitionStats = new CompetitionStatsRepository();
  const personalStats = new PersonalStatsRepository();
  const project = new ProjectApprovedOfficialResultUseCase({
    officialResults,
    identities,
    contributions,
    competitionStats,
    personalStats,
    transaction: { runInTransaction: async (operation) => operation() },
    clock: { now: () => new Date("2026-08-11T07:00:00.000Z") },
  });
  return { byId, project, contributions, competitionStats, personalStats };
}

describe("ProjectApprovedOfficialResultUseCase", () => {
  it("keeps matched, unmatched, and ambiguous correlations while preserving zero and null", async () => {
    const result = officialResult({
      players: [
        player({ externalPlayerId: "matched", goals: 0, assists: null, isMvp: false }),
        player({ externalPlayerId: "unmatched" }),
        player({ externalPlayerId: "ambiguous" }),
      ],
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
        ambiguous: { status: "ambiguous" },
      },
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    const contributions = await harness.contributions.listByOfficialResult(result.id);
    expect(contributions).toHaveLength(3);
    expect(contributions.find((row) => row.externalPlayerId === "matched")).toMatchObject({
      playerProfileId: "profile-1",
      gameAccountId: "account-1",
      correlationStatus: "matched",
      goals: 0,
      assists: null,
      isMvp: false,
    });
    expect(contributions.find((row) => row.externalPlayerId === "unmatched")).toMatchObject({
      playerProfileId: null,
      gameAccountId: null,
      correlationStatus: "unmatched",
    });
    expect(contributions.find((row) => row.externalPlayerId === "ambiguous")).toMatchObject({
      playerProfileId: null,
      gameAccountId: null,
      correlationStatus: "ambiguous",
    });
    const aggregate = await harness.competitionStats.findByPlayerAndCompetition(
      "profile-1",
      result.competitionId,
    );
    expect(aggregate?.totals.goals).toBe(0);
    expect(aggregate?.partial.goals).toBe(false);
    expect(aggregate?.partial.assists).toBe(true);
  });

  it("does not duplicate contributions when projecting the same revision twice", async () => {
    const result = officialResult({ players: [player({ externalPlayerId: "matched" })] });
    const harness = makeHarness({
      results: [result],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);
    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    expect(await harness.contributions.listByOfficialResult(result.id)).toHaveLength(1);
    expect(
      await harness.competitionStats.findByPlayerAndCompetition("profile-1", result.competitionId),
    ).toMatchObject({ matchesPlayed: 1 });
  });

  it("replaces a prior official-result revision and rebuilds aggregates", async () => {
    const revisionOne = officialResult({
      id: "result-r1",
      revision: 1,
      players: [player({ externalPlayerId: "matched", goals: 1 })],
    });
    const revisionTwo = officialResult({
      id: "result-r2",
      revision: 2,
      players: [player({ externalPlayerId: "matched", goals: 3 })],
    });
    const harness = makeHarness({
      results: [revisionOne],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
    });

    expect((await harness.project.execute({ officialResultId: revisionOne.id })).isOk()).toBe(true);
    harness.byId.set(revisionTwo.id, revisionTwo);
    expect((await harness.project.execute({ encounterId: revisionTwo.encounterId })).isOk()).toBe(
      true,
    );

    expect(await harness.contributions.listByOfficialResult(revisionOne.id)).toHaveLength(0);
    expect(await harness.contributions.listByOfficialResult(revisionTwo.id)).toMatchObject([
      { revision: 2, goals: 3 },
    ]);
    expect(
      await harness.competitionStats.findByPlayerAndCompetition(
        "profile-1",
        revisionTwo.competitionId,
      ),
    ).toMatchObject({
      matchesPlayed: 1,
      minutes: 90,
      sourceRevisionMax: 2,
      totals: { goals: 3 },
      averages: { goals: 3 },
      per90: { goals: 3 },
    });
  });

  it("rolls personal stats across competitions without an organization membership", async () => {
    const first = officialResult({
      id: "result-1",
      encounterId: "encounter-1",
      competitionId: "competition-1",
      players: [player({ externalPlayerId: "matched", goals: 1, minutesPlayed: 90 })],
    });
    const second = officialResult({
      id: "result-2",
      encounterId: "encounter-2",
      competitionId: "competition-2",
      players: [player({ externalPlayerId: "matched", goals: 2, minutesPlayed: 45 })],
    });
    const harness = makeHarness({
      results: [first, second],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-without-org",
          gameAccountId: "account-1",
        },
      },
    });

    expect((await harness.project.execute({ officialResultId: first.id })).isOk()).toBe(true);
    expect((await harness.project.execute({ officialResultId: second.id })).isOk()).toBe(true);

    expect(await harness.personalStats.findByPlayerProfile("profile-without-org")).toMatchObject({
      matchesPlayed: 2,
      minutes: 135,
      totals: { goals: 3 },
      averages: { goals: 1.5 },
      per90: { goals: 2 },
    });
  });
});

function officialResult(
  input: {
    readonly id?: string;
    readonly encounterId?: string;
    readonly competitionId?: string;
    readonly revision?: number;
    readonly players?: OfficialResult["slots"][number]["players"];
  } = {},
): OfficialResult {
  return {
    id: input.id ?? "result-1",
    encounterId: asEncounterId(input.encounterId ?? "encounter-1"),
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId(input.competitionId ?? "competition-1"),
    revision: input.revision ?? 1,
    status: "approved",
    slots: [
      {
        officialSlot: 1,
        providerMatchRef: { providerKey: "ea-clubs", externalId: "provider-match-1" },
        homeExternalClubId: "club-1",
        awayExternalClubId: "club-2",
        homeGoals: 1,
        awayGoals: 0,
        occurredAt: new Date("2026-08-10T19:00:00.000Z"),
        gameEdition: "fc26",
        platform: "playstation",
        players: input.players ?? [],
      },
    ],
    approvedAt: new Date("2026-08-10T20:00:00.000Z"),
    approvedBy: asActorId("actor-1"),
  };
}

function player(
  input: Partial<OfficialResult["slots"][number]["players"][number]> & {
    readonly externalPlayerId: string;
  },
): OfficialResult["slots"][number]["players"][number] {
  return {
    externalPlayerId: input.externalPlayerId,
    displayName: input.displayName ?? input.externalPlayerId,
    externalClubId: input.externalClubId ?? "club-1",
    position: input.position ?? "midfielder",
    minutesPlayed: input.minutesPlayed === undefined ? 90 : input.minutesPlayed,
    goals: input.goals === undefined ? 1 : input.goals,
    assists: input.assists === undefined ? 0 : input.assists,
    shots: input.shots === undefined ? 2 : input.shots,
    passAttempts: input.passAttempts === undefined ? 20 : input.passAttempts,
    passesMade: input.passesMade === undefined ? 15 : input.passesMade,
    tackleAttempts: input.tackleAttempts === undefined ? 4 : input.tackleAttempts,
    tacklesMade: input.tacklesMade === undefined ? 2 : input.tacklesMade,
    saves: input.saves === undefined ? 0 : input.saves,
    yellowCards: input.yellowCards === undefined ? 0 : input.yellowCards,
    redCards: input.redCards === undefined ? 0 : input.redCards,
    isMvp: input.isMvp === undefined ? false : input.isMvp,
    rating: input.rating === undefined ? 8 : input.rating,
  };
}
