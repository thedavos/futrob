import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { PlayerGameAccount } from "../domain/entities/player-game-account.ts";
import { InvalidGameAccountIdentifier } from "../domain/errors/team.errors.ts";
import type { PlayerProfile } from "../domain/entities/player-profile.ts";
import type { PlayerGameAccountRepository } from "../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../domain/ports/player-profile.repository.ts";
import { AddPlayerGameAccountUseCase } from "./add-player-game-account/add-player-game-account.use-case.ts";
import { EnsurePlayerProfileUseCase } from "./ensure-player-profile/ensure-player-profile.use-case.ts";

class Profiles implements PlayerProfileRepository {
  rows: PlayerProfile[] = [];
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
    };

    const first = await useCase.execute(input);
    const retried = await useCase.execute({ ...input, identifier: "gamer23" });

    expect(first.isOk() && first.value).toMatchObject({
      identifier: "Gamer23",
      normalizedIdentifier: "gamer23",
    });
    expect(retried.isOk() && first.isOk() && retried.value.id).toBe(
      first.isOk() ? first.value.id : "",
    );
    expect(accounts.rows).toHaveLength(1);
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
});
