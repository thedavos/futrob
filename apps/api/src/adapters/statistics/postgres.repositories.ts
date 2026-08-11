import type {
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerCorrelationStatus,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "@futrob/statistics";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type CompetitionId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresPlayerMatchContributionRepository implements PlayerMatchContributionRepository {
  constructor(private readonly pool: Pool) {}

  async saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void> {
    for (const contribution of contributions) {
      await getPgExecutor(this.pool).query(
        `INSERT INTO player_match_contributions (
           id, official_result_id, revision, encounter_id, competition_id, organization_id,
           official_slot, player_profile_id, game_account_id, correlation_status,
           external_player_id, display_name, external_club_id, platform, game_edition,
           position, minutes_played, goals, assists, shots, pass_attempts, passes_made,
           tackle_attempts, tackles_made, saves, yellow_cards, red_cards, is_mvp, rating
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27, $28, $29
         )
         ON CONFLICT (official_result_id, revision, official_slot, external_player_id)
         DO UPDATE SET
           id = EXCLUDED.id,
           encounter_id = EXCLUDED.encounter_id,
           competition_id = EXCLUDED.competition_id,
           organization_id = EXCLUDED.organization_id,
           player_profile_id = EXCLUDED.player_profile_id,
           game_account_id = EXCLUDED.game_account_id,
           correlation_status = EXCLUDED.correlation_status,
           display_name = EXCLUDED.display_name,
           external_club_id = EXCLUDED.external_club_id,
           platform = EXCLUDED.platform,
           game_edition = EXCLUDED.game_edition,
           position = EXCLUDED.position,
           minutes_played = EXCLUDED.minutes_played,
           goals = EXCLUDED.goals,
           assists = EXCLUDED.assists,
           shots = EXCLUDED.shots,
           pass_attempts = EXCLUDED.pass_attempts,
           passes_made = EXCLUDED.passes_made,
           tackle_attempts = EXCLUDED.tackle_attempts,
           tackles_made = EXCLUDED.tackles_made,
           saves = EXCLUDED.saves,
           yellow_cards = EXCLUDED.yellow_cards,
           red_cards = EXCLUDED.red_cards,
           is_mvp = EXCLUDED.is_mvp,
           rating = EXCLUDED.rating`,
        [
          contribution.id,
          contribution.officialResultId,
          contribution.revision,
          contribution.encounterId,
          contribution.competitionId,
          contribution.organizationId,
          contribution.officialSlot,
          contribution.playerProfileId,
          contribution.gameAccountId,
          contribution.correlationStatus,
          contribution.externalPlayerId,
          contribution.displayName,
          contribution.externalClubId,
          contribution.platform,
          contribution.gameEdition,
          contribution.position,
          contribution.minutesPlayed,
          contribution.goals,
          contribution.assists,
          contribution.shots,
          contribution.passAttempts,
          contribution.passesMade,
          contribution.tackleAttempts,
          contribution.tacklesMade,
          contribution.saves,
          contribution.yellowCards,
          contribution.redCards,
          contribution.isMvp,
          contribution.rating,
        ],
      );
    }
  }

  async deleteByOfficialResultRevision(input: {
    readonly officialResultId: string;
    readonly revision: number | "all";
  }): Promise<void> {
    if (input.revision === "all") {
      await getPgExecutor(this.pool).query(
        `DELETE FROM player_match_contributions WHERE official_result_id = $1`,
        [input.officialResultId],
      );
      return;
    }
    await getPgExecutor(this.pool).query(
      `DELETE FROM player_match_contributions
       WHERE official_result_id = $1 AND revision = $2`,
      [input.officialResultId, input.revision],
    );
  }

  async deleteByEncounterRevision(input: {
    readonly encounterId: PlayerMatchContribution["encounterId"];
    readonly revision: number | "all";
  }): Promise<void> {
    if (input.revision === "all") {
      await getPgExecutor(this.pool).query(
        `DELETE FROM player_match_contributions WHERE encounter_id = $1`,
        [input.encounterId],
      );
      return;
    }
    await getPgExecutor(this.pool).query(
      `DELETE FROM player_match_contributions
       WHERE encounter_id = $1 AND revision = $2`,
      [input.encounterId, input.revision],
    );
  }

  async listByPlayerProfile(playerProfileId: string): Promise<PlayerMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE player_profile_id = $1
       ORDER BY competition_id, encounter_id, official_slot`,
      [playerProfileId],
    );
    return result.rows.map(rehydrateContribution);
  }

  async listByOfficialResult(officialResultId: string): Promise<PlayerMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE official_result_id = $1
       ORDER BY official_slot, external_player_id`,
      [officialResultId],
    );
    return result.rows.map(rehydrateContribution);
  }

  async listByEncounter(
    encounterId: PlayerMatchContribution["encounterId"],
  ): Promise<PlayerMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE encounter_id = $1
       ORDER BY revision, official_slot, external_player_id`,
      [encounterId],
    );
    return result.rows.map(rehydrateContribution);
  }
}

export class PostgresPlayerCompetitionStatsRepository implements PlayerCompetitionStatsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(stats: PlayerCompetitionStats): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO player_competition_stats (
         player_profile_id, competition_id, organization_id, payload, updated_at
       ) VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (player_profile_id, competition_id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         payload = EXCLUDED.payload,
         updated_at = EXCLUDED.updated_at`,
      [
        stats.playerProfileId,
        stats.competitionId,
        stats.organizationId,
        JSON.stringify(stats),
        stats.updatedAt.toISOString(),
      ],
    );
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<PlayerCompetitionStats | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT payload
       FROM player_competition_stats
       WHERE player_profile_id = $1 AND competition_id = $2`,
      [playerProfileId, competitionId],
    );
    const row = result.rows[0];
    return row ? rehydrateCompetitionStats(row.payload) : null;
  }

  async listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT payload
       FROM player_competition_stats
       WHERE player_profile_id = $1
       ORDER BY competition_id`,
      [playerProfileId],
    );
    return result.rows.map((row) => rehydrateCompetitionStats(row.payload));
  }
}

