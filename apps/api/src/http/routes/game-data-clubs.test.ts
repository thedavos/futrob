import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "@/adapters/game-data/ea-clubs/fixtures/search-clubs.json";
import type { CorrelationLogEntry } from "@/context/request-correlation.ts";
import {
  INTERNAL_JOB_SECRET,
  buildApp,
  createFetch,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http game-data clubs", () => {
  it("rejects game-data requests without valid service auth before provider egress", async () => {
    const cases: ReadonlyArray<{
      path: string;
      requestId: string;
      code: string;
      headers?: Record<string, string>;
    }> = [
      {
        path: "/api/v1/game-data/clubs/search?query=Fera",
        requestId: "2c574fb9-091d-433f-b9f4-cc6e1b86f860",
        code: "api.unauthorized",
      },
      {
        path: "/api/v1/game-data/clubs/10754",
        requestId: "2c574fb9-091d-433f-b9f4-cc6e1b86f860",
        code: "api.unauthorized",
      },
      {
        path: "/api/v1/game-data/clubs/10754/matches",
        requestId: "2c574fb9-091d-433f-b9f4-cc6e1b86f860",
        code: "api.unauthorized",
      },
      {
        path: "/api/v1/game-data/clubs/search?query=Fera",
        requestId: "47565055-641b-4e30-b5cf-0978fc9b3647",
        headers: { ...serviceHeaders(), Authorization: "Bearer incorrect-secret" },
        code: "api.unauthorized",
      },
      {
        path: "/api/v1/game-data/clubs/search?query=Fera",
        requestId: "4e22bf7a-59bd-4732-9b09-4c634cfab65a",
        headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
        code: "api.missing_actor",
      },
    ];

    let providerCalls = 0;
    const app = buildApp(
      createFetch(() => {
        providerCalls += 1;
        return Response.json(searchClubsFixture);
      }),
    );

    for (const testCase of cases) {
      const res = await app.request(testCase.path, {
        headers: { ...testCase.headers, "X-Request-ID": testCase.requestId },
      });
      expect(res.status).toBe(401);
      expect(res.headers.get("x-request-id")).toBe(testCase.requestId);
      expect(await res.json()).toMatchObject({
        code: testCase.code,
        requestId: testCase.requestId,
      });
    }
    expect(providerCalls).toBe(0);
  });

  it("GET /api/v1/game-data/clubs/search maps EA results to DTOs", async () => {
    const requestId = "2d81f9de-55a8-4f4b-9962-86f63145def0";
    const correlationLogEntries: CorrelationLogEntry[] = [];
    const app = buildApp(
      createFetch((url) => {
        expect(url).toContain("/allTimeLeaderboard/search");
        expect(url).toContain("clubName=Fera");
        return Response.json(searchClubsFixture);
      }),
      correlationLogEntries,
    );

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: { ...serviceHeaders(), "X-Request-ID": requestId },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    const body = (await res.json()) as { clubs: Array<{ externalClubId: string; name: string }> };
    expect(body.clubs[0]?.externalClubId).toBe("10754");
    expect(body.clubs[0]?.name).toBe("Fera Enjaulada");
    expect(correlationLogEntries).toContainEqual(
      expect.objectContaining({
        event: "provider.request.completed",
        provider: "ea-clubs",
        requestId,
        status: 200,
      }),
    );
  });

  it("GET /api/v1/game-data/clubs/search rejects a missing query with 400", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search", {
      headers: { ...serviceHeaders(), "X-Request-ID": "not-a-safe-request-id" },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; requestId?: string };
    expect(body).toMatchObject({ code: "api.validation_error" });
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
    expect(body.requestId).not.toBe("not-a-safe-request-id");
  });

  it("GET /api/v1/game-data/clubs/search surfaces EA HTTP failures as 502", async () => {
    const requestId = "2f0bb3a7-a7fb-446a-a6c7-81747db676b6";
    const app = buildApp(createFetch(() => new Response("nope", { status: 503 })));

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: { ...serviceHeaders(), "X-Request-ID": requestId },
    });

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    expect((await res.json()) as { code: string }).toMatchObject({
      code: "game_data.ea_clubs_http_error",
      requestId,
    });
  });
});
