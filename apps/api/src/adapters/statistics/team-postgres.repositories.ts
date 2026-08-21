import type {
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
import { RANKING_KINDS } from "@futrob/statistics";
import type { CompetitionId, EncounterId, TeamId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  rehydrateRankingSnapshot,
  rehydrateStandingSnapshot,
  rehydrateTeamCompetitionStats,
  rehydrateTeamContribution,
  type RankingSnapshotRow,
  type StandingSnapshotRow,
  type TeamCompetitionStatsRow,
  type TeamContributionRow,
} from "@/adapters/statistics/team-postgres-rows.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const TEAM_CONTRIBUTION_COLUMNS = 28;

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

export class PostgresRankingSnapshotRepository implements RankingSnapshotRepository {
  constructor(private readonly pool: Pool) {}

  async replaceForCompetition(
    competitionId: CompetitionId,
    snapshots: readonly RankingSnapshot[],
  ): Promise<void> {
    await this.deleteByCompetition(competitionId);
    for (const snapshot of snapshots) {
      await getPgExecutor(this.pool).query(
        `INSERT INTO ranking_snapshots (
           competition_id, organization_id, kind, formula_version, eligibility, rows,
           source_revision_max, updated_at
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
        [
          snapshot.competitionId,
          snapshot.organizationId,
          snapshot.kind,
          snapshot.formulaVersion,
          JSON.stringify(snapshot.eligibility),
          JSON.stringify(snapshot.rows),
          snapshot.sourceRevisionMax,
          snapshot.updatedAt.toISOString(),
        ],
      );
    }
  }

  async listByCompetition(competitionId: CompetitionId): Promise<RankingSnapshot[]> {
    const result = await getPgExecutor(this.pool).query<RankingSnapshotRow>(
      `SELECT * FROM ranking_snapshots WHERE competition_id = $1`,
      [competitionId],
    );
    return result.rows
      .map(rehydrateRankingSnapshot)
      .sort((left, right) => RANKING_KINDS.indexOf(left.kind) - RANKING_KINDS.indexOf(right.kind));
  }

  async findByCompetitionAndKind(
    competitionId: CompetitionId,
    kind: RankingKind,
  ): Promise<RankingSnapshot | null> {
    const result = await getPgExecutor(this.pool).query<RankingSnapshotRow>(
      `SELECT * FROM ranking_snapshots WHERE competition_id = $1 AND kind = $2`,
      [competitionId, kind],
    );
    const row = result.rows[0];
    return row ? rehydrateRankingSnapshot(row) : null;
  }

  async deleteByCompetition(competitionId: CompetitionId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM ranking_snapshots WHERE competition_id = $1`,
      [competitionId],
    );
  }
}
