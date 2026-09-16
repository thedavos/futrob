import type { ExternalReference } from "@futrob/game-data";
import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

export interface EncounterCandidateAssociation {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly providerMatchRef: ExternalReference;
  readonly eligible: boolean;
  readonly associatedAt: Date;
  readonly lastEvaluatedAt: Date;
}
