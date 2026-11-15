import { ok } from "@futrob/shared-kernel";
import { NoopTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { describe, expect, it } from "vite-plus/test";
import {
  DUE_PROVIDER_SYNC_MATCH_TYPES,
  dueProviderSyncTargetsFromSlots,
  dueProviderSyncTargetFeedFromSlots,
  type DueProviderSyncSlot,
} from "./due-provider-sync-target.feed.ts";

import { EnqueueDueProviderSyncsUseCase, EnqueueProviderSyncJobUseCase } from "@futrob/game-data";
import { InMemoryProviderSyncJobRepository } from "./in-memory-provider-sync-job.repository.ts";

const now = new Date("2026-10-10T20:00:00.000Z");

function slot(overrides: Partial<DueProviderSyncSlot> = {}): DueProviderSyncSlot {
  return {
    organizationId: "org-1",
    providerKey: "ea-clubs",
    externalClubId: "club-home",
    platform: "common-gen5",
    gameEdition: "fc26",
    status: "scheduled",
    scheduledStartAt: now,
    ...overrides,
  };
}

describe("dueProviderSyncTargetsFromSlots", () => {
  it("expands each open club inside the candidate window and skips the rest", () => {
    const targets = dueProviderSyncTargetsFromSlots({
      now,
      limit: 20,
      slots: [
        slot(),
        slot({ externalClubId: "club-away" }),
        slot({ externalClubId: "club-home" }),
        slot({
          externalClubId: "club-later",
          scheduledStartAt: new Date("2026-10-11T02:00:00.001Z"),
        }),
        slot({ externalClubId: "club-selected", status: "selected" }),
        slot({ externalClubId: "club-manual", providerKey: "manual" }),
      ],
    });

    expect(targets.map((target) => target.externalClubId)).toEqual([
      ...DUE_PROVIDER_SYNC_MATCH_TYPES.map(() => "club-away"),
      ...DUE_PROVIDER_SYNC_MATCH_TYPES.map(() => "club-home"),
    ]);
    expect(new Set(targets.map((target) => target.matchType))).toEqual(
      new Set(DUE_PROVIDER_SYNC_MATCH_TYPES),
    );
    expect(targets.every((target) => target.maxResultCount === 50)).toBe(true);
  });

  it("keeps the closest kickoff first when the scan limit cuts the list", () => {
    const targets = dueProviderSyncTargetsFromSlots({
      now,
      limit: 1,
      slots: [
        slot({
          externalClubId: "club-far",
          scheduledStartAt: new Date("2026-10-10T21:00:00.000Z"),
        }),
        slot({ externalClubId: "club-now" }),
      ],
    });

    expect(targets).toEqual([
      expect.objectContaining({ externalClubId: "club-now", matchType: "leagueMatch" }),
    ]);
  });
});

describe("in-memory due sync progress", () => {
  it("visits all 82 open clubs while the prefix still has active jobs", async () => {
    const slots = Array.from({ length: 82 }, (_, index) =>
      slot({ externalClubId: `club-${String(index).padStart(3, "0")}` }),
    );
    const jobs = new InMemoryProviderSyncJobRepository();
    let nextId = 0;
    const ids = { generate: () => `progress-${++nextId}` };
    const clock = { now: () => now };
    const useCase = new EnqueueDueProviderSyncsUseCase({
      targets: dueProviderSyncTargetFeedFromSlots(() => slots, jobs),
      jobs,
      enqueue: new EnqueueProviderSyncJobUseCase({
        jobs,
        ids,
        clock,
        maxAttempts: 4,
        transaction: new NoopTransactionPort(),
        quota: { reserve: async () => ok(undefined), release: () => Promise.resolve() },
      }),
      ids,
      clock,
    });
    const counts = new Map<string, number>();
    for (let tick = 0; tick < 13; tick += 1) {
      const result = await useCase.execute();
      expect(result.enqueued).toBeLessThanOrEqual(20);
      for (const ref of result.jobs) {
        const job = await jobs.findById(ref.id);
        if (!job) throw new Error("Persisted job missing");
        const club = job.sync.externalClubId;
        counts.set(club, (counts.get(club) ?? 0) + 1);
      }
    }
    expect(counts.size).toBe(82);
    expect([...counts.values()].every((count) => count === 3)).toBe(true);
    expect((await useCase.execute()).enqueued).toBe(0);
  });
});
