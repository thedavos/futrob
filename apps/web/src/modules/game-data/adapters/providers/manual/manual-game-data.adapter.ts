import { err, type Result } from "@futrob/shared-kernel";
import {
  ProviderNotImplemented,
  UnsupportedGameDataOperation,
  type ExternalClub,
  type ProviderMatch,
  type GameDataProviderPort,
  type GetExternalClubInput,
  type GetRecentMatchesInput,
  type ProviderError,
  type SearchExternalClubsInput,
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
      new UnsupportedGameDataOperation({
        code: "game_data.unsupported_operation",
        message: "Manual provider does not support club search",
      }),
    );
  }

  async getClubInfo(_input: GetExternalClubInput): Promise<Result<ExternalClub, ProviderError>> {
    return err(
      new UnsupportedGameDataOperation({
        code: "game_data.unsupported_operation",
        message: "Manual provider does not support club info",
      }),
    );
  }

  async getRecentMatches(
    _input: GetRecentMatchesInput,
  ): Promise<Result<ProviderMatch[], ProviderError>> {
    return err(
      new ProviderNotImplemented({
        code: "game_data.provider_not_implemented",
        message: "ManualGameDataAdapter.getRecentMatches is not implemented yet",
      }),
    );
  }
}
