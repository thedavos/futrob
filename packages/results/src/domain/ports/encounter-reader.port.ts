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

export interface OfficialMatchStart {
  readonly slot: 1 | 2;
  readonly scheduledStartAt: Date;
}

export interface EncounterScheduleSnapshot {
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly stageId: EncounterStageId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /** Earliest start among the Encounter's OfficialMatch slots. */
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  /**
   * Start of each OfficialMatch slot. A slot may move on its own, so candidates are
   * searched around every slot. Absent means every slot starts at `scheduledStartAt`.
   */
  readonly officialMatchStarts?: readonly OfficialMatchStart[];
  readonly homeExternalClubId: string | null;
  readonly awayExternalClubId: string | null;
  readonly providerKey: string | null;
}

export interface EncounterReaderPort {
  getById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null>;
}
