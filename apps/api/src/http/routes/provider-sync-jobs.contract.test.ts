import { describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { createFetch } from "@/http/http-app.harness.ts";

const PATH = "/internal/game-data/sync-jobs/{jobId}/run";
const secret = "provider-job-secret";

describe("provider sync-run OpenAPI contract", () => {
  it("matches 409 with messageKey when the job is not claimable", async () => {
    const app = createApp({
      modules: createModules({
        fetcher: createFetch(() => Response.json([])),
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        pool: undefined,
      }),
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: secret,
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    const res = await app.request("/api/v1/internal/game-data/sync-jobs/job-missing/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });
    expect(res.status).toBe(409);
    expect(await res.clone().json()).toMatchObject({
      code: "game_data.sync_job_not_claimable",
      messageKey: "errors.game_data.sync_job_not_claimable",
    });
    await expectMatchesOpenApi(res, "post", PATH);
  });
});
