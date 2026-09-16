import type { ExternalReference } from "@futrob/game-data";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { EncounterCandidateAssociation } from "../entities/encounter-candidate-association.ts";

export interface EncounterCandidateAssociationRepository {
  replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
  ): Promise<readonly EncounterCandidateAssociation[]>;
  listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly EncounterCandidateAssociation[]>;
  findByRef(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): Promise<EncounterCandidateAssociation | null>;
}
