import { describe, expect, it } from "vite-plus/test";
import { enqueueProviderSyncJob } from "./provider-sync-job.producer.ts";
import { registerWorkers } from "@/bootstrap/register-workers.ts";

describe("enqueueProviderSyncJob", () => {
  it("publishes only the persisted job identity and correlation ID", async () => {
    const sent: unknown[] = [];
    const job = await enqueueProviderSyncJob({
      enqueue: () =>
        Promise.resolve({
          id: "job-1",
          organizationId: "org-1",
          providerKey: "ea-clubs" as const,
          status: "queued" as const,
          attempt: 0,
          maxAttempts: 4,
          requestId: "f4ca5e4d-ef53-4977-9d4e-f0a68566c6f7",
          availableAt: "2026-08-11T12:00:00.000Z",
          leaseExpiresAt: null,
          updatedAt: "2026-08-11T12:00:00.000Z",
        }),
      queue: {
        async send(message) {
          sent.push(message);
        },
      },
    });

    expect(job.id).toBe("job-1");
    expect(sent).toEqual([{ jobId: "job-1", requestId: "f4ca5e4d-ef53-4977-9d4e-f0a68566c6f7" }]);
  });

  it("carries a persisted job through the queue consumer to a terminal attempt", async () => {
    const queued: unknown[] = [];
    const job = {
      id: "job-2",
      organizationId: "org-1",
      providerKey: "ea-clubs" as const,
      status: "queued" as const,
      attempt: 0,
      maxAttempts: 4,
      requestId: "8e8994da-56e5-4d57-b518-c065a18842cc",
      availableAt: "2026-08-11T12:00:00.000Z",
      leaseExpiresAt: null,
      updatedAt: "2026-08-11T12:00:00.000Z",
    };
    await enqueueProviderSyncJob({
      enqueue: () => Promise.resolve(job),
      queue: { send: async (message) => void queued.push(message) },
    });
    const actions: string[] = [];
    const workers = registerWorkers({
      fetcher: (async () =>
        Response.json({
          ...job,
          status: "succeeded",
          attempt: 1,
          availableAt: null,
        })) as typeof fetch,
      apiBaseUrl: "https://api.futrob.test/api/v1",
      internalJobSecret: "secret",
    });

    await workers.queue({
      messages: queued.map((body) => ({
        body,
        ack: () => actions.push("ack"),
        retry: () => actions.push("retry"),
      })),
    });

    expect(actions).toEqual(["ack"]);
  });
});
