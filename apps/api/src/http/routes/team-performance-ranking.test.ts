import { describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import {
  getTeamPerformanceRankingResponseSchema,
  getCompetitionStandingsResponseSchema,
} from "@futrob/api-contracts";
import { createModules } from "@/di/create-modules.ts";
import { createApp } from "@/app.ts";
import { serviceHeaders, stubFetch, INTERNAL_JOB_SECRET } from "@/http/http-app.harness.ts";
import {
  seedPerformanceModule,
  seedPerformanceResults,
} from "@/testing/team-performance-module.fixture.ts";
import { performanceScope } from "../../../../../packages/statistics/src/domain/policies/team-performance.fixture.ts";

async function setup() {
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
  return { modules, app };
}
const path = "/api/v1/organizations/organization-1/competitions/competition-1";

describe("private team performance HTTP", () => {
  it("returns its own scored team resource with versions and sanitized evidence", async () => {
    const { app, modules } = await setup();
    await seedPerformanceResults(modules);
    const response = await app.request(`${path}/team-performance-ranking`, {
      headers: serviceHeaders("actor-1"),
    });
    expect(response.status).toBe(200);
    const body = getTeamPerformanceRankingResponseSchema.parse(await response.json());
    expect(body.ranking?.rows.map((row) => row.score)).toEqual([95, 5]);
    expect(body.ranking?.formulaVersion).toBe("team-performance-v1");
    expect(body.ranking?.normalizationVersion).toBe("team-performance-normalization-v1");
    expect(JSON.stringify(body)).not.toMatch(/rawPayload|externalPlayerId|approvedBy|players/);
    const standingResponse = await app.request(`${path}/standings`, {
      headers: serviceHeaders("actor-1"),
    });
    const standings = getCompetitionStandingsResponseSchema.parse(await standingResponse.json());
    expect(standings.standings).toMatchObject({
      formulaVersion: "points-gd-gf-v1",
      rows: [
        { teamId: "team-a", played: 3, points: 9 },
        { teamId: "team-b", played: 3, points: 0 },
      ],
    });
    expect(
      (await app.request(`${path}/rankings?kind=team`, { headers: serviceHeaders("actor-1") }))
        .status,
    ).toBe(400);
  });

  it("returns null before projection and incomplete after void, never an invented zero", async () => {
    const { modules, app } = await setup();
    expect(
      await (
        await app.request(`${path}/team-performance-ranking`, {
          headers: serviceHeaders("actor-1"),
        })
      ).json(),
    ).toEqual({ ranking: null });
    await modules.statistics.useCases.rebuildCompetitionStatistics.execute(performanceScope);
    const empty = getTeamPerformanceRankingResponseSchema.parse(
      await (
        await app.request(`${path}/team-performance-ranking`, {
          headers: serviceHeaders("actor-1"),
        })
      ).json(),
    );
    expect(
      empty.ranking?.rows.every((row) => row.score === null && row.coverage.reason === "no_data"),
    ).toBe(true);
    await seedPerformanceResults(modules);
    await modules.voidOfficialResultAndUnproject.execute({
      actorId: asActorId("actor-1"),
      officialResultId: "result-1",
    });
    const body = getTeamPerformanceRankingResponseSchema.parse(
      await (
        await app.request(`${path}/team-performance-ranking`, {
          headers: serviceHeaders("actor-1"),
        })
      ).json(),
    );
    expect(
      body.ranking?.rows.every(
        (row) => row.score === null && row.coverage.reason === "insufficient_sample",
      ),
    ).toBe(true);
    expect(body.ranking?.sources[0]?.status).toBe("voided");
  });

  it("rejects missing identity, denied capability and mismatched organization", async () => {
    const { modules, app } = await setup();
    await seedPerformanceResults(modules);
    expect((await app.request(`${path}/team-performance-ranking`)).status).toBe(401);
    const denied = await app.request(`${path}/team-performance-ranking`, {
      headers: serviceHeaders("outsider"),
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "statistics.read_forbidden" });
    await expect(
      modules.statistics.useCases.getTeamPerformanceRanking.execute({
        ...performanceScope,
        organizationId: asOrganizationId("foreign"),
        actorId: asActorId("actor-1"),
      }),
    ).rejects.toMatchObject({ code: "statistics.read_forbidden" });
  });
});
