import {
  enqueueDueProviderSyncsResponseSchema,
  providerSyncJobResponseSchema,
} from "@futrob/api-contracts";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import clubMatchesFixture from "@/adapters/game-data/ea-clubs/fixtures/club-matches.json";
import { createApp } from "@/app.ts";
import { createFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";
import { createModules } from "@/di/create-modules.ts";

const secret = "provider-job-secret";
const requestId = "032141c9-0574-4129-86d4-7192bdbbcadd";

function buildApp(onProviderCall: () => void) {
  return createApp({
    modules: createModules({
      fetcher: createFetch(() => {
        onProviderCall();
        return Response.json(clubMatchesFixture);
      }),
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    }),
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: secret,
    correlationLogger: { info: () => undefined, error: () => undefined },
  });
}

function headers() {
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
  };
}

describe("provider sync job routes", () => {
  it("deduplicates active work and executes a replay only once", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });
    const body = JSON.stringify({
      organizationId: "org-1",
      providerKey: "ea-clubs",
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    });

    const first = await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body,
    });
    const duplicate = await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body,
    });
    const firstJob = await parseResponse(providerSyncJobResponseSchema, first);
    const duplicateJob = await parseResponse(providerSyncJobResponseSchema, duplicate);
    expect(first.status).toBe(202);
    expect(duplicateJob.id).toBe(firstJob.id);

    const path = `/api/v1/internal/game-data/sync-jobs/${firstJob.id}/run`;
    const run = await app.request(path, { method: "POST", headers: headers() });
    const replay = await app.request(path, { method: "POST", headers: headers() });

    expect(await run.json()).toMatchObject({ status: "succeeded", requestId });
    expect(await replay.json()).toMatchObject({ status: "succeeded", requestId });
    expect(providerCalls).toBe(1);
  });

  it("rejects unauthenticated job execution before provider egress", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });

    const response = await app.request("/api/v1/internal/game-data/sync-jobs/job-1/run", {
      method: "POST",
      headers: { "X-Request-ID": requestId },
    });

    expect(response.status).toBe(401);
    expect(providerCalls).toBe(0);
  });

  it("lets the recovery scheduler drain queued work when publication was interrupted", async () => {
    let providerCalls = 0;
    const app = buildApp(() => {
      providerCalls += 1;
    });
    await app.request("/api/v1/internal/game-data/sync-jobs", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        organizationId: "org-recovery",
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        matchType: "friendlyMatch",
        maxResultCount: 10,
      }),
    });

    const run = await app.request("/api/v1/internal/game-data/sync-jobs/run-next", {
      method: "POST",
      headers: headers(),
    });
    const empty = await app.request("/api/v1/internal/game-data/sync-jobs/run-next", {
      method: "POST",
      headers: headers(),
    });

    expect(await run.json()).toMatchObject({ status: "succeeded" });
    expect(empty.status).toBe(204);
    expect(providerCalls).toBe(1);
  });

  it("enqueues connected clubs inside the candidate window without calling EA or duplicating", async () => {
    const now = new Date("2026-10-10T20:00:00.000Z");
    let providerCalls = 0;
    const modules = createModules({
      fetcher: createFetch(() => {
        providerCalls += 1;
        return Response.json(clubMatchesFixture);
      }),
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
      clock: { now: () => now },
    });
    const organizationId = asOrganizationId("org-due");
    const competitionId = asCompetitionId("competition-due");
    const homeTeamId = asTeamId("team-due-home");
    const awayTeamId = asTeamId("team-due-away");
    const encounterId = asEncounterId("encounter-due");
    await modules.scheduling.encounters.upsert({
      encounterId,
      organizationId,
      competitionId,
      stageId: asFixtureStageId("stage-due"),
      homeTeamId,
      awayTeamId,
      scheduledStartAt: now,
      officialMatchCount: 1,
    });
    await modules.scheduling.officialMatches.upsertMany([
      {
        id: asOfficialMatchSlotId("slot-due"),
        encounterId,
        organizationId,
        competitionId,
        slot: 1,
        status: "scheduled",
        scheduledStartAt: now,
        createdAt: now,
      },
    ]);
    await modules.teams.externalClubConnections.upsert({
      teamId: homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "10754",
      externalClubName: "Owls",
      gameEdition: "fc26",
      platform: "common-gen5",
    });
    const outsideTeamId = asTeamId("team-due-outside");
    const outsideEncounterId = asEncounterId("encounter-outside");
    const outsideStart = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    await modules.scheduling.encounters.upsert({
      encounterId: outsideEncounterId,
      organizationId,
      competitionId,
      stageId: asFixtureStageId("stage-outside"),
      homeTeamId: outsideTeamId,
      awayTeamId,
      scheduledStartAt: outsideStart,
      officialMatchCount: 1,
    });
    await modules.scheduling.officialMatches.upsertMany([
      {
        id: asOfficialMatchSlotId("slot-outside"),
        encounterId: outsideEncounterId,
        organizationId,
        competitionId,
        slot: 1,
        status: "scheduled",
        scheduledStartAt: outsideStart,
        createdAt: now,
      },
    ]);
    await modules.teams.externalClubConnections.upsert({
      teamId: outsideTeamId,
      providerKey: "ea-clubs",
      externalClubId: "99999",
      externalClubName: "Late",
      gameEdition: "fc26",
      platform: "common-gen5",
    });
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: secret,
      correlationLogger: { info: () => undefined, error: () => undefined },
    });

    const denied = await app.request("/api/v1/internal/game-data/sync-jobs/enqueue-due", {
      method: "POST",
    });
    const first = await app.request("/api/v1/internal/game-data/sync-jobs/enqueue-due", {
      method: "POST",
      headers: headers(),
    });
    const second = await app.request("/api/v1/internal/game-data/sync-jobs/enqueue-due", {
      method: "POST",
      headers: headers(),
    });
    const created = enqueueDueProviderSyncsResponseSchema.parse(await first.json());
    const replay = enqueueDueProviderSyncsResponseSchema.parse(await second.json());
    const stored = await Promise.all(
      created.jobs.map((job) => modules.gameData.jobs.findById(job.id)),
    );

    expect(denied.status).toBe(401);
    expect(first.status).toBe(200);
    expect(created.enqueued).toBe(3);
    expect(stored.map((job) => job?.sync.externalClubId)).toEqual(["10754", "10754", "10754"]);
    expect(providerCalls).toBe(0);
    expect(replay).toMatchObject({ enqueued: 0, alreadyCovered: 3, jobs: [] });
  });
});
