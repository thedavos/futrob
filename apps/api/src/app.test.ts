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
const onboardingCompetition = {
  name: "Copa Inicial",
  gameEdition: "FC 26",
  platform: "playstation",
  region: "south-america",
  timeZone: "America/Lima",
  format: "league",
};

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

  it("organization resources do not complete onboarding implicitly", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-organizer";
    const staff = "actor-staff";

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
      destination: { kind: "onboarding" },
    });

    const invite = await app.request(
      `/api/v1/organizations/${createdBody.organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "staff" }),
      },
    );
    expect(invite.status).toBe(201);
    const inviteBody = (await invite.json()) as { token: string };

    const accepted = await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(staff),
      body: JSON.stringify({ token: inviteBody.token }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      organizationId: createdBody.organizationId,
      role: "staff",
    });

    const staffOnboarding = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(staff),
    });
    expect(await staffOnboarding.json()).toMatchObject({
      completed: false,
      path: null,
    });
  });

  it("onboarding: retries organization completion without duplicating it", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-idempotent-organizer";
    const request = () =>
      app.request("/api/v1/identity/onboarding/organization", {
        method: "POST",
        headers: serviceHeaders(actor),
        body: JSON.stringify({
          name: "Liga Única",
          competition: onboardingCompetition,
          gameAccount: {
            identifier: "OrganizerEA",
            platform: "xbox",
            gameEdition: "FC 27",
          },
        }),
      });

    const first = await request();
    const retried = await request();
    const firstBody = (await first.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const retriedBody = (await retried.json()) as { organizationId: string };
    expect(retriedBody.organizationId).toBe(firstBody.organizationId);
    expect(retriedBody).toMatchObject({
      competition: { competition: { name: "Copa Inicial", status: "draft" } },
      destination: { kind: "competition-setup" },
      gameAccount: {
        identifier: "OrganizerEA",
        platform: "xbox",
        gameEdition: "FC 27",
      },
    });

    const draft = await app.request(
      `/api/v1/organizations/${firstBody.organizationId}/competitions/${firstBody.competition.competition.id}`,
      { headers: serviceHeaders(actor) },
    );
    expect(draft.status).toBe(200);
    expect(await draft.json()).toMatchObject({
      competition: { name: "Copa Inicial", organizationId: firstBody.organizationId },
      rules: { version: 1, awayGoalsEnabled: false },
    });

    const forbidden = await app.request(
      `/api/v1/organizations/${firstBody.organizationId}/competitions/${firstBody.competition.competition.id}`,
      { headers: serviceHeaders("actor-outsider") },
    );
    expect(forbidden.status).toBe(403);

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(actor),
    });
    const mineBody = (await mine.json()) as { memberships: unknown[] };
    expect(mineBody.memberships).toHaveLength(1);

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(actor),
    });
    const profileBody = (await profile.json()) as { gameAccounts: unknown[] };
    expect(profileBody.gameAccounts).toHaveLength(1);

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await status.json()).toMatchObject({
      completed: true,
      path: "organization",
      version: 2,
    });
  });

  it("organizations: checks and enforces globally unique normalized names", async () => {
    const app = buildApp(stubFetch);
    const firstActor = "actor-name-owner";

    const initiallyAvailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga Global" }),
    });
    expect(await initiallyAvailable.json()).toEqual({ available: true });

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga  Global" }),
    });
    expect(created.status).toBe(201);

    const unavailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "  LIGA GLOBAL  " }),
    });
    expect(await unavailable.json()).toEqual({ available: false });

    const duplicate = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "liga global" }),
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "organizations.name_conflict" });
  });

  it("onboarding: requires completion before personal destination and persists progress", async () => {
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
      currentStep: "intention",
    });

    const progress = await app.request("/api/v1/identity/onboarding", {
      method: "PATCH",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ path: "player", currentStep: "game-account" }),
    });
    expect(progress.status).toBe(200);
    expect(await progress.json()).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: "player",
      currentStep: "game-account",
    });

    const resumed = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await resumed.json()).toMatchObject({
      completed: false,
      path: "player",
      currentStep: "game-account",
    });

    const initialDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await initialDestination.json()).toMatchObject({
      destination: { kind: "onboarding" },
    });

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ gameAccount: null }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({ destination: "personal", gameAccount: null });

    const personalDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await personalDestination.json()).toMatchObject({
      destination: { kind: "personal" },
    });
  });

  it("onboarding: completes the player path with an idempotent EA game account", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-player-profile";
    const body = JSON.stringify({
      gameAccount: {
        identifier: "Gamer23",
        platform: "nintendo-switch-2",
        gameEdition: "FC 26",
      },
    });

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body,
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      destination: "personal",
      gameAccount: {
        identifier: "Gamer23",
        platform: "nintendo-switch-2",
        gameEdition: "FC 26",
      },
    });

    const retried = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body,
    });
    expect(retried.status).toBe(200);

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(actor),
    });
    const profileBody = (await profile.json()) as { gameAccounts: unknown[] };
    expect(profileBody.gameAccounts).toHaveLength(1);

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await status.json()).toMatchObject({ completed: true, path: "player" });
  });

  it("onboarding: accepts an invitation and completes the invitation path", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-inviting-organizer";
    const player = "actor-invited-player";

    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Liga Invitación",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId, competition } = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const competitionId = competition.competition.id;
    const organizationInvitation = await app.request(
      `/api/v1/organizations/${organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "staff" }),
      },
    );
    const organizationToken = (await organizationInvitation.json()) as { token: string };
    const rejectedOrganizationInvitation = await app.request(
      "/api/v1/identity/onboarding/invitation",
      {
        method: "POST",
        headers: serviceHeaders("actor-with-organization-invite"),
        body: JSON.stringify({ token: organizationToken.token }),
      },
    );
    expect(rejectedOrganizationInvitation.status).toBe(400);
    expect(await rejectedOrganizationInvitation.json()).toMatchObject({
      code: "organizations.invitation_invalid",
    });

    const invitation = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player" }),
      },
    );
    expect(invitation.status).toBe(201);
    const { token } = (await invitation.json()) as { token: string };

    const completed = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      organizationId,
      role: "player",
      competitionId,
      competitionName: "Copa Inicial",
      profile: { id: expect.any(String) },
      gameAccount: null,
      destination: { kind: "competition", organizationId, competitionId },
    });

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(player),
    });
    expect(await profile.json()).toMatchObject({
      profile: { id: expect.any(String) },
      gameAccounts: [],
    });

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(player),
    });
    expect(await status.json()).toMatchObject({ completed: true, path: "invitation" });

    const acceptedAgain = await app.request("/api/v1/competitions/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(acceptedAgain.status).toBe(200);
    expect(await acceptedAgain.json()).toMatchObject({
      competitionId,
      competitionName: "Copa Inicial",
      destination: { kind: "competition", organizationId, competitionId },
    });
  });

  it("onboarding: rejects a different path after completion without creating side effects", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-completed-player";
    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ gameAccount: null }),
    });

    const conflicting = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        name: "No debe existir",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    expect(conflicting.status).toBe(409);
    expect(await conflicting.json()).toMatchObject({
      code: "identity.onboarding_path_conflict",
    });

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(actor),
    });
    expect(await mine.json()).toEqual({ memberships: [] });
  });

  it("organizations routes reject missing service auth", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/organizations/mine");

    expect(res.status).toBe(401);
  });
});
