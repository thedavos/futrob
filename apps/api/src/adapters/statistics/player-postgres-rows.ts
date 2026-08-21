import type {
  PlayerCompetitionStats,
  PlayerCorrelationStatus,
  PlayerMatchContribution,
  PlayerPersonalStats,
  PlayerStatisticPartialFlags,
  PlayerStatisticRates,
  PlayerStatisticTotals,
} from "@futrob/statistics";
import {
  playerStatisticPartialFlagsSchema,
  playerStatisticRatesSchema,
  playerStatisticTotalsSchema,
} from "@futrob/api-contracts";
import { asCompetitionId, asEncounterId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import {
  nullableNumber,
  parseDate,
  parseJsonRecord,
  parseOfficialSlot,
} from "@/adapters/statistics/postgres-row-parsers.ts";

export interface ContributionRow {
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

export interface CompetitionStatsRow extends AggregateStatsRow {
  readonly competition_id: string;
  readonly organization_id: string;
}

export function rehydrateContribution(row: ContributionRow): PlayerMatchContribution {
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

export function rehydrateCompetitionStats(row: CompetitionStatsRow): PlayerCompetitionStats {
  return {
    playerProfileId: row.player_profile_id,
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

export function rehydratePersonalStats(row: AggregateStatsRow): PlayerPersonalStats {
  return {
    playerProfileId: row.player_profile_id,
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

function parseCorrelationStatus(value: string): PlayerCorrelationStatus {
  if (value === "matched" || value === "unmatched" || value === "ambiguous") return value;
  throw new RangeError(`Invalid player correlation status: ${value}`);
}
