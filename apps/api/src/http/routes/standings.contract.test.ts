import { describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { INTERNAL_JOB_SECRET, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { getCompetitionStandingsResponseSchema } from "@futrob/api-contracts";
import { generateFixturePlan } from "@futrob/scheduling";
import {
  seedPerformanceModule,
  seedPerformanceResults,
} from "@/testing/team-performance-module.fixture.ts";
import {
  performanceAway,
  performanceHome,
  performanceScope,
} from "../../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";

const PATH = "/organizations/{organizationId}/competitions/{competitionId}/standings";
const URL = "/api/v1/organizations/organization-1/competitions/competition-1/standings";

async function standingsApp() {
  const modules = createModules({
    pool: undefined,
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://provider.invalid",
  });
  await seedPerformanceModule(modules);
  const app = createApp({
    modules,
    correlationLogger: { info() {}, error() {} },
    internalJobSecret: INTERNAL_JOB_SECRET,
    checkDbHealth: async () => "skipped",
  });
  return { app, modules };
}

describe("competition standings OpenAPI contract", () => {
  it("matches an empty 200 snapshot and a 403 without statistics.read", async () => {
    const { app } = await standingsApp();
    const empty = await app.request(URL, { headers: serviceHeaders("actor-1") });
    expect(empty.status).toBe(200);
    expect(await empty.clone().json()).toEqual({ standings: null });
    await expectMatchesOpenApi(empty, "get", PATH);

    const forbidden = await app.request(URL, { headers: serviceHeaders("outsider") });
    expect(forbidden.status).toBe(403);
    await expectMatchesOpenApi(forbidden, "get", PATH);
  });

  it("returns each team's form and the playoff cut of a league-playoffs fixture", async () => {
    const { app, modules } = await standingsApp();
    await seedPerformanceResults(modules);

    const withoutFixture = await app.request(URL, { headers: serviceHeaders("actor-1") });
    expect(withoutFixture.status).toBe(200);
    await expectMatchesOpenApi(withoutFixture.clone(), "get", PATH);
    const before = getCompetitionStandingsResponseSchema.parse(await withoutFixture.json());
    expect(before.standings?.playoffSpots).toBeNull();
    expect(before.standings?.rows.map((row) => row.form.length)).toEqual([3, 3]);

    await modules.scheduling.fixturePlans.save(
      generateFixturePlan({
        ...performanceScope,
        generationVersion: 1,
        rulesVersion: 1,
        format: "league-playoffs",
        timeZone: "America/Lima",
        startsAt: new Date("2026-09-01T01:00:00.000Z"),
        roundIntervalDays: 7,
        officialMatchCounts: { regular: 1, knockout: 1 },
        resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
        seed: [performanceHome, performanceAway],
        homeAndAway: false,
        playoffs: { teamCount: 2 },
      }),
    );
    const withFixture = await app.request(URL, { headers: serviceHeaders("actor-1") });
    await expectMatchesOpenApi(withFixture.clone(), "get", PATH);
    expect(
      getCompetitionStandingsResponseSchema.parse(await withFixture.json()).standings?.playoffSpots,
    ).toBe(2);
  });
});
