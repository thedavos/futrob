import type { PlayerGameAccount, PlayerProfile } from "@futrob/teams";

export function playerProfileDto(profile: PlayerProfile) {
  return { id: profile.id, createdAt: profile.createdAt.toISOString() };
}

export function playerGameAccountDto(account: PlayerGameAccount) {
  return {
    id: account.id,
    playerProfileId: account.playerProfileId,
    identifier: account.identifier,
    platform: account.platform,
    gameEdition: account.gameEdition,
    createdAt: account.createdAt.toISOString(),
  };
}
