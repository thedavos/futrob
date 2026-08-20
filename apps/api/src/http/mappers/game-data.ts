import type {
  ExternalClub,
  PlayerRecentMatchesResult,
  PlayerRecentProviderMatchResult,
  PlayerRecentProviderMatch,
  ProviderMatch,
} from "@futrob/game-data";
import type {
  ExternalClubDto,
  GetMyRecentMatchResponse,
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDetailDto,
  PlayerRecentProviderMatchDto,
  ProviderMatchDto,
  ProviderMatchListDto,
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

export function toPlayerRecentMatchDetailDto(
  result: PlayerRecentProviderMatchResult,
): GetMyRecentMatchResponse {
  switch (result.status) {
    case "needs_club":
      return { status: "needs_club" };
    case "needs_game_account":
      return { status: "needs_game_account" };
    case "not_found":
      return { status: "not_found" };
    case "ready":
      return {
        status: "ready",
        match: toPlayerRecentMatchFullDto(result.match),
      };
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}

function toPlayerRecentMatchDto(row: PlayerRecentProviderMatch): PlayerRecentProviderMatchDto {
  const match = toRecentListedMatchDto(row.match);
  const listedMvpDisplayName = listedMvpDisplayNameFrom(row);
  switch (row.kind) {
    case "played":
      return {
        kind: "played",
        match,
        appearance: { ...row.appearance },
        listedExternalClubId: row.listedExternalClubId,
        listedMvpDisplayName,
      };
    case "not_played":
      return {
        kind: "not_played",
        match,
        listedExternalClubId: row.listedExternalClubId,
        listedMvpDisplayName,
      };
    default: {
      const _exhaustive: never = row;
      return _exhaustive;
    }
  }
}

function toPlayerRecentMatchFullDto(
  row: PlayerRecentProviderMatch,
): PlayerRecentProviderMatchDetailDto {
  switch (row.kind) {
    case "played":
      return {
        kind: "played",
        match: toProviderMatchDto(row.match),
        appearance: { ...row.appearance },
        listedExternalClubId: row.listedExternalClubId,
      };
    case "not_played":
      return {
        kind: "not_played",
        match: toProviderMatchDto(row.match),
        listedExternalClubId: row.listedExternalClubId,
      };
    default: {
      const exhaustive: never = row;
      return exhaustive;
    }
  }
}

function toRecentListedMatchDto(match: ProviderMatch): ProviderMatchListDto {
  const { players: _players, ...listed } = toProviderMatchDto(match);
  return listed;
}

function listedMvpDisplayNameFrom(row: PlayerRecentProviderMatch): string | null {
  const listedMvp = row.match.players.find(
    (player) => player.isMvp === true && player.externalClubId === row.listedExternalClubId,
  );
  if (listedMvp) return listedMvp.displayName;
  if (
    row.kind === "played" &&
    row.appearance.isMvp === true &&
    row.appearance.externalClubId === row.listedExternalClubId
  ) {
    return row.appearance.displayName;
  }
  return null;
}
