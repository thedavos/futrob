import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import type {
  EncounterScheduleSnapshot,
  OfficialResult,
  OfficialResultReaderPort,
} from "@futrob/results";
import type {
  CompetitionMatchPointsRules,
  CompetitionMatchRulesReaderPort,
  CompetitionStandingSnapshot,
  CompetitionStandingSnapshotRepository,
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerIdentityResolution,
  PlayerIdentityResolverPort,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
  TeamCompetitionStats,
  TeamCompetitionStatsRepository,
  TeamMatchContribution,
  TeamMatchContributionRepository,
} from "../../index.ts";
import type {
  RankingKind,
  RankingSnapshot,
  RankingSnapshotRepository as RankingSnapshotRepositoryPort,
} from "../../index.ts";
import { ProjectOfficialResultUseCase } from "./project-official-result.use-case.ts";
import { RebuildCompetitionRankingsUseCase } from "../rebuild-competition-rankings/rebuild-competition-rankings.use-case.ts";
import { RebuildCompetitionStatisticsUseCase } from "../rebuild-competition-statistics/rebuild-competition-statistics.use-case.ts";

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

  async deleteByCompetition(
    competitionId: PlayerMatchContribution["competitionId"],
  ): Promise<void> {
    this.deleteMatching((row) => row.competitionId === competitionId);
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

  async listMatched(input: MatchedPlayerContributionQuery): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.correlationStatus === "matched" &&
        row.playerProfileId === input.playerProfileId &&
        (input.competitionId === undefined || row.competitionId === input.competitionId) &&
        (input.teamId === undefined || row.teamId === input.teamId) &&
        (input.gameEdition === undefined || row.gameEdition === input.gameEdition) &&
        (input.platform === undefined || row.platform === input.platform) &&
        (input.position === undefined || row.position === input.position),
    );
  }

  async listMatchedPage(input: MatchedPlayerContributionPageQuery): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const matched = (await this.listMatched(input))
      .filter((row) => input.cursor === undefined || row.id > input.cursor)
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

class TeamContributionRepository implements TeamMatchContributionRepository {
  readonly rows = new Map<string, TeamMatchContribution>();

  async saveMany(contributions: readonly TeamMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      this.rows.set(contribution.id, contribution);
    }
  }

  async deleteByEncounterRevision(input: {
    readonly encounterId: TeamMatchContribution["encounterId"];
    readonly revision: number | "all";
  }): Promise<void> {
    for (const [key, row] of this.rows) {
      if (
        row.encounterId === input.encounterId &&
        (input.revision === "all" || row.revision === input.revision)
      ) {
        this.rows.delete(key);
      }
    }
  }

  async deleteByCompetition(competitionId: TeamMatchContribution["competitionId"]): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.competitionId === competitionId) this.rows.delete(key);
    }
  }

  async listByTeam(
    teamId: NonNullable<TeamMatchContribution["teamId"]>,
  ): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.teamId === teamId);
  }

  async listByEncounter(
    encounterId: TeamMatchContribution["encounterId"],
  ): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.encounterId === encounterId);
  }

  async listByCompetition(
    competitionId: TeamMatchContribution["competitionId"],
  ): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter((row) => row.competitionId === competitionId);
  }
}

class TeamCompetitionStatsRepo implements TeamCompetitionStatsRepository {
  readonly rows = new Map<string, TeamCompetitionStats>();

  async upsert(stats: TeamCompetitionStats): Promise<void> {
    this.rows.set(`${stats.teamId}:${stats.competitionId}`, stats);
  }

  async findByTeamAndCompetition(
    teamId: TeamCompetitionStats["teamId"],
    competitionId: TeamCompetitionStats["competitionId"],
  ): Promise<TeamCompetitionStats | null> {
    return this.rows.get(`${teamId}:${competitionId}`) ?? null;
  }

  async listByCompetition(
    competitionId: TeamCompetitionStats["competitionId"],
  ): Promise<TeamCompetitionStats[]> {
    return [...this.rows.values()].filter((row) => row.competitionId === competitionId);
  }

  async deleteByCompetition(competitionId: TeamCompetitionStats["competitionId"]): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.competitionId === competitionId) this.rows.delete(key);
    }
  }
}

class StandingSnapshotRepository implements CompetitionStandingSnapshotRepository {
  readonly rows = new Map<string, CompetitionStandingSnapshot>();

