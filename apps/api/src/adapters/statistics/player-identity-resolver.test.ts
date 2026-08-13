import { describe, expect, it } from "vite-plus/test";
import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionRosterMembership, PlayerGameAccount } from "@futrob/teams";
import { InMemoryPlayerGameAccountRepository } from "@/adapters/teams/in-memory.repository.ts";
import { InMemoryCompetitionRosterMembershipRepository } from "@/adapters/teams/team-roster.repositories.ts";
import { TeamsPlayerIdentityResolver } from "./player-identity-resolver.ts";

describe("TeamsPlayerIdentityResolver", () => {
  it("uses the roster-pinned account before a global provider-id match", async () => {
    const accounts = repositoryWith([
      account({
        id: "pinned-account",
        identifier: "PlayerOne",
        normalizedIdentifier: "playerone",
        providerExternalPlayerId: null,
      }),
      account({
        id: "provider-account",
        identifier: "OtherName",
        normalizedIdentifier: "othername",
        providerExternalPlayerId: "sharedid",
      }),
    ]);
    const rosters = rosterRepositoryWith([membership({ gameAccountId: "pinned-account" })]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
        externalPlayerId: "sharedid",
        platform: "playstation",
        gameEdition: "fc26",
        organizationId: "organization-1",
        competitionId: "competition-1",
        teamId: "team-1",
      }),
    ).resolves.toEqual({
      status: "matched",
      playerProfileId: "profile-1",
      gameAccountId: "pinned-account",
    });
  });

  it("returns ambiguous when two roster-pinned team accounts correlate", async () => {
    const accounts = repositoryWith([
      account({
        id: "account-1",
        playerProfileId: "profile-1",
        providerExternalPlayerId: "shared-id",
      }),
      account({
        id: "account-2",
        playerProfileId: "profile-2",
        providerExternalPlayerId: "shared-id",
      }),
    ]);
    const rosters = rosterRepositoryWith([
      membership({
        id: "membership-1",
        playerProfileId: "profile-1",
        gameAccountId: "account-1",
      }),
      membership({
        id: "membership-2",
        playerProfileId: "profile-2",
        gameAccountId: "account-2",
      }),
    ]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
        externalPlayerId: "shared-id",
        platform: "playstation",
        gameEdition: "fc26",
        organizationId: "organization-1",
        competitionId: "competition-1",
        teamId: "team-1",
      }),
    ).resolves.toEqual({ status: "ambiguous" });
  });

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
    const rosters = rosterRepositoryWith([]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
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
    const rosters = rosterRepositoryWith([]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
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
    const rosters = rosterRepositoryWith([]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
        externalPlayerId: "shared-id",
        platform: "common-gen5",
        gameEdition: "fc26",
      }),
    ).resolves.toEqual({ status: "ambiguous" });
  });

  it("returns unmatched for an unknown provider platform", async () => {
    const accounts = repositoryWith([account({ providerExternalPlayerId: "known" })]);
    const rosters = rosterRepositoryWith([]);

    await expect(
      new TeamsPlayerIdentityResolver(rosters, accounts).resolve({
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

function rosterRepositoryWith(rows: readonly CompetitionRosterMembership[]) {
  const repository = new InMemoryCompetitionRosterMembershipRepository();
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

function membership(
  overrides: Partial<CompetitionRosterMembership> = {},
): CompetitionRosterMembership {
  return {
    id: "membership-1",
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId("competition-1"),
    teamId: asTeamId("team-1"),
    playerProfileId: "profile-1",
    gameAccountId: "account-1",
    role: "player",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}
