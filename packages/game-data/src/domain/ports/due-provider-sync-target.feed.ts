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

/** Select uncovered targets before limiting, oldest completed synchronization first. */
export interface DueProviderSyncTargetFeed {
  list(input: {
    readonly now: Date;
    readonly limit: number;
    readonly cooldownMs: number;
  }): Promise<readonly DueProviderSyncTarget[]>;
}
