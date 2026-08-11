import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { PlayerExternalClubAssociation } from "../domain/entities/player-external-club-association.ts";
import type { PlayerGameAccount } from "../domain/entities/player-game-account.ts";
import {
  InvalidGameAccountIdentifier,
  PlayerProfileNotFound,
} from "../domain/errors/team.errors.ts";
import type { PlayerProfile } from "../domain/entities/player-profile.ts";
import type { PlayerExternalClubAssociationRepository } from "../domain/ports/player-external-club-association.repository.ts";
import type { PlayerGameAccountRepository } from "../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../domain/ports/player-profile.repository.ts";
import { AddPlayerGameAccountUseCase } from "./add-player-game-account/add-player-game-account.use-case.ts";
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
  async findByPlayerProfile(playerProfileId: string) {
    return this.rows.get(playerProfileId) ?? null;
  }
  async upsertForPlayerProfile(association: PlayerExternalClubAssociation) {
    this.rows.set(association.playerProfileId, association);
    return association;
  }
}

class Accounts implements PlayerGameAccountRepository {
  rows: PlayerGameAccount[] = [];
  async listByProfile(playerProfileId: string) {
    return this.rows.filter((row) => row.playerProfileId === playerProfileId);
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
  async setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }) {
    const index = this.rows.findIndex((row) => row.id === input.accountId);
    if (index < 0) return null;
    const updated = { ...this.rows[index], providerExternalPlayerId: input.providerExternalPlayerId };
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

  it("upserts the association for the same profile", async () => {
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
    expect(await associations.findByPlayerProfile(profile.id)).toMatchObject({
      externalClubId: "club-2",
      externalClubName: "Second",
      imageUrl: "https://example.com/crests/l2.png",
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
      imageUrl: null as string | null,
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
    expect(details.externalClub).toMatchObject({
      externalClubId: "club-7",
      externalClubName: "Readers FC",
      imageUrl: "https://example.com/crests/l7.png",
    });
  });
});
