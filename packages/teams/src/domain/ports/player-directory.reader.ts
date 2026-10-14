import type { ActorId } from "@futrob/shared-kernel";
import type { GamePlatform } from "../entities/player-game-account.ts";

/** The EA club a player declared, used to suggest the name of a team they bring. */
export interface PlayerDirectoryClub {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly platform: string;
}

/** One player found by gamertag. Exposes only what an organizer needs to invite them. */
export interface PlayerDirectoryEntry {
  readonly actorId: ActorId;
  readonly gamertag: string;
  readonly platform: GamePlatform;
  readonly gameEdition: string;
  /** Most recently declared club, if any. */
  readonly club: PlayerDirectoryClub | null;
}

export interface PlayerDirectoryReader {
  /**
   * Players with a game account whose normalized identifier starts with `prefix`,
   * one row per player, ordered by gamertag.
   */
  searchByGamertagPrefix(prefix: string, limit: number): Promise<readonly PlayerDirectoryEntry[]>;
}
