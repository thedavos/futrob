import type { ProviderHealthPort } from "../../domain/ports/provider-health.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class GetProviderHealthUseCase {
  constructor(private readonly health: ProviderHealthPort) {}

  execute(providerKey: GameDataProviderKey) {
    return this.health.getSnapshot(providerKey);
  }
}
