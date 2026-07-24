import type { Result } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import type {
  GetRecentMatchesInput,
  ProviderError,
} from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class GetRecentProviderMatchesUseCase {
  constructor(private readonly registry: GameDataProviderRegistryPort) {}

  execute(
    providerKey: GameDataProviderKey,
    input: GetRecentMatchesInput,
  ): Promise<Result<ProviderMatch[], ProviderError>> {
    const provider = this.registry.get(providerKey);
    return provider.getRecentMatches(input);
  }
}
