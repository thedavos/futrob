import type {
  GameDataProviderCapabilities,
  GameDataProviderPort,
} from "./game-data-provider.port.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface GameDataProviderRegistryPort {
  get(providerKey: GameDataProviderKey): GameDataProviderPort;
  findSupporting(capability: keyof GameDataProviderCapabilities): GameDataProviderPort[];
  list(): GameDataProviderPort[];
}
