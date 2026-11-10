import { describe, expect, it } from "vite-plus/test";
import { runDueAccountDeletions } from "./identity-account-deletion.worker.ts";

describe("Cron account deletion wake-up", () => {
  it("calls the API job with service auth only", async () => {
    const sent: Array<{ url: string; init: RequestInit | undefined }> = [];
    await runDueAccountDeletions({
      apiBaseUrl: "https://api.futrob.test/api/v1/",
      internalJobSecret: "job-secret",
      fetcher: async (url, init) => {
        sent.push({ url: String(url), init });
        return Response.json({ deleted: 0, postponed: 0 });
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.futrob.test/api/v1/internal/identity/account-deletion/run",
        init: { method: "POST", headers: { Authorization: "Bearer job-secret" } },
      },
    ]);
  });

  it("surfaces a failed run for the Cron error boundary", async () => {
    await expect(
      runDueAccountDeletions({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "job-secret",
        fetcher: async () => new Response(null, { status: 503 }),
      }),
    ).rejects.toThrow("Account deletion run returned 503");
  });
});
