import type { Result } from "@futrob/shared-kernel";
import type { ProviderError } from "../errors/provider.errors.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";
import type { ProviderMatchIngestionPort } from "./provider-match-ingestion.port.ts";

export interface ProviderMatchIngestionRegistryPort {
  get(providerKey: GameDataProviderKey): ProviderMatchIngestionPort | null;
}

export type { Result, ProviderError };
