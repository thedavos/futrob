import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type {
  EncounterCandidateAssociation,
  EncounterCandidateAssociationRepository,
} from "@futrob/results";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

export class InMemoryEncounterCandidateAssociationRepository implements EncounterCandidateAssociationRepository {
  rows: EncounterCandidateAssociation[] = [];

  async replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
  ): Promise<readonly EncounterCandidateAssociation[]> {
    this.rows = this.rows.filter(
      (row) => row.organizationId !== organizationId || row.encounterId !== encounterId,
    );
    this.rows.push(...rows);
    return rows;
  }

  async listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly EncounterCandidateAssociation[]> {
    return this.rows.filter(
      (row) => row.organizationId === organizationId && row.encounterId === encounterId,
    );
  }

  async findByRef(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): Promise<EncounterCandidateAssociation | null> {
    const key = externalReferenceKey(providerMatchRef);
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.encounterId === encounterId &&
          externalReferenceKey(row.providerMatchRef) === key,
      ) ?? null
    );
  }
}