  async upsert(snapshot: CompetitionStandingSnapshot): Promise<void> {
    this.rows.set(snapshot.competitionId, snapshot);
  }

  async findByCompetition(
    competitionId: CompetitionStandingSnapshot["competitionId"],
  ): Promise<CompetitionStandingSnapshot | null> {
    return this.rows.get(competitionId) ?? null;
  }

  async deleteByCompetition(
    competitionId: CompetitionStandingSnapshot["competitionId"],
  ): Promise<void> {
    this.rows.delete(competitionId);
  }
}

class RankingSnapshotRepository implements RankingSnapshotRepositoryPort {
  readonly rows = new Map<string, RankingSnapshot>();

  async replaceForCompetition(
    competitionId: RankingSnapshot["competitionId"],
    snapshots: readonly RankingSnapshot[],
  ): Promise<void> {
    await this.deleteByCompetition(competitionId);
    for (const snapshot of snapshots) {
      this.rows.set(`${snapshot.competitionId}:${snapshot.kind}`, snapshot);
    }
  }

  async listByCompetition(
    competitionId: RankingSnapshot["competitionId"],
  ): Promise<RankingSnapshot[]> {
    return [...this.rows.values()].filter((row) => row.competitionId === competitionId);
  }

  async findByCompetitionAndKind(
    competitionId: RankingSnapshot["competitionId"],
    kind: RankingKind,
  ): Promise<RankingSnapshot | null> {
    return this.rows.get(`${competitionId}:${kind}`) ?? null;
  }

  async deleteByCompetition(competitionId: RankingSnapshot["competitionId"]): Promise<void> {
    for (const [key, row] of this.rows) {
      if (row.competitionId === competitionId) this.rows.delete(key);
    }
  }
}

function makeHarness(input: {
  readonly results: readonly OfficialResult[];
  readonly resolutions: Readonly<Record<string, PlayerIdentityResolution>>;
  readonly encounter?: EncounterScheduleSnapshot;
  readonly pointsRules?: CompetitionMatchPointsRules | null;
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
    async listByCompetition(competitionId) {
      return [...byId.values()].filter((result) => result.competitionId === competitionId);
    },
  };
  const identityInputs: Parameters<PlayerIdentityResolverPort["resolve"]>[0][] = [];
  const identities: PlayerIdentityResolverPort = {
    async resolve(correlation) {
      identityInputs.push(correlation);
      return input.resolutions[correlation.externalPlayerId] ?? { status: "unmatched" };
    },
  };
  const contributions = new ContributionRepository();
  const competitionStats = new CompetitionStatsRepository();
  const personalStats = new PersonalStatsRepository();
  const teamContributions = new TeamContributionRepository();
  const teamCompetitionStats = new TeamCompetitionStatsRepo();
  const standings = new StandingSnapshotRepository();
  const matchRules: CompetitionMatchRulesReaderPort = {
    async getPointsRules() {
      return input.pointsRules === undefined
        ? { winPoints: 3, drawPoints: 1, lossPoints: 0 }
        : input.pointsRules;
    },
  };
  const project = new ProjectOfficialResultUseCase({
    officialResults,
    identities,
    contributions,
    competitionStats,
    personalStats,
    teamContributions,
    teamCompetitionStats,
    standings,
    matchRules,
    transaction: { runInTransaction: async (operation) => operation() },
    clock: { now: () => new Date("2026-08-11T07:00:00.000Z") },
    encounterReader: input.encounter
      ? {
          getById: async () => input.encounter ?? null,
        }
      : undefined,
  });
  return {
    byId,
    officialResults,
    project,
    contributions,
    competitionStats,
    personalStats,
    teamContributions,
    teamCompetitionStats,
    standings,
    identityInputs,
  };
}

