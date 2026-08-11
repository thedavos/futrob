import { describe, expect, it } from "vite-plus/test";
import type { PlayerGameAccount } from "@futrob/teams";
import { InMemoryPlayerGameAccountRepository } from "@/adapters/teams/in-memory.repository.ts";
import { TeamsPlayerIdentityResolver } from "./player-identity-resolver.ts";

describe("TeamsPlayerIdentityResolver", () => {
  it("prefers provider external player ids over declared identifiers", async () => {
    const accounts = repositoryWith([
      account({
        id: "provider-account",
        playerProfileId: "provider-profile",
        identifier: "OtherName",
        normalizedIdentifier: "othername",
        providerExternalPlayerId: "922546779",
      }),
      account({
        id: "identifier-account",
        playerProfileId: "identifier-profile",
        identifier: "922546779",
        normalizedIdentifier: "922546779",
        providerExternalPlayerId: null,
      }),
    ]);

    await expect(
      new TeamsPlayerIdentityResolver(accounts).resolve({
        externalPlayerId: "922546779",
        platform: "common-gen5",
        gameEdition: "fc26",
      }),
    ).resolves.toEqual({
      status: "matched",
      playerProfileId: "provider-profile",
      gameAccountId: "provider-account",
    });
  });

  it("falls back to the normalized declared identifier", async () => {
    const accounts = repositoryWith([
      account({
        identifier: "GamerTag",
        normalizedIdentifier: "gamertag",
        providerExternalPlayerId: null,
      }),
    ]);

    await expect(
      new TeamsPlayerIdentityResolver(accounts).resolve({
        externalPlayerId: "GAMERTAG",
        platform: "playstation",
        gameEdition: "fc26",
      }),
    ).resolves.toMatchObject({
      status: "matched",
      playerProfileId: "profile-1",
      gameAccountId: "account-1",
    });
  });

  it("returns ambiguous when provider correlation finds multiple accounts", async () => {
    const accounts = repositoryWith([
      account({
        id: "playstation-account",
        platform: "playstation",
        providerExternalPlayerId: "shared-id",
      }),
      account({
        id: "xbox-account",
        platform: "xbox",
        providerExternalPlayerId: "shared-id",
      }),
    ]);

    await expect(
      new TeamsPlayerIdentityResolver(accounts).resolve({
        externalPlayerId: "shared-id",
        platform: "common-gen5",
        gameEdition: "fc26",
      }),
    ).resolves.toEqual({ status: "ambiguous" });
  });

  it("returns unmatched for an unknown provider platform", async () => {
    const accounts = repositoryWith([account({ providerExternalPlayerId: "known" })]);

    await expect(
      new TeamsPlayerIdentityResolver(accounts).resolve({
        externalPlayerId: "known",
        platform: "unsupported-platform",
        gameEdition: "fc26",
      }),
    ).resolves.toEqual({ status: "unmatched" });
  });
});

function repositoryWith(rows: readonly PlayerGameAccount[]) {
  const repository = new InMemoryPlayerGameAccountRepository();
  for (const row of rows) repository.rows.set(row.id, row);
  return repository;
}

function account(overrides: Partial<PlayerGameAccount> = {}): PlayerGameAccount {
  return {
    id: "account-1",
    playerProfileId: "profile-1",
    identifier: "PlayerOne",
    normalizedIdentifier: "playerone",
    providerExternalPlayerId: "provider-player-1",
    platform: "playstation",
    gameEdition: "FC 26",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}
