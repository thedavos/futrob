import { describe, expect, it } from "vite-plus/test";
import type { ProviderMatch, RawProviderObservation } from "@futrob/game-data";
import {
  InMemoryProviderMatchRepository,
  InMemoryRawObservationRepository,
} from "./in-memory.repository.ts";

const match: ProviderMatch = {
  id: "ea-clubs:match-1",
  provider: { key: "ea-clubs", externalMatchId: "match-1" },
  game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
  occurredAt: new Date("2026-08-10T12:00:00.000Z"),
  home: { externalClubId: "home", name: "Home", goals: 2 },
  away: { externalClubId: "away", name: "Away", goals: 1 },
  players: [],
  metadata: {
    durationSeconds: null,
    wasDisconnected: false,
    winnerByForfeit: false,
    completeness: "partial",
  },
};

describe("InMemoryRawObservationRepository", () => {
  it("keeps the first immutable observation for an idempotency key", async () => {
    const repository = new InMemoryRawObservationRepository();
    const observation: RawProviderObservation = {
      id: "observation-1",
      providerKey: "ea-clubs",
      resourceType: "match",
      externalResourceId: "match-1",
      endpointKey: "/clubs/matches",
      payloadHash: "hash-1",
      storageRef: "inline",
      payload: { score: "2-1" },
      observedAt: new Date("2026-08-10T12:01:00.000Z"),
      httpStatus: 200,
      schemaVersion: "ea-clubs.match.v1",
    };

    await repository.append(observation);
    await repository.append({
      ...observation,
      id: "observation-2",
      payload: { score: "changed" },
    });

    expect(repository.rows).toEqual([observation]);
  });
});

describe("InMemoryProviderMatchRepository", () => {
  it("upserts by provider identity and lists either club orientation", async () => {
    const repository = new InMemoryProviderMatchRepository();
    const updated = {
      ...match,
      home: { ...match.home, goals: 3 },
    };

    await repository.upsertMany([match]);
    await repository.upsertMany([updated]);

    await expect(
      repository.findByExternalId({
        providerKey: "ea-clubs",
        externalMatchId: "match-1",
      }),
    ).resolves.toEqual(updated);
    await expect(
      repository.listBetweenClubs({
        providerKey: "ea-clubs",
        homeExternalClubId: "away",
        awayExternalClubId: "home",
        from: new Date("2026-08-10T11:59:00.000Z"),
        to: new Date("2026-08-10T12:01:00.000Z"),
      }),
    ).resolves.toEqual([updated]);
  });
});