describe("ProjectOfficialResultUseCase", () => {
  it("maps the player's external club to a team for identity resolution and persistence", async () => {
    const result = officialResult({
      players: [player({ externalPlayerId: "matched", externalClubId: "club-1" })],
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
      encounter: {
        encounterId: result.encounterId,
        organizationId: result.organizationId,
        competitionId: result.competitionId,
        homeTeamId: asTeamId("home-team"),
        awayTeamId: asTeamId("away-team"),
        scheduledStartAt: new Date("2026-08-10T19:00:00.000Z"),
        officialMatchCount: 1,
        homeExternalClubId: "club-1",
        awayExternalClubId: "club-2",
        providerKey: "ea-clubs",
      },
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    expect(harness.identityInputs).toEqual([
      expect.objectContaining({
        organizationId: result.organizationId,
        competitionId: result.competitionId,
        teamId: asTeamId("home-team"),
      }),
    ]);
    expect(await harness.contributions.listByOfficialResult(result.id)).toEqual([
      expect.objectContaining({ teamId: asTeamId("home-team") }),
    ]);
  });

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

  it("clears a voided encounter and zeros aggregates for previously matched players", async () => {
    const approved = officialResult({
      players: [player({ externalPlayerId: "matched", goals: 2 })],
    });
    const harness = makeHarness({
      results: [approved],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
    });
    expect((await harness.project.execute({ officialResultId: approved.id })).isOk()).toBe(true);

    harness.byId.set(approved.id, { ...approved, status: "voided" });
    const voided = await harness.project.execute({ officialResultId: approved.id });

    expect(voided.isOk() && voided.value.contributionsProjected).toBe(0);
    expect(await harness.contributions.listByEncounter(approved.encounterId)).toEqual([]);
    expect(
      await harness.competitionStats.findByPlayerAndCompetition(
        "profile-1",
        approved.competitionId,
      ),
    ).toMatchObject({ matchesPlayed: 0, minutes: 0, sourceRevisionMax: 0 });
    expect(await harness.personalStats.findByPlayerProfile("profile-1")).toMatchObject({
      matchesPlayed: 0,
      minutes: 0,
      sourceRevisionMax: 0,
    });
  });

  it("leaves newer projected contributions untouched when the result is stale", async () => {
    const stale = officialResult({
      id: "result-r1",
      revision: 1,
      players: [player({ externalPlayerId: "matched", goals: 1 })],
    });
    const newer = officialResult({
      id: "result-r2",
      revision: 2,
      players: [player({ externalPlayerId: "matched", goals: 3 })],
    });
    const harness = makeHarness({
      results: [newer],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
    });
    expect((await harness.project.execute({ officialResultId: newer.id })).isOk()).toBe(true);
    harness.byId.set(stale.id, stale);

    const projected = await harness.project.execute({ officialResultId: stale.id });

    expect(projected.isOk() && projected.value.contributionsProjected).toBe(0);
    expect(await harness.contributions.listByEncounter(stale.encounterId)).toMatchObject([
      { officialResultId: newer.id, revision: 2, goals: 3 },
    ]);
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

  it("rebuilds a competition from the latest approved results and skips voided encounters", async () => {
    const retained = officialResult({
      id: "result-retained",
      encounterId: "encounter-retained",
      players: [player({ externalPlayerId: "matched", goals: 3 })],
    });
    const removed = officialResult({
      id: "result-removed",
      encounterId: "encounter-removed",
      players: [player({ externalPlayerId: "matched", goals: 5 })],
    });
    const harness = makeHarness({
      results: [retained, removed],
      resolutions: {
        matched: {
          status: "matched",
          playerProfileId: "profile-1",
          gameAccountId: "account-1",
        },
      },
    });
    await harness.project.execute({ officialResultId: retained.id });
    await harness.project.execute({ officialResultId: removed.id });
    harness.byId.set(removed.id, { ...removed, status: "voided" });
    const events: string[] = [];
    const eventPublisher = {
      async publish(event: { readonly eventName: string }) {
        events.push(event.eventName);
      },
      async publishMany(batch: readonly { readonly eventName: string }[]) {
        events.push(...batch.map((event) => event.eventName));
      },
    };
    const rankings = new RankingSnapshotRepository();
    const rebuildRankings = new RebuildCompetitionRankingsUseCase({
      contributions: harness.contributions,
      teamContributions: harness.teamContributions,
      rankings,
      eventPublisher,
      transaction: { runInTransaction: async (operation) => operation() },
      clock: { now: () => new Date("2026-08-12T12:00:00.000Z") },
    });
    const rebuild = new RebuildCompetitionStatisticsUseCase({
      officialResults: harness.officialResults,
      projectOfficialResult: harness.project,
      contributions: harness.contributions,
      competitionStats: harness.competitionStats,
      personalStats: harness.personalStats,
      teamContributions: harness.teamContributions,
      teamCompetitionStats: harness.teamCompetitionStats,
      standings: harness.standings,
      matchRules: {
        async getPointsRules() {
          return { winPoints: 3, drawPoints: 1, lossPoints: 0 };
        },
      },
      rebuildRankings,
      transaction: { runInTransaction: async (operation) => operation() },
      clock: { now: () => new Date("2026-08-12T12:00:00.000Z") },
      eventPublisher,
    });

    const rebuilt = await rebuild.execute({ competitionId: retained.competitionId });

    expect(rebuilt.isOk()).toBe(true);
    expect(await harness.contributions.listByCompetition(retained.competitionId)).toMatchObject([
      { officialResultId: retained.id, goals: 3 },
    ]);
    expect(
      await harness.competitionStats.findByPlayerAndCompetition(
        "profile-1",
        retained.competitionId,
      ),
    ).toMatchObject({ matchesPlayed: 1, totals: { goals: 3 } });
    expect(events).toEqual(["statistics.competition-stats-rebuilt", "statistics.rankings-updated"]);
    expect(await rankings.listByCompetition(retained.competitionId)).toHaveLength(5);
  });

  it("projects matched team contributions and competition aggregates for both sides", async () => {
    const result = officialResult({
      players: [
        player({
          externalPlayerId: "home-1",
          externalClubId: "club-1",
          goals: 1,
          minutesPlayed: 90,
        }),
        player({
          externalPlayerId: "away-1",
          externalClubId: "club-2",
          goals: 0,
          minutesPlayed: 90,
        }),
      ],
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {},
      encounter: defaultEncounter(result),
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    const teams = await harness.teamContributions.listByEncounter(result.encounterId);
    expect(teams).toHaveLength(2);
    expect(teams.find((row) => row.side === "home")).toMatchObject({
      teamId: asTeamId("home-team"),
      correlationStatus: "matched",
      goalsFor: 1,
      goalsAgainst: 0,
      goals: 1,
      minutesPlayed: 90,
    });
    expect(teams.find((row) => row.side === "away")).toMatchObject({
      teamId: asTeamId("away-team"),
      correlationStatus: "matched",
      goalsFor: 0,
      goalsAgainst: 1,
      goals: 0,
    });
    expect(
      await harness.teamCompetitionStats.findByTeamAndCompetition(
        asTeamId("home-team"),
        result.competitionId,
      ),
    ).toMatchObject({
      matchesPlayed: 1,
      totals: { goals: 1 },
      minutes: 90,
    });
    expect(
      await harness.teamCompetitionStats.findByTeamAndCompetition(
        asTeamId("away-team"),
        result.competitionId,
      ),
    ).toMatchObject({
      matchesPlayed: 1,
      totals: { goals: 0 },
    });
  });

  it("marks team sides unmatched when no encounter snapshot is available", async () => {
    const result = officialResult({
      players: [player({ externalPlayerId: "ghost", externalClubId: "club-1" })],
      homeExternalClubId: "club-1",
      awayExternalClubId: "club-2",
      homeGoals: 2,
      awayGoals: 1,
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {},
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    const teams = await harness.teamContributions.listByEncounter(result.encounterId);
    expect(teams).toEqual([
      expect.objectContaining({
        side: "home",
        externalClubId: "club-1",
        teamId: null,
        correlationStatus: "unmatched",
        goalsFor: 2,
        goalsAgainst: 1,
      }),
      expect.objectContaining({
        side: "away",
        externalClubId: "club-2",
        teamId: null,
        correlationStatus: "unmatched",
      }),
    ]);
    expect(await harness.teamCompetitionStats.listByCompetition(result.competitionId)).toEqual([]);
  });

  it("maps slot sides to encounter teams even when live connection club ids differ", async () => {
    const result = officialResult({
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1" }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2" }),
      ],
      homeGoals: 1,
      awayGoals: 0,
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {},
      encounter: {
        ...defaultEncounter(result),
        homeExternalClubId: "stale-connection-home",
        awayExternalClubId: "stale-connection-away",
      },
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    const teams = await harness.teamContributions.listByEncounter(result.encounterId);
    expect(teams.find((row) => row.side === "home")).toMatchObject({
      teamId: asTeamId("home-team"),
      correlationStatus: "matched",
      externalClubId: "club-1",
    });
    expect(teams.find((row) => row.side === "away")).toMatchObject({
      teamId: asTeamId("away-team"),
      correlationStatus: "matched",
      externalClubId: "club-2",
    });
  });

  it("clears team contributions and zeros team aggregates when the result is voided", async () => {
    const approved = officialResult({
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1", goals: 2 }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2", goals: 0 }),
      ],
    });
    const harness = makeHarness({
      results: [approved],
      resolutions: {},
      encounter: defaultEncounter(approved),
    });
    expect((await harness.project.execute({ officialResultId: approved.id })).isOk()).toBe(true);

    harness.byId.set(approved.id, { ...approved, status: "voided" });
    expect((await harness.project.execute({ officialResultId: approved.id })).isOk()).toBe(true);

    expect(await harness.teamContributions.listByEncounter(approved.encounterId)).toEqual([]);
    expect(
      await harness.teamCompetitionStats.findByTeamAndCompetition(
        asTeamId("home-team"),
        approved.competitionId,
      ),
    ).toMatchObject({ matchesPlayed: 0, minutes: 0, sourceRevisionMax: 0 });
    expect(
      await harness.teamCompetitionStats.findByTeamAndCompetition(
        asTeamId("away-team"),
        approved.competitionId,
      ),
    ).toMatchObject({ matchesPlayed: 0, minutes: 0, sourceRevisionMax: 0 });
  });

  it("builds standings from a 1-0 result with points and positions", async () => {
    const result = officialResult({
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1" }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2" }),
      ],
      homeGoals: 1,
      awayGoals: 0,
    });
    const harness = makeHarness({
      results: [result],
      resolutions: {},
      encounter: defaultEncounter(result),
    });

    expect((await harness.project.execute({ officialResultId: result.id })).isOk()).toBe(true);

    expect(await harness.standings.findByCompetition(result.competitionId)).toMatchObject({
      formulaVersion: "points-gd-gf-v1",
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
        },
        {
          position: 2,
          teamId: asTeamId("away-team"),
          played: 1,
          wins: 0,
          draws: 0,
          losses: 1,
          goalsFor: 0,
          goalsAgainst: 1,
          goalDifference: -1,
          points: 0,
        },
      ],
    });
  });

  it("breaks standings ties by goal difference then goals for", async () => {
    const first = officialResult({
      id: "result-1",
      encounterId: "encounter-1",
      homeGoals: 2,
      awayGoals: 0,
      players: [
        player({ externalPlayerId: "a", externalClubId: "club-1" }),
        player({ externalPlayerId: "b", externalClubId: "club-2" }),
      ],
    });
    const second = officialResult({
      id: "result-2",
      encounterId: "encounter-2",
      homeGoals: 3,
      awayGoals: 1,
      homeExternalClubId: "club-3",
      awayExternalClubId: "club-4",
      players: [
        player({ externalPlayerId: "c", externalClubId: "club-3" }),
        player({ externalPlayerId: "d", externalClubId: "club-4" }),
      ],
    });
    const harness = makeHarness({
      results: [first],
      resolutions: {},
      encounter: defaultEncounter(first),
    });
    expect((await harness.project.execute({ officialResultId: first.id })).isOk()).toBe(true);

    harness.byId.set(second.id, second);
    const projectSecond = new ProjectOfficialResultUseCase({
      officialResults: harness.officialResults,
      identities: {
        async resolve() {
          return { status: "unmatched" };
        },
      },
      contributions: harness.contributions,
      competitionStats: harness.competitionStats,
      personalStats: harness.personalStats,
      teamContributions: harness.teamContributions,
      teamCompetitionStats: harness.teamCompetitionStats,
      standings: harness.standings,
      matchRules: {
        async getPointsRules() {
          return { winPoints: 3, drawPoints: 1, lossPoints: 0 };
        },
      },
      transaction: { runInTransaction: async (operation) => operation() },
      clock: { now: () => new Date("2026-08-11T07:00:00.000Z") },
      encounterReader: {
        getById: async (encounterId) =>
          encounterId === second.encounterId
            ? {
                encounterId: second.encounterId,
                organizationId: second.organizationId,
                competitionId: second.competitionId,
                homeTeamId: asTeamId("team-c"),
                awayTeamId: asTeamId("team-d"),
                scheduledStartAt: new Date("2026-08-10T19:00:00.000Z"),
                officialMatchCount: 1,
                homeExternalClubId: "club-3",
                awayExternalClubId: "club-4",
                providerKey: "ea-clubs",
              }
            : defaultEncounter(first),
      },
    });
    expect((await projectSecond.execute({ officialResultId: second.id })).isOk()).toBe(true);

    const snapshot = await harness.standings.findByCompetition(first.competitionId);
    expect(snapshot?.rows.map((row) => row.teamId)).toEqual([
      asTeamId("team-c"),
      asTeamId("home-team"),
      asTeamId("team-d"),
      asTeamId("away-team"),
    ]);
    expect(snapshot?.rows[0]).toMatchObject({
      points: 3,
      goalDifference: 2,
      goalsFor: 3,
    });
    expect(snapshot?.rows[1]).toMatchObject({
      points: 3,
      goalDifference: 2,
      goalsFor: 2,
    });
  });

  it("reverts standings when the only result is voided", async () => {
    const approved = officialResult({
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1" }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2" }),
      ],
    });
    const harness = makeHarness({
      results: [approved],
      resolutions: {},
      encounter: defaultEncounter(approved),
    });
    expect((await harness.project.execute({ officialResultId: approved.id })).isOk()).toBe(true);

    harness.byId.set(approved.id, { ...approved, status: "voided" });
    expect((await harness.project.execute({ officialResultId: approved.id })).isOk()).toBe(true);

    expect(await harness.standings.findByCompetition(approved.competitionId)).toMatchObject({
      rows: [],
      sourceRevisionMax: 0,
    });
  });

  it("replaces standings on equal revision and skips only when projected revision is newer", async () => {
    const revisionOne = officialResult({
      id: "result-r1",
      revision: 1,
      homeGoals: 1,
      awayGoals: 0,
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1" }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2" }),
      ],
    });
    const revisionTwo = officialResult({
      id: "result-r2",
      revision: 2,
      homeGoals: 2,
      awayGoals: 2,
      players: [
        player({ externalPlayerId: "home-1", externalClubId: "club-1" }),
        player({ externalPlayerId: "away-1", externalClubId: "club-2" }),
      ],
    });
    const harness = makeHarness({
      results: [revisionOne],
      resolutions: {},
      encounter: defaultEncounter(revisionOne),
    });
    expect((await harness.project.execute({ officialResultId: revisionOne.id })).isOk()).toBe(true);
    expect((await harness.project.execute({ officialResultId: revisionOne.id })).isOk()).toBe(true);
    expect(await harness.teamContributions.listByEncounter(revisionOne.encounterId)).toHaveLength(
      2,
    );

    harness.byId.set(revisionTwo.id, revisionTwo);
    expect((await harness.project.execute({ encounterId: revisionTwo.encounterId })).isOk()).toBe(
      true,
    );
    expect(await harness.standings.findByCompetition(revisionTwo.competitionId)).toMatchObject({
      rows: [
        expect.objectContaining({ teamId: asTeamId("away-team"), points: 1, draws: 1 }),
        expect.objectContaining({ teamId: asTeamId("home-team"), points: 1, draws: 1 }),
      ],
    });

    harness.byId.set(revisionOne.id, revisionOne);
    const stale = await harness.project.execute({ officialResultId: revisionOne.id });
    expect(stale.isOk() && stale.value.contributionsProjected).toBe(0);
    expect(await harness.standings.findByCompetition(revisionOne.competitionId)).toMatchObject({
      rows: [
        expect.objectContaining({ draws: 1, points: 1 }),
        expect.objectContaining({ draws: 1, points: 1 }),
      ],
    });
  });
});

function defaultEncounter(result: OfficialResult): EncounterScheduleSnapshot {
  return {
    encounterId: result.encounterId,
    organizationId: result.organizationId,
    competitionId: result.competitionId,
    homeTeamId: asTeamId("home-team"),
    awayTeamId: asTeamId("away-team"),
    scheduledStartAt: new Date("2026-08-10T19:00:00.000Z"),
    officialMatchCount: 1,
    homeExternalClubId: "club-1",
    awayExternalClubId: "club-2",
    providerKey: "ea-clubs",
  };
}

function officialResult(
  input: {
    readonly id?: string;
    readonly encounterId?: string;
    readonly competitionId?: string;
    readonly revision?: number;
    readonly players?: OfficialResult["slots"][number]["players"];
    readonly homeGoals?: number;
    readonly awayGoals?: number;
    readonly homeExternalClubId?: string;
    readonly awayExternalClubId?: string;
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
        homeExternalClubId: input.homeExternalClubId ?? "club-1",
        awayExternalClubId: input.awayExternalClubId ?? "club-2",
        homeGoals: input.homeGoals ?? 1,
        awayGoals: input.awayGoals ?? 0,
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
