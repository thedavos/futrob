import type { ActorId, CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { ExternalReference, ProviderPlayerMatchStats } from "@futrob/game-data";

export type OfficialResultStatus = "approved" | "voided";

export interface OfficialResultSlotSnapshot {
  readonly officialSlot: 1 | 2;
  readonly providerMatchRef: ExternalReference;
  readonly homeExternalClubId: string;
  readonly awayExternalClubId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly occurredAt: Date;
  readonly gameEdition: string;
  readonly platform: string;
  readonly players: readonly ProviderPlayerMatchStats[];
}

export interface OfficialResult {
  readonly id: string;
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly revision: number;
  readonly status: OfficialResultStatus;
  readonly slots: readonly OfficialResultSlotSnapshot[];
  readonly approvedAt: Date;
  readonly approvedBy: ActorId;
}
