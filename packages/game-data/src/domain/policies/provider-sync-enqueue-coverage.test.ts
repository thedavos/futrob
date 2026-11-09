import { describe, expect, it } from "vite-plus/test";
import type { ProviderSyncJob } from "../entities/provider-sync-job.ts";
import {
  PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS,
  providerSyncStillCovered,
} from "./provider-sync-enqueue-coverage.ts";

const now = new Date("2026-10-10T20:00:00.000Z");

function finished(status: "succeeded" | "dead", completedAt: Date): ProviderSyncJob {
  const base = {
    id: "job-1",
    organizationId: "org-1",
    providerKey: "ea-clubs" as const,
    kind: "recent-matches" as const,
    sync: {
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "leagueMatch",
      maxResultCount: 50,
    },
    dedupeKey: "recent-matches:ea-clubs:10754:common-gen5:fc26:leaguematch:50",
    requestId: "request-1",
    attempt: 1,
    maxAttempts: 4,
    createdAt: completedAt,
    updatedAt: completedAt,
    completedAt,
  };
  return status === "succeeded"
    ? { ...base, status }
    : { ...base, status, lastErrorCode: "game_data.ea_clubs_timeout" };
}

describe("providerSyncStillCovered", () => {
  it("treats an active job as covered and a missing job as open", () => {
    const queued = finished("succeeded", now);
    const active = { ...queued, status: "queued" as const, availableAt: now };
    expect(providerSyncStillCovered(active, now, PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS)).toBe(true);
    expect(providerSyncStillCovered(null, now, PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS)).toBe(false);
  });

  it("keeps a finished job covered until the cooldown elapses", () => {
    const inside = new Date(now.getTime() - PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS + 1);
    const elapsed = new Date(now.getTime() - PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS);
    expect(
      providerSyncStillCovered(
        finished("succeeded", inside),
        now,
        PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS,
      ),
    ).toBe(true);
    expect(
      providerSyncStillCovered(finished("dead", elapsed), now, PROVIDER_SYNC_ENQUEUE_COOLDOWN_MS),
    ).toBe(false);
  });
});
