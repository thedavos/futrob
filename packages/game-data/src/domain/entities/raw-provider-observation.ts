import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export type ProviderResourceType =
  | "club"
  | "club_members"
  | "match"
  | "leaderboard"
  | "player_stats";

export interface RawProviderObservation {
  readonly id: string;
  readonly providerKey: GameDataProviderKey;
  readonly resourceType: ProviderResourceType;
  readonly externalResourceId: string;
  readonly endpointKey: string;
  readonly payloadHash: string;
  /** Object key in R2 when payload is large; otherwise inline JSON path in D1. */
  readonly storageRef: string;
  readonly observedAt: Date;
  readonly httpStatus: number | null;
  readonly schemaVersion: string;
}
