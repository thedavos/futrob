import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { performanceCompetition } from "@/testing/team-performance.fixture.ts";

describe("internal statistics reconstruction", () => {
  it("requires service auth and superuser permission, validates scope and rebuilds repeatably", async () => {
    const modules = createModules({
      fetcher: fetch,
      eaClubsBaseUrl: "https://example.com",
      pool: undefined,
    });
    await modules.authorization.bootstrapInitialSuperuser(asActorId("admin"));
    await modules.competitions.repository.saveDraft(performanceCompetition());
    const app = createApp({
      modules,
      internalJobSecret: "test-secret",
      checkDbHealth: async () => "skipped",
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    const path =
      "/api/v1/internal/organizations/organization-1/competitions/competition-1/statistics/rebuild";
    const headers = { Authorization: "Bearer test-secret", "X-Futrob-Actor-Id": "admin" };
    expect((await app.request(path, { method: "POST" })).status).toBe(401);
    expect(
      (
        await app.request(path, {
          method: "POST",
          headers: { ...headers, "X-Futrob-Actor-Id": "other" },
        })
      ).status,
    ).toBe(403);
    for (let i = 0; i < 2; i++) {
      const response = await app.request(path, { method: "POST", headers });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        competitionId: "competition-1",
        officialResultsProjected: 0,
        contributionsProjected: 0,
      });
    }
    expect(
      (await app.request(path.replace("organization-1", "wrong-org"), { method: "POST", headers }))
        .status,
    ).toBe(400);
  });
});