export class PostgresPlayerPersonalStatsRepository implements PlayerPersonalStatsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(stats: PlayerPersonalStats): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO player_personal_stats (player_profile_id, payload, updated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (player_profile_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         updated_at = EXCLUDED.updated_at`,
      [stats.playerProfileId, JSON.stringify(stats), stats.updatedAt.toISOString()],
    );
  }

  async findByPlayerProfile(playerProfileId: string): Promise<PlayerPersonalStats | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT payload
       FROM player_personal_stats
       WHERE player_profile_id = $1`,
      [playerProfileId],
    );
    const row = result.rows[0];
    return row ? rehydratePersonalStats(row.payload) : null;
  }
}

interface ContributionRow {
  readonly id: string;
  readonly official_result_id: string;
  readonly revision: number | string;
  readonly encounter_id: string;
  readonly competition_id: string;
  readonly organization_id: string;
  readonly official_slot: number | string;
  readonly player_profile_id: string | null;
  readonly game_account_id: string | null;
  readonly correlation_status: string;
  readonly external_player_id: string;
  readonly display_name: string;
  readonly external_club_id: string;
  readonly platform: string;
  readonly game_edition: string;
  readonly position: string | null;
  readonly minutes_played: number | string | null;
  readonly goals: number | string | null;
  readonly assists: number | string | null;
  readonly shots: number | string | null;
  readonly pass_attempts: number | string | null;
  readonly passes_made: number | string | null;
  readonly tackle_attempts: number | string | null;
  readonly tackles_made: number | string | null;
  readonly saves: number | string | null;
  readonly yellow_cards: number | string | null;
  readonly red_cards: number | string | null;
  readonly is_mvp: boolean | null;
  readonly rating: number | string | null;
}

function rehydrateContribution(row: ContributionRow): PlayerMatchContribution {
  return {
    id: row.id,
    officialResultId: row.official_result_id,
    revision: Number(row.revision),
    encounterId: asEncounterId(row.encounter_id),
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    officialSlot: parseOfficialSlot(row.official_slot),
    playerProfileId: row.player_profile_id,
    gameAccountId: row.game_account_id,
    correlationStatus: parseCorrelationStatus(row.correlation_status),
    externalPlayerId: row.external_player_id,
    displayName: row.display_name,
    externalClubId: row.external_club_id,
    platform: row.platform,
    gameEdition: row.game_edition,
    position: row.position,
    minutesPlayed: nullableNumber(row.minutes_played),
    goals: nullableNumber(row.goals),
    assists: nullableNumber(row.assists),
    shots: nullableNumber(row.shots),
    passAttempts: nullableNumber(row.pass_attempts),
    passesMade: nullableNumber(row.passes_made),
    tackleAttempts: nullableNumber(row.tackle_attempts),
    tacklesMade: nullableNumber(row.tackles_made),
    saves: nullableNumber(row.saves),
    yellowCards: nullableNumber(row.yellow_cards),
    redCards: nullableNumber(row.red_cards),
    isMvp: row.is_mvp,
    rating: nullableNumber(row.rating),
  };
}

type StoredCompetitionStats = Omit<PlayerCompetitionStats, "updatedAt"> & {
  readonly updatedAt: string | Date;
};

function rehydrateCompetitionStats(payload: StoredCompetitionStats): PlayerCompetitionStats {
  return { ...payload, updatedAt: parseDate(payload.updatedAt) };
}

type StoredPersonalStats = Omit<PlayerPersonalStats, "updatedAt"> & {
  readonly updatedAt: string | Date;
};

function rehydratePersonalStats(payload: StoredPersonalStats): PlayerPersonalStats {
  return { ...payload, updatedAt: parseDate(payload.updatedAt) };
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function parseDate(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function parseOfficialSlot(value: number | string): 1 | 2 {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2) return numeric;
  throw new RangeError(`Invalid official slot: ${value}`);
}

function parseCorrelationStatus(value: string): PlayerCorrelationStatus {
  if (value === "matched" || value === "unmatched" || value === "ambiguous") return value;
  throw new RangeError(`Invalid player correlation status: ${value}`);
}
