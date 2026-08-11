import type { CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";

export type PlayerCorrelationStatus = "matched" | "unmatched" | "ambiguous";

export interface PlayerMatchContribution {
  readonly id: string;
  readonly officialResultId: string;
  readonly revision: number;
  readonly encounterId: EncounterId;
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly officialSlot: 1 | 2;
  readonly playerProfileId: string | null;
  readonly gameAccountId: string | null;
  readonly correlationStatus: PlayerCorrelationStatus;
  readonly externalPlayerId: string;
  readonly displayName: string;
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly position: string | null;
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
