import type { ProviderMatch } from "../entities/provider-match.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export interface ProviderMatchRepository {
  upsertMany(matches: readonly ProviderMatch[]): Promise<void>;

  findByExternalId(input: {
    readonly providerKey: GameDataProviderKey;
    readonly externalMatchId: string;
  }): Promise<ProviderMatch | null>;

  listBetweenClubs(input: {
    readonly providerKey: GameDataProviderKey;
    readonly homeExternalClubId: string;
    readonly awayExternalClubId: string;
    readonly from: Date;
    readonly to: Date;
  }): Promise<ProviderMatch[]>;
}
