import { err, ok, type Result } from "@futrob/shared-kernel";
import { normalizeGameAccountIdentifier } from "../../domain/entities/player-game-account.ts";
import { InvalidPlayerSearch } from "../../domain/errors/team.errors.ts";
import type {
  PlayerDirectoryEntry,
  PlayerDirectoryReader,
} from "../../domain/ports/player-directory.reader.ts";

export const PLAYER_SEARCH_MIN_LENGTH = 3;
export const PLAYER_SEARCH_MAX_RESULTS = 10;

/**
 * Finds players by the start of their gamertag. A short minimum and a small page keep the
 * directory from being enumerated; the caller enforces who may search.
 */
export class SearchPlayersUseCase {
  constructor(private readonly directory: PlayerDirectoryReader) {}

  async execute(input: {
    readonly query: string;
  }): Promise<Result<readonly PlayerDirectoryEntry[], InvalidPlayerSearch>> {
    const prefix = normalizeGameAccountIdentifier(input.query);
    if (prefix.length < PLAYER_SEARCH_MIN_LENGTH) {
      return err(
        new InvalidPlayerSearch({
          code: "teams.invalid_player_search",
          message: `Search needs at least ${PLAYER_SEARCH_MIN_LENGTH} characters`,
        }),
      );
    }
    return ok(await this.directory.searchByGamertagPrefix(prefix, PLAYER_SEARCH_MAX_RESULTS));
  }
}
