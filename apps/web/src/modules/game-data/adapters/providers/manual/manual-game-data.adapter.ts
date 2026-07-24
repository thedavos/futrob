import { err, type Result, domainError } from "@futrob/shared-kernel";
import type {
  ExternalClub,
  ProviderMatch,
  GameDataProviderPort,
  GetExternalClubInput,
  GetRecentMatchesInput,
  ProviderError,
  SearchExternalClubsInput,
} from "@futrob/game-data";

export class ManualGameDataAdapter implements GameDataProviderPort {
  readonly key = "manual" as const;

  readonly capabilities = {
    searchClubs: false,
    getClubInfo: false,
    getRecentMatches: true,
    getPlayerStats: true,
    getTeamStats: true,
  } as const;

  async searchClubs(
    _input: SearchExternalClubsInput,
  ): Promise<Result<ExternalClub[], ProviderError>> {
    return err(
      domainError(
        "game_data.unsupported_operation",
        "Manual provider does not support club search",
      ),
    );
  }

  async getClubInfo(_input: GetExternalClubInput): Promise<Result<ExternalClub, ProviderError>> {
    return err(
      domainError("game_data.unsupported_operation", "Manual provider does not support club info"),
    );
  }

  async getRecentMatches(
    _input: GetRecentMatchesInput,
  ): Promise<Result<ProviderMatch[], ProviderError>> {
    return err(
      domainError(
        "game_data.provider_not_implemented",
        "ManualGameDataAdapter.getRecentMatches is not implemented yet",
      ),
    );
  }
}
