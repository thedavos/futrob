import { createServer } from "node:http";
import { describe, expect, it } from "vite-plus/test";
import { ProviderNetworkError, ProviderTimeout } from "@futrob/game-data";
import { EaClubsHttpClient } from "./ea-clubs-http.ts";
import type { ProviderCircuitBreaker } from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";

function circuitRecorder(events: string[]): ProviderCircuitBreaker {
  return {
    getProviderState: async () => "closed",
    beforeRequest: async () => ({ allowed: true, state: "closed" }),
    recordSuccess: async () => {
      events.push("success");
    },
    recordTransientFailure: async () => {
      events.push("failure");
    },
  };
}

const retry = {
  maxAttempts: 3,
  baseDelayMs: 0,
  maxDelayMs: 0,
  sleep: async () => {},
  random: () => 0,
};

describe("EA body download", () => {
  it.each([false, true])("handles real body timeouts with recovery=%s", async (recover) => {
    let attempts = 0;
    const events: string[] = [];
    const server = createServer((_request, response) => {
      attempts += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      if (recover && attempts === 3) response.end('{"ok":true}');
      else response.write('{"ok":');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing server address");
    try {
      const client = new EaClubsHttpClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
        fetcher: fetch,
        timeoutMs: 100,
        retry,
        circuit: circuitRecorder(events),
      });
      const result = await client.getJson("/clubs/info", {});
      if (recover) {
        expect(result.isOk()).toBe(true);
        if (result.isOk()) expect(result.value).toEqual({ ok: true });
      } else {
        expect(result.isOk()).toBe(false);
        if (!result.isOk()) expect(ProviderTimeout.is(result.error)).toBe(true);
      }
      expect(attempts).toBe(3);
      expect(events).toEqual([recover ? "success" : "failure"]);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("retries body stream failures and records final network failure", async () => {
    let attempts = 0;
    const events: string[] = [];
    const client = new EaClubsHttpClient({
      baseUrl: "https://example.test",
      timeoutMs: 1_000,
      retry,
      circuit: circuitRecorder(events),
      fetcher: async () => {
        attempts += 1;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new TypeError("download failed"));
            },
          }),
        );
      },
    });
    const result = await client.getJson("/clubs/info", {});
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) expect(ProviderNetworkError.is(result.error)).toBe(true);
    expect(attempts).toBe(3);
    expect(events).toEqual(["failure"]);
  });

  it.each([200, 204])(
    "preserves invalid JSON/empty response fallback for status %s",
    async (status) => {
      let attempts = 0;
      const events: string[] = [];
      const client = new EaClubsHttpClient({
        baseUrl: "https://example.test",
        timeoutMs: 1_000,
        retry,
        circuit: circuitRecorder(events),
        fetcher: async () => {
          attempts += 1;
          return new Response(status === 204 ? null : "{invalid", { status });
        },
      });
      const result = await client.getJson("/clubs/info", {});
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBeNull();
      expect(attempts).toBe(1);
      expect(events).toEqual(["success"]);
    },
  );
});
