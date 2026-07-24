import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "@/adapters/game-data/ea-clubs/fixtures/search-clubs.json";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";

function createFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler(url, init);
  }) as typeof fetch;
}

function buildApp(fetcher: typeof fetch) {
  const modules = createModules({
    fetcher,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
  });
  return createApp({ modules, checkDbHealth: () => Promise.resolve("skipped") });
}

const stubFetch = createFetch(() => Response.json([]));

describe("apps/api", () => {
  it("GET /api/v1/meta/ping returns the ping contract", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/ping");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "futrob", apiVersion: "v1" });
  });

  it("responds to CORS preflight from the local web origin", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("GET /api/v1/meta/health reports db skipped without DATABASE_URL", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, db: "skipped" });
  });

  it("GET /api/v1/openapi.json serves the contract document", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/openapi.json");

    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string };
    expect(doc.openapi).toBe("3.1.0");
  });

  it("GET /api/v1/game-data/clubs/search maps EA results to DTOs", async () => {
    const app = buildApp(
      createFetch((url) => {
        expect(url).toContain("/allTimeLeaderboard/search");
        expect(url).toContain("clubName=Fera");
        return Response.json(searchClubsFixture);
      }),
    );

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera");

    expect(res.status).toBe(200);
    const body = (await res.json()) as { clubs: Array<{ externalClubId: string; name: string }> };
    expect(body.clubs[0]?.externalClubId).toBe("10754");
    expect(body.clubs[0]?.name).toBe("Fera Enjaulada");
  });

  it("GET /api/v1/game-data/clubs/search rejects a missing query with 400", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search");

    expect(res.status).toBe(400);
    expect((await res.json()) as { code: string }).toMatchObject({ code: "api.validation_error" });
  });

  it("GET /api/v1/game-data/clubs/search surfaces EA HTTP failures as 502", async () => {
    const app = buildApp(createFetch(() => new Response("nope", { status: 503 })));

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera");

    expect(res.status).toBe(502);
    expect((await res.json()) as { code: string }).toMatchObject({
      code: "game_data.ea_clubs_http_error",
    });
  });
});
