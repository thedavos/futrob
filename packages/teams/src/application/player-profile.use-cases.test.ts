import { asActorId, compareByTime, TIME_SORT_DIRECTION } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { PlayerExternalClubAssociation } from "../domain/entities/player-external-club-association.ts";
import type { PlayerGameAccount } from "../domain/entities/player-game-account.ts";
import {
  GameAccountConflict,
  GameAccountNotFound,
  InvalidGameAccountIdentifier,
  InvalidGameEdition,
  PlayerProfileNotFound,
} from "../domain/errors/team.errors.ts";
import type { PlayerProfile } from "../domain/entities/player-profile.ts";
import type { PlayerExternalClubAssociationRepository } from "../domain/ports/player-external-club-association.repository.ts";
import type { PlayerGameAccountRepository } from "../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../domain/ports/player-profile.repository.ts";
import { AddPlayerGameAccountUseCase } from "./add-player-game-account/add-player-game-account.use-case.ts";
import { UpdatePlayerGameAccountUseCase } from "./update-player-game-account/update-player-game-account.use-case.ts";
import { AssociatePlayerExternalClubUseCase } from "./associate-player-external-club/associate-player-external-club.use-case.ts";
import { EnsurePlayerProfileUseCase } from "./ensure-player-profile/ensure-player-profile.use-case.ts";
import { GetPlayerProfileUseCase } from "./get-player-profile/get-player-profile.use-case.ts";
import { LinkProviderExternalPlayerIdUseCase } from "./link-provider-external-player-id/link-provider-external-player-id.use-case.ts";

class Profiles implements PlayerProfileRepository {
  rows: PlayerProfile[] = [];
  async findById(playerProfileId: string) {
    return this.rows.find((row) => row.id === playerProfileId) ?? null;
  }
  async findByActor(actorId: PlayerProfile["actorId"]) {
    return this.rows.find((row) => row.actorId === actorId) ?? null;
  }
  async saveIfAbsent(profile: PlayerProfile) {
    const existing = await this.findByActor(profile.actorId);
    if (existing) return existing;
    this.rows.push(profile);
    return profile;
  }
}

class Associations implements PlayerExternalClubAssociationRepository {
  rows = new Map<string, PlayerExternalClubAssociation>();

  private key(association: PlayerExternalClubAssociation) {
    return `${association.playerProfileId}:${association.providerKey}:${association.externalClubId}`;
  }

  async listByPlayerProfile(playerProfileId: string) {
    return [...this.rows.values()]
      .filter((row) => row.playerProfileId === playerProfileId)
      .sort(compareByTime((item) => item.associatedAt, TIME_SORT_DIRECTION.desc));
  }

  async upsertForPlayerProfile(association: PlayerExternalClubAssociation) {
    const key = this.key(association);
    const existing = this.rows.get(key);
    const next = existing ? { ...association, associatedAt: existing.associatedAt } : association;
    this.rows.set(key, next);
    return next;
  }
}

class Accounts implements PlayerGameAccountRepository {
  rows: PlayerGameAccount[] = [];
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByProfile(playerProfileId: string) {
    return this.rows.filter((row) => row.playerProfileId === playerProfileId);
  }
  async findByNormalizedIdentifier(normalizedIdentifier: string) {
    return this.rows.filter((row) => row.normalizedIdentifier === normalizedIdentifier);
  }
  async saveIfAbsent(account: PlayerGameAccount) {
    const existing = this.rows.find(
      (row) =>
        row.playerProfileId === account.playerProfileId &&
        row.normalizedIdentifier === account.normalizedIdentifier &&
        row.platform === account.platform &&
        row.gameEdition === account.gameEdition,
    );
    if (existing) return existing;
    this.rows.push(account);
    return account;
  }
  async updateDeclaredIdentity(account: PlayerGameAccount) {
    const existing = this.rows.find(
      (row) =>
        row.id !== account.id &&
        row.playerProfileId === account.playerProfileId &&
        row.normalizedIdentifier === account.normalizedIdentifier &&
        row.platform === account.platform &&
        row.gameEdition === account.gameEdition,
    );
    if (existing) {
      throw new GameAccountConflict({
        code: "teams.game_account_conflict",
        message: "Game account already exists",
      });
    }
    const index = this.rows.findIndex((row) => row.id === account.id);
    if (index < 0) return null;
    this.rows[index] = account;
    return account;
  }
  async setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }) {
    const index = this.rows.findIndex((row) => row.id === input.accountId);
    if (index < 0) return null;
    const updated = {
      ...this.rows[index],
      providerExternalPlayerId: input.providerExternalPlayerId,
    };
    this.rows[index] = updated;
    return updated;
  }
  async findByCorrelation(input: {
    readonly platform: PlayerGameAccount["platform"];
    readonly gameEdition: string;
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }) {
    return this.rows.filter(
      (row) =>
        row.platform === input.platform &&
        row.gameEdition === input.gameEdition &&
        ((input.providerExternalPlayerId !== undefined &&
          row.providerExternalPlayerId === input.providerExternalPlayerId) ||
          (input.normalizedIdentifier !== undefined &&
            row.normalizedIdentifier === input.normalizedIdentifier)),
    );
  }
}

