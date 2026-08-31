import type {
  AttributeCategoryScore,
  AttributeComponent,
  ExternalClub,
  PlayerGameProfile,
  PlayerGameProfileResult,
  PlayerGameStatBlock,
  PlayerPositionStatBlock,
  PlayerRecentMatchesResult,
  PlayerRecentProviderMatchResult,
  PlayerRecentProviderMatch,
  PlayerTeamStatBlock,
  ProviderMatch,
} from "@futrob/game-data";
import type {
  ExternalClubDto,
  GetMyGameProfileResponse,
  GetMyRecentMatchResponse,
  GetMyRecentMatchesResponse,
  PlayerGameProfileDto,
  PlayerRecentProviderMatchDetailDto,
  PlayerRecentProviderMatchDto,
  ProviderMatchDto,
  ProviderMatchListDto,
} from "@futrob/api-contracts";

export function toPlayerGameProfileDto(result: PlayerGameProfileResult): GetMyGameProfileResponse {
  switch (result.status) {
    case "needs_club":
      return { status: "needs_club" };
    case "needs_game_account":
      return { status: "needs_game_account" };
    case "ready":
      return { status: "ready", profile: serializePlayerGameProfile(result.profile) };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function serializePlayerGameProfile(profile: PlayerGameProfile): PlayerGameProfileDto {
  return {
    identity: {
      displayName: profile.identity.displayName,
      preferredPosition: profile.identity.preferredPosition,
      preferredRole: profile.identity.preferredRole,
    },
    sampleSize: profile.sampleSize,
    attributes: profile.attributes.map(serializeAttributeCategory),
    evolution: profile.evolution.map((point) => ({
      occurredAt: point.occurredAt.toISOString(),
      rating: point.rating,
      outcome: point.outcome,
    })),
    summary: serializeStatBlock(profile.summary),
    byTeam: profile.byTeam.map(serializeTeamBlock),
    byPosition: profile.byPosition.map(serializePositionBlock),
  };
}

function serializeAttributeCategory(category: AttributeCategoryScore) {
  return {
    category: category.category,
    score: category.score,
    components: category.components.map(serializeAttributeComponent),
  };
}

function serializeAttributeComponent(item: AttributeComponent) {
  return {
    key: item.key,
    weight: item.weight,
    raw: item.raw,
    rawKind: item.rawKind,
    score: item.score,
    points: item.points,
    confidence: item.confidence,
    sampleCount: item.sampleCount,
  };
}

function serializeStatBlock(block: PlayerGameStatBlock) {
  return {
    matchesPlayed: block.matchesPlayed,
    wins: block.wins,
    draws: block.draws,
    losses: block.losses,
    minutes: block.minutes,
    totals: { ...block.totals },
    averages: { ...block.averages },
    partial: { ...block.partial },
  };
}

function serializeTeamBlock(block: PlayerTeamStatBlock) {
  return {
    clubId: block.clubId,
    clubName: block.clubName,
    ...serializeStatBlock(block),
  };
}

function serializePositionBlock(block: PlayerPositionStatBlock) {
  return {
    position: block.position,
    role: block.role,
    ...serializeStatBlock(block),
  };
}

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
