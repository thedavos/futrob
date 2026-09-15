import { listEncounterCandidatesResponseSchema } from "@futrob/api-contracts";
import type { ProviderMatch } from "@futrob/game-data";
import { ListEncounterCandidatesUseCase } from "@futrob/results";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
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
      match("at-from", "2026-09-14T02:00:00.000Z"),
      match("at-to-reversed", "2026-09-15T14:00:00.000Z", "club-away", "club-home"),
      match("before", "2026-09-14T01:59:59.999Z"),
      match("after", "2026-09-15T14:00:00.001Z"),
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
      from: "2026-09-14T02:00:00.000Z",
      to: "2026-09-15T14:00:00.000Z",
    });
    expect(body.candidates.map((candidate) => candidate.reference.externalId).sort()).toEqual([
      "at-from",
      "at-to-reversed",
    ]);
  });
});
