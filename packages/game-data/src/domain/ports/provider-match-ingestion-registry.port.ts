import type { GameDataProviderKey } from "../value-objects/provider-key.ts";
import type { ProviderMatchIngestionPort } from "./provider-match-ingestion.port.ts";

export interface ProviderMatchIngestionRegistryPort {
  get(providerKey: GameDataProviderKey): ProviderMatchIngestionPort | null;
}
