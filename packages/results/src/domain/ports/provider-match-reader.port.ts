import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import type { EncounterId } from "@futrob/shared-kernel";

export interface ProviderMatchReaderPort {
  listCandidatesForEncounter(encounterId: EncounterId): Promise<ProviderMatch[]>;
  getByExternalRef(ref: ExternalReference): Promise<ProviderMatch | null>;
}
