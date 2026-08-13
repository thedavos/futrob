import type {
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
  CompetitionStandingSnapshot,
  CompetitionStandingSnapshotRepository,
  RankingKind,
  RankingSnapshot,
  RankingSnapshotRepository,
  TeamCompetitionStats,
  TeamCompetitionStatsRepository,
  TeamMatchContribution,
  TeamMatchContributionRepository,
} from "@futrob/statistics";
import type { CompetitionId, EncounterId, TeamId } from "@futrob/shared-kernel";

export class InMemoryPlayerMatchContributionRepository implements PlayerMatchContributionRepository {
  private readonly rows = new Map<string, PlayerMatchContribution>();

  async saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      this.rows.set(contributionKey(contribution), contribution);
    }
  }

  async deleteByOfficialResultRevision(input: {
    readonly officialResultId: string;
    readonly revision: number | "all";
  }): Promise<void> {
    for (const [key, contribution] of this.rows) {
      if (
        contribution.officialResultId === input.officialResultId &&
        (input.revision === "all" || contribution.revision === input.revision)
      ) {
        this.rows.delete(key);
      }
    }
  }

  async deleteByEncounterRevision(input: {
    readonly encounterId: EncounterId;
    readonly revision: number | "all";
  }): Promise<void> {
    for (const [key, contribution] of this.rows) {
      if (
        contribution.encounterId === input.encounterId &&
        (input.revision === "all" || contribution.revision === input.revision)
      ) {
        this.rows.delete(key);
      }
    }
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    for (const [key, contribution] of this.rows) {
      if (contribution.competitionId === competitionId) this.rows.delete(key);
    }
  }

  async listByPlayerProfile(playerProfileId: string): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.playerProfileId === playerProfileId,
    );
  }

  async listByOfficialResult(officialResultId: string): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.officialResultId === officialResultId,
    );
  }

  async listByEncounter(encounterId: EncounterId): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.encounterId === encounterId,
    );
  }

  async listByCompetition(competitionId: CompetitionId): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.competitionId === competitionId,
    );
  }

  async listMatched(input: MatchedPlayerContributionQuery): Promise<PlayerMatchContribution[]> {
    return [...this.rows.values()].filter((contribution) =>
      matchesContribution(contribution, input),
    );
  }

  async listMatchedPage(input: MatchedPlayerContributionPageQuery): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const items = (await this.listMatched(input))
      .filter((contribution) => input.cursor === undefined || contribution.id > input.cursor)
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, input.limit);

    return {
      items,
      nextCursor: items.length === input.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }
}

export class InMemoryPlayerCompetitionStatsRepository implements PlayerCompetitionStatsRepository {
  private readonly rows = new Map<string, PlayerCompetitionStats>();

  async upsert(stats: PlayerCompetitionStats): Promise<void> {
    this.rows.set(competitionStatsKey(stats.playerProfileId, stats.competitionId), stats);
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<PlayerCompetitionStats | null> {
    return this.rows.get(competitionStatsKey(playerProfileId, competitionId)) ?? null;
  }

  async listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]> {
    return [...this.rows.values()].filter((stats) => stats.playerProfileId === playerProfileId);
  }
}

export class InMemoryPlayerPersonalStatsRepository implements PlayerPersonalStatsRepository {
  private readonly rows = new Map<string, PlayerPersonalStats>();

  async upsert(stats: PlayerPersonalStats): Promise<void> {
    this.rows.set(stats.playerProfileId, stats);
  }

  async findByPlayerProfile(playerProfileId: string): Promise<PlayerPersonalStats | null> {
    return this.rows.get(playerProfileId) ?? null;
  }
}

export class InMemoryTeamMatchContributionRepository implements TeamMatchContributionRepository {
  private readonly rows = new Map<string, TeamMatchContribution>();

  async saveMany(contributions: readonly TeamMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      this.rows.set(contribution.id, contribution);
    }
  }

  async deleteByEncounterRevision(input: {
    readonly encounterId: EncounterId;
    readonly revision: number | "all";
  }): Promise<void> {
    for (const [key, contribution] of this.rows) {
      if (
        contribution.encounterId === input.encounterId &&
        (input.revision === "all" || contribution.revision === input.revision)
      ) {
        this.rows.delete(key);
      }
    }
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    for (const [key, contribution] of this.rows) {
      if (contribution.competitionId === competitionId) this.rows.delete(key);
    }
  }

  async listByTeam(teamId: TeamId): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter((contribution) => contribution.teamId === teamId);
  }

  async listByEncounter(encounterId: EncounterId): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.encounterId === encounterId,
    );
  }

  async listByCompetition(competitionId: CompetitionId): Promise<TeamMatchContribution[]> {
    return [...this.rows.values()].filter(
      (contribution) => contribution.competitionId === competitionId,
    );
  }
}

