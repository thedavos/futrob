import { describe, expect, it } from "vite-plus/test";
import { registerWorkers } from "./register-workers.ts";

describe("registerWorkers", () => {
  it("acknowledges completed jobs and retries transient runner failures", async () => {
    const responses = [
      Response.json(jobResponse("succeeded", null)),
      Response.json(jobResponse("retry_scheduled", "2026-08-11T12:00:07.000Z")),
      new Response(null, { status: 503 }),
    ];
    const workers = registerWorkers({
      fetcher: (async () =>
        responses.shift() ?? new Response(null, { status: 500 })) as typeof fetch,
      apiBaseUrl: "https://api.futrob.test/api/v1",
      internalJobSecret: "secret",
      now: () => new Date("2026-08-11T12:00:00.000Z"),
    });
    const actions: string[] = [];
    const message = (jobId: string) => ({
      body: { jobId, requestId: "b0e3c6fa-fe1e-4866-8573-84ba9e52e437" },
      ack: () => actions.push(`ack:${jobId}`),
      retry: (options?: { delaySeconds?: number }) =>
        actions.push(`retry:${jobId}:${options?.delaySeconds ?? 0}`),
    });

    await workers.queue({ messages: [message("job-1"), message("job-2"), message("job-3")] });

    expect(actions).toEqual(
      expect.arrayContaining(["ack:job-1", "retry:job-2:7", "retry:job-3:0"]),
    );
  });
});

function jobResponse(status: "succeeded" | "retry_scheduled", availableAt: string | null) {
  return {
    id: "job-1",
    organizationId: "org-1",
    providerKey: "ea-clubs",
    status,
    attempt: 1,
    maxAttempts: 4,
    requestId: "b0e3c6fa-fe1e-4866-8573-84ba9e52e437",
    availableAt,
    leaseExpiresAt: null,
    updatedAt: "2026-08-11T12:00:00.000Z",
    ...(status === "retry_scheduled" ? { lastErrorCode: "game_data.ea_clubs_timeout" } : {}),
  };
}
