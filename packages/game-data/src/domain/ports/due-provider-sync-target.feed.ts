import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

/** One recent-matches synchronization the cron may persist. */
export interface DueProviderSyncTarget {
  readonly organizationId: string;
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly matchType: string;
  readonly maxResultCount: number;
}

export interface DueProviderSyncTargetFeed {
  list(input: {
    readonly now: Date;
    readonly limit: number;
  }): Promise<readonly DueProviderSyncTarget[]>;
}
