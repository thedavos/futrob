import type { GameDataProviderKey } from "@futrob/game-data";

export interface PlayerExternalClubAssociation {
  readonly playerProfileId: string;
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly externalClubName: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly associatedAt: Date;
}
