import type { Result } from "@futrob/shared-kernel";
import type { ExternalClub } from "../../domain/entities/external-club.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import type {
  GetExternalClubInput,
  ProviderError,
} from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export class GetExternalClubUseCase {
  constructor(private readonly registry: GameDataProviderRegistryPort) {}

  execute(
    providerKey: GameDataProviderKey,
    input: GetExternalClubInput,
  ): Promise<Result<ExternalClub, ProviderError>> {
    const provider = this.registry.get(providerKey);
    return provider.getClubInfo(input);
  }
}
