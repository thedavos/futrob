export type CommandBarIdentity = {
  readonly gamertag: string | null;
  readonly clubName: string | null;
  readonly imageUrl: string | null;
};

export function commandBarIdentity(input: {
  readonly gameAccounts: readonly { readonly identifier: string }[];
  readonly clubs: readonly { readonly name: string; readonly imageUrl: string | null }[];
}): CommandBarIdentity {
  const gamertag = input.gameAccounts[0]?.identifier.trim() || null;
  const club = input.clubs[0] ?? null;
  return {
    gamertag,
    clubName: club?.name.trim() || null,
    imageUrl: club?.imageUrl ?? null,
  };
}

export function commandBarIdentityLabel(identity: CommandBarIdentity, emptyLabel: string): string {
  if (identity.gamertag && identity.clubName) {
    return `${identity.gamertag} / ${identity.clubName}`;
  }
  return identity.gamertag ?? identity.clubName ?? emptyLabel;
}
