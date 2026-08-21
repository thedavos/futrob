import type {
  CompetitionStandingRow,
  CompetitionStandingSnapshot,
  PlayerStatisticPartialFlags,
  PlayerStatisticRates,
  PlayerStatisticTotals,
  RankingEligibilityConfig,
  RankingKind,
  RankingRow,
  RankingSnapshot,
  TeamCompetitionStats,
  TeamCorrelationStatus,
  TeamMatchContribution,
  TeamMatchSide,
} from "@futrob/statistics";
import { COMPETITION_STANDING_FORMULA_VERSION, RANKING_FORMULA_VERSION } from "@futrob/statistics";
import {
  competitionStandingRowSchema,
  playerStatisticPartialFlagsSchema,
  playerStatisticRatesSchema,
  playerStatisticTotalsSchema,
  rankingEligibilitySchema,
  rankingKindSchema,
  rankingRowSchema,
} from "@futrob/api-contracts";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { z } from "zod";
import { parseJsonColumn } from "@/adapters/persistence/parse-json-column.ts";
import {
  nullableNumber,
  parseDate,
  parseJsonRecord,
  parseOfficialSlot,
} from "@/adapters/statistics/postgres-row-parsers.ts";

export interface TeamContributionRow {
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

export interface TeamCompetitionStatsRow {
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

export interface StandingSnapshotRow {
  readonly competition_id: string;
  readonly organization_id: string;
  readonly formula_version: string;
  readonly rows: CompetitionStandingRow[] | string;
  readonly source_revision_max: number | string;
  readonly updated_at: string | Date;
}

export interface RankingSnapshotRow {
  readonly competition_id: string;
  readonly organization_id: string;
  readonly kind: string;
  readonly formula_version: string;
  readonly eligibility: RankingEligibilityConfig | string;
  readonly rows: RankingRow[] | string;
  readonly source_revision_max: number | string;
  readonly updated_at: string | Date;
}

export function rehydrateTeamContribution(row: TeamContributionRow): TeamMatchContribution {
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

export function rehydrateTeamCompetitionStats(row: TeamCompetitionStatsRow): TeamCompetitionStats {
  return {
    teamId: asTeamId(row.team_id),
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    matchesPlayed: Number(row.matches_played),
    minutes: Number(row.minutes),
    totals: parseJsonRecord(playerStatisticTotalsSchema, row.totals),
    averages: parseJsonRecord(playerStatisticRatesSchema, row.averages),
    per90: parseJsonRecord(playerStatisticRatesSchema, row.per90),
    partial: parseJsonRecord(playerStatisticPartialFlagsSchema, row.partial),
    sourceRevisionMax: Number(row.source_revision_max),
    updatedAt: parseDate(row.updated_at),
  };
}

export function rehydrateStandingSnapshot(row: StandingSnapshotRow): CompetitionStandingSnapshot {
  const rows = parseJsonColumn(z.array(competitionStandingRowSchema), row.rows).map((standing) => ({
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

export function rehydrateRankingSnapshot(row: RankingSnapshotRow): RankingSnapshot {
  if (row.formula_version !== RANKING_FORMULA_VERSION) {
    throw new RangeError(`Unsupported rankings formula version: ${row.formula_version}`);
  }
  const kind = parseRankingKind(row.kind);
  const eligibility = parseJsonColumn(rankingEligibilitySchema, row.eligibility);
  const rows = parseJsonColumn(z.array(rankingRowSchema), row.rows).map((rankingRow) => ({
    ...rankingRow,
    teamId: rankingRow.teamId === null ? null : asTeamId(rankingRow.teamId),
  }));
  return {
    competitionId: asCompetitionId(row.competition_id),
    organizationId: asOrganizationId(row.organization_id),
    kind,
    formulaVersion: RANKING_FORMULA_VERSION,
    eligibility,
    rows,
    sourceRevisionMax: Number(row.source_revision_max),
    updatedAt: parseDate(row.updated_at),
  };
}

function parseRankingKind(value: string): RankingKind {
  return rankingKindSchema.parse(value);
}

function parseTeamCorrelationStatus(value: string): TeamCorrelationStatus {
  if (value === "matched" || value === "unmatched") return value;
  throw new RangeError(`Invalid team correlation status: ${value}`);
}

function parseTeamSide(value: string): TeamMatchSide {
  if (value === "home" || value === "away") return value;
  throw new RangeError(`Invalid team match side: ${value}`);
}
