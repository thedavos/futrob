import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export type TeamCorrelationStatus = "matched" | "unmatched";

export type TeamMatchSide = "home" | "away";

export interface TeamMatchContribution {
  readonly id: string;
  readonly officialResultId: string;
  readonly revision: number;
  readonly encounterId: EncounterId;
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly officialSlot: 1 | 2;
  readonly teamId: TeamId | null;
  readonly correlationStatus: TeamCorrelationStatus;
  readonly side: TeamMatchSide;
  readonly externalClubId: string;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly platform: string;
  readonly gameEdition: string;
  readonly minutesPlayed: number | null;
  readonly goals: number | null;
  readonly assists: number | null;
  readonly shots: number | null;
  readonly passAttempts: number | null;
  readonly passesMade: number | null;
  readonly tackleAttempts: number | null;
  readonly tacklesMade: number | null;
  readonly saves: number | null;
  readonly yellowCards: number | null;
  readonly redCards: number | null;
  readonly isMvp: boolean | null;
  readonly rating: number | null;
}
