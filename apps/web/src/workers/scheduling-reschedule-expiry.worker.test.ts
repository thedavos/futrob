import { describe, expect, it } from "vite-plus/test";
import { recoverScheduleChangeExpiry } from "./scheduling-reschedule-expiry.worker.ts";

describe("Cron schedule-change expiry wake-up", () => {
  it("calls Scheduling's durable runner with service auth and no caller clock or actor", async () => {
    const sent: Array<{ url: string; init: RequestInit | undefined }> = [];
    await recoverScheduleChangeExpiry({
      apiBaseUrl: "https://api.futrob.test/api/v1/",
      internalJobSecret: "reschedule-expiry-secret",
      fetcher: async (url, init) => {
        sent.push({ url: String(url), init });
        return Response.json({ escalated: 2, skipped: 1 });
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.futrob.test/api/v1/internal/scheduling/reschedule-expiry/run",
        init: { method: "POST", headers: { Authorization: "Bearer reschedule-expiry-secret" } },
      },
    ]);
  });

  it.each([401, 409, 503])("surfaces HTTP %i to the Cron error boundary", async (status) => {
    await expect(
      recoverScheduleChangeExpiry({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "reschedule-expiry-secret",
        fetcher: async () => new Response(null, { status }),
      }),
    ).rejects.toThrow(`Schedule change expiry recovery returned ${status}`);
  });

  it("propagates a network failure so the next durable sweep can retry", async () => {
    await expect(
      recoverScheduleChangeExpiry({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "reschedule-expiry-secret",
        fetcher: async () => {
          throw new TypeError("API unreachable");
        },
      }),
    ).rejects.toThrow("API unreachable");
  });
});
