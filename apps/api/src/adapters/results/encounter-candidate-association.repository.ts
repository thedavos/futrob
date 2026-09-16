import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type {
  EncounterCandidateAssociation,
  EncounterCandidateAssociationRepository,
  ReplaceEncounterCandidatesResult,
  WriteIfEligibleResult,
} from "@futrob/results";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

function encounterSetKey(organizationId: OrganizationId, encounterId: EncounterId): string {
  return `${organizationId}:${encounterId}`;
}

export class InMemoryEncounterCandidateAssociationRepository implements EncounterCandidateAssociationRepository {
  rows: EncounterCandidateAssociation[] = [];
  private readonly generations = new Map<string, number>();
  private readonly tails = new Map<string, Promise<void>>();

  async loadForEncounter(organizationId: OrganizationId, encounterId: EncounterId) {
    return {
      associations: await this.listByEncounter(organizationId, encounterId),
      generation: this.generations.get(encounterSetKey(organizationId, encounterId)) ?? 0,
    };
  }

  async replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
    expectedGeneration: number,
  ): Promise<ReplaceEncounterCandidatesResult> {
    return this.runExclusive(encounterSetKey(organizationId, encounterId), async () => {
      const current = this.generations.get(encounterSetKey(organizationId, encounterId)) ?? 0;
      if (current !== expectedGeneration) {
        return { status: "conflict", generation: current };
      }
      this.rows = this.rows.filter(
        (row) => row.organizationId !== organizationId || row.encounterId !== encounterId,
      );
      this.rows.push(...rows);
      const generation = current + 1;
      this.generations.set(encounterSetKey(organizationId, encounterId), generation);
      return { status: "replaced", associations: rows, generation };
    });
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
    return this.findSync(organizationId, encounterId, providerMatchRef);
  }

  async writeIfEligible<T>(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    requiredRefs: readonly ExternalReference[],
    write: () => Promise<T>,
  ): Promise<WriteIfEligibleResult<T>> {
    return this.runExclusive(encounterSetKey(organizationId, encounterId), async () => {
      for (const providerMatchRef of requiredRefs) {
        const association = this.findSync(organizationId, encounterId, providerMatchRef);
        if (!association || !association.eligible) {
          return { status: "ineligible", providerMatchRef };
        }
      }
      return { status: "wrote", value: await write() };
    });
  }

  private findSync(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): EncounterCandidateAssociation | null {
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

  private async runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(key, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
