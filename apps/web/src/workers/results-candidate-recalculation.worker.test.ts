import { describe, expect, it } from "vite-plus/test";
import { recoverCandidateRecalculation } from "./results-candidate-recalculation.worker.ts";

describe("Cron candidate recalculation wake-up", () => {
  it("calls the durable API runner using only service auth", async () => {
    const sent: Array<{ url: string; init: RequestInit | undefined }> = [];
    await recoverCandidateRecalculation({
      apiBaseUrl: "https://api.futrob.test/api/v1/",
      internalJobSecret: "recalculation-secret",
      fetcher: async (url, init) => {
        sent.push({ url: String(url), init });
        return Response.json({ recalculated: 1 });
      },
    });
    expect(sent).toEqual([
      {
        url: "https://api.futrob.test/api/v1/internal/results/candidate-recalculation/run",
        init: { method: "POST", headers: { Authorization: "Bearer recalculation-secret" } },
      },
    ]);
  });

  it.each([401, 503])("surfaces HTTP %i for the Cron error boundary", async (status) => {
    await expect(
      recoverCandidateRecalculation({
        apiBaseUrl: "https://api.futrob.test/api/v1",
        internalJobSecret: "recalculation-secret",
        fetcher: async () => new Response(null, { status }),
      }),
    ).rejects.toThrow(`Candidate recalculation returned ${status}`);
  });
});
