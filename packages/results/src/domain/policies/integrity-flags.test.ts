import { describe, expect, it } from "vite-plus/test";
import type { ProviderMatch } from "@futrob/game-data";
import { integrityFlagsFor } from "./integrity-flags.ts";

function match(metadata: Partial<ProviderMatch["metadata"]>): ProviderMatch {
  return {
    id: "id",
    provider: { key: "ea-clubs", externalMatchId: "m" },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date("2026-09-14T20:00:00.000Z"),
    home: { externalClubId: "h", name: "H", goals: 1, imageUrl: null },
    away: { externalClubId: "a", name: "A", goals: 0, imageUrl: null },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
      ...metadata,
    },
  };
}

const providerMatchRef = { providerKey: "ea-clubs" as const, externalId: "m" };

describe("integrityFlagsFor", () => {
  it("raises no flag for a complete, uninterrupted match", () => {
    expect(integrityFlagsFor([{ providerMatchRef, match: match({}) }])).toEqual([]);
  });

  it("flags incomplete data and disconnections with stable codes", () => {
    expect(
      integrityFlagsFor([
        { providerMatchRef, match: match({ completeness: "partial", wasDisconnected: true }) },
      ]).map((flag) => flag.code),
    ).toEqual(["provider_data_incomplete", "provider_match_disconnected"]);
  });
});
