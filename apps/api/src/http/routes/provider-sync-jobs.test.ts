import { describe, expect, it } from "vite-plus/test";
import clubMatchesFixture from "@/adapters/game-data/ea-clubs/fixtures/club-matches.json";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";

const secret = "provider-job-secret";
const requestId = "032141c9-0574-4129-86d4-7192bdbbcadd";

function buildApp(onProviderCall: () => void) {
  const fetcher = (async () => {
    onProviderCall();
    return Response.json(clubMatchesFixture);
  }) as typeof fetch;
  return createApp({
    modules: createModules({
      fetcher,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    }),
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: secret,
    correlationLogger: { info: () => undefined, error: () => undefined },
  });
}

function headers() {
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
  };
}

describe("provider sync job routes", () => {
  it("deduplicates active work and executes a replay only once", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });
    const body = JSON.stringify({
      organizationId: "org-1",
      providerKey: "ea-clubs",
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    });

    const first = await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body,
    });
    const duplicate = await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body,
    });
    const firstJob = (await first.json()) as { id: string };
    const duplicateJob = (await duplicate.json()) as { id: string };
    expect(first.status).toBe(202);
    expect(duplicateJob.id).toBe(firstJob.id);

    const path = `/api/v1/internal/game-data/sync-jobs/${firstJob.id}/run`;
    const run = await app.request(path, { method: "POST", headers: headers() });
    const replay = await app.request(path, { method: "POST", headers: headers() });

    expect(await run.json()).toMatchObject({ status: "succeeded", requestId });
    expect(await replay.json()).toMatchObject({ status: "succeeded", requestId });
    expect(providerCalls).toBe(1);
  });

  it("rejects unauthenticated job execution before provider egress", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });

    const response = await app.request("/api/v1/internal/game-data/sync-jobs/job-1/run", {
      method: "POST",
      headers: { "X-Request-ID": requestId },
    });

    expect(response.status).toBe(401);
    expect(providerCalls).toBe(0);
  });

  it("lets the recovery scheduler drain queued work when publication was interrupted", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });
    await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        organizationId: "org-recovery",
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      }),
    });

    const run = await app.request("/api/v1/internal/game-data/sync-jobs/run-next", {
      method: "POST",
      headers: headers(),
    });
    const empty = await app.request("/api/v1/internal/game-data/sync-jobs/run-next", {
      method: "POST",
      headers: headers(),
    });

    expect(await run.json()).toMatchObject({ status: "succeeded" });
    expect(empty.status).toBe(204);
    expect(providerCalls).toBe(1);
  });
});
