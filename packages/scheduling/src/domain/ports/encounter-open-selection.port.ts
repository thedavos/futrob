import type { ActorId, CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";

/**
 * Lets scheduling close the door on a selection whose Encounter stops being playable. Runs inside
 * the Encounter's lock and transaction, and throws so a failure rolls the whole change back.
 */
export interface EncounterOpenSelectionPort {
  /**
   * Voids the Encounter's non-terminal selection; a no-op without one. An approved official result
   * is never touched.
   */
  cancelOpen(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
    readonly actorId: ActorId;
    readonly reason: string;
  }): Promise<void>;
}
