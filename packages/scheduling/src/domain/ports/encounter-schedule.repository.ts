import type { EncounterId } from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../entities/encounter-schedule-snapshot.ts";

export interface EncounterScheduleRepository {
  findById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null>;
  /** Returns null when an existing ID belongs to a different tenant/competition. */
  upsert(snapshot: EncounterScheduleSnapshot): Promise<EncounterScheduleSnapshot | null>;
  deleteByEncounterIds(encounterIds: readonly EncounterId[]): Promise<void>;
}

export interface EncounterParticipantValidationPort {
  isApprovedParticipant(input: {
    readonly organizationId: EncounterScheduleSnapshot["organizationId"];
    readonly competitionId: EncounterScheduleSnapshot["competitionId"];
    readonly teamId: EncounterScheduleSnapshot["homeTeamId"];
  }): Promise<boolean>;
}
