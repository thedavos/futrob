import type { EncounterId } from "@futrob/shared-kernel";

export interface EncounterScheduleSnapshot {
  readonly encounterId: EncounterId;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly homeExternalClubId: string | null;
  readonly awayExternalClubId: string | null;
  readonly providerKey: string | null;
}

export interface EncounterReaderPort {
  getById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null>;
}