function dependencies() {
  let sequence = 0;
  return {
    clock: { now: () => new Date("2026-07-31T12:00:00.000Z") },
    ids: { generate: () => `id-${++sequence}` },
  };
}

describe("player profile use cases", () => {
  it("ensures one profile per actor", async () => {
    const profiles = new Profiles();
    const useCase = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const actorId = asActorId("actor-1");

    const first = await useCase.execute({ actorId });
    const retried = await useCase.execute({ actorId });

    expect(retried.id).toBe(first.id);
    expect(profiles.rows).toHaveLength(1);
  });

  it("normalizes and idempotently adds a declared EA account", async () => {
    const accounts = new Accounts();
    const useCase = new AddPlayerGameAccountUseCase({ accounts, ...dependencies() });
    const input = {
      playerProfileId: "profile-1",
      identifier: "  Gamer23 ",
      platform: "playstation" as const,
      gameEdition: " FC 26 ",
      providerExternalPlayerId: "  provider-player-23 ",
    };

    const first = await useCase.execute(input);
    const retried = await useCase.execute({ ...input, identifier: "gamer23" });

    expect(first.isOk() && first.value).toMatchObject({
      identifier: "Gamer23",
      normalizedIdentifier: "gamer23",
      providerExternalPlayerId: "provider-player-23",
    });
    expect(retried.isOk() && first.isOk() && retried.value.id).toBe(
      first.isOk() ? first.value.id : "",
    );
    expect(accounts.rows).toHaveLength(1);
  });

  it("links a provider external player id to an existing account", async () => {
    const accounts = new Accounts();
    const added = await new AddPlayerGameAccountUseCase({
      accounts,
      ...dependencies(),
    }).execute({
      playerProfileId: "profile-1",
      identifier: "Gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) return;

    const linked = await new LinkProviderExternalPlayerIdUseCase({ accounts }).execute({
      accountId: added.value.id,
      providerExternalPlayerId: " provider-player-23 ",
    });

    expect(linked.isOk()).toBe(true);
    expect(linked.isOk() && linked.value.providerExternalPlayerId).toBe("provider-player-23");
    expect(accounts.rows[0]?.providerExternalPlayerId).toBe("provider-player-23");
  });

  it("rejects incomplete account values", async () => {
    const useCase = new AddPlayerGameAccountUseCase({
      accounts: new Accounts(),
      ...dependencies(),
    });
    const result = await useCase.execute({
      playerProfileId: "profile-1",
      identifier: " ",
      platform: "pc",
      gameEdition: "FC 26",
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && InvalidGameAccountIdentifier.is(result.error)).toBe(true);
  });

  it("updates a declared identity in place and keeps the account id", async () => {
    const accounts = new Accounts();
    const added = await new AddPlayerGameAccountUseCase({
      accounts,
      ...dependencies(),
    }).execute({
      playerProfileId: "profile-1",
      identifier: "Gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) return;
    await new LinkProviderExternalPlayerIdUseCase({ accounts }).execute({
      accountId: added.value.id,
      providerExternalPlayerId: "provider-player-23",
    });

    const updated = await new UpdatePlayerGameAccountUseCase({ accounts }).execute({
      accountId: added.value.id,
      playerProfileId: "profile-1",
      identifier: "  Davos282 ",
      platform: "xbox",
      gameEdition: " FC 25 ",
    });

    expect(updated.isOk() && updated.value).toMatchObject({
      id: added.value.id,
      identifier: "Davos282",
      normalizedIdentifier: "davos282",
      platform: "xbox",
      gameEdition: "FC 25",
      providerExternalPlayerId: null,
    });
    expect(accounts.rows).toHaveLength(1);
  });

  it("keeps the provider id when only identifier casing changes", async () => {
    const accounts = new Accounts();
    const added = await new AddPlayerGameAccountUseCase({
      accounts,
      ...dependencies(),
    }).execute({
      playerProfileId: "profile-1",
      identifier: "Gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) return;
    await new LinkProviderExternalPlayerIdUseCase({ accounts }).execute({
      accountId: added.value.id,
      providerExternalPlayerId: "provider-player-23",
    });

    const updated = await new UpdatePlayerGameAccountUseCase({ accounts }).execute({
      accountId: added.value.id,
      playerProfileId: "profile-1",
      identifier: "GAMER23",
      platform: "playstation",
      gameEdition: "FC 26",
    });

    expect(updated.isOk() && updated.value).toMatchObject({
      id: added.value.id,
      identifier: "GAMER23",
      normalizedIdentifier: "gamer23",
      providerExternalPlayerId: "provider-player-23",
    });
  });

  it("rejects an update that collides with another of the player's accounts", async () => {
    const accounts = new Accounts();
    const add = new AddPlayerGameAccountUseCase({ accounts, ...dependencies() });
    const first = await add.execute({
      playerProfileId: "profile-1",
      identifier: "Gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
    });
    const second = await add.execute({
      playerProfileId: "profile-1",
      identifier: "Davos282",
      platform: "xbox",
      gameEdition: "FC 26",
    });
    expect(first.isOk() && second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;

    const updated = await new UpdatePlayerGameAccountUseCase({ accounts }).execute({
      accountId: first.value.id,
      playerProfileId: "profile-1",
      identifier: "davos282",
      platform: "xbox",
      gameEdition: "FC 26",
    });

    expect(updated.isOk()).toBe(false);
    expect(!updated.isOk() && GameAccountConflict.is(updated.error)).toBe(true);
    expect(accounts.rows[0]?.identifier).toBe("Gamer23");
  });

  it("rejects updates for a missing account or a different profile", async () => {
    const accounts = new Accounts();
    const added = await new AddPlayerGameAccountUseCase({
      accounts,
      ...dependencies(),
    }).execute({
      playerProfileId: "profile-1",
      identifier: "Gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
    });
    expect(added.isOk()).toBe(true);
    if (!added.isOk()) return;
    const useCase = new UpdatePlayerGameAccountUseCase({ accounts });

    const missing = await useCase.execute({
      accountId: "missing",
      playerProfileId: "profile-1",
      identifier: "Davos282",
      platform: "xbox",
      gameEdition: "FC 26",
    });
    const foreign = await useCase.execute({
      accountId: added.value.id,
      playerProfileId: "profile-2",
      identifier: "Davos282",
      platform: "xbox",
      gameEdition: "FC 26",
    });
    const invalidEdition = await useCase.execute({
      accountId: added.value.id,
      playerProfileId: "profile-1",
      identifier: "Davos282",
      platform: "xbox",
      gameEdition: " ",
    });

    expect(!missing.isOk() && GameAccountNotFound.is(missing.error)).toBe(true);
    expect(!foreign.isOk() && GameAccountNotFound.is(foreign.error)).toBe(true);
    expect(!invalidEdition.isOk() && InvalidGameEdition.is(invalidEdition.error)).toBe(true);
  });

  it("associates an external club with a player profile", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock: dependencies().clock,
    });
    const profile = await ensure.execute({ actorId: asActorId("actor-1") });

    const result = await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-9",
        name: "Night Owls",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: "https://example.com/crests/l9.png",
      },
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toMatchObject({
      playerProfileId: profile.id,
      externalClubId: "club-9",
      externalClubName: "Night Owls",
      platform: "common-gen5",
      imageUrl: "https://example.com/crests/l9.png",
    });
  });

  it("keeps both associations when a second club is added", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    let tick = 0;
    const clock = {
      now: () => new Date(Date.UTC(2026, 6, 31, 12, 0, tick++)),
    };
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock,
    });
    const profile = await ensure.execute({ actorId: asActorId("actor-1") });
    await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-1",
        name: "First",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    });

    const result = await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-2",
        name: "Second",
        platform: "ps5",
        gameEdition: "fc26",
        imageUrl: "https://example.com/crests/l2.png",
      },
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value.externalClubId).toBe("club-2");
    const listed = await associations.listByPlayerProfile(profile.id);
    expect(listed.map((row) => row.externalClubId)).toEqual(["club-2", "club-1"]);
  });

  it("upserts metadata when the same club is associated again", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock: dependencies().clock,
    });
    const profile = await ensure.execute({ actorId: asActorId("actor-1") });
    await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-1",
        name: "Old Name",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    });

    const result = await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-1",
        name: "New Name",
        platform: "ps5",
        gameEdition: "fc26",
        imageUrl: "https://example.com/crests/l1.png",
      },
    });

    expect(result.isOk()).toBe(true);
    const listed = await associations.listByPlayerProfile(profile.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      externalClubId: "club-1",
      externalClubName: "New Name",
      platform: "ps5",
      imageUrl: "https://example.com/crests/l1.png",
      associatedAt: new Date("2026-07-31T12:00:00.000Z"),
    });
  });

  it("allows two profiles to share the same external club", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock: dependencies().clock,
    });
    const first = await ensure.execute({ actorId: asActorId("actor-1") });
    const second = await ensure.execute({ actorId: asActorId("actor-2") });
    const club = {
      providerKey: "ea-clubs" as const,
      externalClubId: "shared-club",
      name: "Shared FC",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: null,
    };

    const firstResult = await associate.execute({ playerProfileId: first.id, club });
    const secondResult = await associate.execute({ playerProfileId: second.id, club });

    expect(firstResult.isOk()).toBe(true);
    expect(secondResult.isOk()).toBe(true);
    expect(associations.rows.size).toBe(2);
  });

  it("rejects association for a missing player profile", async () => {
    const result = await new AssociatePlayerExternalClubUseCase({
      profiles: new Profiles(),
      associations: new Associations(),
      clock: dependencies().clock,
    }).execute({
      playerProfileId: "missing",
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-1",
        name: "Ghost",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && PlayerProfileNotFound.is(result.error)).toBe(true);
  });

  it("returns the external club association with the player profile", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    const accounts = new Accounts();
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock: dependencies().clock,
    });
    const getProfile = new GetPlayerProfileUseCase(profiles, accounts, associations);
    const profile = await ensure.execute({ actorId: asActorId("actor-1") });
    await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-7",
        name: "Readers FC",
        platform: "xbox",
        gameEdition: "fc26",
        imageUrl: "https://example.com/crests/l7.png",
      },
    });

    const details = await getProfile.execute({ actorId: asActorId("actor-1") });
    expect(details.externalClubs).toHaveLength(1);
    expect(details.externalClubs[0]).toMatchObject({
      externalClubId: "club-7",
      externalClubName: "Readers FC",
      imageUrl: "https://example.com/crests/l7.png",
    });
  });

  it("lists multiple external club associations newest first", async () => {
    const profiles = new Profiles();
    const associations = new Associations();
    const accounts = new Accounts();
    let tick = 0;
    const clock = {
      now: () => new Date(Date.UTC(2026, 6, 31, 12, 0, tick++)),
    };
    const ensure = new EnsurePlayerProfileUseCase({ profiles, ...dependencies() });
    const associate = new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock,
    });
    const getProfile = new GetPlayerProfileUseCase(profiles, accounts, associations);
    const profile = await ensure.execute({ actorId: asActorId("actor-1") });
    await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-a",
        name: "Alpha",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    });
    await associate.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-b",
        name: "Beta",
        platform: "ps5",
        gameEdition: "fc26",
        imageUrl: null,
      },
    });

    const details = await getProfile.execute({ actorId: asActorId("actor-1") });
    expect(details.externalClubs.map((row) => row.externalClubId)).toEqual(["club-b", "club-a"]);
  });
});
