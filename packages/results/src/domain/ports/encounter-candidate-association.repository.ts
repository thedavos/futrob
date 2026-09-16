import type { ExternalReference } from "@futrob/game-data";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { EncounterCandidateAssociation } from "../entities/encounter-candidate-association.ts";

export interface EncounterCandidateSetSnapshot {
  readonly associations: readonly EncounterCandidateAssociation[];
  readonly generation: number;
}

export type ReplaceEncounterCandidatesResult =
  | {
      readonly status: "replaced";
      readonly associations: readonly EncounterCandidateAssociation[];
      readonly generation: number;
    }
  | {
      readonly status: "conflict";
      readonly generation: number;
    };

export type WriteIfEligibleResult<T> =
  | { readonly status: "wrote"; readonly value: T }
  | { readonly status: "ineligible"; readonly providerMatchRef: ExternalReference };

export interface EncounterCandidateAssociationRepository {
  loadForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<EncounterCandidateSetSnapshot>;
  replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
    expectedGeneration: number,
  ): Promise<ReplaceEncounterCandidatesResult>;
  listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly EncounterCandidateAssociation[]>;
  findByRef(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): Promise<EncounterCandidateAssociation | null>;
  writeIfEligible<T>(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    requiredRefs: readonly ExternalReference[],
    write: () => Promise<T>,
  ): Promise<WriteIfEligibleResult<T>>;
}
