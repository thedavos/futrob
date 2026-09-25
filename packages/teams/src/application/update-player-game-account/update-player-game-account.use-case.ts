import { err, ok, type Result } from "@futrob/shared-kernel";
import {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "../../domain/entities/player-game-account.ts";
import {
  GameAccountConflict,
  GameAccountNotFound,
  InvalidGameAccountIdentifier,
  InvalidGameEdition,
  type UpdatePlayerGameAccountError,
} from "../../domain/errors/team.errors.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";

export interface UpdatePlayerGameAccountInput {
  readonly accountId: string;
  readonly playerProfileId: string;
  readonly identifier: string;
  readonly platform: GamePlatform;
  readonly gameEdition: string;
}

export class UpdatePlayerGameAccountUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: PlayerGameAccountRepository;
    },
  ) {}

  async execute(
    input: UpdatePlayerGameAccountInput,
  ): Promise<Result<PlayerGameAccount, UpdatePlayerGameAccountError>> {
    const identifier = input.identifier.trim();
    const gameEdition = input.gameEdition.trim();
    if (identifier.length === 0 || identifier.length > 80) {
      return err(
        new InvalidGameAccountIdentifier({
          code: "teams.invalid_game_account_identifier",
          message: "Invalid identifier",
        }),
      );
    }
    if (gameEdition.length === 0 || gameEdition.length > 40) {
      return err(
        new InvalidGameEdition({
          code: "teams.invalid_game_edition",
          message: "Invalid game edition",
        }),
      );
    }

    const account = await this.deps.accounts.findById(input.accountId);
    if (!account || account.playerProfileId !== input.playerProfileId) {
      return err(
        new GameAccountNotFound({
          code: "teams.game_account_not_found",
          message: "Game account not found",
        }),
      );
    }

    const normalizedIdentifier = normalizeGameAccountIdentifier(identifier);
    const identityChanged =
      account.normalizedIdentifier !== normalizedIdentifier ||
      account.platform !== input.platform ||
      account.gameEdition !== gameEdition;

    if (identityChanged) {
      const siblings = await this.deps.accounts.listByProfile(input.playerProfileId);
      const conflict = siblings.some(
        (row) =>
          row.id !== account.id &&
          row.normalizedIdentifier === normalizedIdentifier &&
          row.platform === input.platform &&
          row.gameEdition === gameEdition,
      );
      if (conflict) {
        return err(
          new GameAccountConflict({
            code: "teams.game_account_conflict",
            message: "Game account already exists",
          }),
        );
      }
    }

    const next: PlayerGameAccount = {
      ...account,
      identifier,
      normalizedIdentifier,
      platform: input.platform,
      gameEdition,
      providerExternalPlayerId: identityChanged ? null : account.providerExternalPlayerId,
    };

    if (
      next.identifier === account.identifier &&
      next.platform === account.platform &&
      next.gameEdition === account.gameEdition &&
      next.providerExternalPlayerId === account.providerExternalPlayerId
    ) {
      return ok(account);
    }

    try {
      const saved = await this.deps.accounts.updateDeclaredIdentity(next);
      if (!saved) {
        return err(
          new GameAccountNotFound({
            code: "teams.game_account_not_found",
            message: "Game account not found",
          }),
        );
      }
      return ok(saved);
    } catch (error) {
      if (error instanceof GameAccountConflict) return err(error);
      throw error;
    }
  }
}
