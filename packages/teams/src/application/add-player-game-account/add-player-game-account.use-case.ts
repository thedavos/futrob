import { err, ok, type ClockPort, type IdGeneratorPort, type Result } from "@futrob/shared-kernel";
import {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "../../domain/entities/player-game-account.ts";
import {
  InvalidGameAccountIdentifier,
  InvalidGameEdition,
  type AddPlayerGameAccountError,
} from "../../domain/errors/team.errors.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";

export interface AddPlayerGameAccountInput {
  readonly playerProfileId: string;
  readonly identifier: string;
  readonly platform: GamePlatform;
  readonly gameEdition: string;
  readonly providerExternalPlayerId?: string | null;
}

export class AddPlayerGameAccountUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: PlayerGameAccountRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: AddPlayerGameAccountInput,
  ): Promise<Result<PlayerGameAccount, AddPlayerGameAccountError>> {
    const identifier = input.identifier.trim();
    const gameEdition = input.gameEdition.trim();
    const providerExternalPlayerId =
      input.providerExternalPlayerId === undefined || input.providerExternalPlayerId === null
        ? null
        : input.providerExternalPlayerId.trim();
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
    if (
      providerExternalPlayerId !== null &&
      (providerExternalPlayerId.length === 0 || providerExternalPlayerId.length > 80)
    ) {
      return err(
        new InvalidGameAccountIdentifier({
          code: "teams.invalid_game_account_identifier",
          message: "Invalid provider external player id",
        }),
      );
    }

    const account: PlayerGameAccount = {
      id: this.deps.ids.generate(),
      playerProfileId: input.playerProfileId,
      identifier,
      normalizedIdentifier: normalizeGameAccountIdentifier(identifier),
      providerExternalPlayerId,
      platform: input.platform,
      gameEdition,
      createdAt: this.deps.clock.now(),
    };
    return ok(await this.deps.accounts.saveIfAbsent(account));
  }
}
