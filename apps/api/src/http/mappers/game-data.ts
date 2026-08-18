import type {
  ExternalClub,
  PlayerRecentMatchesResult,
  PlayerRecentProviderMatch,
  ProviderMatch,
} from "@futrob/game-data";
import type {
  ExternalClubDto,
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
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
        matches: result.matches.map(toPlayerRecentMatchDto),
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function toPlayerRecentMatchDto(row: PlayerRecentProviderMatch): PlayerRecentProviderMatchDto {
  const match = toRecentListedMatchDto(row);
  switch (row.kind) {
    case "played":
      return {
        kind: "played",
        match,
        appearance: { ...row.appearance },
        listedExternalClubId: row.listedExternalClubId,
      };
    case "not_played":
      return {
        kind: "not_played",
        match,
        listedExternalClubId: row.listedExternalClubId,
      };
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

function toRecentListedMatchDto(row: PlayerRecentProviderMatch): ProviderMatchDto {
  const mvpPlayers = row.match.players.filter((player) => player.isMvp === true);
  return {
    ...toProviderMatchDto(row.match),
    // Only the match MVP is needed to name them without shipping the full roster.
    players:
      row.kind === "not_played"
        ? mvpPlayers.filter((player) => player.externalClubId === row.listedExternalClubId)
        : mvpPlayers,
  };
}
