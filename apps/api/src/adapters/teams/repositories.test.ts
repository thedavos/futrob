import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import type { Pool } from "pg";
import {
  InMemoryPlayerGameAccountRepository,
  InMemoryPlayerProfileRepository,
} from "./in-memory.repository.ts";
import {
  PostgresPlayerGameAccountRepository,
  PostgresPlayerProfileRepository,
} from "./postgres.repository.ts";

const createdAt = new Date("2026-07-31T12:00:00.000Z");

describe("teams persistence adapters", () => {
  it("keeps profiles and accounts idempotent in memory", async () => {
    const profiles = new InMemoryPlayerProfileRepository();
    const accounts = new InMemoryPlayerGameAccountRepository();
    const profile = { id: "profile-1", actorId: asActorId("actor-1"), createdAt };
    expect((await profiles.saveIfAbsent(profile)).id).toBe("profile-1");
    expect((await profiles.saveIfAbsent({ ...profile, id: "profile-2" })).id).toBe("profile-1");

    const account = {
      id: "account-1",
      playerProfileId: profile.id,
      identifier: "Gamer23",
      normalizedIdentifier: "gamer23",
      platform: "playstation" as const,
      gameEdition: "FC 26",
      createdAt,
    };
    expect((await accounts.saveIfAbsent(account)).id).toBe("account-1");
    expect((await accounts.saveIfAbsent({ ...account, id: "account-2" })).id).toBe("account-1");
  });

  it("rehydrates rows returned by Postgres upserts", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: "profile-1", actor_id: "actor-1", created_at: createdAt }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "account-1",
            player_profile_id: "profile-1",
            identifier: "Gamer23",
            normalized_identifier: "gamer23",
            platform: "playstation",
            game_edition: "FC 26",
            created_at: createdAt,
          },
        ],
      });
    const pool = { query } as unknown as Pool;
    const profile = await new PostgresPlayerProfileRepository(pool).saveIfAbsent({
      id: "profile-new",
      actorId: asActorId("actor-1"),
      createdAt,
    });
    const account = await new PostgresPlayerGameAccountRepository(pool).saveIfAbsent({
      id: "account-new",
      playerProfileId: profile.id,
      identifier: "Gamer23",
      normalizedIdentifier: "gamer23",
      platform: "playstation",
      gameEdition: "FC 26",
      createdAt,
    });
    expect(profile.actorId).toBe("actor-1");
    expect(account).toMatchObject({ id: "account-1", identifier: "Gamer23" });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
