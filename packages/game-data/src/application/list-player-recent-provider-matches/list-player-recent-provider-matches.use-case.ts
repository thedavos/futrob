import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import type { PlayerRecentMatchIdentity } from "../../domain/policies/player-appears-in-provider-match.ts";
import {
  PLAYER_RECENT_MATCH_TYPES,
  PlayerRecentMatchWindowLoader,
  type PlayerRecentMatchClub,
  type PlayerRecentProviderMatch,
} from "../player-recent-match-window/player-recent-match-window.ts";

export { PLAYER_RECENT_MATCH_TYPES };
export type { PlayerRecentMatchClub, PlayerRecentMatchIdentity, PlayerRecentProviderMatch };

export interface ListPlayerRecentProviderMatchesInput {
  readonly accounts: readonly PlayerRecentMatchIdentity[];
  readonly clubs: readonly PlayerRecentMatchClub[];
}

export type PlayerRecentMatchesResult =
  | { readonly status: "needs_club" }
  | { readonly status: "needs_game_account" }
  | { readonly status: "ready"; readonly matches: readonly PlayerRecentProviderMatch[] };

export class ListPlayerRecentProviderMatchesUseCase {
  private readonly windowLoader: PlayerRecentMatchWindowLoader;

  constructor(registry: GameDataProviderRegistryPort) {
    this.windowLoader = new PlayerRecentMatchWindowLoader(registry);
  }

  async execute(
    input: ListPlayerRecentProviderMatchesInput,
  ): Promise<Result<PlayerRecentMatchesResult, ProviderError>> {
    if (input.clubs.length === 0) {
      return ok({ status: "needs_club" });
    }
    if (input.accounts.length === 0) {
      return ok({ status: "needs_game_account" });
    }

    const window = await this.windowLoader.load(input);
    if (!window.isOk()) return err(window.error);
    return ok({ status: "ready", matches: window.value.matches });
  }
}
