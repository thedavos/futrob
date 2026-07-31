import type { PlayerGameAccount } from "../entities/player-game-account.ts";

export interface PlayerGameAccountRepository {
  listByProfile(playerProfileId: string): Promise<PlayerGameAccount[]>;
  saveIfAbsent(account: PlayerGameAccount): Promise<PlayerGameAccount>;
}
