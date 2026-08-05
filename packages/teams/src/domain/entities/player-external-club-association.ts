import type { GameDataProviderKey } from "@futrob/game-data";

export interface PlayerExternalClubAssociation {
  readonly playerProfileId: string;
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly externalClubName: string;
  readonly platform: string;
  readonly gameEdition: string;
  /** EA Clubs crest CDN URL resolved at association time; null if the provider had none. */
  readonly imageUrl: string | null;
  readonly associatedAt: Date;
}
