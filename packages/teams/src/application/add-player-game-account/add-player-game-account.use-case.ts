import {
  domainError,
  err,
  ok,
  type ClockPort,
  type DomainError,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
import {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "../../domain/entities/player-game-account.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";

export interface AddPlayerGameAccountInput {
  readonly playerProfileId: string;
  readonly identifier: string;
  readonly platform: GamePlatform;
  readonly gameEdition: string;
}

export class AddPlayerGameAccountUseCase {
  constructor(
    private readonly deps: {
      readonly accounts: PlayerGameAccountRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: AddPlayerGameAccountInput): Promise<Result<PlayerGameAccount, DomainError>> {
    const identifier = input.identifier.trim();
    const gameEdition = input.gameEdition.trim();
    if (identifier.length === 0 || identifier.length > 80) {
      return err(domainError("teams.invalid_game_account_identifier", "Invalid identifier"));
    }
    if (gameEdition.length === 0 || gameEdition.length > 40) {
      return err(domainError("teams.invalid_game_edition", "Invalid game edition"));
    }

    const account: PlayerGameAccount = {
      id: this.deps.ids.generate(),
      playerProfileId: input.playerProfileId,
      identifier,
      normalizedIdentifier: normalizeGameAccountIdentifier(identifier),
      platform: input.platform,
      gameEdition,
      createdAt: this.deps.clock.now(),
    };
    return ok(await this.deps.accounts.saveIfAbsent(account));
  }
}
