import type {
  CompetitionCoverPreset,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
  ResolutionMode,
} from "@futrob/competitions";
import type { RankingKind } from "@futrob/statistics";
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

export type PublicStandingFormResult = "win" | "draw" | "loss";

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
  /** Latest official results, oldest first. */
  readonly form: readonly PublicStandingFormResult[];
  /** Swiss only: tie-break, rests and withdrawal. `points` already include the rests. */
  readonly buchholz?: number;
  readonly byes?: number;
  readonly withdrawn?: boolean;
}

export interface PublicSwissProgress {
  readonly roundsTotal: number;
  readonly roundsCompleted: number;
  readonly currentRound: number | null;
  readonly isFinal: boolean;
}

export interface PublicStandings {
  readonly rows: readonly PublicStandingRow[];
  /** Null unless the competition plays a Swiss fixture and has a table. */
  readonly swiss: PublicSwissProgress | null;
  /** Null until the first approved result is projected. */
  readonly updatedAt: Date | null;
}

export type PublicEncounterStatus = "scheduled" | "awaiting_result" | "official";

/**
 * Goals of one approved official match, oriented to the Encounter's home side. It is the only
 * part of an OfficialResult a spectator sees: no slots, provider refs, clubs or player lines.
 */
export interface PublicMatchScore {
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export interface PublicCalendarEntry {
  readonly roundNumber: number;
  readonly scheduledStartAt: Date;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly status: PublicEncounterStatus;
  /** Official matches in slot order; null until the Encounter has an approved result. */
  readonly score: readonly PublicMatchScore[] | null;
}

export interface PublicCalendar {
  readonly timeZone: string;
  readonly entries: readonly PublicCalendarEntry[];
}

export interface PublicTeam {
  readonly name: string;
}

export interface PublicTeams {
  /** Approved participants, alphabetical. */
  readonly teams: readonly PublicTeam[];
}

/** Who fills one side of a bracket Encounter, without a single internal id. */
export type PublicBracketSide =
  | { readonly kind: "team"; readonly name: string }
  | { readonly kind: "bye" }
  /** The winner of the Encounter at this round number and 1-based order of the same bracket. */
  | { readonly kind: "winner"; readonly roundNumber: number; readonly order: number }
  | { readonly kind: "group_rank"; readonly group: string; readonly rank: number }
  | { readonly kind: "stage_rank"; readonly rank: number }
  /** Not decided yet, or not traceable without exposing an internal reference. */
  | { readonly kind: "pending" };

/** A bracket Encounter also shows when the organizer closed it without a result. */
export type PublicBracketEncounterStatus = PublicEncounterStatus | "closed";

export interface PublicBracketEncounter {
  readonly order: number;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly home: PublicBracketSide;
  readonly away: PublicBracketSide;
  readonly status: PublicBracketEncounterStatus;
  readonly score: readonly PublicMatchScore[] | null;
}

export interface PublicBracketRound {
  readonly number: number;
  readonly scheduledStartAt: Date;
  readonly encounters: readonly PublicBracketEncounter[];
}

export type PublicBracketStageKind = "knockout" | "playoffs";

export interface PublicBracketStage {
  readonly kind: PublicBracketStageKind;
  readonly rounds: readonly PublicBracketRound[];
}

export interface PublicBracket {
  readonly timeZone: string;
  readonly stages: readonly PublicBracketStage[];
}

export type PublicRankingKind = RankingKind;

export interface PublicRankingRow {
  readonly position: number;
  /** The game account name the player declared on the Team roster. */
  readonly playerName: string;
  readonly teamName: string | null;
  readonly value: number;
  readonly matchesPlayed: number;
}

export interface PublicRanking {
  readonly kind: PublicRankingKind;
  readonly rows: readonly PublicRankingRow[];
  /** Null until the first approved result is projected. */
  readonly updatedAt: Date | null;
}

export type PublicReschedulingRules =
  | { readonly allowed: false }
  | {
      readonly allowed: true;
      /** Null means no limit. */
      readonly maxPerTeam: number | null;
      readonly minimumNoticeHours: number;
    };

export interface PublicStageRules {
  readonly stage: "regular" | "knockout";
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
  readonly officialMatchesPerEncounter: 1 | 2;
  readonly resolutionMode: ResolutionMode;
  readonly rescheduling: PublicReschedulingRules;
}

export interface PublicRules {
  readonly format: CompetitionFormat;
  /** Null only when the competition has no stored rules. */
  readonly teams: { readonly min: number; readonly max: number | null } | null;
  /** Regular stage first; only the stages the published rules define. */
  readonly stages: readonly PublicStageRules[];
  /** Null means the platform default roster size. */
  readonly maxRosterSize: number | null;
}

/** A competition a spectator may open, as a crawler sees it: its public address and freshness. */
export interface PublicCompetitionListing {
  readonly organizationSlug: string;
  readonly competitionKey: string;
  readonly updatedAt: Date;
}
