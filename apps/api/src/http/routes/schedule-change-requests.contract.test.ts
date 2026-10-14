import { futrobOpenApiV1 } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  fixtureTeamId,
  LEAGUE_ORGANIZER,
  publishLeagueWithFixture,
} from "@/http/contract/published-league.ts";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const WALL_TIME = { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 };

function scheduleChangeOperations() {
  const operations: { path: string; method: (typeof METHODS)[number] }[] = [];
  for (const [path, item] of Object.entries(futrobOpenApiV1.paths)) {
    if (!path.includes("schedule-change") && !path.includes("reschedule-expiry")) continue;
    for (const method of METHODS) {
      if (Object.hasOwn(item, method)) operations.push({ path, method });
    }
  }
  return operations;
}

function concrete(path: string) {
  return `/api/v1${path
    .replaceAll("{encounterId}", "enc-unknown")
    .replaceAll("{requestId}", "req-unknown")
    .replaceAll("{proposalId}", "prop-unknown")}`;
}

describe("schedule-change-request OpenAPI contract", () => {
  it("documents every operation and matches unauthenticated 401 bodies", async () => {
    const operations = scheduleChangeOperations();
    expect(operations.length).toBeGreaterThanOrEqual(8);
    const app = buildApp(stubFetch);
    for (const { path, method } of operations) {
      const res = await app.request(concrete(path), {
        method: method.toUpperCase(),
        headers: { "Content-Type": "application/json" },
        body: method === "get" ? undefined : "{}",
      });
      expect(res.status, `${method} ${path}`).toBe(401);
      await expectMatchesOpenApi(res, method, path);
    }
  });

  it("lists, creates, and reads documented 200/404 bodies", async () => {
    const { app, encounter } = await publishLeagueWithFixture();
    const listPath = `/encounters/{encounterId}/schedule-change-requests`;
    const url = `/api/v1/encounters/${encounter.id}/schedule-change-requests`;
    const listed = await app.request(url, { headers: serviceHeaders(LEAGUE_ORGANIZER) });
    expect(listed.status).toBe(200);
    await expectMatchesOpenApi(listed, "get", listPath);

    const created = await app.request(url, {
      method: "POST",
      headers: serviceHeaders(LEAGUE_ORGANIZER),
      body: JSON.stringify({
        requestingTeamId: fixtureTeamId(encounter.home),
        scope: { type: "entire_encounter" },
        proposedWallTime: WALL_TIME,
        reason: "Team travel conflict",
        idempotencyKey: "contract-idem-1",
      }),
    });
    expect(created.status).toBe(200);
    await expectMatchesOpenApi(created, "post", listPath);

    const missing = await app.request(`${url}/request-missing`, {
      headers: serviceHeaders(LEAGUE_ORGANIZER),
    });
    expect(missing.status).toBe(404);
    await expectMatchesOpenApi(missing, "get", `${listPath}/{requestId}`);
  });
});
