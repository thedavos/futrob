import { describe, expect, it } from "vite-plus/test";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  fixtureTeamId,
  LEAGUE_ORGANIZER,
  publishLeagueWithFixture,
} from "@/http/contract/published-league.ts";
import { serviceHeaders } from "@/http/http-app.harness.ts";

const PATH = "/encounters/{encounterId}/schedule-snapshot";

describe("schedule-snapshot OpenAPI contract", () => {
  it("matches GET 200 and PUT 409 on a fixture-managed encounter", async () => {
    const { app, encounter, organizationId, competitionId } = await publishLeagueWithFixture();
    const url = `/api/v1/encounters/${encounter.id}/schedule-snapshot`;

    const snapshot = await app.request(url, { headers: serviceHeaders(LEAGUE_ORGANIZER) });
    expect(snapshot.status).toBe(200);
    await expectMatchesOpenApi(snapshot, "get", PATH);

    const conflict = await app.request(url, {
      method: "PUT",
      headers: serviceHeaders(LEAGUE_ORGANIZER),
      body: JSON.stringify({
        organizationId,
        competitionId,
        stageId: encounter.stageId,
        homeTeamId: fixtureTeamId(encounter.home),
        awayTeamId: fixtureTeamId(encounter.away),
        scheduledStartAt: "2026-09-04T01:00:00.000Z",
        officialMatchCount: 1,
      }),
    });
    expect(conflict.status).toBe(409);
    await expectMatchesOpenApi(conflict, "put", PATH);
  });
});
