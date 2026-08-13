import type {
  CompetitionStandingRow,
  CompetitionStandingSnapshot,
  CompetitionStandingSnapshotRepository,
  MatchedPlayerContributionPageQuery,
  MatchedPlayerContributionQuery,
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
  TeamCompetitionStats,
  TeamCompetitionStatsRepository,
  TeamCorrelationStatus,
  TeamMatchContribution,
  TeamMatchContributionRepository,
  TeamMatchSide,
} from "@futrob/statistics";
import { COMPETITION_STANDING_FORMULA_VERSION } from "@futrob/statistics";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const CONTRIBUTION_COLUMNS = 30;
const TEAM_CONTRIBUTION_COLUMNS = 28;

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

function matchedContributionFilters(input: MatchedPlayerContributionQuery): {
  readonly filters: string[];
  readonly params: unknown[];
} {
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
  readonly team_id: string | null;
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
    teamId: row.team_id === null ? null : asTeamId(row.team_id),
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

export class PostgresTeamMatchContributionRepository implements TeamMatchContributionRepository {
  constructor(private readonly pool: Pool) {}

  async saveMany(contributions: readonly TeamMatchContribution[]): Promise<void> {
    if (contributions.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let index = 0; index < contributions.length; index += 1) {
      const contribution = contributions[index]!;
      const offset = index * TEAM_CONTRIBUTION_COLUMNS;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28})`,
      );
      values.push(
        contribution.id,
        contribution.officialResultId,
        contribution.revision,
        contribution.encounterId,
        contribution.competitionId,
        contribution.organizationId,
        contribution.officialSlot,
        contribution.teamId,
        contribution.correlationStatus,
        contribution.side,
        contribution.externalClubId,
        contribution.goalsFor,
        contribution.goalsAgainst,
        contribution.platform,
        contribution.gameEdition,
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
      `INSERT INTO team_match_contributions (
         id, official_result_id, revision, encounter_id, competition_id, organization_id,
         official_slot, team_id, correlation_status, side, external_club_id, goals_for,
         goals_against, platform, game_edition, minutes_played, goals, assists, shots,
         pass_attempts, passes_made, tackle_attempts, tackles_made, saves, yellow_cards,
         red_cards, is_mvp, rating
       ) VALUES ${placeholders.join(", ")}
       ON CONFLICT (official_result_id, revision, official_slot, side)
       DO UPDATE SET
         id = EXCLUDED.id,
         encounter_id = EXCLUDED.encounter_id,
         competition_id = EXCLUDED.competition_id,
         organization_id = EXCLUDED.organization_id,
         team_id = EXCLUDED.team_id,
         correlation_status = EXCLUDED.correlation_status,
         external_club_id = EXCLUDED.external_club_id,
         goals_for = EXCLUDED.goals_for,
         goals_against = EXCLUDED.goals_against,
         platform = EXCLUDED.platform,
         game_edition = EXCLUDED.game_edition,
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

  async deleteByEncounterRevision(input: {
    readonly encounterId: EncounterId;
    readonly revision: number | "all";
  }): Promise<void> {
    if (input.revision === "all") {
      await getPgExecutor(this.pool).query(
        `DELETE FROM team_match_contributions WHERE encounter_id = $1`,
        [input.encounterId],
      );
      return;
    }
    await getPgExecutor(this.pool).query(
      `DELETE FROM team_match_contributions WHERE encounter_id = $1 AND revision = $2`,
      [input.encounterId, input.revision],
    );
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM team_match_contributions WHERE competition_id = $1`,
      [competitionId],
    );
  }

  async listByTeam(teamId: TeamId): Promise<TeamMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query<TeamContributionRow>(
      `SELECT * FROM team_match_contributions WHERE team_id = $1`,
      [teamId],
    );
    return result.rows.map(rehydrateTeamContribution);
  }

  async listByEncounter(encounterId: EncounterId): Promise<TeamMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query<TeamContributionRow>(
      `SELECT * FROM team_match_contributions WHERE encounter_id = $1`,
      [encounterId],
    );
    return result.rows.map(rehydrateTeamContribution);
  }

  async listByCompetition(competitionId: CompetitionId): Promise<TeamMatchContribution[]> {
    const result = await getPgExecutor(this.pool).query<TeamContributionRow>(
      `SELECT * FROM team_match_contributions WHERE competition_id = $1`,
      [competitionId],
    );
    return result.rows.map(rehydrateTeamContribution);
  }
}

export class PostgresTeamCompetitionStatsRepository implements TeamCompetitionStatsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(stats: TeamCompetitionStats): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO team_competition_stats (
         team_id, competition_id, organization_id, matches_played, minutes, totals,
         averages, per90, partial, source_revision_max, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
       ON CONFLICT (team_id, competition_id) DO UPDATE SET
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
        stats.teamId,
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

  async findByTeamAndCompetition(
    teamId: TeamId,
    competitionId: CompetitionId,
  ): Promise<TeamCompetitionStats | null> {
    const result = await getPgExecutor(this.pool).query<TeamCompetitionStatsRow>(
      `SELECT * FROM team_competition_stats WHERE team_id = $1 AND competition_id = $2`,
      [teamId, competitionId],
    );
    const row = result.rows[0];
    return row ? rehydrateTeamCompetitionStats(row) : null;
  }

  async listByCompetition(competitionId: CompetitionId): Promise<TeamCompetitionStats[]> {
    const result = await getPgExecutor(this.pool).query<TeamCompetitionStatsRow>(
      `SELECT * FROM team_competition_stats WHERE competition_id = $1`,
      [competitionId],
    );
    return result.rows.map(rehydrateTeamCompetitionStats);
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM team_competition_stats WHERE competition_id = $1`,
      [competitionId],
    );
  }
}

