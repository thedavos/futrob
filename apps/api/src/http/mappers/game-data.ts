import type { ExternalClub, ProviderMatch } from "@futrob/game-data";
import type { ExternalClubDto, ProviderMatchDto } from "@futrob/api-contracts";

export function toExternalClubDto(club: ExternalClub): ExternalClubDto {
  return {
    providerKey: club.providerKey,
    externalClubId: club.externalClubId,
    name: club.name,
    platform: club.platform,
    gameEdition: club.gameEdition,
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
