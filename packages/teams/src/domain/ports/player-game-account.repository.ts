import type { GamePlatform, PlayerGameAccount } from "../entities/player-game-account.ts";

export interface PlayerGameAccountRepository {
  findById(id: string): Promise<PlayerGameAccount | null>;
  listByProfile(playerProfileId: string): Promise<PlayerGameAccount[]>;
  saveIfAbsent(account: PlayerGameAccount): Promise<PlayerGameAccount>;
  /** Updates providerExternalPlayerId; returns null if the account does not exist. */
  setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }): Promise<PlayerGameAccount | null>;
  findByCorrelation(input: {
    readonly platform: GamePlatform;
    readonly gameEdition: string;
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }): Promise<PlayerGameAccount[]>;
}
