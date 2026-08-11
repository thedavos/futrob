import type {
  PlayerExternalClubAssociation,
  PlayerGameAccount,
  PlayerProfile,
} from "@futrob/teams";

export function playerProfileDto(profile: PlayerProfile) {
  return { id: profile.id, createdAt: profile.createdAt.toISOString() };
}

export function playerGameAccountDto(account: PlayerGameAccount) {
  return {
    id: account.id,
    playerProfileId: account.playerProfileId,
    identifier: account.identifier,
    providerExternalPlayerId: account.providerExternalPlayerId,
    platform: account.platform,
    gameEdition: account.gameEdition,
    createdAt: account.createdAt.toISOString(),
  };
}

export function playerExternalClubAssociationDto(association: PlayerExternalClubAssociation) {
  return {
    playerProfileId: association.playerProfileId,
    providerKey: association.providerKey,
    externalClubId: association.externalClubId,
    externalClubName: association.externalClubName,
    platform: association.platform,
    gameEdition: association.gameEdition,
    imageUrl: association.imageUrl,
    associatedAt: association.associatedAt.toISOString(),
  };
}
