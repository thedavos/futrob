import type {
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerCorrelationStatus,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
  PlayerStatisticPartialFlags,
  PlayerStatisticRates,
  PlayerStatisticTotals,
} from "@futrob/statistics";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type CompetitionId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const CONTRIBUTION_COLUMNS = 29;

export class PostgresPlayerMatchContributionRepository implements PlayerMatchContributionRepository {
  constructor(private readonly pool: Pool) {}

  async saveMany(contributions: readonly PlayerMatchContribution[]): Promise<void> {
    if (contributions.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let index = 0; index < contributions.length; index += 1) {
      const contribution = contributions[index]!;
      const offset = index * CONTRIBUTION_COLUMNS;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29})`,
      );
      values.push(
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
      );
    }

    await getPgExecutor(this.pool).query(
      `INSERT INTO player_match_contributions (
         id, official_result_id, revision, encounter_id, competition_id, organization_id,
         official_slot, player_profile_id, game_account_id, correlation_status,
         external_player_id, display_name, external_club_id, platform, game_edition,
         position, minutes_played, goals, assists, shots, pass_attempts, passes_made,
         tackle_attempts, tackles_made, saves, yellow_cards, red_cards, is_mvp, rating
       ) VALUES ${placeholders.join(", ")}
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
      values,
    );
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

  async listMatchedPage(input: {
    readonly playerProfileId: string;
    readonly competitionId?: CompetitionId;
    readonly cursor?: string;
    readonly limit: number;
  }): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const params: unknown[] = [input.playerProfileId];
    const filters = [`player_profile_id = $1`, `correlation_status = 'matched'`];

    if (input.competitionId) {
      params.push(input.competitionId);
      filters.push(`competition_id = $${params.length}`);
    }
    if (input.cursor) {
      params.push(input.cursor);
      filters.push(`id > $${params.length}`);
    }
    params.push(input.limit);

    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE ${filters.join(" AND ")}
       ORDER BY id ASC
       LIMIT $${params.length}`,
      params,
    );
    const items = result.rows.map(rehydrateContribution);
    return {
      items,
      nextCursor: items.length === input.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }
}

export class PostgresPlayerCompetitionStatsRepository implements PlayerCompetitionStatsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(stats: PlayerCompetitionStats): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO player_competition_stats (
         player_profile_id, competition_id, organization_id,
         matches_played, minutes, totals, averages, per90, partial,
         source_revision_max, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
       ON CONFLICT (player_profile_id, competition_id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         matches_played = EXCLUDED.matches_played,
         minutes = EXCLUDED.minutes,
         totals = EXCLUDED.totals,
         averages = EXCLUDED.averages,
         per90 = EXCLUDED.per90,
         partial = EXCLUDED.partial,
         source_revision_max = EXCLUDED.source_revision_max,
         updated_at = EXCLUDED.updated_at`,
      [
        stats.playerProfileId,
        stats.competitionId,
        stats.organizationId,
        stats.matchesPlayed,
        stats.minutes,
        JSON.stringify(stats.totals),
        JSON.stringify(stats.averages),
        JSON.stringify(stats.per90),
        JSON.stringify(stats.partial),
        stats.sourceRevisionMax,
        stats.updatedAt.toISOString(),
      ],
    );
  }

  async findByPlayerAndCompetition(
    playerProfileId: string,
    competitionId: CompetitionId,
  ): Promise<PlayerCompetitionStats | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_competition_stats
       WHERE player_profile_id = $1 AND competition_id = $2`,
      [playerProfileId, competitionId],
    );
    const row = result.rows[0];
    return row ? rehydrateCompetitionStats(row) : null;
  }

  async listByPlayer(playerProfileId: string): Promise<PlayerCompetitionStats[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_competition_stats
       WHERE player_profile_id = $1
       ORDER BY competition_id`,
      [playerProfileId],
    );
    return result.rows.map(rehydrateCompetitionStats);
  }
}

export class PostgresPlayerPersonalStatsRepository implements PlayerPersonalStatsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(stats: PlayerPersonalStats): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO player_personal_stats (
         player_profile_id, matches_played, minutes, totals, averages, per90, partial,
         source_revision_max, updated_at
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
       ON CONFLICT (player_profile_id) DO UPDATE SET
         matches_played = EXCLUDED.matches_played,
         minutes = EXCLUDED.minutes,
         totals = EXCLUDED.totals,
         averages = EXCLUDED.averages,
         per90 = EXCLUDED.per90,
         partial = EXCLUDED.partial,
         source_revision_max = EXCLUDED.source_revision_max,
         updated_at = EXCLUDED.updated_at`,
      [
        stats.playerProfileId,
        stats.matchesPlayed,
        stats.minutes,
        JSON.stringify(stats.totals),
        JSON.stringify(stats.averages),
        JSON.stringify(stats.per90),
        JSON.stringify(stats.partial),
        stats.sourceRevisionMax,
        stats.updatedAt.toISOString(),
      ],
    );
  }

  async findByPlayerProfile(playerProfileId: string): Promise<PlayerPersonalStats | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_personal_stats
       WHERE player_profile_id = $1`,
      [playerProfileId],
    );
    const row = result.rows[0];
    return row ? rehydratePersonalStats(row) : null;
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

interface AggregateStatsRow {
  readonly player_profile_id: string;
  readonly matches_played: number | string;
  readonly minutes: number | string;
  readonly totals: PlayerStatisticTotals | string;
  readonly averages: PlayerStatisticRates | string;
  readonly per90: PlayerStatisticRates | string;
  readonly partial: PlayerStatisticPartialFlags | string;
  readonly source_revision_max: number | string;
  readonly updated_at: string | Date;
}

interface CompetitionStatsRow extends AggregateStatsRow {
  readonly competition_id: string;
  readonly organization_id: string;
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

function rehydrateCompetitionStats(row: CompetitionStatsRow): PlayerCompetitionStats {
  return {
    playerProfileId: row.player_profile_id,
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    matchesPlayed: Number(row.matches_played),
    minutes: Number(row.minutes),
    totals: parseJsonRecord(row.totals),
    averages: parseJsonRecord(row.averages),
    per90: parseJsonRecord(row.per90),
    partial: parseJsonRecord(row.partial),
    sourceRevisionMax: Number(row.source_revision_max),
    updatedAt: parseDate(row.updated_at),
  };
}

function rehydratePersonalStats(row: AggregateStatsRow): PlayerPersonalStats {
  return {
    playerProfileId: row.player_profile_id,
    matchesPlayed: Number(row.matches_played),
    minutes: Number(row.minutes),
    totals: parseJsonRecord(row.totals),
    averages: parseJsonRecord(row.averages),
    per90: parseJsonRecord(row.per90),
    partial: parseJsonRecord(row.partial),
    sourceRevisionMax: Number(row.source_revision_max),
    updatedAt: parseDate(row.updated_at),
  };
}

function parseJsonRecord<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
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
