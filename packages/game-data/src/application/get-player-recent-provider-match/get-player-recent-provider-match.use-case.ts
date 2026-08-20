import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import type { PlayerRecentMatchIdentity } from "../../domain/policies/player-appears-in-provider-match.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";
import {
  PlayerRecentMatchWindowLoader,
  type PlayerRecentMatchClub,
  type PlayerRecentMatchWindow,
  type PlayerRecentProviderMatch,
} from "../player-recent-match-window/player-recent-match-window.ts";

export interface GetPlayerRecentProviderMatchInput {
  readonly accounts: readonly PlayerRecentMatchIdentity[];
  readonly club: PlayerRecentMatchClub | null;
  readonly providerKey: GameDataProviderKey;
  readonly externalMatchId: string;
}

export type PlayerRecentProviderMatchResult =
  | { readonly status: "needs_club" }
  | { readonly status: "needs_game_account" }
  | { readonly status: "not_found" }
  | { readonly status: "ready"; readonly match: PlayerRecentProviderMatch };

export class GetPlayerRecentProviderMatchUseCase {
  private readonly windowLoader: PlayerRecentMatchWindowLoader;

  constructor(registry: GameDataProviderRegistryPort) {
    this.windowLoader = new PlayerRecentMatchWindowLoader(registry);
  }

  async execute(
    input: GetPlayerRecentProviderMatchInput,
  ): Promise<Result<PlayerRecentProviderMatchResult, ProviderError>> {
    if (!input.club) {
      return ok({ status: "needs_club" });
    }
    if (input.accounts.length === 0) {
      return ok({ status: "needs_game_account" });
    }

    const window = await this.windowLoader.load({
      accounts: input.accounts,
      clubs: [input.club],
    });
    if (!window.isOk()) return err(window.error);

    const match = window.value.matches.find(
      (candidate) =>
        candidate.match.provider.key === input.providerKey &&
        candidate.match.provider.externalMatchId === input.externalMatchId,
    );
    if (match) return ok({ status: "ready", match });

    return absentMatchResult(window.value);
  }
}

function absentMatchResult(
  window: PlayerRecentMatchWindow,
): Result<PlayerRecentProviderMatchResult, ProviderError> {
  switch (window.coverage) {
    case "complete":
      return ok({ status: "not_found" });
    case "partial":
      return err(window.error);
    default: {
      const exhaustive: never = window;
      return exhaustive;
    }
  }
}