export class InMemoryTeamCompetitionStatsRepository implements TeamCompetitionStatsRepository {
  private readonly rows = new Map<string, TeamCompetitionStats>();

  async upsert(stats: TeamCompetitionStats): Promise<void> {
    this.rows.set(`${stats.teamId}:${stats.competitionId}`, stats);
  }

  async findByTeamAndCompetition(
    teamId: TeamId,
    competitionId: CompetitionId,
  ): Promise<TeamCompetitionStats | null> {
    return this.rows.get(`${teamId}:${competitionId}`) ?? null;
  }

  async listByCompetition(competitionId: CompetitionId): Promise<TeamCompetitionStats[]> {
    return [...this.rows.values()].filter((stats) => stats.competitionId === competitionId);
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    for (const [key, stats] of this.rows) {
      if (stats.competitionId === competitionId) this.rows.delete(key);
    }
  }
}

export class InMemoryCompetitionStandingSnapshotRepository implements CompetitionStandingSnapshotRepository {
  private readonly rows = new Map<string, CompetitionStandingSnapshot>();

  async upsert(snapshot: CompetitionStandingSnapshot): Promise<void> {
    this.rows.set(snapshot.competitionId, snapshot);
  }

  async findByCompetition(
    competitionId: CompetitionId,
  ): Promise<CompetitionStandingSnapshot | null> {
    return this.rows.get(competitionId) ?? null;
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    this.rows.delete(competitionId);
  }
}

export class InMemoryRankingSnapshotRepository implements RankingSnapshotRepository {
  private readonly rows = new Map<string, RankingSnapshot>();

  async replaceForCompetition(
    competitionId: CompetitionId,
    snapshots: readonly RankingSnapshot[],
  ): Promise<void> {
    await this.deleteByCompetition(competitionId);
    for (const snapshot of snapshots) {
      this.rows.set(rankingKey(snapshot.competitionId, snapshot.kind), snapshot);
    }
  }

  async listByCompetition(competitionId: CompetitionId): Promise<RankingSnapshot[]> {
    return [...this.rows.values()]
      .filter((snapshot) => snapshot.competitionId === competitionId)
      .sort((left, right) => rankingKindOrder(left.kind) - rankingKindOrder(right.kind));
  }

  async findByCompetitionAndKind(
    competitionId: CompetitionId,
    kind: RankingKind,
  ): Promise<RankingSnapshot | null> {
    return this.rows.get(rankingKey(competitionId, kind)) ?? null;
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    for (const [key, snapshot] of this.rows) {
      if (snapshot.competitionId === competitionId) this.rows.delete(key);
    }
  }
}

function contributionKey(contribution: PlayerMatchContribution): string {
  return [
    contribution.officialResultId,
    contribution.revision,
    contribution.officialSlot,
    contribution.externalPlayerId,
  ].join(":");
}

function competitionStatsKey(playerProfileId: string, competitionId: CompetitionId): string {
  return `${playerProfileId}:${competitionId}`;
}

function rankingKey(competitionId: CompetitionId, kind: RankingKind): string {
  return `${competitionId}:${kind}`;
}

function rankingKindOrder(kind: RankingKind): number {
  switch (kind) {
    case "scorer":
      return 0;
    case "assister":
      return 1;
    case "rating":
      return 2;
    case "mvp":
      return 3;
    case "goalkeeper":
      return 4;
    default:
      return assertNeverRankingKind(kind);
  }
}

function assertNeverRankingKind(kind: never): never {
  throw new RangeError(`Unsupported ranking kind: ${String(kind)}`);
}

function matchesContribution(
  contribution: PlayerMatchContribution,
  input: MatchedPlayerContributionQuery,
): boolean {
  return (
    contribution.playerProfileId === input.playerProfileId &&
    contribution.correlationStatus === "matched" &&
    (input.competitionId === undefined || contribution.competitionId === input.competitionId) &&
    (input.teamId === undefined || contribution.teamId === input.teamId) &&
    (input.gameEdition === undefined || contribution.gameEdition === input.gameEdition) &&
    (input.platform === undefined || contribution.platform === input.platform) &&
    (input.position === undefined || contribution.position === input.position)
  );
}
