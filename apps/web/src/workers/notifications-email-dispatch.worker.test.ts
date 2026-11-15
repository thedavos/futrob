import { describe, expect, it } from "vite-plus/test";
import { dispatchDueEmails } from "./notifications-email-dispatch.worker.ts";

describe("Cron email dispatch wake-up", () => {
  it("calls the API's email outbox runner with service auth", async () => {
    const sent: Array<{ url: string; init: RequestInit | undefined }> = [];
    await dispatchDueEmails({
      apiBaseUrl: "https://api.futrob.test/api/v1/",
      internalJobSecret: "email-dispatch-secret",
      fetcher: async (url, init) => {
        sent.push({ url: String(url), init });
        return Response.json({ sent: 1, retried: 0, failed: 0, skipped: 0 });
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.futrob.test/api/v1/internal/notifications/email-dispatch/run",
        init: { method: "POST", headers: { Authorization: "Bearer email-dispatch-secret" } },
      },
    ]);
  });

  it("treats a missing provider (503) as nothing to send", async () => {
    await expect(
      dispatchDueEmails({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "email-dispatch-secret",
        fetcher: async () => new Response(null, { status: 503 }),
      }),
    ).resolves.toBeUndefined();
  });

  it.each([401, 500])("surfaces HTTP %i to the Cron error boundary", async (status) => {
    await expect(
      dispatchDueEmails({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "email-dispatch-secret",
        fetcher: async () => new Response(null, { status }),
      }),
    ).rejects.toThrow(`Email dispatch returned ${status}`);
  });
});
