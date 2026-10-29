import type { CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";

/**
 * Notifies the owners of per-Encounter data, such as official result candidates, that
 * advancement created, changed or removed the Teams of an Encounter. It runs inside the
 * Encounter's lock and transaction, so a failure rolls the advancement back.
 */
export interface EncounterParticipantsChangePort {
  participantsChanged(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
  }): Promise<void>;
}
