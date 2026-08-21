import type {
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
  PlayerCompetitionStats,
  PlayerCompetitionStatsRepository,
  PlayerMatchContribution,
  PlayerMatchContributionRepository,
  PlayerPersonalStats,
  PlayerPersonalStatsRepository,
} from "@futrob/statistics";
import type { CompetitionId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  rehydrateCompetitionStats,
  rehydrateContribution,
  rehydratePersonalStats,
} from "@/adapters/statistics/player-postgres-rows.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const CONTRIBUTION_COLUMNS = 30;

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
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30})`,
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
        contribution.teamId,
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
         official_slot, player_profile_id, game_account_id, team_id, correlation_status,
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
         team_id = EXCLUDED.team_id,
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

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM player_match_contributions WHERE competition_id = $1`,
      [competitionId],
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

  async listByCompetition(competitionId: CompetitionId): Promise<PlayerMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE competition_id = $1
       ORDER BY encounter_id, revision, official_slot, external_player_id`,
      [competitionId],
    );
    return result.rows.map(rehydrateContribution);
  }

  async listMatched(input: MatchedPlayerContributionQuery): Promise<PlayerMatchContribution[]> {
    const { filters, params } = matchedContributionFilters(input);
    const result = await getPgExecutor(this.pool).query(
      `SELECT *
       FROM player_match_contributions
       WHERE ${filters.join(" AND ")}
       ORDER BY id ASC`,
      params,
    );
    return result.rows.map(rehydrateContribution);
  }

  async listMatchedPage(input: MatchedPlayerContributionPageQuery): Promise<{
    readonly items: PlayerMatchContribution[];
    readonly nextCursor: string | null;
  }> {
    const { filters, params } = matchedContributionFilters(input);
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

function matchedContributionFilters(input: MatchedPlayerContributionQuery) {
  const params: unknown[] = [input.playerProfileId];
  const filters = [`player_profile_id = $1`, `correlation_status = 'matched'`];
  for (const [column, value] of [
    ["competition_id", input.competitionId],
    ["team_id", input.teamId],
    ["game_edition", input.gameEdition],
    ["platform", input.platform],
    ["position", input.position],
  ] as const) {
    if (value === undefined) continue;
    params.push(value);
    filters.push(`${column} = $${params.length}`);
  }
  return { filters, params };
}
