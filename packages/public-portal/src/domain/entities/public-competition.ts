import type {
  CompetitionCoverPreset,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
} from "@futrob/competitions";
import type { PublicCompetitionStatus } from "../policies/public-visibility.ts";

/**
 * Portada projection. Every field is on an explicit allowlist: adding a field to a source
 * type never reaches a spectator without editing `toPublicCompetition`.
 */
export interface PublicCompetition {
  readonly name: string;
  readonly status: PublicCompetitionStatus;
  readonly format: CompetitionFormat;
  readonly platform: CompetitionPlatform;
  readonly gameEdition: string;
  readonly region: CompetitionRegion;
  readonly timeZone: string;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly approvedTeamCount: number;
  /**
   * Built-in illustration only. An uploaded cover is keyed by organization, so it needs
   * its own public media route before it can be shown (ADR-0024).
   */
  readonly coverPreset: CompetitionCoverPreset | null;
}

export interface PublicStandingRow {
  readonly position: number;
  readonly teamName: string;
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface PublicStandings {
  readonly rows: readonly PublicStandingRow[];
  /** Null until the first approved result is projected. */
  readonly updatedAt: Date | null;
}

export type PublicEncounterStatus = "scheduled" | "awaiting_result" | "official";

export interface PublicCalendarEntry {
  readonly roundNumber: number;
  readonly scheduledStartAt: Date;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly status: PublicEncounterStatus;
}

export interface PublicCalendar {
  readonly timeZone: string;
  readonly entries: readonly PublicCalendarEntry[];
}
