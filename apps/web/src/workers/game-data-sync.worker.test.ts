import { describe, expect, it } from "vite-plus/test";
import { handleGameDataSyncJob, recoverNextProviderSyncJob } from "./game-data-sync.worker.ts";

describe("handleGameDataSyncJob", () => {
  it("wakes the API runner with the persisted job and request identifiers", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      request = { url, init };
      return Response.json(jobResponse("succeeded"));
    }) as typeof fetch;

    const result = await handleGameDataSyncJob(
      {
        jobId: "job/1",
        requestId: "60efe215-1cf7-44ac-bc90-65d8eb4c82b3",
      },
      {
        fetcher,
        apiBaseUrl: "https://api.futrob.test/api/v1/",
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
    expect(result).toEqual({ action: "ack" });
  });

  it("wakes the recovery runner for jobs left queued after a publication failure", async () => {
    let requested = "";
    await recoverNextProviderSyncJob({
      fetcher: (async (input) => {
        requested =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        return new Response(null, { status: 204 });
      }) as typeof fetch,
      apiBaseUrl: "https://api.futrob.test/api/v1",
      internalJobSecret: "secret",
    });

    expect(requested).toBe("https://api.futrob.test/api/v1/internal/game-data/sync-jobs/run-next");
  });

  it("drops unknown jobs and retries durable retry schedules instead of acknowledging them", async () => {
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
    ).resolves.toEqual({ action: "ack" });

    await expect(
      handleGameDataSyncJob(
        { jobId: "job-1", requestId: "84a02caf-7051-4677-9a68-b6329f39e063" },
        {
          ...deps,
          now: () => new Date("2026-08-11T12:00:00.000Z"),
          fetcher: (async () =>
            Response.json({
              id: "job-1",
              organizationId: "org-1",
              providerKey: "ea-clubs",
              status: "retry_scheduled",
              attempt: 1,
              maxAttempts: 4,
              requestId: "84a02caf-7051-4677-9a68-b6329f39e063",
              availableAt: "2026-08-11T12:00:17.000Z",
              leaseExpiresAt: null,
              updatedAt: "2026-08-11T12:00:00.000Z",
              lastErrorCode: "game_data.ea_clubs_timeout",
            })) as typeof fetch,
        },
      ),
    ).resolves.toEqual({ action: "retry", delaySeconds: 17 });
  });
});

function jobResponse(status: "succeeded" | "dead") {
  return {
    id: "job-1",
    organizationId: "org-1",
    providerKey: "ea-clubs",
    status,
    attempt: 1,
    maxAttempts: 4,
    requestId: "60efe215-1cf7-44ac-bc90-65d8eb4c82b3",
    availableAt: null,
    leaseExpiresAt: null,
    updatedAt: "2026-08-11T12:00:00.000Z",
  };
}
