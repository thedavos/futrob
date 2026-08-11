import type { GamePlatform } from "@futrob/shared-kernel";

export type { GamePlatform };

export interface PlayerGameAccount {
  readonly id: string;
  readonly playerProfileId: string;
  /** External EA player identifier declared by the actor (often a gamertag). */
  readonly identifier: string;
  readonly normalizedIdentifier: string;
  /**
   * Stable provider player id from match/member payloads when known.
   * Distinct from the declared gamertag on EA Clubs.
   */
  readonly providerExternalPlayerId: string | null;
  /** Context required when querying the EA provider; it does not prove ownership. */
  readonly platform: GamePlatform;
  /** EA game version used to select the provider API dataset. */
  readonly gameEdition: string;
  readonly createdAt: Date;
}

export function normalizeGameAccountIdentifier(identifier: string): string {
  return identifier.trim().toLocaleLowerCase("en-US");
}
