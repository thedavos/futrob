import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vite-plus/test";
import { ProviderSchemaError, ProviderTimeout } from "@futrob/game-data";
import { createFetch } from "@/http/http-app.harness.ts";
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

  it("treats an empty EA match payload as no matches on HTTP 200", async () => {
    const outcomes: string[] = [];
    const adapter = new EaClubsGameDataAdapter({
      fetcher: createFetch(
        async () =>
          new Response("{}", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      health: {
        record: (event) => {
          outcomes.push(event.outcome);
          return Promise.resolve();
        },
        getSnapshot: () => Promise.reject(new Error("unused")),
      },
    });

    const result = await adapter.ingestRecentMatches(input);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.observations).toEqual([]);
    expect(result.value.matches).toEqual([]);
    expect(outcomes).toEqual(["success"]);
  });
  it.each(["timeout", "malformed"])(
    "preserves %s classification through the adapter and health boundary",
    async (outcome) => {
      vi.useFakeTimers();
      let attempts = 0;
      const outcomes: string[] = [];
      try {
        const adapter = new EaClubsGameDataAdapter({
          baseUrl: "https://example.test",
          timeoutMs: 100,
          fetcher: async (_input, init) => {
            attempts += 1;
            return outcome === "malformed"
              ? new Response("{invalid")
              : new Response(
                  new ReadableStream({
                    start(controller) {
                      init?.signal?.addEventListener(
                        "abort",
                        () => controller.error(new TypeError("body aborted")),
                        { once: true },
                      );
                    },
                  }),
                );
          },
          health: {
            record: async (event) => {
              outcomes.push(event.outcome);
            },
            getSnapshot: async () => {
              throw new Error("unused");
            },
          },
        });
        const pending = adapter.getClubInfo(input);
        await vi.runAllTimersAsync();
        const result = await pending;
        expect(result.isOk()).toBe(false);
        if (!result.isOk()) {
          expect(
            outcome === "timeout"
              ? ProviderTimeout.is(result.error)
              : ProviderSchemaError.is(result.error),
          ).toBe(true);
        }
        expect(attempts).toBe(outcome === "timeout" ? 3 : 1);
        expect(outcomes).toEqual([outcome === "timeout" ? "timeout" : "schema"]);
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
