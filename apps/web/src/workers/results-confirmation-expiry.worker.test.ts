import { describe, expect, it } from "vite-plus/test";
import { recoverConfirmationExpiry } from "./results-confirmation-expiry.worker.ts";

describe("Cron confirmation expiry wake-up", () => {
  it("calls the durable API runner using only service auth", async () => {
    const sent: Array<{ url: string; init: RequestInit | undefined }> = [];
    await recoverConfirmationExpiry({
      apiBaseUrl: "https://api.futrob.test/api/v1/",
      internalJobSecret: "expiry-secret",
      fetcher: async (url, init) => {
        sent.push({ url: String(url), init });
        return Response.json({ expired: 1, skipped: 0 });
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.futrob.test/api/v1/internal/results/confirmation-expiry/run",
        init: { method: "POST", headers: { Authorization: "Bearer expiry-secret" } },
      },
    ]);
  });
  it.each([401, 503])("surfaces HTTP %i for the Cron error boundary", async (status) => {
    await expect(
      recoverConfirmationExpiry({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "expiry-secret",
        fetcher: async () => new Response(null, { status }),
      }),
    ).rejects.toThrow(`Confirmation expiry recovery returned ${status}`);
  });
});
