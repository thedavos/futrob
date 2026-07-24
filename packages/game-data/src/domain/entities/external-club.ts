import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ExternalClub {
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly name: string;
  readonly platform: string;
  readonly gameEdition: string;
}
