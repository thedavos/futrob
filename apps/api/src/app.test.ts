import { describe, expect, it } from "vite-plus/test";
import searchClubsFixture from "@/adapters/game-data/ea-clubs/fixtures/search-clubs.json";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";

const INTERNAL_JOB_SECRET = "test-internal-secret";

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
    pool: undefined,
  });
  return createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
  });
}

function serviceHeaders(actorId = "actor-test-1"): Record<string, string> {
  return {
    Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
    "X-Futrob-Actor-Id": actorId,
    "Content-Type": "application/json",
  };
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

  it("organizations: create → mine → post-auth destination → invite → accept", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-organizer";
    const captain = "actor-captain";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Liga Test" }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { organizationId: string };
    expect(createdBody.organizationId).toBeTruthy();

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(organizer),
    });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      memberships: [
        {
          organizationId: createdBody.organizationId,
          organizationName: "Liga Test",
          role: "organizer",
        },
      ],
    });

    const destination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(organizer),
    });
    expect(destination.status).toBe(200);
    expect(await destination.json()).toMatchObject({
      destination: {
        kind: "organization",
        organizationId: createdBody.organizationId,
      },
    });

    const invite = await app.request(
      `/api/v1/organizations/${createdBody.organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "captain" }),
      },
    );
    expect(invite.status).toBe(201);
    const inviteBody = (await invite.json()) as { token: string };

    const accepted = await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(captain),
      body: JSON.stringify({ token: inviteBody.token }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      organizationId: createdBody.organizationId,
      role: "captain",
    });

    const captainOnboarding = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(captain),
    });
    expect(await captainOnboarding.json()).toMatchObject({
      completed: true,
      version: 1,
      path: "invitation",
    });
  });

  it("identity: requires onboarding before personal destination and completes idempotently", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-personal";

    const initialStatus = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(initialStatus.status).toBe(200);
    expect(await initialStatus.json()).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: null,
    });

    const initialDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await initialDestination.json()).toMatchObject({
      destination: { kind: "onboarding" },
    });

    const completed = await app.request("/api/v1/identity/onboarding", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ path: "player" }),
    });
    expect(completed.status).toBe(200);
    const completedBody = (await completed.json()) as {
      completedAt: string;
    };
    expect(completedBody).toMatchObject({
      completed: true,
      version: 1,
      path: "player",
    });
    expect(completedBody.completedAt).toBeTruthy();

    const repeated = await app.request("/api/v1/identity/onboarding", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ path: "organization" }),
    });
    expect(await repeated.json()).toMatchObject({
      completedAt: completedBody.completedAt,
      path: "player",
    });

    const personalDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await personalDestination.json()).toMatchObject({
      destination: { kind: "personal" },
    });
  });

  it("organizations routes reject missing service auth", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/organizations/mine");

    expect(res.status).toBe(401);
  });
});
