import type { ProviderHealthEvent, ProviderHealthSnapshot } from "../entities/provider-health.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ProviderHealthPort {
  record(event: ProviderHealthEvent): Promise<void>;
  getSnapshot(providerKey: GameDataProviderKey): Promise<ProviderHealthSnapshot>;
}
