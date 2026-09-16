import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { EncounterCandidateAssociation } from "../entities/encounter-candidate-association.ts";

export function encounterCandidateAssociationId(
  organizationId: OrganizationId,
  encounterId: EncounterId,
  providerMatchRef: ExternalReference,
): string {
  return `${organizationId}:${encounterId}:${externalReferenceKey(providerMatchRef)}`;
}

export function reconcileCandidateAssociations(input: {
  readonly existing: readonly EncounterCandidateAssociation[];
  readonly inWindowRefs: readonly ExternalReference[];
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly now: Date;
}): EncounterCandidateAssociation[] {
  const existingByKey = new Map(
    input.existing.map((row) => [externalReferenceKey(row.providerMatchRef), row] as const),
  );
  const seen = new Set<string>();
  const next: EncounterCandidateAssociation[] = [];

  for (const providerMatchRef of input.inWindowRefs) {
    const key = externalReferenceKey(providerMatchRef);
    if (seen.has(key)) continue;
    seen.add(key);
    const existing = existingByKey.get(key);
    next.push({
      id:
        existing?.id ??
        encounterCandidateAssociationId(input.organizationId, input.encounterId, providerMatchRef),
      organizationId: input.organizationId,
      encounterId: input.encounterId,
      providerMatchRef: existing?.providerMatchRef ?? providerMatchRef,
      eligible: true,
      associatedAt: existing?.associatedAt ?? input.now,
      lastEvaluatedAt: input.now,
    });
  }

  for (const existing of input.existing) {
    const key = externalReferenceKey(existing.providerMatchRef);
    if (seen.has(key)) continue;
    next.push({
      ...existing,
      eligible: false,
      lastEvaluatedAt: input.now,
    });
  }

  return next.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}
