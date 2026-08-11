import { err, ok, type Result } from "@futrob/shared-kernel";
import type { PlayerGameAccount } from "../../domain/entities/player-game-account.ts";
import {
  GameAccountNotFound,
  InvalidGameAccountIdentifier,
  type AddPlayerGameAccountError,
} from "../../domain/errors/team.errors.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";

export type LinkProviderExternalPlayerIdError =
  | AddPlayerGameAccountError
  | GameAccountNotFound;

export interface LinkProviderExternalPlayerIdInput {
  readonly accountId: string;
  readonly providerExternalPlayerId: string;
}

export class LinkProviderExternalPlayerIdUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: PlayerGameAccountRepository;
    },
  ) {}

  async execute(
    input: LinkProviderExternalPlayerIdInput,
  ): Promise<Result<PlayerGameAccount, LinkProviderExternalPlayerIdError>> {
    const providerExternalPlayerId = input.providerExternalPlayerId.trim();
    if (providerExternalPlayerId.length === 0 || providerExternalPlayerId.length > 80) {
      return err(
        new InvalidGameAccountIdentifier({
          code: "teams.invalid_game_account_identifier",
          message: "Invalid provider external player id",
        }),
      );
    }

    const updated = await this.deps.accounts.setProviderExternalPlayerId({
      accountId: input.accountId,
      providerExternalPlayerId,
    });
    if (!updated) {
      return err(
        new GameAccountNotFound({
          code: "teams.game_account_not_found",
          message: "Game account not found",
        }),
      );
    }
    return ok(updated);
  }
}
