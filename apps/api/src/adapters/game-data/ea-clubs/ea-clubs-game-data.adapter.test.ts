import { createHash } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import { EaClubsGameDataAdapter } from "./ea-clubs-game-data.adapter.ts";

const input = {
  externalClubId: "100",
  platform: "common-gen5",
  gameEdition: "fc26",
  matchType: "friendlyMatch",
  maxResultCount: 10,
};

describe("EaClubsGameDataAdapter", () => {
  it("keeps the raw match payload and hashes its stable JSON representation", async () => {
    const payload = {
      matchId: 42,
      timestamp: "1786406400",
      clubs: {
        "100": {
          goals: "2",
          details: { name: "Home", clubId: "100" },
        },
        "200": {
          goals: "1",
          details: { name: "Away", clubId: "200" },
        },
      },
      players: {},
      providerOnlyField: { retained: true },
    };
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify([payload]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const adapter = new EaClubsGameDataAdapter({
      fetcher,
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
    });

    const result = await adapter.ingestRecentMatches(input);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.observations).toHaveLength(1);
    expect(result.value.observations[0]).toMatchObject({
      providerKey: "ea-clubs",
      resourceType: "match",
      externalResourceId: "42",
      endpointKey: "/clubs/matches",
      payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
      storageRef: "inline",
      payload,
      httpStatus: 200,
      schemaVersion: "ea-clubs.match.v1",
    });
    expect(result.value.matches[0]).toMatchObject({
      provider: { externalMatchId: "42" },
      home: { goals: 2 },
      away: { goals: 1 },
    });
  });
});
