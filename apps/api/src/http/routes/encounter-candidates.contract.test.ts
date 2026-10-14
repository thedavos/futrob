import { ListEncounterCandidatesUseCase } from "@futrob/results";
import type { ProviderMatch } from "@futrob/game-data";
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
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

const PATH = "/encounters/{encounterId}/candidates";
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

function match(externalMatchId: string, occurredAt: string): ProviderMatch {
  return {
    id: `id-${externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date(occurredAt),
    home: { externalClubId: "club-home", name: "Home Club", goals: 2, imageUrl: null },
    away: { externalClubId: "club-away", name: "Away Club", goals: 1, imageUrl: null },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

async function seedEncounter(mode: "allowed" | "default" | "unavailable") {
  const modules = createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
  });
  const encounterId = asEncounterId("encounter-contract-candidates");
  const organizationId = asOrganizationId("organization-contract-candidates");
  const competitionId = asCompetitionId("competition-contract-candidates");
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
  await matches.upsertMany([match("inside-window", "2026-09-14T20:00:00.000Z")]);
  const encounterReader = new SchedulingEncounterReader(
    modules.scheduling.encounters,
    modules.scheduling.officialMatches,
    modules.teams.externalClubConnections,
  );
  const providerMatches =
    mode === "unavailable"
      ? {
          listCandidatesForEncounter: async () => {
            throw new Error("provider down");
          },
          getByExternalRef: async () => null,
        }
      : new RepositoryProviderMatchReader(matches, modules.teams.externalClubConnections);
  const listEncounterCandidates = new ListEncounterCandidatesUseCase({
    encounterReader,
    providerMatches,
    authorization,
  });
  const app = createApp({
    modules:
      mode === "default"
        ? modules
        : { ...modules, results: { ...modules.results, listEncounterCandidates } },
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: "test-internal-secret",
    correlationLogger: { info: () => undefined, error: () => undefined },
  });
  return { app, url: `/api/v1/encounters/${encounterId}/candidates` };
}

describe("encounter candidates OpenAPI contract", () => {
  it("matches 200 ready, 401 missing bearer, 404 forbidden, and 503 unavailable", async () => {
    const ready = await seedEncounter("allowed");
    const ok = await ready.app.request(ready.url, { headers: serviceHeaders("actor-candidates") });
    expect(ok.status).toBe(200);
    await expectMatchesOpenApi(ok, "get", PATH);

    const unauthorized = await ready.app.request(ready.url);
    expect(unauthorized.status).toBe(401);
    await expectMatchesOpenApi(unauthorized, "get", PATH);

    const hiddenSeed = await seedEncounter("default");
    const hidden = await hiddenSeed.app.request(hiddenSeed.url, {
      headers: serviceHeaders("actor-from-another-organization"),
    });
    expect(hidden.status).toBe(404);
    await expectMatchesOpenApi(hidden, "get", PATH);

    const failing = await seedEncounter("unavailable");
    const unavailableRes = await failing.app.request(failing.url, {
      headers: serviceHeaders("actor-candidates"),
    });
    expect(unavailableRes.status).toBe(503);
    await expectMatchesOpenApi(unavailableRes, "get", PATH);
  });
});
