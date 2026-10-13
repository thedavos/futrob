import { encounterViewSchema, listEncounterCandidatesResponseSchema } from "@futrob/api-contracts";
import type { ProviderMatch } from "@futrob/game-data";
import { ListEncounterCandidatesUseCase } from "@futrob/results";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asOfficialMatchSlotId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it, vi } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  RepositoryProviderMatchReader,
  SchedulingEncounterReader,
} from "@/adapters/results/bridges.ts";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { parseResponse } from "@/http/parse-response.ts";
import { serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

const authorization: AuthorizationPort = {
  async decide(request) {
    return {
      allowed: true,
      permission: request.permission,
      scope: request.scope,
      reason: "allowed",
    };
  },
  async getEffectiveAccess(input) {
    return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
  },
};

function match(
  externalMatchId: string,
  occurredAt: string,
  homeExternalClubId = "club-home",
  awayExternalClubId = "club-away",
): ProviderMatch {
  return {
    id: `id-${externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date(occurredAt),
    home: {
      externalClubId: homeExternalClubId,
      name: `Club ${homeExternalClubId}`,
      goals: 2,
      imageUrl: null,
    },
    away: {
      externalClubId: awayExternalClubId,
      name: `Club ${awayExternalClubId}`,
      goals: 1,
      imageUrl: null,
    },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

describe("GET /api/v1/encounters/:encounterId/candidates", () => {
  it("returns both orientations at inclusive window boundaries and excludes outside matches", async () => {
    const modules = createModules({
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    });
    const encounterId = asEncounterId("encounter-candidates-1");
    const organizationId = asOrganizationId("organization-candidates-1");
    const competitionId = asCompetitionId("competition-candidates-1");
    const homeTeamId = asTeamId("team-home");
    const awayTeamId = asTeamId("team-away");
    await modules.scheduling.encounters.upsert({
      encounterId,
      organizationId,
      competitionId,
      homeTeamId,
      awayTeamId,
      scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
      officialMatchCount: 1,
      stageId: asFixtureStageId("stage-1"),
    });
    await modules.teams.externalClubConnections.upsert({
      teamId: homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    await modules.teams.externalClubConnections.upsert({
      teamId: awayTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-away",
      externalClubName: "Away Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });

    const matches = new InMemoryProviderMatchRepository();
    await matches.upsertMany([
      match("at-from", "2026-09-14T14:00:00.000Z"),
      match("at-to-reversed", "2026-09-15T02:00:00.000Z", "club-away", "club-home"),
      match("before", "2026-09-14T13:59:59.999Z"),
      match("after", "2026-09-15T02:00:00.001Z"),
      match("other-club", "2026-09-14T20:00:00.000Z", "club-home", "club-other"),
      match("same-club", "2026-09-14T20:00:00.000Z", "club-home", "club-home"),
    ]);
    const providerMatches = new RepositoryProviderMatchReader(
      matches,
      modules.teams.externalClubConnections,
    );
    const unauthorizedApp = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: "test-internal-secret",
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    const unauthorized = await unauthorizedApp.request(
      `/api/v1/encounters/${encounterId}/candidates`,
      { headers: serviceHeaders("actor-from-another-organization") },
    );
    expect({ status: unauthorized.status, body: await unauthorized.json() }).toMatchObject({
      status: 404,
      body: { code: "results.encounter_not_found" },
    });

    const listEncounterCandidates = new ListEncounterCandidatesUseCase({
      encounterReader: new SchedulingEncounterReader(
        modules.scheduling.encounters,
        modules.scheduling.officialMatches,
        modules.teams.externalClubConnections,
      ),
      providerMatches,
      authorization,
    });
    const app = createApp({
      modules: {
        ...modules,
        results: { ...modules.results, listEncounterCandidates },
      },
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: "test-internal-secret",
      correlationLogger: { info: () => undefined, error: () => undefined },
    });

    const response = await app.request(`/api/v1/encounters/${encounterId}/candidates`, {
      headers: serviceHeaders("actor-candidates"),
    });
    const body = await parseResponse(listEncounterCandidatesResponseSchema, response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    if (body.status !== "ready") return;
    expect(body.window).toEqual({
      from: "2026-09-14T14:00:00.000Z",
      to: "2026-09-15T02:00:00.000Z",
    });
    expect(body.candidates.map((candidate) => candidate.reference.externalId).sort()).toEqual([
      "at-from",
      "at-to-reversed",
    ]);
  });
});

describe("GET /api/v1/organizations/:organizationId/encounters/:encounterId", () => {
  async function seededApp(allowedActorId: string) {
    const modules = createModules({
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: undefined,
    });
    const encounterId = asEncounterId("encounter-view-1");
    const organizationId = asOrganizationId("organization-view-1");
    const competitionId = asCompetitionId("competition-view-1");
    const homeTeamId = asTeamId("team-view-home");
    const awayTeamId = asTeamId("team-view-away");
    const createdAt = new Date("2026-09-01T00:00:00.000Z");
    for (const [id, name] of [
      [homeTeamId, "Cuervos FC"],
      [awayTeamId, "Maderas FC"],
    ] as const) {
      await modules.teams.repositories.teams.save({
        id,
        organizationId,
        name,
        createdAt,
        createdByActorId: asActorId(allowedActorId),
        creationKey: null,
      });
    }
    await modules.scheduling.encounters.upsert({
      encounterId,
      organizationId,
      competitionId,
      homeTeamId,
      awayTeamId,
      scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
      officialMatchCount: 2,
      stageId: asFixtureStageId("stage-1"),
    });
    await modules.scheduling.officialMatches.upsertMany(
      ([1, 2] as const).map((slot) => ({
        id: asOfficialMatchSlotId(`slot-view-${slot}`),
        encounterId,
        organizationId,
        competitionId,
        slot,
        status: "scheduled" as const,
        scheduledStartAt: new Date(
          slot === 1 ? "2026-09-14T20:00:00.000Z" : "2026-09-16T22:30:00.000Z",
        ),
        createdAt,
      })),
    );
    vi.spyOn(modules.authorization.port, "decide").mockImplementation(async (request) => {
      const allowed = request.actorId === allowedActorId;
      return {
        allowed,
        permission: request.permission,
        scope: request.scope,
        reason: allowed ? "allowed" : "denied",
      };
    });
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: "test-internal-secret",
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    return { app, path: `/api/v1/organizations/${organizationId}/encounters/${encounterId}` };
  }

  it("names both Teams and returns each slot's own start to a reader", async () => {
    const { app, path } = await seededApp("actor-reader");

    const response = await app.request(path, { headers: serviceHeaders("actor-reader") });
    const body = await parseResponse(encounterViewSchema, response);

    expect(response.status).toBe(200);
    expect({
      home: body.home.name,
      away: body.away.name,
      slots: body.officialMatches,
      start: body.scheduledStartAt,
    }).toEqual({
      home: "Cuervos FC",
      away: "Maderas FC",
      slots: [
        { officialSlot: 1, scheduledStartAt: "2026-09-14T20:00:00.000Z" },
        { officialSlot: 2, scheduledStartAt: "2026-09-16T22:30:00.000Z" },
      ],
      start: "2026-09-14T20:00:00.000Z",
    });
  });

  it("hides the Encounter from an actor without read access and from another organization", async () => {
    const { app, path } = await seededApp("actor-reader");

    const denied = await app.request(path, { headers: serviceHeaders("actor-outsider") });
    const otherOrganization = await app.request(
      path.replace("organization-view-1", "organization-other"),
      { headers: serviceHeaders("actor-reader") },
    );

    expect([
      { status: denied.status, body: await denied.json() },
      { status: otherOrganization.status, body: await otherOrganization.json() },
    ]).toMatchObject([
      { status: 404, body: { code: "scheduling.encounter_not_found" } },
      { status: 404, body: { code: "scheduling.encounter_not_found" } },
    ]);
  });
});
