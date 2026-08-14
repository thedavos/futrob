import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import type { Pool } from "pg";
import {
  InMemoryPlayerExternalClubAssociationRepository,
  InMemoryPlayerGameAccountRepository,
  InMemoryPlayerProfileRepository,
} from "./in-memory.repository.ts";
import {
  PostgresPlayerExternalClubAssociationRepository,
  PostgresPlayerGameAccountRepository,
  PostgresPlayerProfileRepository,
} from "./postgres.repository.ts";

const createdAt = new Date("2026-07-31T12:00:00.000Z");

describe("teams persistence adapters", () => {
  it("keeps profiles, accounts, and club associations idempotent in memory", async () => {
    const profiles = new InMemoryPlayerProfileRepository();
    const accounts = new InMemoryPlayerGameAccountRepository();
    const associations = new InMemoryPlayerExternalClubAssociationRepository();
    const profile = { id: "profile-1", actorId: asActorId("actor-1"), createdAt };
    expect((await profiles.saveIfAbsent(profile)).id).toBe("profile-1");
    expect((await profiles.saveIfAbsent({ ...profile, id: "profile-2" })).id).toBe("profile-1");
    expect(await profiles.findById("profile-1")).toMatchObject({ id: "profile-1" });

    const account = {
      id: "account-1",
      playerProfileId: profile.id,
      identifier: "Gamer23",
      normalizedIdentifier: "gamer23",
      providerExternalPlayerId: null,
      platform: "playstation" as const,
      gameEdition: "FC 26",
      createdAt,
    };
    expect((await accounts.saveIfAbsent(account)).id).toBe("account-1");
    expect((await accounts.saveIfAbsent({ ...account, id: "account-2" })).id).toBe("account-1");
    const linked = await accounts.setProviderExternalPlayerId({
      accountId: account.id,
      providerExternalPlayerId: "provider-player-23",
    });
    expect(linked?.providerExternalPlayerId).toBe("provider-player-23");
    expect(await accounts.findById(account.id)).toEqual(linked);
    expect(
      await accounts.findByCorrelation({
        platform: account.platform,
        gameEdition: account.gameEdition,
        providerExternalPlayerId: "provider-player-23",
        normalizedIdentifier: account.normalizedIdentifier,
      }),
    ).toEqual([linked]);

    const association = {
      playerProfileId: profile.id,
      providerKey: "ea-clubs" as const,
      externalClubId: "club-9",
      externalClubName: "Night Owls",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: "https://example.com/crests/l9.png",
      associatedAt: createdAt,
    };
    expect((await associations.upsertForPlayerProfile(association)).externalClubId).toBe("club-9");
    expect(
      (
        await associations.upsertForPlayerProfile({
          ...association,
          externalClubId: "club-10",
          externalClubName: "Day Owls",
          imageUrl: null,
          associatedAt: new Date("2026-07-31T12:00:01.000Z"),
        })
      ).externalClubId,
    ).toBe("club-10");
    expect(await associations.listByPlayerProfile(profile.id)).toEqual([
      expect.objectContaining({ externalClubId: "club-10", imageUrl: null }),
      expect.objectContaining({ externalClubId: "club-9", imageUrl: association.imageUrl }),
    ]);
    expect(
      await associations.upsertForPlayerProfile({
        ...association,
        externalClubName: "Night Owls Renamed",
        imageUrl: "https://example.com/crests/l9b.png",
        associatedAt: new Date("2026-07-31T12:00:05.000Z"),
      }),
    ).toMatchObject({
      externalClubId: "club-9",
      externalClubName: "Night Owls Renamed",
      associatedAt: createdAt,
    });
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
            provider_external_player_id: null,
            platform: "playstation",
            game_edition: "FC 26",
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            player_profile_id: "profile-1",
            provider_key: "ea-clubs",
            external_club_id: "club-9",
            external_club_name: "Night Owls",
            platform: "common-gen5",
            game_edition: "fc26",
            image_url: "https://example.com/crests/l9.png",
            associated_at: createdAt,
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
      providerExternalPlayerId: null,
      platform: "playstation",
      gameEdition: "FC 26",
      createdAt,
    });
    const association = await new PostgresPlayerExternalClubAssociationRepository(
      pool,
    ).upsertForPlayerProfile({
      playerProfileId: profile.id,
      providerKey: "ea-clubs",
      externalClubId: "club-new",
      externalClubName: "Ghost Name",
      platform: "ps5",
      gameEdition: "fc26",
      imageUrl: null,
      associatedAt: createdAt,
    });
    expect(profile.actorId).toBe("actor-1");
    expect(account).toMatchObject({ id: "account-1", identifier: "Gamer23" });
    expect(association).toMatchObject({
      externalClubId: "club-9",
      externalClubName: "Night Owls",
      imageUrl: "https://example.com/crests/l9.png",
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("updates and finds a Postgres account by id and provider correlation", async () => {
    const row = {
      id: "account-1",
      player_profile_id: "profile-1",
      identifier: "Gamer23",
      normalized_identifier: "gamer23",
      provider_external_player_id: "provider-player-23",
      platform: "playstation",
      game_edition: "FC 26",
      created_at: createdAt,
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] });
    const repository = new PostgresPlayerGameAccountRepository({
      query,
    } as unknown as Pool);

    const linked = await repository.setProviderExternalPlayerId({
      accountId: row.id,
      providerExternalPlayerId: row.provider_external_player_id,
    });
    const found = await repository.findById(row.id);
    const matches = await repository.findByCorrelation({
      platform: "playstation",
      gameEdition: "FC 26",
      providerExternalPlayerId: row.provider_external_player_id,
    });

    expect(linked?.providerExternalPlayerId).toBe(row.provider_external_player_id);
    expect(found).toEqual(linked);
    expect(matches).toEqual([linked]);
    expect(query.mock.calls[1]?.[1]).toEqual([row.id]);
    expect(query.mock.calls[2]?.[1]).toEqual([
      "playstation",
      "FC 26",
      row.provider_external_player_id,
      null,
    ]);
  });
});
