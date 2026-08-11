import type { Result } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../entities/provider-match.ts";
import type { ProviderResourceType } from "../entities/raw-provider-observation.ts";
import type { ProviderError } from "../errors/provider.errors.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";
import type { GetRecentMatchesInput } from "./game-data-provider.port.ts";

export interface ProviderMatchObservationDraft {
  readonly providerKey: GameDataProviderKey;
  readonly resourceType: Extract<ProviderResourceType, "match">;
  readonly externalResourceId: string;
  readonly endpointKey: string;
  readonly payloadHash: string;
  readonly storageRef: string;
  readonly payload: unknown;
  readonly observedAt: Date;
  readonly httpStatus: number | null;
  readonly schemaVersion: string;
}

export interface IngestedProviderMatches {
  readonly observations: readonly ProviderMatchObservationDraft[];
  readonly matches: readonly ProviderMatch[];
}

export interface ProviderMatchIngestionPort {
  readonly key: GameDataProviderKey;
  ingestRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<IngestedProviderMatches, ProviderError>>;
}
