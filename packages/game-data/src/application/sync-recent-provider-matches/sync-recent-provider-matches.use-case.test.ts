import { describe, expect, it } from "vite-plus/test";
import { ok } from "@futrob/shared-kernel";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { RawProviderObservation } from "../../domain/entities/raw-provider-observation.ts";
import type {
  IngestedProviderMatches,
  ProviderMatchIngestionPort,
} from "../../domain/ports/provider-match-ingestion.port.ts";
import type { ProviderMatchRepository } from "../../domain/ports/provider-match.repository.ts";
import type { RawObservationRepository } from "../../domain/ports/raw-observation.repository.ts";
import { SyncRecentProviderMatchesUseCase } from "./sync-recent-provider-matches.use-case.ts";

const match: ProviderMatch = {
  id: "ea-clubs:1",
  provider: { key: "ea-clubs", externalMatchId: "1" },
  game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
  occurredAt: new Date("2026-01-01T00:00:00.000Z"),
  home: { externalClubId: "a", name: "A", goals: 1 },
  away: { externalClubId: "b", name: "B", goals: 0 },
  players: [],
  metadata: {
    durationSeconds: null,
    wasDisconnected: false,
    winnerByForfeit: false,
    completeness: "partial",
  },
};

class FakeIngestion implements ProviderMatchIngestionPort {
  readonly key = "ea-clubs" as const;
  calls = 0;
  constructor(private readonly payload: IngestedProviderMatches) {}
  ingestRecentMatches() {
    this.calls += 1;
    return Promise.resolve(ok(this.payload));
  }
}

class MemoryRaw implements RawObservationRepository {
  rows: RawProviderObservation[] = [];
  async append(observation: RawProviderObservation) {
    const duplicate = this.rows.some(
      (row) =>
        row.providerKey === observation.providerKey &&
        row.resourceType === observation.resourceType &&
        row.externalResourceId === observation.externalResourceId &&
        row.payloadHash === observation.payloadHash,
    );
    if (!duplicate) {
      this.rows.push(observation);
    }
  }
}

class MemoryMatches implements ProviderMatchRepository {
  byId = new Map<string, ProviderMatch>();
  async upsertMany(matches: readonly ProviderMatch[]) {
    for (const row of matches) {
      this.byId.set(row.id, row);
    }
  }
  async listBetweenClubs() {
    return [...this.byId.values()];
  }
}

describe("SyncRecentProviderMatchesUseCase", () => {
  it("appends raw observations once for the same payload hash and upserts matches", async () => {
    const draft = {
      providerKey: "ea-clubs" as const,
      resourceType: "match" as const,
      externalResourceId: "1",
      endpointKey: "/clubs/matches",
      payloadHash: "abc",
      storageRef: "inline",
      payload: { matchId: "1" },
      observedAt: new Date("2026-01-01T00:00:00.000Z"),
      httpStatus: 200,
      schemaVersion: "ea-clubs.match.v1",
    };
    const ingestion = new FakeIngestion({ observations: [draft], matches: [match] });
    const raw = new MemoryRaw();
    const matches = new MemoryMatches();
    let ids = 0;
    const useCase = new SyncRecentProviderMatchesUseCase({
      ingestions: { get: () => ingestion },
      rawObservations: raw,
      matches,
      ids: { generate: () => `obs-${++ids}` },
    });

    const first = await useCase.execute("ea-clubs", {
      externalClubId: "a",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    });
    const second = await useCase.execute("ea-clubs", {
      externalClubId: "a",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    expect(ingestion.calls).toBe(2);
    expect(raw.rows).toHaveLength(1);
    expect(matches.byId.get("ea-clubs:1")).toMatchObject({ id: "ea-clubs:1" });
  });
});
