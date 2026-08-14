import type { ExternalClub, PlayerRecentMatchesResult, ProviderMatch } from "@futrob/game-data";
import type {
  ExternalClubDto,
  GetMyRecentMatchesResponse,
  ProviderMatchDto,
} from "@futrob/api-contracts";

export function toExternalClubDto(club: ExternalClub): ExternalClubDto {
  return {
    providerKey: club.providerKey,
    externalClubId: club.externalClubId,
    name: club.name,
    platform: club.platform,
    gameEdition: club.gameEdition,
    imageUrl: club.imageUrl,
  };
}

export function toProviderMatchDto(match: ProviderMatch): ProviderMatchDto {
  return {
    id: match.id,
    provider: match.provider,
    game: match.game,
    occurredAt: match.occurredAt.toISOString(),
    home: match.home,
    away: match.away,
    players: match.players.map((player) => ({ ...player })),
    metadata: match.metadata,
  };
}

export function toPlayerRecentMatchesDto(
  result: PlayerRecentMatchesResult,
): GetMyRecentMatchesResponse {
  switch (result.status) {
    case "needs_club":
      return { status: "needs_club" };
    case "needs_game_account":
      return { status: "needs_game_account" };
    case "ready":
      return {
        status: "ready",
        matches: result.matches.map((row) => ({
          match: {
            ...toProviderMatchDto(row.match),
            players: [],
          },
          appearance: { ...row.appearance },
        })),
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
