import type { GamePlatform, PlayerGameAccount } from "../entities/player-game-account.ts";

export interface PlayerGameAccountRepository {
  findById(id: string): Promise<PlayerGameAccount | null>;
  listByProfile(playerProfileId: string): Promise<PlayerGameAccount[]>;
  /** Accounts whose normalized identifier matches; used to resolve invitation recipients. */
  findByNormalizedIdentifier(normalizedIdentifier: string): Promise<PlayerGameAccount[]>;
  saveIfAbsent(account: PlayerGameAccount): Promise<PlayerGameAccount>;
  /**
   * Replaces the declared identity of an existing row. Returns null if the id
   * is missing. Throws `GameAccountConflict` when another of the player's
   * accounts already uses the new unique tuple.
   */
  updateDeclaredIdentity(account: PlayerGameAccount): Promise<PlayerGameAccount | null>;
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
