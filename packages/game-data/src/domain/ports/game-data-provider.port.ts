import type { Result } from "@futrob/shared-kernel";
import type { ExternalClub } from "../entities/external-club.ts";
import type { ProviderMatch } from "../entities/provider-match.ts";
import type { ProviderError } from "../errors/provider.errors.ts";
import type { GameDataProviderKey } from "../value-objects/provider-key.ts";

export type { ProviderError };

export interface GameDataProviderCapabilities {
  readonly searchClubs: boolean;
  readonly getClubInfo: boolean;
  readonly getRecentMatches: boolean;
  readonly getPlayerStats: boolean;
  readonly getTeamStats: boolean;
}

export interface SearchExternalClubsInput {
  readonly query: string;
  readonly platform: string;
  readonly gameEdition: string;
}

export interface GetExternalClubInput {
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
}

export interface GetRecentMatchesInput {
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly matchType: string;
  readonly maxResultCount: number;
}

export interface GameDataProviderPort {
  readonly key: GameDataProviderKey;
  readonly capabilities: GameDataProviderCapabilities;

  searchClubs(input: SearchExternalClubsInput): Promise<Result<ExternalClub[], ProviderError>>;

  getClubInfo(input: GetExternalClubInput): Promise<Result<ExternalClub, ProviderError>>;

  getRecentMatches(input: GetRecentMatchesInput): Promise<Result<ProviderMatch[], ProviderError>>;
}
