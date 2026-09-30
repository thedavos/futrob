import {
  completeOrganizationOnboardingResponseSchema,
  fixturePlanSchema,
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeRequestSchema,
  type FixtureEncounterDto,
} from "@futrob/api-contracts";
import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const organizer = "actor-schedule-change-organizer";
const stranger = "actor-schedule-change-stranger";
const wallTime = { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 };

describe("schedule-change-request HTTP", () => {
  it("creates, replays, lists closed history, and hides private encounters", async () => {
    const { app, encounter, modules, organizationId } = await seedFixture();
    const path = `/api/v1/encounters/${encounter.id}/schedule-change-requests`;
    const homeTeamId = teamId(encounter.home);
    const body = {
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      proposedWallTime: wallTime,
      reason: "Team travel conflict",
      idempotencyKey: "idem-1",
    };

    const emptyList = await parseResponse(
      listScheduleChangeRequestsResponseSchema,
      await app.request(path, { headers: serviceHeaders(organizer) }),
    );
    expect(emptyList).toEqual({ requests: [] });

    const created = await app.request(path, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify(body),
    });
    expect(created.status).toBe(200);
    const createdJson: unknown = await created.json();
    expect(JSON.stringify(createdJson)).not.toContain("idempotencyKey");
    expect(createdJson).not.toHaveProperty("idempotencyKey");
    const createdBody = scheduleChangeRequestSchema.parse(createdJson);
    expect(createdBody.status).toBe("open");
    expect(createdBody.requestingTeamId).toBe(homeTeamId);
    expect(createdBody.proposals[0]?.reason).toBe("Team travel conflict");

    const replay = await app.request(path, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify(body),
    });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(createdBody);

    const reused = await app.request(path, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ ...body, reason: "Different payload", idempotencyKey: "idem-1" }),
    });
    expect({ status: reused.status, body: await reused.json() }).toMatchObject({
      status: 409,
      body: { code: "scheduling.schedule_change_idempotency_conflict" },
    });

    const stored = await modules.scheduling.scheduleChangeRequests.findByIdempotencyKey(
      asOrganizationId(organizationId),
      "idem-1",
    );
    expect(stored).not.toBeNull();
    if (!stored) return;
    await modules.scheduling.scheduleChangeRequests.save({
      ...stored,
      status: "rejected",
      updatedAt: new Date(stored.updatedAt.getTime() + 1),
    });

    const listedResponse = await app.request(path, { headers: serviceHeaders(organizer) });
    expect(listedResponse.status).toBe(200);
    const listedJson: unknown = await listedResponse.json();
    expect(JSON.stringify(listedJson)).not.toContain("idempotencyKey");
    const listed = listScheduleChangeRequestsResponseSchema.parse(listedJson);
    expect(listed.requests).toHaveLength(1);
    expect(listed.requests[0]?.status).toBe("rejected");
    expect(listed.requests[0]?.proposals).toHaveLength(1);
    expect(listed.requests[0]).not.toHaveProperty("idempotencyKey");

    const snapshot = await modules.scheduling.encounters.findById(stored.encounterId);
    expect(snapshot?.scheduledStartAt).toEqual(new Date(encounter.scheduledStartAt));

    expect(
      (
        await app.request(path, {
          method: "POST",
          headers: serviceHeaders(stranger),
          body: JSON.stringify({ ...body, idempotencyKey: "idem-stranger" }),
        })
      ).status,
    ).toBe(404);
    expect((await app.request(path, { headers: serviceHeaders(stranger) })).status).toBe(404);
    expect((await app.request(path)).status).toBe(401);

    const missingPath = "/api/v1/encounters/encounter-missing/schedule-change-requests";
    expect((await app.request(missingPath, { headers: serviceHeaders(organizer) })).status).toBe(
      404,
    );
    expect(
      (
        await app.request(missingPath, {
          method: "POST",
          headers: serviceHeaders(organizer),
          body: JSON.stringify({ ...body, idempotencyKey: "idem-missing" }),
        })
      ).status,
    ).toBe(404);
  });

  it("rejects a foreign Team, missing slot, invalid date, and a manipulated timezone", async () => {
    const { app, encounter } = await seedFixture();
    const path = `/api/v1/encounters/${encounter.id}/schedule-change-requests`;
    const homeTeamId = teamId(encounter.home);
    const post = (body: unknown) =>
      app.request(path, {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify(body),
      });

    const foreignTeam = await post({
      requestingTeamId: "team-outsider",
      scope: { type: "entire_encounter" },
      proposedWallTime: wallTime,
      reason: "Team travel conflict",
      idempotencyKey: "idem-foreign",
    });
    expect({ status: foreignTeam.status, body: await foreignTeam.json() }).toMatchObject({
      status: 400,
      body: { code: "scheduling.invalid_schedule_change_request" },
    });

    const missingSlot = await post({
      requestingTeamId: homeTeamId,
      scope: { type: "official_match", officialSlot: 2 },
      proposedWallTime: wallTime,
      reason: "Team travel conflict",
      idempotencyKey: "idem-slot",
    });
    expect({ status: missingSlot.status, body: await missingSlot.json() }).toMatchObject({
      status: 400,
      body: { code: "scheduling.invalid_schedule_change_scope" },
    });

    const invalidDate = await post({
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      proposedWallTime: { year: 2020, month: 1, day: 1, hour: 18, minute: 0, second: 0 },
      reason: "Team travel conflict",
      idempotencyKey: "idem-past",
    });
    expect({ status: invalidDate.status, body: await invalidDate.json() }).toMatchObject({
      status: 400,
      body: { code: "scheduling.invalid_schedule_change_date" },
    });

    const timezone = await post({
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      proposedWallTime: wallTime,
      reason: "Team travel conflict",
      idempotencyKey: "idem-zone",
      timeZone: "America/New_York",
    });
    expect({ status: timezone.status, body: await timezone.json() }).toMatchObject({
      status: 400,
      body: { code: "scheduling.invalid_schedule_change_date" },
    });
  });

  it("rejects an incompatible overlapping request", async () => {
    const { app, encounter } = await seedFixture();
    const path = `/api/v1/encounters/${encounter.id}/schedule-change-requests`;
    const homeTeamId = teamId(encounter.home);
    const first = await app.request(path, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        requestingTeamId: homeTeamId,
        scope: { type: "entire_encounter" },
        proposedWallTime: wallTime,
        reason: "Team travel conflict",
        idempotencyKey: "idem-open",
      }),
    });
    expect(first.status).toBe(200);

    const overlap = await app.request(path, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        requestingTeamId: homeTeamId,
        scope: { type: "official_match", officialSlot: 1 },
        proposedWallTime: { ...wallTime, day: 16 },
        reason: "Different payload",
        idempotencyKey: "idem-overlap",
      }),
    });
    expect({ status: overlap.status, body: await overlap.json() }).toMatchObject({
      status: 409,
      body: { code: "scheduling.active_schedule_change_request_exists" },
    });
  });
});

