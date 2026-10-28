import { describe, expect, it } from "vite-plus/test";
import {
  DUE_PROVIDER_SYNC_MATCH_TYPES,
  dueProviderSyncTargetsFromSlots,
  type DueProviderSyncSlot,
} from "./due-provider-sync-target.feed.ts";

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
