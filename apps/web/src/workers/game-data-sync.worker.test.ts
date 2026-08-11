import { describe, expect, it } from "vite-plus/test";
import { handleGameDataSyncJob } from "./game-data-sync.worker.ts";

describe("handleGameDataSyncJob", () => {
  it("wakes the API runner with the persisted job and request identifiers", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      request = { url, init };
      return Response.json({ status: "succeeded" });
    }) as typeof fetch;

    await handleGameDataSyncJob(
      {
        jobId: "job/1",
        requestId: "60efe215-1cf7-44ac-bc90-65d8eb4c82b3",
      },
      {
        fetcher,
        apiBaseUrl: "https://api.futrob.test/",
        internalJobSecret: "secret",
      },
    );

    expect(request?.url).toBe(
      "https://api.futrob.test/api/v1/internal/game-data/sync-jobs/job%2F1/run",
    );
    expect(request?.init?.headers).toMatchObject({
      Authorization: "Bearer secret",
      "X-Request-ID": "60efe215-1cf7-44ac-bc90-65d8eb4c82b3",
    });
  });

  it("throws for retryable runner failures but treats an active lease as acknowledged", async () => {
    const deps = {
      apiBaseUrl: "https://api.futrob.test",
      internalJobSecret: "secret",
    };
    await expect(
      handleGameDataSyncJob(
        { jobId: "job-1", requestId: "84a02caf-7051-4677-9a68-b6329f39e063" },
        { ...deps, fetcher: (async () => new Response(null, { status: 503 })) as typeof fetch },
      ),
    ).rejects.toThrow("503");
    await expect(
      handleGameDataSyncJob(
        { jobId: "job-1", requestId: "84a02caf-7051-4677-9a68-b6329f39e063" },
        { ...deps, fetcher: (async () => new Response(null, { status: 409 })) as typeof fetch },
      ),
    ).resolves.toBeUndefined();
  });
});
