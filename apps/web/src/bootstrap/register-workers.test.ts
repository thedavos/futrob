import { describe, expect, it } from "vite-plus/test";
import { registerWorkers } from "./register-workers.ts";

describe("registerWorkers", () => {
  it("acknowledges completed jobs and retries transient runner failures", async () => {
    const statuses = [200, 503];
    const workers = registerWorkers({
      fetcher: (async () => new Response(null, { status: statuses.shift() })) as typeof fetch,
      apiBaseUrl: "https://api.futrob.test",
      internalJobSecret: "secret",
    });
    const actions: string[] = [];
    const message = (jobId: string) => ({
      body: { jobId, requestId: "b0e3c6fa-fe1e-4866-8573-84ba9e52e437" },
      ack: () => actions.push(`ack:${jobId}`),
      retry: () => actions.push(`retry:${jobId}`),
    });

    await workers.queue({ messages: [message("job-1"), message("job-2")] });

    expect(actions).toEqual(expect.arrayContaining(["ack:job-1", "retry:job-2"]));
  });
});
