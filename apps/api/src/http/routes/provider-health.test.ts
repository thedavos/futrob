import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "@/adapters/game-data/ea-clubs/fixtures/search-clubs.json";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { asActorId } from "@futrob/shared-kernel";

const secret = "provider-health-secret";
const actorId = "provider-health-admin";

describe("provider health route", () => {
  it("requires platform administration and returns a sanitized real snapshot", async () => {
    const modules = createModules({
      fetcher: (async () => Response.json(searchClubsFixture)) as typeof fetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    });
    await modules.authorization.bootstrapInitialSuperuser(asActorId(actorId));
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: secret,
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    const headers = {
      Authorization: `Bearer ${secret}`,
      "X-Futrob-Actor-Id": actorId,
      "X-Request-ID": "5c9ca832-74f8-45f2-803b-c101e3a9258d",
    };
    const search = await app.request("/api/v1/game-data/clubs/search?query=Fera", { headers });
    expect(search.status).toBe(200);

    const response = await app.request("/api/v1/internal/game-data/providers/ea-clubs/health", {
      headers,
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toMatchObject({
      providerKey: "ea-clubs",
      status: "healthy",
      sampleSize: 1,
      successCount: 1,
      cache: { misses: 0 },
    });
    expect(body).not.toContain("payload");
    expect(body).not.toContain("externalClubId");
    expect(body).not.toContain("requestId");
    expect(body).not.toContain("jobId");
  });

  it("rejects callers without service authentication", async () => {
    const modules = createModules({
      fetcher: (async () => Response.json([])) as typeof fetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    });
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: secret,
      correlationLogger: { info: () => undefined, error: () => undefined },
    });

    const response = await app.request("/api/v1/internal/game-data/providers/ea-clubs/health");
    expect(response.status).toBe(401);
  });
});
