import { describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { INTERNAL_JOB_SECRET, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { seedPerformanceModule } from "@/testing/team-performance-module.fixture.ts";

const PATH = "/organizations/{organizationId}/competitions/{competitionId}/standings";
const URL = "/api/v1/organizations/organization-1/competitions/competition-1/standings";

async function standingsApp() {
  const modules = createModules({
    pool: undefined,
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://provider.invalid",
  });
  await seedPerformanceModule(modules);
  return createApp({
    modules,
    correlationLogger: { info() {}, error() {} },
    internalJobSecret: INTERNAL_JOB_SECRET,
    checkDbHealth: async () => "skipped",
  });
}

describe("competition standings OpenAPI contract", () => {
  it("matches an empty 200 snapshot and a 403 without statistics.read", async () => {
    const app = await standingsApp();
    const empty = await app.request(URL, { headers: serviceHeaders("actor-1") });
    expect(empty.status).toBe(200);
    expect(await empty.clone().json()).toEqual({ standings: null });
    await expectMatchesOpenApi(empty, "get", PATH);

    const forbidden = await app.request(URL, { headers: serviceHeaders("outsider") });
    expect(forbidden.status).toBe(403);
    await expectMatchesOpenApi(forbidden, "get", PATH);
  });
});