export class PostgresCompetitionStandingSnapshotRepository implements CompetitionStandingSnapshotRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(snapshot: CompetitionStandingSnapshot): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO competition_standing_snapshots (
         competition_id, organization_id, formula_version, rows, source_revision_max, updated_at
       ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (competition_id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         formula_version = EXCLUDED.formula_version,
         rows = EXCLUDED.rows,
         source_revision_max = EXCLUDED.source_revision_max,
         updated_at = EXCLUDED.updated_at`,
      [
        snapshot.competitionId,
        snapshot.organizationId,
        snapshot.formulaVersion,
        JSON.stringify(snapshot.rows),
        snapshot.sourceRevisionMax,
        snapshot.updatedAt.toISOString(),
      ],
    );
  }

  async findByCompetition(
    competitionId: CompetitionId,
  ): Promise<CompetitionStandingSnapshot | null> {
    const result = await getPgExecutor(this.pool).query<StandingSnapshotRow>(
      `SELECT * FROM competition_standing_snapshots WHERE competition_id = $1`,
      [competitionId],
    );
    const row = result.rows[0];
    return row ? rehydrateStandingSnapshot(row) : null;
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM competition_standing_snapshots WHERE competition_id = $1`,
      [competitionId],
    );
  }
}

interface TeamContributionRow {
  readonly id: string;
  readonly official_result_id: string;
  readonly revision: number | string;
  readonly encounter_id: string;
  readonly competition_id: string;
  readonly organization_id: string;
  readonly official_slot: number | string;
  readonly team_id: string | null;
  readonly correlation_status: string;
  readonly side: string;
  readonly external_club_id: string;
  readonly goals_for: number | string;
  readonly goals_against: number | string;
  readonly platform: string;
  readonly game_edition: string;
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

interface TeamCompetitionStatsRow {
  readonly team_id: string;
  readonly competition_id: string;
  readonly organization_id: string;
  readonly matches_played: number | string;
  readonly minutes: number | string;
  readonly totals: PlayerStatisticTotals | string;
  readonly averages: PlayerStatisticRates | string;
  readonly per90: PlayerStatisticRates | string;
  readonly partial: PlayerStatisticPartialFlags | string;
  readonly source_revision_max: number | string;
  readonly updated_at: string | Date;
}

interface StandingSnapshotRow {
  readonly competition_id: string;
  readonly organization_id: string;
  readonly formula_version: string;
  readonly rows: CompetitionStandingRow[] | string;
  readonly source_revision_max: number | string;
  readonly updated_at: string | Date;
}

function rehydrateTeamContribution(row: TeamContributionRow): TeamMatchContribution {
  return {
    id: row.id,
    officialResultId: row.official_result_id,
    revision: Number(row.revision),
    encounterId: asEncounterId(row.encounter_id),
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    officialSlot: parseOfficialSlot(row.official_slot),
    teamId: row.team_id === null ? null : asTeamId(row.team_id),
    correlationStatus: parseTeamCorrelationStatus(row.correlation_status),
    side: parseTeamSide(row.side),
    externalClubId: row.external_club_id,
    goalsFor: Number(row.goals_for),
    goalsAgainst: Number(row.goals_against),
    platform: row.platform,
    gameEdition: row.game_edition,
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

function rehydrateTeamCompetitionStats(row: TeamCompetitionStatsRow): TeamCompetitionStats {
  return {
    teamId: asTeamId(row.team_id),
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

function rehydrateStandingSnapshot(row: StandingSnapshotRow): CompetitionStandingSnapshot {
  const rows = parseJsonRecord(row.rows).map((standing) => ({
    ...standing,
    teamId: asTeamId(standing.teamId),
  }));
  if (row.formula_version !== COMPETITION_STANDING_FORMULA_VERSION) {
    throw new RangeError(`Unsupported standings formula version: ${row.formula_version}`);
  }
  return {
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    formulaVersion: COMPETITION_STANDING_FORMULA_VERSION,
    rows,
    sourceRevisionMax: Number(row.source_revision_max),
    updatedAt: parseDate(row.updated_at),
  };
}

function parseTeamCorrelationStatus(value: string): TeamCorrelationStatus {
  if (value === "matched" || value === "unmatched") return value;
  throw new RangeError(`Invalid team correlation status: ${value}`);
}

function parseTeamSide(value: string): TeamMatchSide {
  if (value === "home" || value === "away") return value;
  throw new RangeError(`Invalid team match side: ${value}`);
}