async function seedFixture() {
  const modules = createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
  });
  const app = createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
    correlationLogger: { info: () => undefined, error: () => undefined },
  });
  const created = await app.request("/api/v1/identity/onboarding/organization", {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({
      name: "Reschedule Org",
      competition: onboardingCompetition,
      gameAccount: null,
    }),
  });
  const createdBody = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
  const { organizationId } = createdBody;
  const competitionId = createdBody.competition.competition.id;
  for (const [name, creationKey] of [
    ["Alpha Reschedule", "reschedule-alpha"],
    ["Beta Reschedule", "reschedule-beta"],
    ["Gamma Reschedule", "reschedule-gamma"],
  ] as const) {
    const added = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ kind: "new-team", name, creationKey }),
      },
    );
    expect(added.status).toBeLessThan(300);
  }
  await app.request(
    `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
    { method: "POST", headers: serviceHeaders(organizer) },
  );
  const generated = await app.request(
    `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixture`,
    {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        generationVersion: 1,
        startsAt: "2026-09-01T01:00:00.000Z",
        roundIntervalDays: 7,
        homeAndAway: false,
      }),
    },
  );
  expect(generated.status).toBe(200);
  const fixture = await parseResponse(fixturePlanSchema, generated);
  const encounter = fixture.stages[0]?.rounds[0]?.encounters.find(
    (row) => row.home.kind === "team" && row.away.kind === "team",
  );
  expect(encounter).toBeDefined();
  if (!encounter) throw new Error("Expected a Team vs Team Encounter");
  return { app, encounter, modules, organizationId };
}

function teamId(slot: FixtureEncounterDto["home"]): string {
  if (slot.kind !== "team") throw new Error("Expected a Team participant");
  return slot.teamId;
}
