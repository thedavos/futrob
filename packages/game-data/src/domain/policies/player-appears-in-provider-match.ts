import type { ProviderMatch, ProviderPlayerMatchStats } from "../entities/provider-match.ts";

export interface PlayerRecentMatchIdentity {
  readonly identifier: string;
  readonly normalizedIdentifier: string;
  readonly providerExternalPlayerId: string | null;
}

export function findPlayerAppearances(
  match: ProviderMatch,
  accounts: readonly PlayerRecentMatchIdentity[],
): readonly ProviderPlayerMatchStats[] {
  return match.players.filter((player) =>
    accounts.some((account) => playerMatchesAccount(player, account)),
  );
}

export function findPlayerAppearance(
  match: ProviderMatch,
  accounts: readonly PlayerRecentMatchIdentity[],
): ProviderPlayerMatchStats | null {
  return findPlayerAppearances(match, accounts)[0] ?? null;
}

function playerMatchesAccount(
  player: ProviderPlayerMatchStats,
  account: PlayerRecentMatchIdentity,
): boolean {
  if (
    account.providerExternalPlayerId !== null &&
    player.externalPlayerId === account.providerExternalPlayerId
  ) {
    return true;
  }
  if (normalizePlayerName(player.displayName) === account.normalizedIdentifier) {
    return true;
  }
  return player.externalPlayerId === account.identifier;
}

function normalizePlayerName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}
