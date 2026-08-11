import type {
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "@futrob/statistics";
import type { CompetitionId, EncounterId } from "@futrob/shared-kernel";

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

  async listMatchedPage(input: {
    readonly playerProfileId: string;
    readonly competitionId?: CompetitionId;
    readonly cursor?: string;
    readonly limit: number;
  }): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const items = [...this.rows.values()]
      .filter(
        (contribution) =>
          contribution.playerProfileId === input.playerProfileId &&
          contribution.correlationStatus === "matched" &&
          (input.competitionId === undefined ||
            contribution.competitionId === input.competitionId) &&
          (input.cursor === undefined || contribution.id > input.cursor),
      )
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
