import type {
  Brand,
  CompetitionId,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";

/**
 * Same brand as scheduling `FixtureStageId` (`${planId}:stage:${stageOrder}`).
 * Results does not import `@futrob/scheduling`; do not invent encounter-local ids.
 */
export type EncounterStageId = Brand<string, "FixtureStageId">;

export function asEncounterStageId(value: string): EncounterStageId {
  // SAFETY: Compile-time brand marker; adapters copy scheduling fixture stage ids.
  return value as EncounterStageId;
}

export interface EncounterScheduleSnapshot {
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly stageId: EncounterStageId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly homeExternalClubId: string | null;
  readonly awayExternalClubId: string | null;
  readonly providerKey: string | null;
}

export interface EncounterReaderPort {
  getById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null>;
}
